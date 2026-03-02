"""Tests for the Celery Beat pool monitor task."""

import json
import time
from unittest.mock import patch, MagicMock

import pytest
import fakeredis

from app.tasks.pool_monitor import (
    monitor_pool_levels,
    _check_rate_limit,
    _increment_rate_counter,
    _update_monitor_meta,
    MONITOR_META_KEY,
    RATE_LIMIT_KEY,
    POOL_GENERATORS,
)
from app.config import settings


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_redis():
    """Create a fakeredis synchronous client."""
    r = fakeredis.FakeRedis(decode_responses=True)
    yield r
    r.close()


@pytest.fixture
def mock_generator():
    """Mock ContentGenerator that returns deterministic content."""
    gen = MagicMock()

    async def mock_quest(*args, **kwargs):
        result = MagicMock()
        result.model_dump.return_value = {
            "quest_id": "test-q-1",
            "title": "Test Quest",
            "description": "A test quest.",
            "objectives": ["Do thing"],
            "rewards": {"xp": 100},
            "difficulty": "easy",
        }
        return result

    async def mock_dungeon(*args, **kwargs):
        result = MagicMock()
        result.model_dump.return_value = {
            "layout_id": "test-d-1",
            "rooms": [{"id": "room_0"}],
            "enemies": [],
            "rune_placements": [],
            "corruption_effects": [],
        }
        return result

    async def mock_narrative(*args, **kwargs):
        result = MagicMock()
        result.model_dump.return_value = {
            "event_id": "test-n-1",
            "narrative": "Something happened.",
            "choices": [{"label": "Go", "consequence": "ok", "risk_level": "low"}],
        }
        return result

    gen.generate_quest = mock_quest
    gen.generate_dungeon = mock_dungeon
    gen.generate_narrative_event = mock_narrative
    return gen


# ---------------------------------------------------------------------------
# Rate limiting tests
# ---------------------------------------------------------------------------


class TestRateLimiting:
    def test_check_rate_limit_no_key(self, fake_redis):
        """When no rate counter exists, full limit is available."""
        remaining = _check_rate_limit(fake_redis, 10)
        assert remaining == 10

    def test_check_rate_limit_partial(self, fake_redis):
        """When counter exists, remaining is limit - counter."""
        fake_redis.set(RATE_LIMIT_KEY, "3")
        remaining = _check_rate_limit(fake_redis, 10)
        assert remaining == 7

    def test_check_rate_limit_exceeded(self, fake_redis):
        """When counter >= limit, remaining is 0."""
        fake_redis.set(RATE_LIMIT_KEY, "10")
        remaining = _check_rate_limit(fake_redis, 10)
        assert remaining == 0

    def test_check_rate_limit_over_limit(self, fake_redis):
        """When counter > limit, remaining is still 0 (not negative)."""
        fake_redis.set(RATE_LIMIT_KEY, "15")
        remaining = _check_rate_limit(fake_redis, 10)
        assert remaining == 0

    def test_increment_rate_counter(self, fake_redis):
        """Incrementing counter sets value and TTL."""
        _increment_rate_counter(fake_redis)
        assert fake_redis.get(RATE_LIMIT_KEY) == "1"
        assert fake_redis.ttl(RATE_LIMIT_KEY) > 0

        _increment_rate_counter(fake_redis)
        assert fake_redis.get(RATE_LIMIT_KEY) == "2"


# ---------------------------------------------------------------------------
# Monitor metadata tests
# ---------------------------------------------------------------------------


class TestMonitorMetadata:
    def test_update_monitor_meta(self, fake_redis):
        """Metadata is stored correctly in Redis hash."""
        _update_monitor_meta(fake_redis, "pool:quests:easy", 3)

        meta = fake_redis.hgetall(MONITOR_META_KEY)
        assert "pool:quests:easy:last_generation_time" in meta
        assert meta["pool:quests:easy:total_generated"] == "3"
        assert "last_run_time" in meta

        # Calling again increments total
        _update_monitor_meta(fake_redis, "pool:quests:easy", 2)
        meta = fake_redis.hgetall(MONITOR_META_KEY)
        assert meta["pool:quests:easy:total_generated"] == "5"


# ---------------------------------------------------------------------------
# Pool monitor task integration tests
# ---------------------------------------------------------------------------


class TestMonitorPoolLevels:
    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_all_pools_full_no_generation(self, mock_get_gen, mock_get_redis, fake_redis):
        """When all pools are at threshold, no generation should occur."""
        mock_get_redis.return_value = fake_redis

        # Pre-fill all pools to their thresholds
        thresholds = settings.get_pool_thresholds()
        for pool_key, threshold in thresholds.items():
            for i in range(threshold):
                item = json.dumps({"content": {"id": i}, "created_at": time.time()})
                fake_redis.lpush(pool_key, item)

        result = monitor_pool_levels()

        assert result["total_generated"] == 0
        for pool_key, report in result["pools"].items():
            assert report["deficit"] == 0
            assert report["generated"] == 0

        # Generator should never be called
        mock_get_gen.assert_not_called()

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_empty_pools_trigger_generation(self, mock_get_gen, mock_get_redis, fake_redis, mock_generator):
        """When pools are empty, generator is invoked to fill them."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        result = monitor_pool_levels()

        assert result["total_generated"] > 0
        # At least one pool should have generated items
        generated_any = any(
            report["generated"] > 0 for report in result["pools"].values()
        )
        assert generated_any

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_rate_limit_caps_generation(self, mock_get_gen, mock_get_redis, fake_redis, mock_generator):
        """Generation stops when rate limit is reached."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Set rate limit to 3
        with patch.object(settings, "pool_generation_rate_limit", 3):
            result = monitor_pool_levels()

        assert result["total_generated"] <= 3

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_rate_limit_already_exhausted(self, mock_get_gen, mock_get_redis, fake_redis, mock_generator):
        """When rate limit is already maxed, no generation occurs."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Pre-exhaust rate limit
        fake_redis.set(RATE_LIMIT_KEY, str(settings.pool_generation_rate_limit))

        result = monitor_pool_levels()

        assert result["total_generated"] == 0

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_partial_pool_fills_deficit_only(self, mock_get_gen, mock_get_redis, fake_redis, mock_generator):
        """A pool with 3/5 items only generates 2 more."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Fill all pools to threshold except dungeons:10room (threshold=5, fill 3)
        thresholds = settings.get_pool_thresholds()
        for pool_key, threshold in thresholds.items():
            fill_count = threshold if pool_key != "pool:dungeons:10room" else 3
            for i in range(fill_count):
                item = json.dumps({"content": {"id": i}, "created_at": time.time()})
                fake_redis.lpush(pool_key, item)

        result = monitor_pool_levels()

        # Only dungeons:10room should have generated items
        assert result["pools"]["pool:dungeons:10room"]["deficit"] == 2
        assert result["pools"]["pool:dungeons:10room"]["generated"] == 2
        assert result["total_generated"] == 2

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_generation_failure_continues_to_next_pool(
        self, mock_get_gen, mock_get_redis, fake_redis
    ):
        """If generation fails for one pool, other pools still get processed."""
        mock_get_redis.return_value = fake_redis

        # Create a generator that fails for quests but works for others
        gen = MagicMock()

        async def failing_quest(*a, **kw):
            raise RuntimeError("LLM down")

        async def ok_dungeon(*a, **kw):
            result = MagicMock()
            result.model_dump.return_value = {"layout_id": "test", "rooms": []}
            return result

        async def ok_narrative(*a, **kw):
            result = MagicMock()
            result.model_dump.return_value = {"event_id": "test", "narrative": "ok", "choices": []}
            return result

        gen.generate_quest = failing_quest
        gen.generate_dungeon = ok_dungeon
        gen.generate_narrative_event = ok_narrative
        mock_get_gen.return_value = gen

        result = monitor_pool_levels()

        # Quest pools failed, but dungeons and narratives should have generated
        assert result["pools"]["pool:quests:easy"]["generated"] == 0
        assert result["pools"]["pool:quests:medium"]["generated"] == 0
        # At least one non-quest pool should succeed (if rate limit allows)
        non_quest_generated = sum(
            report["generated"]
            for key, report in result["pools"].items()
            if "quests" not in key
        )
        assert non_quest_generated > 0

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_metadata_updated_after_generation(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Monitor metadata is stored in Redis after generation."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Set a very low rate limit so we generate few items
        with patch.object(settings, "pool_generation_rate_limit", 2):
            monitor_pool_levels()

        meta = fake_redis.hgetall(MONITOR_META_KEY)
        assert "last_run_time" in meta
        assert float(meta["last_run_time"]) > 0

    @patch("app.tasks.pool_monitor._get_sync_redis")
    @patch("app.tasks.pool_monitor._get_generator")
    def test_items_stored_in_correct_format(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Generated items are stored with the same JSON envelope as ContentPool.push."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Only fill dungeon:10room deficit (threshold 5) with low rate
        thresholds = settings.get_pool_thresholds()
        for pool_key, threshold in thresholds.items():
            if pool_key != "pool:dungeons:10room":
                for i in range(threshold):
                    item = json.dumps({"content": {"id": i}, "created_at": time.time()})
                    fake_redis.lpush(pool_key, item)

        with patch.object(settings, "pool_generation_rate_limit", 1):
            monitor_pool_levels()

        # Verify the stored item format
        raw = fake_redis.rpop("pool:dungeons:10room")
        assert raw is not None
        parsed = json.loads(raw)
        assert "content" in parsed
        assert "created_at" in parsed
        assert isinstance(parsed["created_at"], float)


# ---------------------------------------------------------------------------
# Pool generator coverage tests
# ---------------------------------------------------------------------------


class TestPoolGenerators:
    def test_all_pool_keys_have_generators(self):
        """Every pool in POOL_CONFIG has a corresponding generator function."""
        from app.services.content_pool import ContentPool

        for pool_key in ContentPool.POOL_CONFIG:
            assert pool_key in POOL_GENERATORS, (
                f"Missing generator for pool {pool_key}"
            )


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------


class TestPoolMonitorConfig:
    def test_default_thresholds_match_pool_config(self):
        """Default threshold settings match ContentPool.POOL_CONFIG min_sizes."""
        from app.services.content_pool import ContentPool

        thresholds = settings.get_pool_thresholds()
        for pool_key, config in ContentPool.POOL_CONFIG.items():
            assert pool_key in thresholds
            assert thresholds[pool_key] == config["min_size"]

    def test_default_interval(self):
        """Default monitor interval is 60 seconds."""
        assert settings.pool_monitor_interval_seconds == 60

    def test_default_rate_limit(self):
        """Default rate limit is 10 generations per minute."""
        assert settings.pool_generation_rate_limit == 10
