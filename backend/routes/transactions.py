import csv
import io
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.extensions import db
from backend.models import Category, Transaction, User
from backend.services.ai_service import classify_expense

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        raise ValueError("User not found")
    return user


@transactions_bp.get("")
@jwt_required()
def list_transactions():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    query = Transaction.query.filter_by(user_id=user.id)

    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    transaction_type = request.args.get("type", "").strip()
    month = request.args.get("month", "").strip()

    if category:
        query = query.join(Category).filter(Category.name.ilike(f"%{category}%"))
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    if transaction_type:
        query = query.filter(Transaction.type == transaction_type)
    if month:
        query = query.filter(Transaction.transaction_date >= datetime.strptime(month + "-01", "%Y-%m-%d"))
        month_end = datetime.strptime(month + "-28", "%Y-%m-%d")
        query = query.filter(Transaction.transaction_date <= month_end)

    transactions = query.order_by(Transaction.transaction_date.desc()).all()
    return jsonify([transaction.to_dict() for transaction in transactions])


@transactions_bp.post("")
@jwt_required()
def create_transaction():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    data = request.get_json() or {}
    amount = float(data.get("amount") or 0)
    description = (data.get("description") or "").strip()
    transaction_type = (data.get("type") or "expense").strip().lower()
    notes = (data.get("notes") or "").strip()
    source = (data.get("source") or "manual").strip()
    date_value = data.get("transaction_date") or datetime.utcnow().date().isoformat()

    if not description or amount <= 0:
        return jsonify({"error": "description and a positive amount are required"}), 400

    category_name = (data.get("category") or data.get("category_name") or "").strip()
    if transaction_type == "expense" and not category_name:
        category_name = classify_expense(description)

    category = None
    if category_name:
        category = Category.query.filter_by(user_id=user.id, name=category_name, type=transaction_type).first()
        if not category:
            category = Category(name=category_name, type=transaction_type, user_id=user.id)
            db.session.add(category)
            db.session.flush()

    transaction = Transaction(
        user_id=user.id,
        type=transaction_type,
        amount=amount,
        description=description,
        category_id=category.id if category else None,
        transaction_date=datetime.strptime(date_value, "%Y-%m-%d"),
        notes=notes,
        source=source,
    )
    db.session.add(transaction)
    db.session.commit()

    return jsonify(transaction.to_dict()), 201


@transactions_bp.put("/<int:transaction_id>")
@jwt_required()
def update_transaction(transaction_id):
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user.id).first()
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    data = request.get_json() or {}
    transaction.description = (data.get("description") or transaction.description).strip()
    transaction.type = (data.get("type") or transaction.type).strip().lower()
    transaction.amount = float(data.get("amount") or transaction.amount)
    transaction.notes = (data.get("notes") or transaction.notes or "").strip()
    transaction.source = (data.get("source") or transaction.source).strip()

    if data.get("transaction_date"):
        transaction.transaction_date = datetime.strptime(data.get("transaction_date"), "%Y-%m-%d")

    category_name = (data.get("category") or data.get("category_name") or "").strip()
    if transaction.type == "expense" and category_name:
        category = Category.query.filter_by(user_id=user.id, name=category_name, type=transaction.type).first()
        if not category:
            category = Category(name=category_name, type=transaction.type, user_id=user.id)
            db.session.add(category)
            db.session.flush()
        transaction.category_id = category.id

    db.session.commit()
    return jsonify(transaction.to_dict())


@transactions_bp.delete("/<int:transaction_id>")
@jwt_required()
def delete_transaction(transaction_id):
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user.id).first()
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction deleted"})


@transactions_bp.get("/categories")
@jwt_required()
def list_categories():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    categories = Category.query.filter_by(user_id=user.id).order_by(Category.name).all()
    return jsonify([category.to_dict() for category in categories])


@transactions_bp.post("/upload-csv")
@jwt_required()
def upload_csv():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "No file uploaded"}), 400

    content = uploaded.read().decode("utf-8-sig")
    stream = io.StringIO(content)
    reader = csv.DictReader(stream)
    created = 0

    for row in reader:
        if not row.get("description"):
            continue
        amount = float(row.get("amount") or 0)
        if amount <= 0:
            continue
        transaction_type = (row.get("type") or "expense").strip().lower()
        category_name = (row.get("category") or "").strip()
        if transaction_type == "expense" and not category_name:
            category_name = classify_expense(row.get("description", ""))

        category = None
        if category_name:
            category = Category.query.filter_by(user_id=user.id, name=category_name, type=transaction_type).first()
            if not category:
                category = Category(name=category_name, type=transaction_type, user_id=user.id)
                db.session.add(category)
                db.session.flush()

        transaction_date = row.get("transaction_date") or datetime.utcnow().date().isoformat()
        transaction = Transaction(
            user_id=user.id,
            type=transaction_type,
            amount=amount,
            description=row.get("description", ""),
            category_id=category.id if category else None,
            transaction_date=datetime.strptime(transaction_date, "%Y-%m-%d"),
            notes=row.get("notes") or "",
            source="csv",
        )
        db.session.add(transaction)
        created += 1

    db.session.commit()
    return jsonify({"message": f"Imported {created} transactions"})
