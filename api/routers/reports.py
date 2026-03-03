"""Reports router - spend and subscription analytics."""
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Request, Invoice, Subscription

router = APIRouter()


def _require_admin(user):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator ima pristup izvještajima")


@router.get("/spend")
def spend_report(
    from_date: str = Query(..., description="YYYY-MM-DD"),
    to_date: str = Query(..., description="YYYY-MM-DD"),
    group_by: str = Query("store", description="store|vendor|category"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Aggregate spend by store, vendor, or category (we use store as category proxy)."""
    _require_admin(user)
    # Use requests for spend (amount_gross) in date range
    q = db.query(
        Request.store if group_by == "store" else Request.vendor_id,
        func.sum(Request.amount_gross).label("total"),
    ).filter(
        Request.created_at >= from_date,
        Request.created_at <= to_date,
        Request.status.in_(["APPROVED", "ORDERED", "DELIVERED", "CLOSED"]),
    )
    if group_by == "store":
        q = q.group_by(Request.store)
        rows = q.all()
        return {
            "group_by": "store",
            "data": [{"key": r[0], "total": float(r[1])} for r in rows],
        }
    if group_by == "vendor":
        from api.models import Vendor
        q = q.group_by(Request.vendor_id)
        rows = q.all()
        vendor_ids = [r[0] for r in rows if r[0]]
        vendors = {v.id: v.name for v in db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()}
        return {
            "group_by": "vendor",
            "data": [
                {"key": vendors.get(r[0], str(r[0])), "total": float(r[1])}
                for r in rows
            ],
        }
    # category - we don't have category, use store as proxy
    q = db.query(Request.store, func.sum(Request.amount_gross).label("total")).filter(
        Request.created_at >= from_date,
        Request.created_at <= to_date,
        Request.status.in_(["APPROVED", "ORDERED", "DELIVERED", "CLOSED"]),
    ).group_by(Request.store)
    rows = q.all()
    return {
        "group_by": "category",
        "data": [{"key": r[0], "total": float(r[1])} for r in rows],
    }


@router.get("/subscriptions/monthly")
def subscriptions_monthly(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Monthly cost breakdown for active subscriptions."""
    _require_admin(user)
    subs = db.query(Subscription).filter(Subscription.status == "ACTIVE").all()
    monthly = Decimal("0")
    for s in subs:
        if s.billing_cycle == "MONTHLY":
            monthly += s.cost
        else:
            monthly += s.cost / 12
    return {
        "total_monthly": float(monthly),
        "total_annual": float(monthly * 12),
        "subscription_count": len(subs),
    }
