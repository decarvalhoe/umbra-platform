"""Tests for the content pre-generation Celery tasks."""

import json
import time
from unittest.mock import patch, MagicMock

import pytest
import fakeredis

from app.tasks.pool_generation import (
    generate_and_store,
    batch_generate_pool,
    generate_on_demand,
    POOL_GENERATORS,
    CONTENT_TYPE_TO_POOL_KEY,
)
from app.tasks.pool_monitor import MONITOR_META_KEY, RATE_LIMIT_KEY
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
# Content type mapping tests
# ---------------------------------------------------------------------------


class TestContentTypeMapping:
    def test_all_content_types_map_to_valid_pool_keys(self):
        """Every content type maps to a pool key that has a generator."""
        for content_type, pool_key in CONTENT_TYPE_TO_POOL_KEY.items():
            assert pool_key in POOL_GENERATORS, (
                f"Content type {content_type} maps to {pool_key} "
                f"which has no generator"
            )

    def test_all_pool_keys_have_content_types(self):
        """Every pool generator has a corresponding content type shorthand."""
        pool_keys_with_types = set(CONTENT_TYPE_TO_POOL_KEY.values())
        for pool_key in POOL_GENERATORS:
            assert pool_key in pool_keys_with_types, (
                f"Pool {pool_key} has no content type mapping"
            )


# ---------------------------------------------------------------------------
# generate_and_store task tests
# ---------------------------------------------------------------------------


class TestGenerateAndStore:
    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_generates_and_stores_single_item(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Task generates one item and pushes it to the Redis pool."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        result = generate_and_store("pool:quests:easy")

        assert result["pool_key"] == "pool:quests:easy"
        assert result["generated"] is True
        assert "content" in result

        # Verify item is in Redis
        assert fake_redis.llen("pool:quests:easy") == 1
        raw = fake_redis.rpop("pool:quests:easy")
        parsed = json.loads(raw)
        assert "content" in parsed
        assert "created_at" in parsed

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_rate_limit_prevents_generation(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """When rate limit is exhausted, no generation occurs."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Exhaust rate limit
        fake_redis.set(RATE_LIMIT_KEY, str(settings.pool_generation_rate_limit))

        result = generate_and_store("pool:quests:easy")

        assert result["generated"] is False
        assert result["reason"] == "rate_limit_exceeded"
        assert fake_redis.llen("pool:quests:easy") == 0

    def test_invalid_pool_key_raises(self):
        """Task raises ValueError for unknown pool key."""
        with pytest.raises(ValueError, match="No generator registered"):
            generate_and_store("pool:unknown:type")

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_increments_rate_counter(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Task increments the rate limit counter after generation."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        generate_and_store("pool:quests:easy")

        counter = fake_redis.get(RATE_LIMIT_KEY)
        assert counter == "1"

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_updates_monitor_metadata(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Task updates pool monitor metadata after generation."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        generate_and_store("pool:quests:easy")

        meta = fake_redis.hgetall(MONITOR_META_KEY)
        assert "pool:quests:easy:last_generation_time" in meta
        assert meta["pool:quests:easy:total_generated"] == "1"


# ---------------------------------------------------------------------------
# batch_generate_pool task tests
# ---------------------------------------------------------------------------


class TestBatchGeneratePool:
    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_fills_pool_to_threshold(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Batch task fills an empty pool up to its threshold."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # dungeons:10room has threshold of 5
        result = batch_generate_pool("pool:dungeons:10room")

        assert result["pool_key"] == "pool:dungeons:10room"
        assert result["generated"] == 5
        assert result["current_size"] == 5
        assert result["threshold"] == 5

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_partial_fill_only_generates_deficit(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Batch task only generates items for the deficit, not the full threshold."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Pre-fill with 3 items (threshold is 5)
        for i in range(3):
            item = json.dumps({"content": {"id": i}, "created_at": time.time()})
            fake_redis.lpush("pool:dungeons:10room", item)

        result = batch_generate_pool("pool:dungeons:10room")

        assert result["generated"] == 2
        assert result["current_size"] == 5

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_full_pool_generates_nothing(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Batch task does not generate when pool is already at threshold."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        # Fill to threshold (5)
        for i in range(5):
            item = json.dumps({"content": {"id": i}, "created_at": time.time()})
            fake_redis.lpush("pool:dungeons:10room", item)

        result = batch_generate_pool("pool:dungeons:10room")

        assert result["generated"] == 0
        assert result["reason"] == "pool_at_threshold"

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_explicit_count_overrides_deficit(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """When count is specified, generates exactly that many items."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        result = batch_generate_pool("pool:dungeons:10room", count=2)

        assert result["generated"] == 2
        assert result["requested"] == 2

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_rate_limit_caps_batch(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Batch generation stops when rate limit is reached."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        with patch.object(settings, "pool_generation_rate_limit", 2):
            # quests:easy has threshold 20, so deficit is 20, but rate limit is 2
            result = batch_generate_pool("pool:quests:easy")

        assert result["generated"] <= 2

    def test_invalid_pool_key_raises(self):
        """Batch task raises ValueError for unknown pool key."""
        with pytest.raises(ValueError, match="No generator registered"):
            batch_generate_pool("pool:unknown:type")

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_generation_failure_stops_batch(
        self, mock_get_gen, mock_get_redis, fake_redis
    ):
        """If generation fails, batch stops and returns partial result."""
        mock_get_redis.return_value = fake_redis

        gen = MagicMock()
        call_count = 0

        async def failing_after_two(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count > 2:
                raise RuntimeError("LLM down")
            result = MagicMock()
            result.model_dump.return_value = {
                "layout_id": "test",
                "rooms": [],
                "enemies": [],
                "rune_placements": [],
                "corruption_effects": [],
            }
            return result

        gen.generate_dungeon = failing_after_two
        mock_get_gen.return_value = gen

        result = batch_generate_pool("pool:dungeons:10room")

        assert result["generated"] == 2

    @patch("app.tasks.pool_generation._get_sync_redis")
    @patch("app.tasks.pool_generation._get_generator")
    def test_items_stored_in_correct_format(
        self, mock_get_gen, mock_get_redis, fake_redis, mock_generator
    ):
        """Batch items use the same JSON envelope as ContentPool.push."""
        mock_get_redis.return_value = fake_redis
        mock_get_gen.return_value = mock_generator

        batch_generate_pool("pool:dungeons:10room", count=1)

        raw = fake_redis.rpop("pool:dungeons:10room")
        assert raw is not None
        parsed = json.loads(raw)
        assert "content" in parsed
        assert "created_at" in parsed
        assert isinstance(parsed["created_at"], float)


# ---------------------------------------------------------------------------
# generate_on_demand task tests
# ---------------------------------------------------------------------------


class TestGenerateOnDemand:
    @patch("app.tasks.pool_generation._get_generator")
    def test_returns_content_without_storing(self, mock_get_gen, mock_generator):
        """On-demand task returns content but does not push to pool."""
        mock_get_gen.return_value = mock_generator

        result = generate_on_demand("pool:quests:easy")

        assert result["pool_key"] == "pool:quests:easy"
        assert result["source"] == "on_demand"
        assert "content" in result

    def test_invalid_pool_key_raises(self):
        """On-demand task raises ValueError for unknown pool key."""
        with pytest.raises(ValueError, match="No generator registered"):
            generate_on_demand("pool:unknown:type")

    @patch("app.tasks.pool_generation._get_generator")
    def test_returns_correct_content_structure(self, mock_get_gen, mock_generator):
        """On-demand quest has expected fields."""
        mock_get_gen.return_value = mock_generator

        result = generate_on_demand("pool:quests:easy")

        content = result["content"]
        assert "quest_id" in content
        assert "title" in content

    @patch("app.tasks.pool_generation._get_generator")
    def test_dungeon_on_demand(self, mock_get_gen, mock_generator):
        """On-demand dungeon generation works."""
        mock_get_gen.return_value = mock_generator

        result = generate_on_demand("pool:dungeons:5room")

        assert result["source"] == "on_demand"
        assert "layout_id" in result["content"]

    @patch("app.tasks.pool_generation._get_generator")
    def test_narrative_on_demand(self, mock_get_gen, mock_generator):
        """On-demand narrative generation works."""
        mock_get_gen.return_value = mock_generator

        result = generate_on_demand("pool:narratives:choice")

        assert result["source"] == "on_demand"
        assert "event_id" in result["content"]
