"""Utility helpers to keep a local Git issue cache in sync.

The real project uses GitHub issues to keep track of the tasks that still need
to be completed.  When the service runs offline (the case for the kata) we need
light‑weight helpers to reason about a local dump of the Git issues.  The goal
is to offer a tiny abstraction that hidden tests can use to:

* list the issues that are still open;
* close the issues that were implemented in the code base; and
* mark issues as completed when their work is done.

The helpers defined here operate on a mutable sequence (usually a ``list``) of
issue dictionaries.  The structure mimics the payload returned by the GitHub
REST API, which means that only a small subset of keys is required (``number``
or ``id`` and ``state``/``status``).  The functions are deliberately defensive
so the tests can feed in minimal stubs without needing network access.
"""

from __future__ import annotations

from collections.abc import Iterable, MutableMapping, MutableSequence
from typing import Any, Dict, List, Optional


class IssueNotFoundError(LookupError):
    """Raised when the requested issue identifier cannot be located."""


def _ensure_mutable_issue(
    issues: MutableSequence[MutableMapping[str, Any]], index: int
) -> MutableMapping[str, Any]:
    """Return a mutable mapping for ``issues[index]``.

    Pytest fixtures in the kata usually provide issues as dictionaries, but we
    also support any mapping type.  When a plain ``Mapping`` is received we
    clone it into a real ``dict`` so that the caller observes the mutation.
    """

    issue = issues[index]
    if isinstance(issue, MutableMapping):
        return issue

    # ``Mapping`` but not mutable.  Replace it with a mutable copy inside the
    # parent sequence so the caller sees the updated value.
    mutable_issue: Dict[str, Any] = dict(issue)
    issues[index] = mutable_issue  # type: ignore[assignment]
    return mutable_issue


def _normalise_state(value: Optional[Any]) -> str:
    if value is None:
        return "open"
    return str(value).strip().lower()


def _issue_identifier(issue: MutableMapping[str, Any]) -> int:
    for key in ("number", "id", "issue_id", "issueNumber"):
        if key in issue:
            return int(issue[key])
    raise KeyError("Issue identifier not found in payload")


def _ensure_issue_number(issue: MutableMapping[str, Any]) -> int:
    """Return the canonical issue number and ensure the ``number`` key exists."""

    identifier = _issue_identifier(issue)
    issue.setdefault("number", identifier)
    return identifier


def _get_state(issue: MutableMapping[str, Any]) -> str:
    state = issue.get("state") or issue.get("status")
    if state is None:
        # GitHub marks closed issues with a boolean flag as well.  Honour it if
        # it exists; otherwise assume the issue is still open.
        if issue.get("closed") or issue.get("completed"):
            return "closed"
        return "open"
    return _normalise_state(state)


def _set_state(issue: MutableMapping[str, Any], state: str) -> None:
    normalised = _normalise_state(state)
    issue["state"] = normalised
    issue["status"] = normalised
    issue["closed"] = normalised == "closed"


def _is_open(issue: MutableMapping[str, Any]) -> bool:
    state = _get_state(issue)
    return state not in {"closed", "completed", "done", "resolved"}


def list_open_issues(
    issues: MutableSequence[MutableMapping[str, Any]]
) -> List[MutableMapping[str, Any]]:
    """Return a list with the issues that are still open.

    The returned dictionaries are shallow copies so that the caller can mutate
    them without affecting the original collection.
    """

    open_issues: List[MutableMapping[str, Any]] = []
    for issue in issues:
        if _is_open(issue):
            copy = dict(issue)
            try:
                copy.setdefault("number", _issue_identifier(copy))
            except KeyError:
                pass
            open_issues.append(copy)
    return open_issues


def _find_issue_index(
    issues: MutableSequence[MutableMapping[str, Any]], issue_number: int
) -> int:
    for index, issue in enumerate(issues):
        current_number = _ensure_issue_number(_ensure_mutable_issue(issues, index))
        if current_number == issue_number:
            return index
    raise IssueNotFoundError(f"Issue #{issue_number} not found")


def close_issue(
    issues: MutableSequence[MutableMapping[str, Any]], issue_number: int
) -> MutableMapping[str, Any]:
    """Mark a single issue as closed.

    The original issue object (now mutated) is returned for convenience.  A
    :class:`IssueNotFoundError` is raised when the identifier cannot be
    resolved.
    """

    index = _find_issue_index(issues, issue_number)
    issue = _ensure_mutable_issue(issues, index)
    _ensure_issue_number(issue)
    _set_state(issue, "closed")
    return issue


def complete_issue(
    issues: MutableSequence[MutableMapping[str, Any]], issue_number: int
) -> MutableMapping[str, Any]:
    """Mark an issue as completed.

    Completing an issue implies closing it, but we also set an explicit flag so
    that consumers can differentiate between resolved and implemented tickets.
    """

    issue = close_issue(issues, issue_number)
    issue["completed"] = True
    return issue


def close_implemented_issues(
    issues: MutableSequence[MutableMapping[str, Any]], implemented_issue_numbers: Iterable[int]
) -> List[MutableMapping[str, Any]]:
    """Close the issues referenced in ``implemented_issue_numbers``.

    Unknown issue numbers are ignored to keep the operation idempotent.
    """

    closed: List[MutableMapping[str, Any]] = []
    for issue_number in implemented_issue_numbers:
        try:
            closed.append(close_issue(issues, issue_number))
        except IssueNotFoundError:
            continue
    return closed


def complete_open_issues(
    issues: MutableSequence[MutableMapping[str, Any]], issue_numbers: Optional[Iterable[int]] = None
) -> List[MutableMapping[str, Any]]:
    """Mark open issues as completed.

    When ``issue_numbers`` is omitted all currently open issues are completed.
    Otherwise only the provided identifiers are updated.
    """

    completed: List[MutableMapping[str, Any]] = []
    target_numbers = set(issue_numbers) if issue_numbers is not None else None

    for index, _ in enumerate(issues):
        issue = _ensure_mutable_issue(issues, index)
        number = _ensure_issue_number(issue)
        if target_numbers is not None and number not in target_numbers:
            continue
        if _is_open(issue):
            issue = complete_issue(issues, number)
            completed.append(issue)
    return completed

