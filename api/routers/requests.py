"""Requests router."""
from __future__ import annotations
import os
import uuid
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from api.core.config import get_settings
from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Request, RequestItem, Approval, Vendor, Document, Invoice, Asset
from api.services.notifications import notify_new_request, notify_request_submitted, notify_request_decision
from api.schemas.request import (
    RequestCreate,
    RequestUpdate,
    RequestOut,
    RequestDetailOut,
    RequestItemCreate,
    ApproveRejectBody,
)
from api.services.approval_workflow import get_required_approval_steps, step_to_role

router = APIRouter()


def _request_to_out(r: Request, db: Session) -> dict:
    vendor_name = None
    if r.vendor_id:
        v = db.query(Vendor).get(r.vendor_id)
        vendor_name = v.name if v else None
    return {
        "id": r.id,
        "code": r.code,
        "title": r.title,
        "description": r.description,
        "store": r.store,
        "sector": r.sector,
        "assigned_approver_id": r.assigned_approver_id,
        "assigned_approver_name": r.assigned_approver.name if r.assigned_approver else None,
        "requester_id": r.requester_id,
        "vendor_id": r.vendor_id,
        "amount_net": r.amount_net,
        "vat_rate": r.vat_rate,
        "amount_gross": r.amount_gross,
        "currency": r.currency,
        "priority": r.priority,
        "status": r.status,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "requester_name": r.requester.name if r.requester else None,
        "vendor_name": vendor_name,
    }


def _user_can_see_request(user: User, r: Request) -> bool:
    """Admin vidi sve; odobravatelj samo zahtjeve dodijeljene njemu. FINANCE ne odobrava zahtjeve."""
    if user.role == "ADMIN":
        return True
    if user.role in ("APPROVER", "MANAGER", "CEO"):
        return r.assigned_approver_id == user.id
    return r.requester_id == user.id


@router.get("", response_model=list[RequestOut])
def list_requests(
    status: Optional[str] = Query(None),
    store: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    vendor_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Request)
    # Odobravatelj: samo zahtjeve dodijeljene njemu (FINANCE ne odobrava)
    if user.role in ("APPROVER", "MANAGER", "CEO"):
        q = q.filter(Request.assigned_approver_id == user.id)
    if status:
        q = q.filter(Request.status == status)
    if store:
        q = q.filter(Request.store == store)
    if sector:
        q = q.filter(Request.sector == sector)
    if vendor_id:
        q = q.filter(Request.vendor_id == vendor_id)
    if from_date:
        q = q.filter(Request.created_at >= from_date)
    if to_date:
        q = q.filter(Request.created_at <= to_date)
    if search:
        q = q.filter(
            or_(
                Request.code.ilike(f"%{search}%"),
                Request.title.ilike(f"%{search}%"),
            )
        )
    reqs = q.order_by(Request.created_at.desc()).limit(200).all()
    return [_request_to_out(r, db) for r in reqs]


@router.post("", response_model=RequestOut)
def create_request(
    data: RequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Samo administrator kreira zahtjeve
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator može kreirati zahtjeve")
    if data.items and len(data.items) > 0:
        def _item_net(it):
            disc = float(it.discount_pct or 0) / 100
            return float(it.unit_price_net) * it.qty * (1 - disc)

        def _item_gross(it):
            net = _item_net(it)
            return net * (1 + float(it.vat_rate) / 100)

        amount_net = sum(_item_net(it) for it in data.items)
        amount_gross = sum(_item_gross(it) for it in data.items)
        vat_rate = data.items[0].vat_rate
    else:
        amount_net = float(data.amount_net)
        amount_gross = float(data.amount_net) * (1 + float(data.vat_rate) / 100)
        vat_rate = data.vat_rate
    code = f"REQ-2024-{db.query(Request).count() + 1:03d}"
    r = Request(
        code=code,
        title=data.title,
        description=data.description,
        store=data.store,
        sector=data.sector,
        assigned_approver_id=data.assigned_approver_id,
        requester_id=user.id,
        vendor_id=data.vendor_id,
        amount_net=Decimal(str(amount_net)),
        vat_rate=vat_rate,
        amount_gross=Decimal(str(amount_gross)),
        currency=data.currency,
        priority=data.priority,
        status="DRAFT",
    )
    db.add(r)
    db.flush()
    try:
        notify_new_request(db, r, user.name)
    except Exception:
        pass
    if data.items:
        for it in data.items:
            disc = float(it.discount_pct or 0) / 100
            net = float(it.unit_price_net) * it.qty * (1 - disc)
            total = net * (1 + float(it.vat_rate) / 100)
            db.add(RequestItem(
                request_id=r.id,
                name=it.name,
                qty=it.qty,
                unit_price_net=it.unit_price_net,
                vat_rate=it.vat_rate,
                discount_pct=it.discount_pct if it.discount_pct is not None else 0,
                total_gross=Decimal(str(total)),
            ))
    db.commit()
    db.refresh(r)
    try:
        notify_request_decision(db, r, approved=True, decided_by=user)
    except Exception:
        pass
    return _request_to_out(r, db)


def _delete_request_cascade(db: Session, request_id: int) -> None:
    """Odspoji dokumente, račune i imovinu; zatim obriši zahtjev (items i approvals se brišu cascade)."""
    db.query(Document).filter(Document.request_id == request_id).update({Document.request_id: None})
    db.query(Invoice).filter(Invoice.request_id == request_id).update({Invoice.request_id: None})
    db.query(Asset).filter(Asset.request_id == request_id).update({Asset.request_id: None})
    r = db.query(Request).filter(Request.id == request_id).first()
    if r:
        db.delete(r)


@router.post("/{request_id}/delete")
def delete_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Obriši zahtjev (samo administrator)."""
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator može brisati zahtjeve")
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Zahtjev nije pronađen")
    _delete_request_cascade(db, request_id)
    db.commit()
    return {"ok": True, "message": "Zahtjev obrisan"}


class BulkDeleteBody(BaseModel):
    ids: list[int]


@router.post("/bulk-delete")
def bulk_delete_requests(
    body: BulkDeleteBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Obriši više zahtjeva odjednom (samo administrator)."""
    if user.role != "ADMIN":
        raise HTTPException(403, "Samo administrator može brisati zahtjeve")
    if not body.ids:
        return {"ok": True, "deleted": 0, "message": "Nema zahtjeva za brisanje"}
    for rid in body.ids:
        _delete_request_cascade(db, rid)
    db.commit()
    return {"ok": True, "deleted": len(body.ids), "message": f"Obrisano {len(body.ids)} zahtjeva"}


@router.get("/{request_id}", response_model=RequestDetailOut)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Request not found")
    if not _user_can_see_request(user, r):
        raise HTTPException(403, "Nemate pristup ovom zahtjevu")
    out = _request_to_out(r, db)
    out["items"] = [
        {
            "id": i.id,
            "name": i.name,
            "qty": i.qty,
            "unit_price_net": i.unit_price_net,
            "vat_rate": i.vat_rate,
            "discount_pct": getattr(i, "discount_pct", None),
            "total_gross": i.total_gross,
        }
        for i in r.items
    ]
    out["approvals"] = [
        {
            "id": a.id,
            "step": a.step,
            "approver_id": a.approver_id,
            "approver_name": a.approver.name if a.approver else None,
            "decision": a.decision,
            "comment": a.comment,
            "decided_at": a.decided_at,
        }
        for a in r.approvals
    ]
    # Build approval flow for UI (expected steps + status)
    steps = get_required_approval_steps(r.amount_gross)
    step_labels = {1: "Manager", 2: "Finance", 3: "CEO"}
    done_by_step = {a["step"]: a for a in out["approvals"]}
    approval_flow = []
    for s in steps:
        label = step_labels.get(s, f"Step {s}")
        d = done_by_step.get(s)
        dt = d.get("decided_at") if d else None
        date_str = dt.strftime("%Y-%m-%d %I:%M %p") if hasattr(dt, "strftime") and dt else None
        approval_flow.append({
            "step": label,
            "approver": d["approver_name"] if d else "-",
            "status": (d["decision"] or "").lower() if d else "pending",
            "date": date_str,
            "comment": d.get("comment") if d else None,
        })
    out["approval_flow"] = approval_flow
    # Povezani računi / predračuni (prateća dokumentacija)
    invs = db.query(Invoice).filter(Invoice.request_id == r.id).order_by(Invoice.invoice_date.desc()).all()
    out["invoices"] = []
    for inv in invs:
        doc = db.query(Document).filter(Document.invoice_id == inv.id).first()
        doc_type = doc.doc_type if doc else "INVOICE"
        out["invoices"].append({
            "id": inv.id,
            "invoice_no": inv.invoice_no,
            "doc_type": doc_type,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "status": inv.status,
        })
    return out


ALLOWED_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".gif"}


@router.post("/{request_id}/upload-invoice")
def upload_invoice_from_request(
    request_id: int,
    file: UploadFile = File(...),
    invoice_no: str = Form(...),
    invoice_date: str = Form(...),
    doc_type: str = Form("INVOICE"),
    amount_net: Optional[str] = Form(None),
    amount_gross: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Otpremi račun ili predračun vezan za zahtjev; ide u Financije."""
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Zahtjev nije pronađen")
    if not _user_can_see_request(user, r):
        raise HTTPException(403, "Nemate pristup ovom zahtjevu")
    if not r.vendor_id:
        raise HTTPException(400, "Zahtjev mora imati dobavljača da biste otpremili račun")
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"Format fajla nije dozvoljen. Dozvoljeni: {', '.join(ALLOWED_EXT)}")
    if doc_type not in ("INVOICE", "PROFORMA"):
        doc_type = "INVOICE"
    amt_net = Decimal(amount_net) if amount_net else r.amount_net
    amt_gross = Decimal(amount_gross) if amount_gross else r.amount_gross
    try:
        inv_date = date.fromisoformat(invoice_date)
    except (ValueError, TypeError):
        raise HTTPException(400, "Neispravan format datuma")
    settings = get_settings()
    content = file.file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Fajl prevelik. Maks. {settings.MAX_UPLOAD_SIZE_MB}MB")
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stem = uuid.uuid4().hex[:12]
    save_name = f"{stem}{ext}"
    save_path = upload_dir / save_name
    with open(save_path, "wb") as f:
        f.write(content)
    inv = Invoice(
        vendor_id=r.vendor_id,
        invoice_no=invoice_no.strip(),
        invoice_date=inv_date,
        amount_net=amt_net,
        vat_rate=r.vat_rate,
        amount_gross=amt_gross,
        currency=getattr(r, "currency", "EUR") or "EUR",
        request_id=r.id,
        status="RECEIVED",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    doc = Document(
        request_id=r.id,
        invoice_id=inv.id,
        uploaded_by=user.id,
        doc_type=doc_type,
        filename=file.filename or save_name,
        mime=file.content_type,
        size=len(content),
        storage_path=str(save_path),
    )
    db.add(doc)
    db.commit()
    return {"ok": True, "invoice_id": inv.id, "message": "Račun otpremljen u Financije"}


@router.patch("/{request_id}", response_model=RequestOut)
def update_request(
    request_id: int,
    data: RequestUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Request not found")
    if not _user_can_see_request(user, r):
        raise HTTPException(403, "Nemate pristup ovom zahtjevu")
    if r.requester_id != user.id and user.role != "ADMIN":
        raise HTTPException(403, "Samo podnosilac ili administrator može mijenjati zahtjev")
    if r.status not in ("DRAFT", "PENDING"):
        raise HTTPException(400, "Možete mijenjati samo zahtjeve koje još nisu odobreni ili odbijeni")
    if data.store is not None:
        r.store = data.store
    if data.title is not None:
        r.title = data.title
    if data.description is not None:
        r.description = data.description
    if data.sector is not None:
        r.sector = data.sector
    if data.assigned_approver_id is not None:
        r.assigned_approver_id = data.assigned_approver_id
    if data.vendor_id is not None:
        r.vendor_id = data.vendor_id
    if data.amount_net is not None:
        r.amount_net = data.amount_net
    if data.vat_rate is not None:
        r.vat_rate = data.vat_rate
    if data.priority is not None:
        r.priority = data.priority
    if data.items is not None:
        for old in r.items:
            db.delete(old)
        for it in data.items:
            disc = float(it.discount_pct or 0) / 100
            net = float(it.unit_price_net) * it.qty * (1 - disc)
            total = net * (1 + float(it.vat_rate) / 100)
            db.add(RequestItem(
                request_id=r.id,
                name=it.name,
                qty=it.qty,
                unit_price_net=it.unit_price_net,
                vat_rate=it.vat_rate,
                discount_pct=it.discount_pct if it.discount_pct is not None else 0,
                total_gross=Decimal(str(total)),
            ))
        r.amount_net = sum(
            float(i.unit_price_net) * i.qty * (1 - float(i.discount_pct or 0) / 100)
            for i in data.items
        )
        r.amount_gross = sum(
            float(i.unit_price_net) * i.qty * (1 - float(i.discount_pct or 0) / 100) * (1 + float(i.vat_rate) / 100)
            for i in data.items
        )
    db.commit()
    db.refresh(r)
    return _request_to_out(r, db)


@router.post("/{request_id}/submit", response_model=RequestOut)
def submit_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Request not found")
    if not _user_can_see_request(user, r):
        raise HTTPException(403, "Nemate pristup ovom zahtjevu")
    if r.requester_id != user.id and user.role != "ADMIN":
        raise HTTPException(403, "Samo podnosilac ili administrator može poslati zahtjev na odobrenje")
    if r.status != "DRAFT":
        raise HTTPException(400, "Only draft can be submitted")
    r.status = "PENDING"
    db.commit()
    db.refresh(r)
    try:
        notify_request_submitted(db, r, r.requester.name if r.requester else "Korisnik")
    except Exception:
        pass
    return _request_to_out(r, db)


@router.post("/{request_id}/approve", response_model=RequestOut)
def approve_request(
    request_id: int,
    body: ApproveRejectBody = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body is None:
        body = ApproveRejectBody()
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Request not found")
    if not _user_can_see_request(user, r):
        raise HTTPException(403, "Nemate pristup ovom zahtjevu")
    if r.status != "PENDING":
        raise HTTPException(400, "Request is not pending approval")
    # Ako je odabran odobravatelj - samo on (ili ADMIN) može odobriti
    if r.assigned_approver_id:
        if user.id != r.assigned_approver_id and user.role != "ADMIN":
            raise HTTPException(403, "Samo odabrani odobravatelj može odobriti ovaj zahtjev")
        db.add(Approval(request_id=r.id, step=1, approver_id=user.id, decision="APPROVED", comment=body.comment, decided_at=datetime.utcnow()))
        r.status = "APPROVED"
    else:
        # Stari tok po ulogama
        steps = get_required_approval_steps(r.amount_gross)
        done = {a.step: a for a in r.approvals if a.decision}
        next_step = next((s for s in steps if s not in done), None)
        if next_step is None:
            r.status = "APPROVED"
        else:
            role_for_step = {1: "MANAGER", 2: "FINANCE", 3: "CEO"}[next_step]
            if user.role != role_for_step and user.role != "ADMIN":
                raise HTTPException(403, f"Only {role_for_step} can approve this step")
            db.add(Approval(request_id=r.id, step=next_step, approver_id=user.id, decision="APPROVED", comment=body.comment, decided_at=datetime.utcnow()))
            db.flush()
            done[next_step] = {"step": next_step}
            next_step = next((s for s in steps if s not in done), None)
            if next_step is None:
                r.status = "APPROVED"
    db.commit()
    db.refresh(r)
    return _request_to_out(r, db)


@router.post("/{request_id}/reject", response_model=RequestOut)
def reject_request(
    request_id: int,
    body: ApproveRejectBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.comment:
        raise HTTPException(400, "Reject reason is required")
    r = db.query(Request).filter(Request.id == request_id).first()
    if not r:
        raise HTTPException(404, "Request not found")
    if not _user_can_see_request(user, r):
        raise HTTPException(403, "Nemate pristup ovom zahtjevu")
    if r.status != "PENDING":
        raise HTTPException(400, "Request is not pending")
    if r.assigned_approver_id:
        if user.id != r.assigned_approver_id and user.role != "ADMIN":
            raise HTTPException(403, "Samo odabrani odobravatelj može odbiti ovaj zahtjev")
        next_step = 1
    else:
        steps = get_required_approval_steps(r.amount_gross)
        done = {a.step for a in r.approvals if a.decision}
        next_step = next((s for s in steps if s not in done), None)
        if next_step is None:
            raise HTTPException(400, "Request already fully approved")
        role_for_step = {1: "MANAGER", 2: "FINANCE", 3: "CEO"}[next_step]
        if user.role != role_for_step and user.role != "ADMIN":
            raise HTTPException(403, f"Only {role_for_step} can reject this step")
    db.add(Approval(
        request_id=r.id,
        step=next_step,
        approver_id=user.id,
        decision="REJECTED",
        comment=body.comment,
        decided_at=datetime.utcnow(),
    ))
    r.status = "REJECTED"
    db.commit()
    db.refresh(r)
    try:
        notify_request_decision(db, r, approved=False, decided_by=user)
    except Exception:
        pass
    return _request_to_out(r, db)
