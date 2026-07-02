from flask import Flask
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from backend.config import Config, TestConfig
from backend.extensions import db, jwt
from backend.models import Budget, Category, Prediction, Transaction, User
from backend.routes.admin import admin_bp
from backend.routes.ai import ai_bp
from backend.routes.analytics import analytics_bp
from backend.routes.auth import auth_bp
from backend.routes.budgets import budgets_bp
from backend.routes.transactions import transactions_bp


def create_app(config_name: str = "default"):
    app = Flask(__name__)
    app.config.from_object(TestConfig if config_name == "testing" else Config)

    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(admin_bp)

    with app.app_context():
        db.create_all()
        seed_admin_user()

    return app


def seed_admin_user():
    if User.query.count() == 0:
        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=generate_password_hash("admin123"),
            role="admin",
        )
        db.session.add(admin)
        db.session.commit()
