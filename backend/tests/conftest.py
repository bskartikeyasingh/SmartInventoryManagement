import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.models.profile import Profile, UserRole
from app.main import app

# Use isolated in-memory or dedicated test SQLite database
TEST_DB_URL = "sqlite:///./test_stockpilot.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_stockpilot.db"):
        try:
            os.remove("./test_stockpilot.db")
        except Exception:
            pass

@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_headers(db_session):
    admin = db_session.query(Profile).filter(Profile.id == "test-admin").first()
    if not admin:
        admin = Profile(
            id="test-admin",
            email="admin@test.com",
            full_name="Test Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()

    token = create_access_token({
        "sub": admin.id,
        "email": admin.email,
        "role": admin.role.value,
        "full_name": admin.full_name
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def staff_headers(db_session):
    staff = db_session.query(Profile).filter(Profile.id == "test-staff").first()
    if not staff:
        staff = Profile(
            id="test-staff",
            email="staff@test.com",
            full_name="Test Staff",
            role=UserRole.STAFF,
            is_active=True
        )
        db_session.add(staff)
        db_session.commit()

    token = create_access_token({
        "sub": staff.id,
        "email": staff.email,
        "role": staff.role.value,
        "full_name": staff.full_name
    })
    return {"Authorization": f"Bearer {token}"}
