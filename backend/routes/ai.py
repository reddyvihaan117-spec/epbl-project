from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.models import Transaction, User
from backend.services.ai_service import (
    classify_expense,
    detect_unusual_spending,
    forecast_next_month_expenses,
    recommend_budgets,
    suggest_saving_tips,
)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        raise ValueError("User not found")
    return user


@ai_bp.post("/classify")
@jwt_required()
def classify():
    data = request.get_json() or {}
    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "description is required"}), 400
    return jsonify({"category": classify_expense(description)})


@ai_bp.get("/forecast")
@jwt_required()
def forecast():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transaction_history = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.transaction_date.asc()).all()
    return jsonify({"forecast": forecast_next_month_expenses(transaction_history)})


@ai_bp.get("/anomalies")
@jwt_required()
def anomalies():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transaction_history = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.transaction_date.asc()).all()
    return jsonify({"anomalies": detect_unusual_spending(transaction_history)})


@ai_bp.get("/recommendations")
@jwt_required()
def recommendations():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transaction_history = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.transaction_date.asc()).all()
    return jsonify(
        {
            "budgets": recommend_budgets(transaction_history),
            "saving_tips": suggest_saving_tips(transaction_history),
        }
    )
