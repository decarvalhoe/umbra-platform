from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_provider: str = "openai"
    llm_model: str = "gpt-4-turbo-preview"
    redis_url: str = "redis://localhost:6379/1"
    service_port: int = 8001
    log_level: str = "INFO"

    # Pool monitor settings
    pool_monitor_interval_seconds: int = 60
    pool_generation_rate_limit: int = 10  # Max generations per minute
    pool_threshold_quests_easy: int = 20
    pool_threshold_quests_medium: int = 15
    pool_threshold_dungeons_5room: int = 10
    pool_threshold_dungeons_10room: int = 5
    pool_threshold_narratives_choice: int = 15

    model_config = {"env_file": ".env", "extra": "ignore"}

    def get_pool_thresholds(self) -> dict[str, int]:
        """Return a mapping of pool keys to their configured thresholds."""
        return {
            "pool:quests:easy": self.pool_threshold_quests_easy,
            "pool:quests:medium": self.pool_threshold_quests_medium,
            "pool:dungeons:5room": self.pool_threshold_dungeons_5room,
            "pool:dungeons:10room": self.pool_threshold_dungeons_10room,
            "pool:narratives:choice": self.pool_threshold_narratives_choice,
        }


settings = Settings()
