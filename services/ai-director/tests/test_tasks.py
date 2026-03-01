import pytest
from app.tasks.generation import ping


def test_ping_task():
    """Test that the ping task returns pong synchronously."""
    result = ping()
    assert result == "pong"
