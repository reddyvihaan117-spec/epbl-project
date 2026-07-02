# AI Personal Finance Tracker

Full-stack personal finance tracker built with a React frontend, Flask backend, SQLite database, and Scikit-learn AI.

## Features

- User registration and login with JWT authentication
- Transaction management with add/edit/delete and CSV upload
- Dashboard metrics, spending analytics, and category breakdowns
- Expense classification, forecasting, and anomaly detection
- Budget creation and recommendations
- CSV export and PDF report generation
- Admin analytics pages for user and transaction insights
- Docker support for containerized deployment

## Repository Structure

- `backend/` - Flask application, API routes, database models, and AI services
- `frontend/` - React + Vite user interface
- `models/` - saved machine learning model files
- `dataset/` - CSV dataset uploads and sample data
- `ml/` - AI training helpers and model utilities
- `docs/` - architecture notes and documentation

## Local Setup

### Backend

```powershell
cd "C:\Users\reddy\OneDrive\Desktop\New folder (4)\backend"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The backend starts on `http://localhost:5000` by default.

### Frontend

```powershell
cd "C:\Users\reddy\OneDrive\Desktop\New folder (4)\frontend"
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` by default.

### Working Together

After both backend and frontend are running:
- open `http://localhost:5173`
- register or login
- use the dashboard, transactions, budgets, AI insights, and reports

## Docker

```powershell
docker build -t finance-tracker .
docker run -p 5000:5000 finance-tracker
```

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/<id>`
- `DELETE /api/transactions/<id>`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/report/csv`
- `GET /api/analytics/report/pdf`
- `GET /api/ai/forecast`
- `GET /api/ai/anomalies`
- `GET /api/ai/recommendations`

## GitHub Push Instructions

This repo is not yet committed locally because Git is not installed in the current shell.

After installing Git on Windows, run:

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/reddyvihaan117-spec/epbl-project.git
git push -u origin main
```

## Notes

- Ensure the backend is running before using the frontend.
- If you want, I can help you verify or update the `.gitignore` as well.
