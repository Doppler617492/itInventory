"""Dashboard summary endpoint."""
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Request, Invoice, Subscription

router = APIRouter()


def _store_filter(q, user):
    """Za odobravatelja samo zahtjeve dodijeljene njemu."""
    if user.role in ("APPROVER", "MANAGER", "FINANCE", "CEO"):
        return q.filter(Request.assigned_approver_id == user.id)
    return q


@router.get("")
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    start_month = today.replace(day=1)
    end_month = start_month + timedelta(days=32)
    end_month = end_month.replace(day=1) - timedelta(days=1)

    # Monthly spend
    monthly_q = db.query(func.coalesce(func.sum(Request.amount_gross), 0)).filter(
        Request.status.in_(["APPROVED", "ORDERED", "DELIVERED", "CLOSED"]),
        func.date(Request.created_at) >= start_month,
        func.date(Request.created_at) <= end_month,
    )
    monthly_q = _store_filter(monthly_q, user)
    monthly_spend = float(monthly_q.scalar() or 0)

    # Pending approvals
    pending_q = _store_filter(db.query(Request).filter(Request.status == "PENDING"), user)
    pending_count = pending_q.count()

    # Active subscriptions (odobravatelj ne upravlja pretplatama – samo admin)
    if user.role in ("APPROVER", "MANAGER", "FINANCE", "CEO"):
        sub_count = 0
        sub_monthly = 0
    else:
        active_subs = db.query(Subscription).filter(Subscription.status == "ACTIVE").all()
        sub_count = len(active_subs)
        sub_monthly = sum(
            float(s.cost) if s.billing_cycle == "MONTHLY" else float(s.cost) / 12
            for s in active_subs
        )

    # Unpaid invoices (odobravatelj: samo zahtjevi dodijeljeni njemu)
    unpaid_q = db.query(Invoice).filter(Invoice.status != "PAID")
    if user.role in ("APPROVER", "MANAGER", "FINANCE", "CEO"):
        unpaid_q = unpaid_q.join(Request, Invoice.request_id == Request.id, isouter=False).filter(Request.assigned_approver_id == user.id)
    unpaid = unpaid_q.all()
    unpaid_count = len(unpaid)
    unpaid_total = sum(float(i.amount_gross) for i in unpaid)

    # Chart data - last 6 months
    chart_data = []
    for i in range(6):
        year = today.year
        month = today.month - (5 - i)
        if month <= 0:
            month += 12
            year -= 1
        m_start = date(year, month, 1)
        if month == 12:
            m_end = date(year, 12, 31)
        else:
            m_end = date(year, month + 1, 1)
        m_end = m_end - timedelta(days=1)
        d_start = datetime.combine(m_start, datetime.min.time())
        d_end = datetime.combine(m_end, datetime.max.time())
        chart_q = db.query(func.coalesce(func.sum(Request.amount_gross), 0)).filter(
            Request.status.in_(["APPROVED", "ORDERED", "DELIVERED", "CLOSED"]),
            Request.created_at >= d_start,
            Request.created_at <= d_end,
        )
        chart_q = _store_filter(chart_q, user)
        s = chart_q.scalar() or 0
        chart_data.append({"month": m_start.strftime("%b"), "amount": float(s)})

    # By store (last 6 months for better visibility)
    six_months_ago = today - timedelta(days=180)
    store_q = db.query(Request.store, func.sum(Request.amount_gross).label("total")).filter(
        Request.status.in_(["APPROVED", "ORDERED", "DELIVERED", "CLOSED"]),
        func.date(Request.created_at) >= six_months_ago,
    )
    store_q = _store_filter(store_q, user)
    store_data = store_q.group_by(Request.store).order_by(func.sum(Request.amount_gross).desc()).all()

    sector_q = db.query(Request.sector, func.sum(Request.amount_gross).label("total")).filter(
        Request.status.in_(["APPROVED", "ORDERED", "DELIVERED", "CLOSED"]),
        Request.sector.isnot(None),
        func.date(Request.created_at) >= six_months_ago,
    )
    sector_q = _store_filter(sector_q, user)
    sector_data = sector_q.group_by(Request.sector).order_by(func.sum(Request.amount_gross).desc()).all()
    colors = ["#1E3A8A", "#16A34A", "#F59E0B", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#ec4899"]
    category_data = [
        {"name": r[0] or "Bez sektora", "value": float(r[1]), "color": colors[i % len(colors)]}
        for i, r in enumerate(sector_data)
    ]
    if not category_data:
        category_data = [
            {"name": "Nema podataka", "value": 0, "color": "#94a3b8"},
        ]

    return {
        "monthly_spend": float(monthly_spend),
        "pending_approvals": pending_count,
        "active_subscriptions": sub_count,
        "sub_monthly_cost": sub_monthly,
        "unpaid_invoices_count": unpaid_count,
        "unpaid_invoices_total": unpaid_total,
        "chart_monthly": chart_data,
        "chart_by_category": category_data,
        "chart_by_store": [{"store": r[0], "cost": float(r[1])} for r in store_data] if store_data else [{"store": "Nema podataka", "cost": 0}],
    }
