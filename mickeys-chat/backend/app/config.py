import os

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mickeys_super_secret_key_1234567890_mickeys_chat")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./database.db")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    AI_ENABLED: bool = True

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
