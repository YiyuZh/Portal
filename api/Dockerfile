FROM python:3.12-alpine

WORKDIR /app

COPY ./api/messages_api.py /app/messages_api.py
COPY ./security /app/security

ENV PORT=8000
ENV MESSAGES_DB=/data/messages.sqlite3

VOLUME ["/data"]

EXPOSE 8000

CMD ["python", "/app/messages_api.py"]
