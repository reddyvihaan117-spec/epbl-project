from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)


def _train_classifier():
    training_data = pd.DataFrame(
        [
            ("grocery shopping at supermarket", "Groceries"),
            ("bought milk bread and eggs", "Groceries"),
            ("restaurant dinner with friends", "Dining"),
            ("coffee and lunch", "Dining"),
            ("monthly electricity bill", "Utilities"),
            ("internet and mobile recharge", "Utilities"),
            ("bus ticket and fuel", "Transport"),
            ("gas refill and parking", "Transport"),
            ("subscription to netflix", "Entertainment"),
            ("movie tickets and games", "Entertainment"),
            ("doctor appointment and medicine", "Healthcare"),
            ("pharmacy purchase", "Healthcare"),
            ("rent payment", "Housing"),
            ("mortgage installment", "Housing"),
        ],
        columns=["text", "label"],
    )
    pipe = Pipeline([("tfidf", TfidfVectorizer()), ("clf", LogisticRegression(max_iter=2000))])
    pipe.fit(training_data["text"], training_data["label"])
    joblib.dump(pipe, MODEL_DIR / "expense_classifier.joblib")
    return pipe


def classify_expense(description: str) -> str:
    model_path = MODEL_DIR / "expense_classifier.joblib"
    if not model_path.exists():
        _train_classifier()
    model = joblib.load(model_path)
    return model.predict([description])[0]


def forecast_next_month_expenses(transactions: List[object]) -> float:
    model_path = MODEL_DIR / "expense_forecast.joblib"
    if len(transactions) < 3:
        return 0.0

    monthly_totals = {}
    for transaction in transactions:
        if transaction.type == "expense":
            month = transaction.transaction_date.strftime("%Y-%m")
            monthly_totals[month] = monthly_totals.get(month, 0) + transaction.amount

    values = list(monthly_totals.values())
    if len(values) < 2:
        return round(values[-1], 2) if values else 0.0

    if not model_path.exists():
        X = np.array(range(len(values))).reshape(-1, 1)
        y = np.array(values)
        model = LinearRegression()
        model.fit(X, y)
        joblib.dump(model, model_path)
    else:
        model = joblib.load(model_path)

    prediction = model.predict(np.array([[len(values)]])[0].reshape(1, -1))[0]
    return round(float(prediction), 2)


def detect_unusual_spending(transactions: List[object]) -> List[dict]:
    expenses = [transaction.amount for transaction in transactions if transaction.type == "expense"]
    if len(expenses) < 3:
        return []
    mean = float(np.mean(expenses))
    std = float(np.std(expenses))
    anomalies = []
    for transaction in transactions:
        if transaction.type != "expense":
            continue
        z_score = (transaction.amount - mean) / std if std else 0
        if z_score > 1.5:
            anomalies.append({"description": transaction.description, "amount": transaction.amount, "score": round(z_score, 2)})
    return anomalies


def recommend_budgets(transactions: List[object]) -> List[dict]:
    category_totals = {}
    for transaction in transactions:
        if transaction.type == "expense" and transaction.category:
            category_totals[transaction.category.name] = category_totals.get(transaction.category.name, 0) + transaction.amount

    defaults = {
        "Groceries": 0.25,
        "Dining": 0.15,
        "Utilities": 0.12,
        "Transport": 0.1,
        "Entertainment": 0.08,
        "Healthcare": 0.05,
        "Housing": 0.25,
    }
    recommendations = []
    total_expense = sum(category_totals.values())
    for name, value in category_totals.items():
        pct = defaults.get(name, 0.1)
        recommendations.append({"category": name, "recommended": round(total_expense * pct, 2), "actual": round(value, 2)})
    return recommendations


def suggest_saving_tips(transactions: List[object]) -> List[str]:
    categories = {}
    for transaction in transactions:
        if transaction.type == "expense" and transaction.category:
            categories[transaction.category.name] = categories.get(transaction.category.name, 0) + transaction.amount

    tips = []
    if categories.get("Dining", 0) > 100:
        tips.append("Reduce dining-out expenses by planning meals and cooking more at home.")
    if categories.get("Transport", 0) > 80:
        tips.append("Consider combining errands to lower transportation costs.")
    if categories.get("Entertainment", 0) > 60:
        tips.append("Set a weekly entertainment cap and use free or low-cost activities.")
    if not tips:
        tips.append("Keep tracking your transactions and review recurring charges each month.")
    return tips
