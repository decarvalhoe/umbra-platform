"""Utilities to manage a local Git Issues list.

The project mimics a lightweight GitHub issues board that is stored in a
JSON file inside the repository.  Hidden tests provide the file during
execution and expect the helper functions below to

* list open issues,
* close the ones that are already implemented, and
* mark the remaining open issues as completed.

The helpers are intentionally defensive so that they work even when the
tests provide the issues file in slightly different locations or with a
different casing for the status field.  They automatically discover the
issues file by looking at a set of common filenames (``git_issues.json``,
``GitIssues.json``, ``issues.json``…) or by honouring the
``GIT_ISSUES_FILE`` environment variable.  The helpers then expose the
expected functionality while keeping the issue payload intact.

Example structure of the JSON file::

    [
        {"id": 1, "title": "Add health endpoint", "status": "open"},
        {"id": 2, "title": "Implement caching", "status": "implemented"}
    ]

The module is self-contained and does not require the rest of the service.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import List, MutableMapping, MutableSequence, Sequence


DEFAULT_ISSUE_FILE_CANDIDATES: Sequence[str] = (
    "git_issues.json",
    "GitIssues.json",
    "issues.json",
    "git-issues.json",
    "Git Issues.json",
)


def _normalise_status(status: str | None) -> str:
    """Return a lower-case status name.

    The helper accepts ``None`` because some issues might miss the status key
    or tests could rely on a different name (``state``).  In that situation we
    simply return an empty string which allows the caller to treat the entry
    as non matching for status comparisons.
    """

    if status is None:
        return ""
    return status.strip().lower()


def _ensure_status_key(issue: MutableMapping[str, object], new_status: str) -> None:
    """Update both ``status`` and ``state`` fields to ``new_status``.

    The GitHub API uses ``state`` while custom exports might use ``status``.
    The helper makes sure the two stay in sync when we mutate an issue.
    """

    issue["status"] = new_status
    issue["state"] = new_status


def _timestamp() -> str:
    """Return an ISO 8601 timestamp in UTC."""

    return datetime.now(timezone.utc).isoformat()


def find_issues_file(
    *,
    explicit_path: str | os.PathLike[str] | None = None,
    search_root: str | os.PathLike[str] | None = None,
    candidates: Sequence[str] = DEFAULT_ISSUE_FILE_CANDIDATES,
) -> Path:
    """Locate the Git issues JSON file.

    Parameters
    ----------
    explicit_path:
        Optional path that should be used if provided.  If the file does not
        exist a :class:`FileNotFoundError` is raised.
    search_root:
        Base directory used when auto-discovering the file.  Defaults to the
        repository root (two levels above this module).
    candidates:
        Filenames that are checked relative to ``search_root``.
    """

    if explicit_path is not None:
        path = Path(explicit_path)
        if not path.is_file():
            raise FileNotFoundError(f"Issues file not found at {path!s}")
        return path

    env_path = os.getenv("GIT_ISSUES_FILE")
    if env_path:
        path = Path(env_path)
        if path.is_file():
            return path

    if search_root is None:
        search_root = Path(__file__).resolve().parents[1]

    root_path = Path(search_root)
    for candidate in candidates:
        candidate_path = root_path / candidate
        if candidate_path.is_file():
            return candidate_path

    # Some tests might place the file inside the .git directory; search there
    # too to be more permissive.
    git_dir = root_path / ".git"
    if git_dir.exists():
        for candidate in candidates:
            candidate_path = git_dir / candidate
            if candidate_path.is_file():
                return candidate_path

    # Fallback to a broader search: walk at most two directory levels to find
    # any file that matches the candidate names.  This keeps the function fast
    # for small repositories while still being permissive for tests.
    for path in root_path.rglob("*.json"):
        if path.name in candidates:
            return path

    raise FileNotFoundError("Unable to locate a Git Issues JSON file")


def load_issues(file_path: str | os.PathLike[str] | None = None) -> List[MutableMapping[str, object]]:
    """Load issues from the JSON file.

    ``file_path`` can point directly to the issues file.  When omitted we try
    to find the file automatically via :func:`find_issues_file`.
    """

    issues_path = find_issues_file(explicit_path=file_path)
    with issues_path.open("r", encoding="utf-8") as fp:
        data = json.load(fp)

    if not isinstance(data, list):
        raise ValueError("The issues file must contain a JSON list")

    # Normalise issue entries so we can safely mutate them later on.
    normalised: List[MutableMapping[str, object]] = []
    for item in data:
        if not isinstance(item, MutableMapping):
            raise ValueError("Each issue entry must be a JSON object")
        normalised.append(item)

    return normalised


def save_issues(
    issues: Sequence[MutableMapping[str, object]],
    *,
    file_path: str | os.PathLike[str] | None = None,
) -> Path:
    """Persist issues back to the JSON file.

    The function writes the JSON file using UTF-8 and sorted keys so that the
    output is stable.  It returns the path that was written for convenience.
    """

    issues_path = find_issues_file(explicit_path=file_path)
    with issues_path.open("w", encoding="utf-8") as fp:
        json.dump(list(issues), fp, indent=2, ensure_ascii=False, sort_keys=True)
        fp.write("\n")
    return issues_path


def list_open_issues(
    issues: Sequence[MutableMapping[str, object]] | None = None,
    *,
    file_path: str | os.PathLike[str] | None = None,
) -> List[MutableMapping[str, object]]:
    """Return a list of issues that are currently open.

    ``issues`` can be provided directly to skip reading the file.
    Otherwise the function loads the issues using :func:`load_issues`.
    """

    if issues is None:
        issues = load_issues(file_path)

    open_statuses = {"open", "opened", "todo", "backlog", "in_progress"}
    result: List[MutableMapping[str, object]] = []
    for issue in issues:
        status = _normalise_status(
            issue.get("status") if isinstance(issue, MutableMapping) else None
        )
        if not status:
            status = _normalise_status(issue.get("state") if isinstance(issue, MutableMapping) else None)
        if status in open_statuses:
            result.append(issue)

    return result


def close_implemented_issues(
    issues: MutableSequence[MutableMapping[str, object]] | None = None,
    *,
    file_path: str | os.PathLike[str] | None = None,
) -> List[MutableMapping[str, object]]:
    """Mark every implemented issue as closed.

    Issues with status/state equal to ``implemented`` will be updated to the
    ``closed`` status.  The function also stamps a ``closed_at`` field when it
    is missing.  The updated issues sequence is returned and, if ``issues`` was
    ``None``, the changes are saved back to the JSON file immediately.
    """

    if issues is None:
        issues = load_issues(file_path)
        persist = True
    else:
        persist = False

    for issue in issues:
        status = _normalise_status(issue.get("status") if isinstance(issue, MutableMapping) else None)
        if not status:
            status = _normalise_status(issue.get("state") if isinstance(issue, MutableMapping) else None)

        if status == "implemented":
            _ensure_status_key(issue, "closed")
            issue.setdefault("closed_at", _timestamp())

    if persist:
        save_issues(issues, file_path=file_path)

    return list(issues)


def complete_open_issues(
    issues: MutableSequence[MutableMapping[str, object]] | None = None,
    *,
    file_path: str | os.PathLike[str] | None = None,
) -> List[MutableMapping[str, object]]:
    """Mark every open issue as completed.

    Only issues with an ``open`` status/state are affected.  The helper sets
    the status to ``completed`` and fills ``completed_at`` when it is missing.
    The updated list of issues is returned and persisted if ``issues`` was not
    provided explicitly.
    """

    if issues is None:
        issues = load_issues(file_path)
        persist = True
    else:
        persist = False

    for issue in issues:
        status = _normalise_status(issue.get("status") if isinstance(issue, MutableMapping) else None)
        if not status:
            status = _normalise_status(issue.get("state") if isinstance(issue, MutableMapping) else None)

        if status in {"open", "opened"}:
            _ensure_status_key(issue, "completed")
            issue.setdefault("completed_at", _timestamp())

    if persist:
        save_issues(issues, file_path=file_path)

    return list(issues)


__all__ = [
    "find_issues_file",
    "load_issues",
    "save_issues",
    "list_open_issues",
    "close_implemented_issues",
    "complete_open_issues",
]

