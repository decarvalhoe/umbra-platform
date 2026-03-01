"""Utilities to inspect and update the local Git issues list.

This module provides helper functions that read the mocked Git Issues
list stored in :mod:`data/git_issues.json`. It is intentionally small and
framework agnostic so that the logic can be reused both by the Flask
application and command-line scripts.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Sequence
import json

BASE_DIR = Path(__file__).resolve().parent.parent
ISSUES_FILE = BASE_DIR / 'data' / 'git_issues.json'


@dataclass
class Issue:
    """Representation of a Git issue entry."""

    id: int
    title: str
    status: str
    implemented: bool
    description: str | None = None
    notes: str | None = None
    priority: str | None = None

    @property
    def is_open(self) -> bool:
        """Return ``True`` when the issue is still open."""

        return self.status.lower() == 'open'

    def close(self, note: str | None = None) -> None:
        """Mark the issue as closed and optionally append a note."""

        self.status = 'closed'
        self.implemented = True
        if note:
            self.notes = note


def load_issues(path: Path = ISSUES_FILE) -> List[Issue]:
    """Load issues from ``path``.

    Parameters
    ----------
    path:
        Path to the JSON file storing the issues list.
    """

    with path.open('r', encoding='utf-8') as handle:
        payload = json.load(handle)
    return [Issue(**item) for item in payload]


def save_issues(issues: Sequence[Issue], path: Path = ISSUES_FILE) -> None:
    """Persist ``issues`` into ``path`` in JSON format."""

    serializable = [asdict(issue) for issue in issues]
    with path.open('w', encoding='utf-8') as handle:
        json.dump(serializable, handle, indent=2, ensure_ascii=False)


def list_open_issues(issues: Iterable[Issue]) -> List[Issue]:
    """Return a list containing only open issues."""

    return [issue for issue in issues if issue.is_open]


def close_implemented_issues(issues: Sequence[Issue]) -> List[Issue]:
    """Close every issue that is already implemented.

    The function mutates a shallow copy of ``issues`` to avoid side
    effects when the caller still needs the original list.
    """

    updated = [Issue(**asdict(issue)) for issue in issues]
    for issue in updated:
        if issue.implemented and issue.is_open:
            issue.close(note='Automatically closed because implementation exists.')
    return updated


def complete_issue(issues: Sequence[Issue], issue_id: int, note: str | None = None) -> List[Issue]:
    """Mark the issue identified by ``issue_id`` as completed.

    The function returns a new list where the targeted issue is updated.
    """

    updated = [Issue(**asdict(issue)) for issue in issues]
    for issue in updated:
        if issue.id == issue_id:
            issue.close(note=note)
            break
    else:  # pragma: no cover - defensive branch
        raise ValueError(f'Issue {issue_id} not found')
    return updated


def summarize_open_issues(issues: Sequence[Issue]) -> str:
    """Produce a human readable summary of open issues."""

    open_issues = list_open_issues(issues)
    if not open_issues:
        return 'No open issues 🎉'

    lines = ['Open issues:']
    for issue in open_issues:
        parts = [f"#{issue.id}", issue.title]
        if issue.priority:
            parts.append(f'[{issue.priority}]')
        lines.append(' - ' + ' '.join(parts))
    return '\n'.join(lines)


def close_and_complete_all(path: Path = ISSUES_FILE) -> List[Issue]:
    """Utility used by maintenance scripts.

    Loads the issues file, closes issues already implemented and persists
    the result. This mirrors the manual workflow requested in the task
    description.
    """

    issues = load_issues(path)
    closed = close_implemented_issues(issues)
    save_issues(closed, path)
    return closed


if __name__ == '__main__':  # pragma: no cover - manual usage helper
    issues = load_issues()
    print(summarize_open_issues(issues))
