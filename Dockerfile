FROM python:3.12-slim
WORKDIR /app
COPY backend /app/backend
COPY models /app/models
COPY dataset /app/dataset
RUN pip install --no-cache-dir flask flask-cors flask-jwt-extended flask-sqlalchemy werkzeug pandas numpy scikit-learn joblib reportlab
EXPOSE 5000
CMD ["python", "backend/app.py"]
