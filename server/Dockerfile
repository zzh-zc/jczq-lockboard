FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt app.py schema.sql ./
RUN pip install --no-cache-dir -r requirements.txt
ENV JCZQ_DB_PATH=/data/jczq.db
ENV JCZQ_PORT=8787
EXPOSE 8787
CMD ["python", "app.py"]
