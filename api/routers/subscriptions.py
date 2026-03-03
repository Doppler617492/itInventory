"""Subscriptions router."""
from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Subscription, Vendor

router = APIRouter()


class SubscriptionOut(BaseModel):
    id: int
    name: str
    vendor_id: int
    plan: Optional[str]
    seats: Optional[int]
    billing_cycle: str
    cost: Decimal
    currency: str
    renewal_date: Optional[date]
    owner_user_id: Optional[int]
    status: str
    notes: Optional[str]
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    name: str
    vendor_id: int
    plan: Optional[str] = None
    seats: Optional[int] = None
    billing_cycle: str = "MONTHLY"
    cost: Decimal
    currency: str = "EUR"
    renewal_date: Optional[date] = None
    owner_user_id: Optional[int] = None
    notes: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    seats: Optional[int] = None
    billing_cycle: Optional[str] = None
    cost: Optional[Decimal] = None
    renewal_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _sub_to_out(s: Subscription, db: Session) -> dict:
    v = db.query(Vendor).get(s.vendor_id)
    return {
        "id": s.id,
        "name": s.name,
        "vendor_id": s.vendor_id,
        "plan": s.plan,
        "seats": s.seats,
        "billing_cycle": s.billing_cycle,
        "cost": s.cost,
        "currency": s.currency,
        "renewal_date": s.renewal_date,
        "owner_user_id": s.owner_user_id,
        "status": s.status,
        "notes": s.notes,
        "vendor_name": v.name if v else None,
    }


def _require_admin(user):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator ima pristup pretplatama")


@router.get("", response_model=list[SubscriptionOut])
def list_subscriptions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    subs = db.query(Subscription).order_by(Subscription.renewal_date).all()
    return [_sub_to_out(s, db) for s in subs]


@router.get("/renewals", response_model=list[SubscriptionOut])
def list_renewals(
    days: int = Query(30),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import timedelta
    from sqlalchemy import and_
    today = date.today()
    until = today + timedelta(days=days)
    subs = db.query(Subscription).filter(
        Subscription.status == "ACTIVE",
        Subscription.renewal_date >= today,
        Subscription.renewal_date <= until,
    ).order_by(Subscription.renewal_date).all()
    return [_sub_to_out(s, db) for s in subs]


@router.post("", response_model=SubscriptionOut)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    s = Subscription(
        name=data.name,
        vendor_id=data.vendor_id,
        plan=data.plan,
        seats=data.seats,
        billing_cycle=data.billing_cycle,
        cost=data.cost,
        currency=data.currency,
        renewal_date=data.renewal_date,
        owner_user_id=data.owner_user_id or user.id,
        status="ACTIVE",
        notes=data.notes,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _sub_to_out(s, db)


@router.delete("/{sub_id}")
def delete_subscription(
    sub_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    s = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not s:
        raise HTTPException(404, "Subscription not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.patch("/{sub_id}", response_model=SubscriptionOut)
def update_subscription(
    sub_id: int,
    data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    s = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not s:
        raise HTTPException(404, "Subscription not found")
    if data.name is not None:
        s.name = data.name
    if data.plan is not None:
        s.plan = data.plan
    if data.seats is not None:
        s.seats = data.seats
    if data.billing_cycle is not None:
        s.billing_cycle = data.billing_cycle
    if data.cost is not None:
        s.cost = data.cost
    if data.renewal_date is not None:
        s.renewal_date = data.renewal_date
    if data.status is not None:
        s.status = data.status
    if data.notes is not None:
        s.notes = data.notes
    db.commit()
    db.refresh(s)
    return _sub_to_out(s, db)
