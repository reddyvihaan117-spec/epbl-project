from collections import defaultdict
from datetime import datetime
from io import BytesIO
import csv

from flask import Blueprint, Response, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from backend.extensions import db
from backend.models import Budget, Category, Transaction, User

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        raise ValueError("User not found")
    return user


@analytics_bp.get("/dashboard")
@jwt_required()
def dashboard():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    today = datetime.utcnow()
    month_start = datetime(today.year, today.month, 1)
    month_end = datetime(today.year, today.month + 1, 1) if today.month < 12 else datetime(today.year + 1, 1, 1)

    transactions = Transaction.query.filter_by(user_id=user.id).filter(Transaction.transaction_date >= month_start, Transaction.transaction_date < month_end).all()

    income = sum(t.amount for t in transactions if t.type == "income")
    expenses = sum(t.amount for t in transactions if t.type == "expense")
    savings = income - expenses

    budgets = Budget.query.filter_by(user_id=user.id).filter(Budget.month == today.strftime("%Y-%m")).all()
    budget_limit = sum(b.amount for b in budgets)
    budget_used = expenses
    budget_progress = round((budget_used / budget_limit) * 100, 1) if budget_limit else 0
    health_score = max(0, min(100, round(70 + (savings / max(income, 1)) * 30 - budget_progress * 0.2)))

    recent_transactions = sorted(transactions, key=lambda t: t.transaction_date, reverse=True)[:5]

    return jsonify(
        {
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "savings": round(savings, 2),
            "budget_progress": round(budget_progress, 1),
            "health_score": health_score,
            "recent_transactions": [t.to_dict() for t in recent_transactions],
        }
    )


@analytics_bp.get("/charts")
@jwt_required()
def charts():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transactions = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.transaction_date.asc()).all()

    monthly_expenses = defaultdict(float)
    monthly_income = defaultdict(float)
    monthly_savings = defaultdict(float)
    category_expenses = defaultdict(float)
    budget_actual = defaultdict(float)
    budgets = Budget.query.filter_by(user_id=user.id).all()

    for transaction in transactions:
        month = transaction.transaction_date.strftime("%Y-%m")
        if transaction.type == "expense":
            monthly_expenses[month] += transaction.amount
            if transaction.category:
                category_expenses[transaction.category.name] += transaction.amount
        else:
            monthly_income[month] += transaction.amount
        monthly_savings[month] += (transaction.amount if transaction.type == "income" else -transaction.amount)

    for budget in budgets:
        if budget.month == datetime.utcnow().strftime("%Y-%m"):
            budget_actual[budget.category.name] += budget.amount

    return jsonify(
        {
            "monthly_expenses": [{"month": month, "amount": round(value, 2)} for month, value in sorted(monthly_expenses.items())],
            "income_vs_expense": [
                {"month": month, "income": round(monthly_income.get(month, 0), 2), "expense": round(monthly_expenses.get(month, 0), 2)}
                for month in sorted(set(monthly_income) | set(monthly_expenses))
            ],
            "category_breakdown": [{"name": name, "value": round(value, 2)} for name, value in sorted(category_expenses.items())],
            "savings_trend": [{"month": month, "amount": round(value, 2)} for month, value in sorted(monthly_savings.items())],
            "budget_vs_actual": [{"name": name, "budget": round(value, 2), "actual": round(budget_actual.get(name, 0), 2)} for name, value in sorted(budget_actual.items())],
        }
    )


@analytics_bp.get("/reports/monthly")
@jwt_required()
def monthly_report():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    today = datetime.utcnow()
    month = today.strftime("%Y-%m")
    transactions = Transaction.query.filter_by(user_id=user.id).filter(Transaction.transaction_date >= datetime(today.year, today.month, 1)).all()
    income = sum(t.amount for t in transactions if t.type == "income")
    expenses = sum(t.amount for t in transactions if t.type == "expense")

    return jsonify({"month": month, "income": round(income, 2), "expenses": round(expenses, 2), "savings": round(income - expenses, 2)})


@analytics_bp.get("/reports/yearly")
@jwt_required()
def yearly_report():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transactions = Transaction.query.filter_by(user_id=user.id).all()
    grouped = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    for transaction in transactions:
        year = transaction.transaction_date.strftime("%Y")
        if transaction.type == "income":
            grouped[year]["income"] += transaction.amount
        else:
            grouped[year]["expense"] += transaction.amount

    return jsonify([{"year": year, **values} for year, values in sorted(grouped.items())])


@analytics_bp.get("/reports/export-csv")
@jwt_required()
def export_csv():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    transactions = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.transaction_date.desc()).all()
    output = BytesIO()
    writer = csv.writer(output)
    writer.writerow(["date", "type", "description", "amount", "category"])
    for transaction in transactions:
        writer.writerow([transaction.transaction_date.date().isoformat(), transaction.type, transaction.description, transaction.amount, transaction.category.name if transaction.category else ""])
    output.seek(0)
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=transactions.csv"})


@analytics_bp.get("/reports/download-pdf")
@jwt_required()
def download_pdf():
    try:
        user = get_current_user()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle("Personal Finance Report")
    pdf.drawString(40, 760, "Personal Finance Tracker Report")
    pdf.drawString(40, 740, f"User: {user.username}")
    pdf.drawString(40, 720, f"Generated: {datetime.utcnow().date().isoformat()}")
    pdf.drawString(40, 700, "This report is generated from your recent transactions.")
    pdf.save()
    buffer.seek(0)
    return send_file(buffer, download_name="finance_report.pdf", as_attachment=True, mimetype="application/pdf")
