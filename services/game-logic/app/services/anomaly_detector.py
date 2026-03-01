from app.models.schemas import AnomalyEvalRequest, AnomalyEvalResponse


class AnomalyDetector:
    """Server-side anomaly detection mirroring the Nakama RPC checks.

    Uses 7 weighted heuristic checks to flag suspicious player sessions.
    Threshold for flagging: cumulative score >= 0.4.
    """

    SUSPICIOUS_THRESHOLD = 0.4

    # Each check: (stat_key, threshold, operator, weight, description)
    CHECKS: list[tuple[str, float, str, float, str]] = [
        ("apm", 280.0, "gt", 0.20, "Actions per minute exceeds 280"),
        ("kd_ratio", 6.0, "gt", 0.15, "Kill/death ratio exceeds 6.0"),
        ("accuracy", 0.96, "gt", 0.20, "Accuracy exceeds 96%"),
        ("headshot_ratio", 0.85, "gt", 0.15, "Headshot ratio exceeds 85%"),
        ("dps", 10000.0, "gt", 0.10, "DPS exceeds 10,000"),
        ("session_duration", 60.0, "lt", 0.10, "Session duration under 60 seconds"),
        ("resource_rate", 1000.0, "gt", 0.10, "Resource acquisition exceeds 1,000/min"),
    ]

    def evaluate(self, request: AnomalyEvalRequest) -> AnomalyEvalResponse:
        """Evaluate a session's stats against anomaly heuristics."""
        stats = request.session_stats
        total_score = 0.0
        check_results: list[dict] = []

        for stat_key, threshold, operator, weight, description in self.CHECKS:
            value = stats.get(stat_key)
            if value is None:
                check_results.append(
                    {
                        "check": stat_key,
                        "triggered": False,
                        "weight": weight,
                        "reason": f"Missing stat: {stat_key}",
                    }
                )
                continue

            value = float(value)
            if operator == "gt":
                triggered = value > threshold
            elif operator == "lt":
                triggered = value < threshold
            else:
                triggered = False

            if triggered:
                total_score += weight

            check_results.append(
                {
                    "check": stat_key,
                    "triggered": triggered,
                    "value": value,
                    "threshold": threshold,
                    "weight": weight,
                    "reason": description if triggered else "Within normal range",
                }
            )

        return AnomalyEvalResponse(
            is_suspicious=total_score >= self.SUSPICIOUS_THRESHOLD,
            score=round(total_score, 4),
            checks=check_results,
        )
