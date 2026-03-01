"""Tests for the Git issues helper module."""

import json
from pathlib import Path

import pytest

from src import git_issues


@pytest.fixture()
def issues_file(tmp_path: Path) -> Path:
    data = [
        {"id": 1, "title": "First", "status": "open"},
        {"id": 2, "title": "Second", "status": "implemented"},
        {"id": 3, "title": "Third", "state": "closed"},
    ]
    path = tmp_path / "git_issues.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def test_list_open_issues(issues_file: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GIT_ISSUES_FILE", str(issues_file))
    open_issues = git_issues.list_open_issues()

    assert [issue["id"] for issue in open_issues] == [1]


def test_close_implemented_issues(issues_file: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GIT_ISSUES_FILE", str(issues_file))

    issues = git_issues.close_implemented_issues()

    implemented = next(issue for issue in issues if issue["id"] == 2)
    assert implemented["status"] == "closed"
    assert implemented["state"] == "closed"
    assert "closed_at" in implemented


def test_complete_open_issues(issues_file: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GIT_ISSUES_FILE", str(issues_file))

    issues = git_issues.complete_open_issues()
    open_issue = next(issue for issue in issues if issue["id"] == 1)

    assert open_issue["status"] == "completed"
    assert open_issue["state"] == "completed"
    assert "completed_at" in open_issue
