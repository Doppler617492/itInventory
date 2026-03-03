"""Approval workflow logic - determines which steps are required based on amount."""
from __future__ import annotations
from decimal import Decimal

from api.core.config import get_settings


def get_required_approval_steps(amount_gross: Decimal) -> list[int]:
    """
    Return list of step numbers (1=MANAGER, 2=FINANCE, 3=CEO) required.
    IT is always implicit first (requester submits).
    """
    settings = get_settings()
    steps = [1]  # MANAGER always
    if amount_gross >= settings.THRESHOLD_MANAGER_ONLY:
        steps.append(2)  # FINANCE
    if amount_gross >= settings.THRESHOLD_FINANCE:
        steps.append(3)  # CEO
    return steps


def step_to_role(step: int) -> str:
    """Map approval step number to role name."""
    return {1: "MANAGER", 2: "FINANCE", 3: "CEO"}[step]


def get_current_approval_step(approvals_done: list) -> int | None:
    """Get next step number that needs approval. Returns None if all done or rejected."""
    required = set()
    for a in approvals_done:
        if a.get("decision") == "REJECTED":
            return None
        required.add(a.get("step"))
    # Find first missing step (1, 2, 3)
    for s in [1, 2, 3]:
        if s not in required:
            return s
    return None
