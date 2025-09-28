"""Tests for the issue tracker helper functions."""

from src.issue_tracker import (
    close_implemented_issues,
    complete_open_issues,
    list_open_issues,
)


def _sample_issues():
    return [
        {
            "id": 1,
            "title": "Implement health endpoint",
            "state": "open",
            "implemented": True,
            "labels": ["feature", "implemented"],
        },
        {
            "id": 2,
            "title": "Add leaderboard",
            "status": "open",
            "labels": ["feature"],
        },
        {
            "id": 3,
            "title": "Fix typo",
            "state": "closed",
        },
    ]


def test_list_open_issues_filters_only_open_items():
    issues = _sample_issues()

    open_issues = list_open_issues(issues)

    assert [issue["id"] for issue in open_issues] == [1, 2]


def test_close_implemented_issues_marks_items_closed():
    issues = _sample_issues()

    closed = close_implemented_issues(issues)

    assert [issue["id"] for issue in closed] == [1]
    assert issues[0]["state"] == "closed"
    assert issues[0]["completed"] is True


def test_complete_open_issues_marks_remaining_open_items():
    issues = _sample_issues()
    close_implemented_issues(issues)

    completed = complete_open_issues(issues)

    assert [issue["id"] for issue in completed] == [2]
    assert issues[1]["status"] == "completed"
    assert issues[1]["completed"] is True

