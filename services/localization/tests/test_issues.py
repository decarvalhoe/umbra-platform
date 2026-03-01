"""Tests for the Git issues helper module."""
from pathlib import Path

import json

import pytest

from src import issues as issues_module
from src.issues import (
    Issue,
    close_implemented_issues,
    complete_issue,
    list_open_issues,
    load_issues,
    save_issues,
    summarize_open_issues,
)


@pytest.fixture
def sample_issues(tmp_path: Path) -> list[Issue]:
    payload = [
        {
            'id': 1,
            'title': 'Already implemented feature',
            'status': 'open',
            'implemented': True,
            'priority': 'P1'
        },
        {
            'id': 2,
            'title': 'Missing functionality',
            'status': 'open',
            'implemented': False,
            'priority': 'P2'
        }
    ]
    issues_path = tmp_path / 'issues.json'
    issues_path.write_text(json.dumps(payload), encoding='utf-8')

    original_path = issues_module.ISSUES_FILE
    issues_module.ISSUES_FILE = issues_path
    try:
        yield load_issues(issues_path)
    finally:
        issues_module.ISSUES_FILE = original_path


def test_list_open_issues_filters_by_status(sample_issues):
    open_issues = list_open_issues(sample_issues)
    assert len(open_issues) == 2
    assert all(issue.status == 'open' for issue in open_issues)


def test_close_implemented_issues_marks_entries(sample_issues):
    closed = close_implemented_issues(sample_issues)
    issue_one = next(issue for issue in closed if issue.id == 1)
    assert issue_one.status == 'closed'
    assert issue_one.implemented is True


def test_complete_issue_updates_note(sample_issues):
    closed = complete_issue(sample_issues, issue_id=2, note='Implemented during tests')
    issue_two = next(issue for issue in closed if issue.id == 2)
    assert issue_two.status == 'closed'
    assert issue_two.notes == 'Implemented during tests'


def test_summarize_open_issues_handles_empty_list(sample_issues):
    all_closed = close_implemented_issues(sample_issues)
    all_closed = complete_issue(all_closed, issue_id=2)
    summary = summarize_open_issues(all_closed)
    assert summary == 'No open issues 🎉'


def test_save_and_load_roundtrip(tmp_path: Path, sample_issues):
    output_path = tmp_path / 'saved.json'
    save_issues(sample_issues, output_path)
    reloaded = load_issues(output_path)
    assert [(issue.id, issue.status) for issue in reloaded] == [
        (issue.id, issue.status) for issue in sample_issues
    ]
