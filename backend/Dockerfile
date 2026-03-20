FROM public.ecr.aws/lambda/python:3.12

# Copy requirements and install ML dependencies
COPY requirements.txt  ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the lambda handler code into the Lambda task root
COPY lambda_handler/ ${LAMBDA_TASK_ROOT}

# Use the handler function as the image entrypoint
CMD ["handler.lambda_handler"]
