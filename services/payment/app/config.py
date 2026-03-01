from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    payment_database_url: str = "sqlite+aiosqlite:///./test.db"
    redis_url: str = "redis://localhost:6379/3"
    frontend_url: str = "http://localhost:3000"
    battlepass_season_weeks: int = 10
    service_port: int = 8003
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
