"""Seed database with demo data."""
import os
import sys
from pathlib import Path

# Ensure we can import api
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal

from api.core.database import SessionLocal, init_db
from api.core.security import get_password_hash
from api.models import User, Vendor, Request, RequestItem, Invoice, Asset, Subscription, Location, Sector


def seed(db: Session):
    # Admin user - it@cungu.com
    admin = db.query(User).filter(User.email == "it@cungu.com").first()
    if not admin:
        admin = User(
            email="it@cungu.com",
            name="IT Admin",
            password_hash=get_password_hash("Dekodera1989@"),
            role="ADMIN",
        )
        db.add(admin)
        db.flush()
    else:
        admin.role = "ADMIN"
        db.flush()

    # Fallback admin za demo (admin@company.com)
    demo_admin = db.query(User).filter(User.email == "admin@company.com").first()
    if not demo_admin:
        demo_admin = User(
            email="admin@company.com",
            name="Admin User",
            password_hash=get_password_hash("admin123"),
            role="ADMIN",
        )
        db.add(demo_admin)
        db.flush()

    # Other users - uključujući odobravatelje
    users_data = [
        ("sarah@company.com", "Sarah Johnson", "APPROVER"),
        ("james@company.com", "James Wilson", "APPROVER"),
        ("mike@company.com", "Mike Chen", "APPROVER"),
        ("emily@company.com", "Emily Davis", "APPROVER"),
        ("lisa@company.com", "Lisa Anderson", "CEO"),
        ("david@company.com", "David Martinez", "APPROVER"),
    ]
    users = [admin, demo_admin]
    for email, name, role in users_data:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(
                email=email,
                name=name,
                password_hash=get_password_hash("demo123"),
                role=role,
            )
            db.add(u)
            db.flush()
        users.append(u)

    # Vendors
    vendors_data = [
        ("Apple Inc.", "123456789", "1 Infinite Loop, Cupertino"),
        ("Adobe Systems", "987654321", "345 Park Ave, San Jose"),
        ("Dell Technologies", "555555555", "One Dell Way, Round Rock"),
        ("Microsoft Corp.", "111222333", "One Microsoft Way, Redmond"),
        ("Cisco Systems", "444555666", "170 West Tasman Dr, San Jose"),
    ]
    vendors = []
    for name, pib, addr in vendors_data:
        v = db.query(Vendor).filter(Vendor.name == name).first()
        if not v:
            v = Vendor(name=name, pib=pib, address=addr)
            db.add(v)
            db.flush()
        vendors.append(v)

    # Locations (for dropdown)
    locations_data = [
        "Prodavnica - Ulcinj Ctc",
        "Prodavnica - Budva",
        "Prodavnica - Ulcinj",
        "Prodavnica - Podgorica Centar",
        "Prodavnica - Podgorica 2",
        "Prodavnica - Niksic",
        "Prodavnica - Kotor Centar",
        "Prodavnica - Bar Centar",
        "Prodavnica - Bar",
        "Prodavnica - Bijelo polje",
        "Prodavnica - Berane Centar",
        "Prodavnica - Herceg Novi",
        "Prodavnica - Herceg Novi Centar",
        "Administracija",
    ]
    for name in locations_data:
        if not db.query(Location).filter(Location.name == name).first():
            db.add(Location(name=name))

    # Sectors (for dropdown)
    sectors_data = [
        "IT Sektor",
        "Komerciala",
        "Logistika",
        "Marketing OnlineShop",
        "Financije",
        "Bankarstvo",
        "Manadzment",
        "Pravna Sluzba",
        "HQ",
        "Prodavnice",
    ]
    for name in sectors_data:
        if not db.query(Sector).filter(Sector.name == name).first():
            db.add(Sector(name=name))
    db.flush()

    # Requests
    stores = [
        "Prodavnica - Ulcinj Ctc",
        "Prodavnica - Budva",
        "Prodavnica - Ulcinj",
        "Prodavnica - Podgorica Centar",
        "Prodavnica - Podgorica 2",
        "Prodavnica - Niksic",
        "Prodavnica - Kotor Centar",
        "Prodavnica - Bar Centar",
        "Prodavnica - Bar",
        "Prodavnica - Bijelo polje",
        "Prodavnica - Berane Centar",
        "Prodavnica - Herceg Novi",
        "Prodavnica - Herceg Novi Centar",
        "Administracija",
    ]
    sectors = [
        "IT Sektor",
        "Komerciala",
        "Logistika",
        "Marketing OnlineShop",
        "Financije",
        "Bankarstvo",
        "Manadzment",
        "Pravna Sluzba",
        "HQ",
        "Prodavnice",
    ]
    if db.query(Request).count() == 0:
        reqs_data = [
            ("MacBook Pro 16\" M3", "Laptop for design team", stores[0], sectors[0], 2499, 1, "APPROVED", vendors[0].id),
            ("Adobe Creative Cloud - Annual", "Annual license for design", stores[0], sectors[0], 2999, 1, "PENDING", vendors[1].id),
            ("Dell UltraSharp 27\" Monitor x5", "Monitors for Store B", stores[2], sectors[1], 379, 5, "ORDERED", vendors[2].id),
            ("Microsoft Office 365 Business", "50 seats", stores[3], sectors[4], 24, 50, "DELIVERED", vendors[3].id),
            ("Cisco Network Switch", "Server room upgrade", stores[0], sectors[0], 3850, 1, "REJECTED", vendors[4].id),
            ("iPhone 15 Pro x3", "Field sales devices", stores[4], sectors[1], 1199, 3, "DRAFT", vendors[0].id),
        ]
        for i, (title, desc, store, sector, unit_price, qty, status, vendor_id) in enumerate(reqs_data):
            code = f"REQ-2024-{i+1:03d}"
            net = Decimal(str(unit_price * qty))
            gross = net * Decimal("1.2")
            r = Request(
                code=code,
                title=title,
                description=desc,
                store=store,
                sector=sector,
                requester_id=users[(i % 5) + 1].id,
                vendor_id=vendor_id,
                amount_net=net,
                vat_rate=Decimal("20"),
                amount_gross=gross,
                currency="EUR",
                priority="MEDIUM",
                status=status,
            )
            db.add(r)
            db.flush()
            db.add(RequestItem(
                request_id=r.id,
                name=title,
                qty=qty,
                unit_price_net=Decimal(str(unit_price)),
                vat_rate=Decimal("20"),
                total_gross=gross,
            ))

    # Invoices (vendor: Apple, Adobe, Dell, Microsoft, Cisco)
    if db.query(Invoice).count() == 0:
        inv_data = [
            ("APL-2024-0045", date(2024, 2, 28), 2998.8, "APPROVED_FOR_PAYMENT", 1, 0),
            ("ADB-2024-0128", date(2024, 2, 27), 3598.8, "MATCHED", 2, 1),
            ("DEL-2024-1142", date(2024, 2, 26), 2274, "CHECKED", 3, 2),
            ("MSF-2024-0892", date(2024, 2, 25), 1440, "PAID", 4, 3),
            ("CSC-2024-0567", date(2024, 2, 24), 4620, "RECEIVED", None, 4),
        ]
        for inv_no, inv_date, amt, status, req_id, v_idx in inv_data:
            net = Decimal(str(round(amt / 1.2, 2)))
            gross = Decimal(str(amt))
            db.add(Invoice(
                request_id=req_id,
                vendor_id=vendors[v_idx].id,
                invoice_no=inv_no,
                invoice_date=inv_date,
                amount_net=net,
                vat_rate=Decimal("20"),
                amount_gross=gross,
                currency="EUR",
                status=status,
            ))


    # Assets
    if db.query(Asset).count() == 0:
        assets_data = [
            ("MacBook Pro 16\" M3", "C02YQ3JXMD6M", stores[0], users[1].id, date(2024, 1, 15), date(2026, 1, 15), 2499),
            ("Dell UltraSharp 27\" Monitor", "DL-US27-8845621", stores[1], users[2].id, date(2024, 2, 1), date(2027, 2, 1), 379),
            ("iPhone 15 Pro", "FMGX3LL/A-128945", stores[2], users[3].id, date(2023, 12, 10), date(2024, 12, 10), 1199),
        ]
        for name, serial, loc, uid, pdate, wdate, cost in assets_data:
            db.add(Asset(
                name=name,
                serial_no=serial,
                location=loc,
                assigned_to=uid,
                purchase_date=pdate,
                warranty_until=wdate,
                cost_gross=Decimal(str(cost)),
            ))

    # Subscriptions
    if db.query(Subscription).count() == 0:
        subs_data = [
            ("Adobe Creative Cloud", vendors[1].id, 2999, "YEARLY", date(2025, 2, 15), 12),
            ("Microsoft 365 Business", vendors[3].id, 1200, "MONTHLY", date(2024, 3, 28), 50),
            ("Slack Enterprise", vendors[1].id, 850, "MONTHLY", date(2024, 3, 15), 35),
        ]
        for name, vid, cost, cycle, renewal, seats in subs_data:
            db.add(Subscription(
                name=name,
                vendor_id=vid,
                cost=Decimal(str(cost)),
                billing_cycle=cycle,
                renewal_date=renewal,
                seats=seats,
                status="ACTIVE",
            ))

    db.commit()
    print("Seed completed.")


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
