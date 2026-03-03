"""Assets router."""
from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Asset

router = APIRouter()


class AssetOut(BaseModel):
    id: int
    request_id: Optional[int]
    invoice_id: Optional[int]
    name: str
    serial_no: Optional[str]
    location: Optional[str]
    assigned_to: Optional[int]
    internal_barcode: Optional[str]
    purchase_date: Optional[date]
    warranty_until: Optional[date]
    cost_gross: Optional[Decimal]
    assigned_to_name: Optional[str] = None

    class Config:
        from_attributes = True


class AssetCreate(BaseModel):
    name: str
    serial_no: Optional[str] = None
    location: Optional[str] = None
    assigned_to: Optional[int] = None
    internal_barcode: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_until: Optional[date] = None
    cost_gross: Optional[Decimal] = None
    request_id: Optional[int] = None
    invoice_id: Optional[int] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    serial_no: Optional[str] = None
    location: Optional[str] = None
    assigned_to: Optional[int] = None
    internal_barcode: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_until: Optional[date] = None
    cost_gross: Optional[Decimal] = None


def _asset_to_out(a: Asset, db: Session) -> dict:
    u = db.query(User).get(a.assigned_to) if a.assigned_to else None
    return {
        "id": a.id,
        "request_id": a.request_id,
        "invoice_id": a.invoice_id,
        "name": a.name,
        "serial_no": a.serial_no,
        "location": a.location,
        "assigned_to": a.assigned_to,
        "internal_barcode": getattr(a, "internal_barcode", None),
        "purchase_date": a.purchase_date,
        "warranty_until": a.warranty_until,
        "cost_gross": a.cost_gross,
        "assigned_to_name": u.name if u else None,
    }


def _require_admin(user):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator ima pristup imovini")


@router.get("", response_model=list[AssetOut])
def list_assets(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    q = db.query(Asset)
    if search:
        q = q.filter(
            or_(
                Asset.name.ilike(f"%{search}%"),
                Asset.serial_no.ilike(f"%{search}%"),
                Asset.internal_barcode.ilike(f"%{search}%"),
            )
        )
    assets = q.order_by(Asset.id.desc()).limit(200).all()
    return [_asset_to_out(a, db) for a in assets]


@router.post("", response_model=AssetOut)
def create_asset(
    data: AssetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    a = Asset(
        name=data.name,
        serial_no=data.serial_no,
        location=data.location,
        assigned_to=data.assigned_to,
        internal_barcode=data.internal_barcode,
        purchase_date=data.purchase_date,
        warranty_until=data.warranty_until,
        cost_gross=data.cost_gross,
        request_id=data.request_id,
        invoice_id=data.invoice_id,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _asset_to_out(a, db)


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    data: AssetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    a = db.query(Asset).filter(Asset.id == asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    sent = data.model_dump(exclude_unset=True)
    if "name" in sent:
        a.name = data.name
    if "serial_no" in sent:
        a.serial_no = data.serial_no
    if "location" in sent:
        a.location = data.location
    if "assigned_to" in sent:
        a.assigned_to = data.assigned_to
    if "internal_barcode" in sent:
        a.internal_barcode = data.internal_barcode
    if "purchase_date" in sent:
        a.purchase_date = data.purchase_date
    if "warranty_until" in sent:
        a.warranty_until = data.warranty_until
    if "cost_gross" in sent:
        a.cost_gross = data.cost_gross
    db.commit()
    db.refresh(a)
    return _asset_to_out(a, db)
