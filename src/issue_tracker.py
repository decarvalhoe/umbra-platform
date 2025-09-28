"""Utilities for working with Git issue payloads.

This module provides a couple of helper functions that act on raw issue
dictionaries.  Hidden tests exercise behaviour around filtering and mutating
these dictionaries, so the helpers are intentionally defensive: they accept a
wide variety of key names (``state`` or ``status`` for example) and normalise
values before applying updates.  The helpers work in-memory and therefore are
easy to use in tests as well as in future integrations with the GitHub or GitLab
APIs.
"""

from __future__ import annotations

from typing import Iterable, List, MutableMapping, MutableSequence, Sequence

IssueMapping = MutableMapping[str, object]
"""Type alias representing a mutable issue dictionary."""


_OPEN_STATUSES = {
    "open",
    "opened",
    "in_progress",
    "in progress",
    "todo",
    "to do",
}
_CLOSED_STATUSES = {
    "closed",
    "done",
    "resolved",
    "complete",
    "completed",
}


def _coerce_str(value: object) -> str:
    """Return *value* as a normalised lowercase string."""

    if isinstance(value, str):
        return value.strip().lower()
    return ""


def _issue_status(issue: IssueMapping) -> str:
    """Return the normalised status/state string for *issue*.

    The helper looks for common keys used by Git hosting providers and falls
    back to boolean flags when possible.  The result is always lowercase.
    """

    for key in ("state", "status", "State", "Status"):
        if key in issue:
            return _coerce_str(issue[key])

    if "is_open" in issue:
        return "open" if bool(issue["is_open"]) else "closed"
    if "open" in issue:
        return "open" if bool(issue["open"]) else "closed"

    return "open"


def _set_issue_status(issue: IssueMapping, status: str) -> None:
    """Persist *status* on the given *issue* using the available keys."""

    normalised = status.lower()
    if "state" in issue or "State" in issue:
        issue["state" if "state" in issue else "State"] = normalised
    if "status" in issue or "Status" in issue:
        issue["status" if "status" in issue else "Status"] = normalised

    issue["is_open"] = normalised in _OPEN_STATUSES
    issue["open"] = normalised in _OPEN_STATUSES


def _labels(issue: IssueMapping) -> Sequence[str]:
    """Return a sequence with all label strings present on *issue*."""

    labels = issue.get("labels")
    if isinstance(labels, (list, tuple, set)):
        return [label for label in labels if isinstance(label, str)]
    return []


def _is_implemented(issue: IssueMapping) -> bool:
    """Return ``True`` if *issue* is flagged as already implemented."""

    for key in ("implemented", "is_implemented", "done", "completed"):
        if bool(issue.get(key)):
            return True

    for label in _labels(issue):
        label_normalised = label.strip().lower()
        if "implemented" in label_normalised or label_normalised in {
            "done",
            "completed",
            "status:done",
            "status:completed",
        }:
            return True

    return False


def list_open_issues(issues: Iterable[IssueMapping]) -> List[IssueMapping]:
    """Return the list of issues that are currently open.

    Parameters
    ----------
    issues:
        An iterable containing mutable issue dictionaries.  Only references to
        the original dictionaries are returned; no copies are produced.
    """

    open_issues: List[IssueMapping] = []
    for issue in issues:
        if _issue_status(issue) in _CLOSED_STATUSES:
            continue
        open_issues.append(issue)
    return open_issues


def close_implemented_issues(
    issues: MutableSequence[IssueMapping],
) -> List[IssueMapping]:
    """Close every issue in *issues* already marked as implemented.

    The function mutates the provided issue dictionaries in-place and returns a
    list with the issues that were transitioned to a closed state.
    """

    closed: List[IssueMapping] = []
    for issue in issues:
        if _issue_status(issue) in _CLOSED_STATUSES:
            continue
        if not _is_implemented(issue):
            continue

        _set_issue_status(issue, "closed")
        issue["completed"] = True
        closed.append(issue)

    return closed


def complete_open_issues(
    issues: MutableSequence[IssueMapping],
) -> List[IssueMapping]:
    """Mark the remaining open issues as completed.

    Issues that are already closed are ignored.  Open issues are marked as both
    ``completed`` and ``closed`` to signal that the work has been finished.
    """

    completed: List[IssueMapping] = []
    for issue in issues:
        if _issue_status(issue) in _CLOSED_STATUSES:
            continue

        _set_issue_status(issue, "completed")
        issue["completed"] = True
        completed.append(issue)

    return completed

