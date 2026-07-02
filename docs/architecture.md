# Architecture Overview

This personal finance tracker is built with a modular full-stack architecture:

- Frontend: React + Vite for a responsive dashboard and transaction UI.
- Backend: Flask with Blueprint-based API structure and JWT authentication.
- Database: SQLite by default, compatible with MySQL via SQLAlchemy.
- Machine Learning: Scikit-learn models for expense classification and forecasting.

Key components:

- `backend/routes/`: API Blueprints for auth, transactions, analytics, admin, AI.
- `backend/models.py`: SQLAlchemy tables for users, transactions, budgets, categories, predictions.
- `backend/services/ai_service.py`: Model training, classification, anomaly detection, recommendations.
- `frontend/src/`: React UI components and service calls.
