import pytest

from app.services.anomaly_detector import AnomalyDetector
from app.models.schemas import AnomalyEvalRequest


class TestDetectionThresholds:
    """Test anomaly detection heuristics and scoring."""

    def setup_method(self):
        self.detector = AnomalyDetector()

    def test_clean_session_not_suspicious(self):
        request = AnomalyEvalRequest(
            session_stats={
                "apm": 120,
                "kd_ratio": 2.0,
                "accuracy": 0.65,
                "headshot_ratio": 0.20,
                "dps": 3000,
                "session_duration": 1800,
                "resource_rate": 200,
            }
        )
        result = self.detector.evaluate(request)
        assert result.is_suspicious is False
        assert result.score < 0.4

    def test_obvious_cheater_flagged(self):
        request = AnomalyEvalRequest(
            session_stats={
                "apm": 500,          # > 280 -> 0.20
                "kd_ratio": 20.0,    # > 6   -> 0.15
                "accuracy": 0.99,    # > 0.96 -> 0.20
                "headshot_ratio": 0.95,  # > 0.85 -> 0.15
                "dps": 15000,        # > 10000 -> 0.10
                "session_duration": 30,  # < 60 -> 0.10
                "resource_rate": 2000,   # > 1000 -> 0.10
            }
        )
        result = self.detector.evaluate(request)
        assert result.is_suspicious is True
        assert result.score == 1.0  # All checks triggered

    def test_borderline_not_suspicious(self):
        """Score just below threshold should not be flagged."""
        request = AnomalyEvalRequest(
            session_stats={
                "apm": 300,          # > 280 -> 0.20
                "kd_ratio": 2.0,     # normal
                "accuracy": 0.50,    # normal
                "headshot_ratio": 0.90,  # > 0.85 -> 0.15
                "dps": 3000,         # normal
                "session_duration": 1800,  # normal
                "resource_rate": 200,  # normal
            }
        )
        result = self.detector.evaluate(request)
        # APM (0.20) + headshot (0.15) = 0.35 < 0.40
        assert result.is_suspicious is False
        assert result.score == pytest.approx(0.35)

    def test_at_threshold_is_suspicious(self):
        """Score at exactly 0.40 should be flagged."""
        request = AnomalyEvalRequest(
            session_stats={
                "apm": 300,          # > 280 -> 0.20
                "kd_ratio": 2.0,     # normal
                "accuracy": 0.97,    # > 0.96 -> 0.20
                "headshot_ratio": 0.50,  # normal
                "dps": 3000,         # normal
                "session_duration": 1800,  # normal
                "resource_rate": 200,  # normal
            }
        )
        result = self.detector.evaluate(request)
        # APM (0.20) + accuracy (0.20) = 0.40 >= 0.40
        assert result.is_suspicious is True
        assert result.score == pytest.approx(0.40)

    def test_missing_stats_handled(self):
        request = AnomalyEvalRequest(session_stats={})
        result = self.detector.evaluate(request)
        assert result.is_suspicious is False
        assert result.score == 0.0
        assert len(result.checks) == 7  # All checks reported


@pytest.mark.anyio
async def test_evaluate_endpoint(client):
    payload = {
        "session_stats": {
            "apm": 500,
            "kd_ratio": 20.0,
            "accuracy": 0.99,
            "headshot_ratio": 0.95,
            "dps": 15000,
            "session_duration": 30,
            "resource_rate": 2000,
        }
    }
    response = await client.post("/api/v1/anomaly/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_suspicious"] is True
    assert data["score"] == 1.0
    assert len(data["checks"]) == 7
