"""Minimal tests for approval workflow."""
from decimal import Decimal

from api.services.approval_workflow import get_required_approval_steps, step_to_role


def test_threshold_manager_only():
    """Amount < 300: Manager only."""
    steps = get_required_approval_steps(Decimal("250"))
    assert steps == [1]


def test_threshold_finance():
    """Amount 300-2000: Manager + Finance."""
    steps = get_required_approval_steps(Decimal("500"))
    assert steps == [1, 2]


def test_threshold_ceo():
    """Amount > 2000: Manager + Finance + CEO."""
    steps = get_required_approval_steps(Decimal("3000"))
    assert steps == [1, 2, 3]


def test_step_to_role():
    assert step_to_role(1) == "MANAGER"
    assert step_to_role(2) == "FINANCE"
    assert step_to_role(3) == "CEO"
