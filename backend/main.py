import os

from flask import Flask, render_template
from flask_cors import CORS

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from extensions import db
from routes.currency import currency_bp
from routes.checkin import checkin_bp
from routes.trains import trains_bp
from routes.safety import safety_bp
from routes.trust import trust_bp
from routes.disruption import disruption_bp

app = Flask(__name__, instance_relative_config=True)

os.makedirs(app.instance_path, exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", f"sqlite:///{os.path.join(app.instance_path, 'silksync.db')}"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

# Columns added to existing models after their table was first created.
# There's no Alembic in this project, so `db.create_all()` won't add these to an
# already-existing SQLite file -- this idempotently backfills them on startup instead.
_NEW_COLUMNS = [
    ("travelers", "coach", "VARCHAR"),
    ("reports", "verified", "BOOLEAN DEFAULT 0"),
    ("train_journeys", "status", "VARCHAR DEFAULT 'normal'"),
    ("train_journeys", "alternatives_json", "TEXT"),
]


def _ensure_new_columns():
    for table, column, coltype in _NEW_COLUMNS:
        try:
            db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))
            db.session.commit()
        except OperationalError:
            db.session.rollback()  # column already exists


with app.app_context():
    import models  # noqa: F401 registers models on the metadata before create_all
    db.create_all()
    _ensure_new_columns()

# Comma-separated list of allowed origins, e.g. "https://app.silksync.com,https://silksync.com"
# Falls back to "*" for local development when unset.
_allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
CORS(app, origins=[o.strip() for o in _allowed_origins.split(",")] if _allowed_origins != "*" else "*")

app.register_blueprint(currency_bp)
app.register_blueprint(checkin_bp)
app.register_blueprint(trains_bp)
app.register_blueprint(safety_bp)
app.register_blueprint(trust_bp)
app.register_blueprint(disruption_bp)


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=5001, debug=debug_mode)
