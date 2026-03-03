"""Vendors router - for dropdowns and lookup."""
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Vendor, Request, Invoice, Subscription

router = APIRouter()


class VendorOut(BaseModel):
    id: int
    name: str
    pib: Optional[str]
    address: Optional[str]

    class Config:
        from_attributes = True


class VendorCreate(BaseModel):
    name: str
    pib: Optional[str] = None
    address: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    pib: Optional[str] = None
    address: Optional[str] = None


@router.get("", response_model=list[VendorOut])
def list_vendors(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Vendor).order_by(Vendor.name).all()


@router.post("", response_model=VendorOut)
def create_vendor(
    data: VendorCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "Naziv je obavezan")
    existing = db.query(Vendor).filter(Vendor.name == name).first()
    if existing:
        return existing
    v = Vendor(name=name, pib=data.pib, address=data.address)
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator može brisati dobavljače")
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(404, "Dobavljač nije pronađen")
    # Ne dopuštamo brisanje ako postoje povezani zapisi
    has_requests = db.query(Request).filter(Request.vendor_id == vendor_id).first() is not None
    has_invoices = db.query(Invoice).filter(Invoice.vendor_id == vendor_id).first() is not None
    has_subs = db.query(Subscription).filter(Subscription.vendor_id == vendor_id).first() is not None
    if has_requests or has_invoices or has_subs:
        raise HTTPException(400, "Dobavljač se koristi u zahtjevima, računima ili pretplatama i ne može se obrisati")
    db.delete(v)
    db.commit()
    return {"ok": True}


@router.patch("/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: int,
    data: VendorUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator može mijenjati dobavljače")
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(404, "Dobavljač nije pronađen")
    if data.name is not None:
        new_name = data.name.strip()
        if not new_name:
          raise HTTPException(400, "Naziv je obavezan")
        v.name = new_name
    if data.pib is not None:
        v.pib = data.pib or None
    if data.address is not None:
        v.address = data.address or None
    db.commit()
    db.refresh(v)
    return v
