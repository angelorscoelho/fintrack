FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.12

WORKDIR /var/task

# Instala dependências mínimas sem cache
RUN pip install --no-cache-dir --target . \
    scikit-learn==1.4.2 \
    numpy==1.26.4 \
    joblib==1.4.2

# Copia código + model (assume handler.py e model.pkl na pasta atual)
COPY . .

# Handler: módulo.funcao (confirma que tens handler.py com def lambda_handler(event, context))
CMD ["handler.lambda_handler"]