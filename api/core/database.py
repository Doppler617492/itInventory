"""Database connection and session management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

from .config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False for FastAPI
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    poolclass=StaticPool if settings.DATABASE_URL.startswith("sqlite") else None,
    pool_pre_ping=not settings.DATABASE_URL.startswith("sqlite"),
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database (create tables if needed)."""
    from sqlalchemy import text
    from api.models import (
        User, Vendor, Request, RequestItem, Approval, Document,
        Invoice, Asset, Subscription, AuditLog, Location, Sector, Notification, AppConfig,
        UserLocation, UserSector,
    )
    Base.metadata.create_all(bind=engine)
    # Migration: add columns if missing (for existing DBs)
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    migrations = [
        ("requests", "sector", "VARCHAR(255)", None),
        ("requests", "assigned_approver_id", "INTEGER", None),
        ("users", "location_id", "INTEGER", None),
        ("users", "notifications_enabled", "INTEGER DEFAULT 1", "BOOLEAN DEFAULT true"),
        ("users", "email_enabled", "INTEGER DEFAULT 1", "BOOLEAN DEFAULT true"),
        ("request_items", "discount_pct", "REAL DEFAULT 0", "NUMERIC(5,2) DEFAULT 0"),
        ("assets", "internal_barcode", "VARCHAR(100)", None),
    ]
    with engine.connect() as conn:
        for row in migrations:
            table, col = row[0], row[1]
            col_def = row[3] if row[3] and not is_sqlite else row[2]
            try:
                if is_sqlite:
                    result = conn.execute(text(
                        f"SELECT name FROM pragma_table_info('{table}') WHERE name=:col"  # noqa: S608
                    ), {"col": col})
                else:
                    result = conn.execute(text("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_name=:table AND column_name=:col
                    """), {"table": table, "col": col})
                if result.fetchone() is None:
                    sql = f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"  # noqa: S608
                    conn.execute(text(sql))
                    conn.commit()
            except Exception:
                conn.rollback()
    # Seed default locations and sectors if empty
    db = SessionLocal()
    try:
        from sqlalchemy import update
        db.execute(update(User).where(User.role == "IT_REQUESTER").values(role="APPROVER"))
        db.commit()
    except Exception:
        db.rollback()
    try:
        if db.query(Location).count() == 0:
            for name in [
                "Prodavnica - Ulcinj Ctc", "Prodavnica - Budva", "Prodavnica - Ulcinj",
                "Prodavnica - Podgorica Centar", "Prodavnica - Podgorica 2", "Prodavnica - Niksic",
                "Prodavnica - Kotor Centar", "Prodavnica - Bar Centar", "Prodavnica - Bar",
                "Prodavnica - Bijelo polje", "Prodavnica - Berane Centar",
                "Prodavnica - Herceg Novi", "Prodavnica - Herceg Novi Centar", "Administracija",
            ]:
                db.add(Location(name=name))
        if db.query(Sector).count() == 0:
            for name in [
                "IT Sektor", "Komerciala", "Logistika", "Marketing OnlineShop", "Financije",
                "Bankarstvo", "Manadzment", "Pravna Sluzba", "HQ", "Prodavnice",
            ]:
                db.add(Sector(name=name))
        db.commit()
    finally:
        db.close()
