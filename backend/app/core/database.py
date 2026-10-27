import logging
import re
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("stockpilot.database")
Base = declarative_base()

def get_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg://"):
        db_url = "postgresql+psycopg://" + db_url[len("postgresql://"):]

    # Check if we should attempt PostgreSQL
    if "postgres" in db_url.lower():
        try:
            logger.info("Attempting connection to PostgreSQL database...")
            engine = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
                connect_args={"connect_timeout": 5}
            )
            # Test connectivity
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Successfully connected to Supabase PostgreSQL database.")
            return engine
        except Exception as e:
            logger.warning(
                f"PostgreSQL connection failed ({e}). "
                + ("Falling back to local SQLite database." if settings.ALLOW_SQLITE_FALLBACK else "Fallback disabled.")
            )
            if not settings.ALLOW_SQLITE_FALLBACK:
                raise e

    # SQLite fallback (with foreign key enforcement and WAL mode)
    logger.info("Using SQLite database (./stockpilot.db) with foreign keys enabled.")
    sqlite_url = "sqlite:///./stockpilot.db"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to ensure they are registered with Base.metadata
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
