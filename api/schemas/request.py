"""Request schemas."""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from typing import Optional


class RequestItemCreate(BaseModel):
    name: str
    qty: int = 1
    unit_price_net: Decimal
    vat_rate: Decimal = 21
    discount_pct: Optional[Decimal] = 0  # Opcioni rabat u %


class RequestItemOut(BaseModel):
    id: int
    name: str
    qty: int
    unit_price_net: Decimal
    vat_rate: Decimal
    discount_pct: Optional[Decimal] = None
    total_gross: Decimal

    class Config:
        from_attributes = True


class ApprovalOut(BaseModel):
    id: int
    step: int
    approver_id: Optional[int]
    decision: Optional[str]
    comment: Optional[str]
    decided_at: Optional[datetime]

    class Config:
        from_attributes = True


class RequestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    store: str
    sector: Optional[str] = None
    assigned_approver_id: Optional[int] = None  # Kome se šalje za odobrenje
    vendor_id: Optional[int] = None
    amount_net: Decimal
    vat_rate: Decimal = 21
    currency: str = "EUR"
    priority: str = "MEDIUM"
    items: Optional[list[RequestItemCreate]] = None


class RequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    store: Optional[str] = None
    sector: Optional[str] = None
    assigned_approver_id: Optional[int] = None
    vendor_id: Optional[int] = None
    amount_net: Optional[Decimal] = None
    vat_rate: Optional[Decimal] = None
    priority: Optional[str] = None
    items: Optional[list[RequestItemCreate]] = None


class RequestOut(BaseModel):
    id: int
    code: str
    title: str
    description: Optional[str]
    store: str
    sector: Optional[str] = None
    requester_id: int
    assigned_approver_id: Optional[int] = None
    vendor_id: Optional[int]
    amount_net: Decimal
    vat_rate: Decimal
    amount_gross: Decimal
    currency: str
    priority: str
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    requester_name: Optional[str] = None
    vendor_name: Optional[str] = None

    class Config:
        from_attributes = True


class LinkedInvoiceOut(BaseModel):
    id: int
    invoice_no: str
    doc_type: str  # INVOICE, PROFORMA
    invoice_date: Optional[str] = None
    status: str = "RECEIVED"


class ApprovalFlowStepOut(BaseModel):
    step: str
    approver: str
    status: str  # approved, rejected, pending
    date: Optional[str] = None
    comment: Optional[str] = None


class RequestDetailOut(RequestOut):
    items: list[RequestItemOut] = []
    approvals: list[ApprovalOut] = []
    approval_flow: list[ApprovalFlowStepOut] = []
    invoices: list[LinkedInvoiceOut] = []


class ApproveRejectBody(BaseModel):
    comment: Optional[str] = None
