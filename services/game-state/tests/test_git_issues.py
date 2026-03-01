import pytest

from src.git_issues import (
    IssueNotFoundError,
    close_implemented_issues,
    close_issue,
    complete_issue,
    complete_open_issues,
    list_open_issues,
)


def sample_issues():
    return [
        {"number": 1, "title": "Bootstrap project", "state": "closed"},
        {"number": 2, "title": "Add /health endpoint", "state": "open"},
        {"number": 3, "title": "Persist game state", "status": "in_progress"},
        {"id": 4, "title": "Add achievements", "closed": False},
    ]


def test_list_open_issues_returns_only_non_closed_entries():
    issues = sample_issues()
    open_issues = list_open_issues(issues)

    assert [issue["number"] for issue in open_issues] == [2, 3, 4]
    # Changing the copy must not alter the original issue payload.
    open_issues[0]["state"] = "closed"
    assert issues[1]["state"] == "open"


def test_close_issue_updates_state_and_status_fields():
    issues = sample_issues()
    closed = close_issue(issues, 2)

    assert closed["state"] == "closed"
    assert closed["status"] == "closed"
    assert closed["closed"] is True


def test_close_issue_raises_error_when_identifier_unknown():
    issues = sample_issues()

    with pytest.raises(IssueNotFoundError):
        close_issue(issues, 999)


def test_complete_issue_marks_completed_and_closes():
    issues = sample_issues()
    completed = complete_issue(issues, 3)

    assert completed["completed"] is True
    assert completed["state"] == "closed"


def test_close_implemented_issues_ignores_unknown_numbers():
    issues = sample_issues()
    closed = close_implemented_issues(issues, [2, 999])

    assert [issue["state"] for issue in closed] == ["closed"]
    assert issues[1]["state"] == "closed"


def test_complete_open_issues_without_argument_closes_everything():
    issues = sample_issues()
    completed = complete_open_issues(issues)

    completed_numbers = sorted(issue["number"] for issue in completed)
    assert completed_numbers == [2, 3, 4]
    assert issues[1]["completed"] and issues[2]["completed"] and issues[3]["completed"]


def test_complete_open_issues_with_subset_only_updates_selected():
    issues = sample_issues()
    completed = complete_open_issues(issues, issue_numbers=[3])

    assert [issue["number"] for issue in completed] == [3]
    assert issues[2]["completed"] is True
    # Issue #2 remains open because it was not part of the explicit list.
    assert issues[1]["state"] == "open"
