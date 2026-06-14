import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Adjust path to import backend app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db
from app.main import fastapi_app, app

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db

client = TestClient(fastapi_app)

@pytest.fixture(autouse=True)
def setup_db():
    # Setup tables
    Base.metadata.create_all(bind=engine)
    yield
    # Teardown tables
    Base.metadata.drop_all(bind=engine)
    engine.dispose()  # Dispose connection pool to release file lock on Windows
    # Clean up test.db file if it exists
    if os.path.exists("./test.db"):
        os.remove("./test.db")

def test_register_and_login():
    # Register user
    reg_response = client.post(
        "/api/auth/register",
        json={"username": "mickey_mouse", "email": "mickey@disney.com", "password": "mickeypassword123"}
    )
    assert reg_response.status_code == 201
    assert reg_response.json()["username"] == "mickey_mouse"
    assert reg_response.json()["email"] == "mickey@disney.com"

    # Login user
    login_response = client.post(
        "/api/auth/login",
        json={"username_or_email": "mickey_mouse", "password": "mickeypassword123"}
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    token = login_response.json()["access_token"]

    # Access protected profile
    profile_response = client.get(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["username"] == "mickey_mouse"
