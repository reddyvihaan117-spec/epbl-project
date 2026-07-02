from functools import wraps

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.models import Transaction, User

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)

    return wrapper


@admin_bp.get("/users")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([user.to_dict() for user in users])


@admin_bp.get("/stats")
@admin_required
def stats():
    users = User.query.count()
    transactions = Transaction.query.count()
    income = sum(t.amount for t in Transaction.query.filter_by(type="income").all())
    expenses = sum(t.amount for t in Transaction.query.filter_by(type="expense").all())

    return jsonify({"users": users, "transactions": transactions, "income": round(income, 2), "expenses": round(expenses, 2)})
