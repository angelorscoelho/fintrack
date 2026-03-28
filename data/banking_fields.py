"""
Shared helpers for synthetic IBANs, country pairs, and payment_platform.
Used by data/generator.py, data/populate_dynamodb.py, and backend/api/scripts/seed_dynamodb.py.
"""
from __future__ import annotations

import random
from typing import Callable

_DEST_CODES = ["PT", "ES", "FR", "DE", "US", "GB", "CN"]
_DEST_WEIGHTS = [75.0, 5.0, 5.0, 5.0, 10.0 / 3.0, 10.0 / 3.0, 10.0 / 3.0]


def _digits(n: int) -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(n))


def format_iban_pt() -> str:
    """Portuguese IBAN display: PT50 + 21 digits in groups."""
    body = _digits(21)
    groups = [body[i : i + 4] for i in range(0, 20, 4)] + [body[20]]
    return "PT50 " + " ".join(groups)


def format_iban_es() -> str:
    body = _digits(20)
    return "ES91 " + " ".join(body[i : i + 4] for i in range(0, 20, 4))


def format_iban_fr() -> str:
    body = _digits(23)
    parts = [body[i : i + 4] for i in range(0, 20, 4)] + [body[20:23]]
    return "FR76 " + " ".join(parts)


def format_iban_de() -> str:
    body = _digits(18)
    return "DE39 " + " ".join(body[i : i + 4] for i in range(0, 16, 4)) + " " + body[16:18]


def format_iban_gb() -> str:
    body = _digits(18)
    return "GB33 BUKB " + " ".join(body[i : i + 4] for i in range(0, 16, 4)) + body[16:18]


def format_iban_us_style() -> str:
    """Pseudo US routing display (not a valid IBAN — demo only)."""
    return "US62 " + " ".join(_digits(4) for _ in range(6))


def format_iban_cn_style() -> str:
    return "CN54 " + " ".join(_digits(4) for _ in range(6))


_IBAN_BY_CC: dict[str, Callable[[], str]] = {
    "PT": format_iban_pt,
    "ES": format_iban_es,
    "FR": format_iban_fr,
    "DE": format_iban_de,
    "GB": format_iban_gb,
    "US": format_iban_us_style,
    "CN": format_iban_cn_style,
}


def iban_for_country(country_code: str) -> str:
    """Plausible formatted IBAN-like string for ISO alpha-2 country."""
    fn = _IBAN_BY_CC.get(country_code, format_iban_pt)
    return fn()


def pick_destination_country() -> str:
    return random.choices(_DEST_CODES, weights=_DEST_WEIGHTS, k=1)[0]


# ~80% bank_transfer, ~10% card (mastercard+visa), ~7% wallet, ~3% cash (100 draws)
_PAYMENT_POOL = (
    ["bank_transfer"] * 80
    + ["mastercard"] * 5
    + ["visa"] * 5
    + ["paypal"] * 2
    + ["mbway"] * 2
    + ["revolut"] * 3
    + ["cash"] * 3
)


def pick_payment_platform() -> str:
    return random.choice(_PAYMENT_POOL)


def attach_banking_fields(record: dict) -> None:
    """
    Mutates record: sets source_country, destination_country, source_account,
    destination_account, payment_platform, and merchant_country = source_country.
    Expects record to already have merchant_country set by anomaly builders.
    """
    src = str(record.get("merchant_country", "PT"))
    record["source_country"] = src
    dst = pick_destination_country()
    record["destination_country"] = dst
    record["source_account"] = iban_for_country(src)
    record["destination_account"] = iban_for_country(dst)
    record["payment_platform"] = pick_payment_platform()
    record["merchant_country"] = src
