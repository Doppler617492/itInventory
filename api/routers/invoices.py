"""Invoices router - finance inbox."""
from __future__ import annotations
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Invoice, Vendor, Request, Asset, Document

router = APIRouter()


class InvoiceOut(BaseModel):
    id: int
    request_id: Optional[int]
    vendor_id: int
    invoice_no: str
    invoice_date: date
    amount_net: Decimal
    vat_rate: Decimal
    amount_gross: Decimal
    currency: str
    status: str
    payment_method: Optional[str]
    paid_at: Optional[datetime]
    vendor_name: Optional[str] = None
    request_code: Optional[str] = None
    has_document: bool = False
    document_id: Optional[int] = None
    document_mime: Optional[str] = None
    document_filename: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_pib: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    vendor_id: int
    invoice_no: str
    invoice_date: date
    amount_net: Decimal
    vat_rate: Decimal = 21
    amount_gross: Decimal
    currency: str = "EUR"
    request_id: Optional[int] = None


class SetStatusBody(BaseModel):
    status: str


class MarkPaidBody(BaseModel):
    payment_method: str
    paid_at: Optional[datetime] = None


def _invoice_to_out(i: Invoice, db: Session) -> dict:
    v = db.query(Vendor).get(i.vendor_id)
    r = db.query(Request).get(i.request_id) if i.request_id else None
    doc = db.query(Document).filter(Document.invoice_id == i.id).first()
    return {
        "id": i.id,
        "request_id": i.request_id,
        "vendor_id": i.vendor_id,
        "invoice_no": i.invoice_no,
        "invoice_date": i.invoice_date,
        "amount_net": i.amount_net,
        "vat_rate": i.vat_rate,
        "amount_gross": i.amount_gross,
        "currency": i.currency,
        "status": i.status,
        "payment_method": i.payment_method,
        "paid_at": i.paid_at,
        "vendor_name": v.name if v else None,
        "vendor_address": v.address if v else None,
        "vendor_pib": v.pib if v else None,
        "request_code": r.code if r else None,
        "has_document": doc is not None,
        "document_id": doc.id if doc else None,
        "document_mime": doc.mime if doc else None,
        "document_filename": doc.filename if doc else None,
    }


def _require_admin_for_finance(user: User):
    if user.role not in ("ADMIN", "FINANCE"):
        raise HTTPException(403, "Samo administrator ili financije imaju pristup financijama")


@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    q = db.query(Invoice)
    if status:
        q = q.filter(Invoice.status == status)
    invs = q.order_by(Invoice.created_at.desc()).limit(100).all()
    return [_invoice_to_out(i, db) for i in invs]


@router.post("", response_model=InvoiceOut)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    inv = Invoice(
        vendor_id=data.vendor_id,
        invoice_no=data.invoice_no,
        invoice_date=data.invoice_date,
        amount_net=data.amount_net,
        vat_rate=data.vat_rate,
        amount_gross=data.amount_gross,
        currency=data.currency,
        request_id=data.request_id,
        status="RECEIVED",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _invoice_to_out(inv, db)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return _invoice_to_out(inv, db)


@router.post("/{invoice_id}/match-request/{request_id}")
def match_request(
    invoice_id: int,
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    inv.request_id = request_id
    inv.status = "MATCHED"
    db.commit()
    return {"ok": True}


@router.post("/{invoice_id}/set-status")
def set_status(
    invoice_id: int,
    body: SetStatusBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = body.status
    db.commit()
    return {"ok": True}


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    # Unlink documents and assets before delete
    db.query(Document).filter(Document.invoice_id == invoice_id).update({Document.invoice_id: None})
    db.query(Asset).filter(Asset.invoice_id == invoice_id).update({Asset.invoice_id: None})
    db.delete(inv)
    db.commit()
    return {"ok": True}


@router.post("/{invoice_id}/mark-paid")
def mark_paid(
    invoice_id: int,
    body: MarkPaidBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin_for_finance(user)
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    inv.status = "PAID"
    inv.payment_method = body.payment_method
    inv.paid_at = body.paid_at or datetime.utcnow()
    db.commit()

    # Auto-create asset if request has equipment-type items
    req = db.query(Request).filter(Request.id == inv.request_id).first() if inv.request_id else None
    if req and req.items:
        for it in req.items:
            db.add(Asset(
                request_id=req.id,
                invoice_id=inv.id,
                name=it.name,
                serial_no=None,
                location=req.store,
                assigned_to=None,
                purchase_date=inv.invoice_date,
                warranty_until=None,
                cost_gross=it.total_gross,
            ))
        db.commit()
    return {"ok": True}
