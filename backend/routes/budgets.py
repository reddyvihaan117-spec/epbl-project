from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.extensions import db
from backend.models import Budget, Category, User

budgets_bp = Blueprint("budgets", __name__, url_prefix="/api/budgets")


def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        raise ValueError("User not found")
    return user


@budgets_bp.get("")
@jwt_required()
def list_budgets():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    budgets = Budget.query.filter_by(user_id=user.id).order_by(Budget.month.desc()).all()
    return jsonify([budget.to_dict() for budget in budgets])


@budgets_bp.post("")
@jwt_required()
def create_budget():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    data = request.get_json() or {}
    category_name = (data.get("category") or "").strip()
    month = (data.get("month") or datetime.utcnow().strftime("%Y-%m")).strip()
    amount = float(data.get("amount") or 0)

    if not category_name or amount <= 0:
        return jsonify({"error": "category and positive amount are required"}), 400

    category = Category.query.filter_by(user_id=user.id, name=category_name, type="expense").first()
    if not category:
        category = Category(name=category_name, type="expense", user_id=user.id)
        db.session.add(category)
        db.session.flush()

    budget = Budget(user_id=user.id, category_id=category.id, month=month, amount=amount)
    db.session.add(budget)
    db.session.commit()
    return jsonify(budget.to_dict()), 201


@budgets_bp.put("/<int:budget_id>")
@jwt_required()
def update_budget(budget_id):
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    budget = Budget.query.filter_by(id=budget_id, user_id=user.id).first()
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    data = request.get_json() or {}
    amount = float(data.get("amount") or budget.amount)
    month = (data.get("month") or budget.month).strip()
    category_name = (data.get("category") or budget.category.name if budget.category else "").strip()

    if not category_name or amount <= 0:
        return jsonify({"error": "category and positive amount are required"}), 400

    category = Category.query.filter_by(user_id=user.id, name=category_name, type="expense").first()
    if not category:
        category = Category(name=category_name, type="expense", user_id=user.id)
        db.session.add(category)
        db.session.flush()

    budget.category_id = category.id
    budget.month = month
    budget.amount = amount
    db.session.commit()
    return jsonify(budget.to_dict())


@budgets_bp.delete("/<int:budget_id>")
@jwt_required()
def delete_budget(budget_id):
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    budget = Budget.query.filter_by(id=budget_id, user_id=user.id).first()
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget deleted"})
