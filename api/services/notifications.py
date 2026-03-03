"""Notification and email service."""
from sqlalchemy.orm import Session
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from api.core.config import get_settings
from api.models import User, Request, Notification, AppConfig


def _get_smtp_config(db: Session):
    """Učitaj SMTP iz baze (AppConfig). Fallback na env."""
    r = db.query(AppConfig).filter(AppConfig.key.in_(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"])).all()
    cfg = {x.key: x.value for x in r}
    env = get_settings()
    return {
        "host": cfg.get("smtp_host") or env.SMTP_HOST,
        "port": int(cfg.get("smtp_port") or env.SMTP_PORT or "587"),
        "user": cfg.get("smtp_user") or env.SMTP_USER,
        "password": cfg.get("smtp_password") or env.SMTP_PASSWORD,
        "from": cfg.get("smtp_from") or env.SMTP_FROM or "IT Nabavka <noreply@company.com>",
    }


def get_users_to_notify(db: Session) -> list[User]:
    """Korisnici koji treba da primaju notifikacije: ADMIN, MANAGER, FINANCE, CEO."""
    return db.query(User).filter(
        User.is_active == True,
        User.role.in_(["ADMIN", "MANAGER", "FINANCE", "CEO"])
    ).all()


def create_notification(db: Session, user_id: int, title: str, message: str = None, type: str = "INFO", link: str = None):
    """Kreira notifikaciju u bazi."""
    n = Notification(user_id=user_id, title=title, message=message, type=type, link=link)
    db.add(n)
    db.flush()
    return n


def send_email(db: Session, to_email: str, subject: str, body_html: str):
    """Šalje email preko SMTP (konfig iz baze ili env)."""
    cfg = _get_smtp_config(db)
    if not cfg["host"] or not cfg["user"]:
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = cfg["from"]
        msg["To"] = to_email
        msg.attach(MIMEText(body_html.replace("<br>", "\n"), "plain"))
        msg.attach(MIMEText(body_html, "html"))
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.starttls()
            server.login(cfg["user"], cfg["password"] or "")
            server.sendmail(cfg["from"], to_email, msg.as_string())
    except Exception:
        pass


def get_approvers(db: Session) -> list[User]:
    """Korisnici koji mogu primati zahtjeve na odobrenje: APPROVER, MANAGER, CEO, ADMIN (bez FINANCE)."""
    return db.query(User).filter(
        User.is_active == True,
        User.role.in_(["APPROVER", "MANAGER", "CEO", "ADMIN"])
    ).order_by(User.name).all()


def notify_request_submitted(db: Session, request: Request, requester_name: str):
    """Kreira notifikaciju podnosiocu, odabranom odobravatelju i it@cungu.com (admin) kada se zahtjev pošalje na odobrenje."""
    title = f"Zahtjev čeka odobrenje: {request.title}"
    message = f"{requester_name} je poslao zahtjev '{request.title}' (€{request.amount_gross}) na odobrenje."
    link = f"/requests/{request.id}"
    html = f"""
    <h3>Zahtjev čeka odobrenje</h3>
    <p><strong>{request.title}</strong></p>
    <p>Podnosioc: {requester_name}</p>
    <p>Iznos: €{request.amount_gross}</p>
    <p><a href="{link}">Odobri ili odbij</a></p>
    """
    # Obavijesti podnosioca da je zahtjev poslan
    if request.requester_id:
        create_notification(
            db,
            request.requester_id,
            "Zahtjev poslan na odobrenje",
            f"Vaš zahtjev '{request.title}' je poslan na odobrenje. Bićete obaviješteni kada odobravatelj donese odluku.",
            "PENDING_APPROVAL",
            link,
        )
    # Uvijek obavijesti it@cungu.com (admin)
    admin = db.query(User).filter(User.email == "it@cungu.com").first()
    if admin and admin.id != request.requester_id:
        create_notification(db, admin.id, title, message, "PENDING_APPROVAL", link)
        send_email(db, admin.email, f"[IT Nabavka] Zahtjev čeka odobrenje: {request.title}", html)
    # Obavijesti odabranog odobravatelja
    approver_id = request.assigned_approver_id
    if approver_id:
        approver = db.query(User).filter(User.id == approver_id).first()
        if approver and approver.id != request.requester_id and (not admin or approver.id != admin.id):
            create_notification(db, approver.id, title, message, "PENDING_APPROVAL", link)
            send_email(db, approver.email, f"[IT Nabavka] Zahtjev čeka odobrenje: {request.title}", html)


def send_email_password_changed(db: Session, to_email: str, user_name: str):
    """Obavijesti korisnika da mu je lozinka promijenjena."""
    subject = "[IT Nabavka] Lozinka je promijenjena"
    html = f"""
    <h3>Lozinka promijenjena</h3>
    <p>Poštovani/a {user_name},</p>
    <p>Administrator je resetovao Vašu lozinku za IT Nabavka sistem.</p>
    <p>Za prijavu koristite novu lozinku koju Vam je administrator dostavio.</p>
    <p>Ako niste zatražili ovu promjenu, kontaktirajte administratora.</p>
    """
    send_email(db, to_email, subject, html)


def send_email_account_deleted(db: Session, to_email: str, user_name: str):
    """Obavijesti korisnika da mu je nalog uklonjen."""
    subject = "[IT Nabavka] Nalog je uklonjen"
    html = f"""
    <h3>Nalog uklonjen</h3>
    <p>Poštovani/a {user_name},</p>
    <p>Vaš nalog za IT Nabavka sistem je uklonjen od strane administratora.</p>
    <p>Više nemate pristup aplikaciji.</p>
    <p>Ako mislite da je ovo greška, kontaktirajte administratora.</p>
    """
    send_email(db, to_email, subject, html)


def notify_new_request(db: Session, request: Request, requester_name: str):
    """Kreira notifikaciju podnosiocu, it@cungu.com i odabranom odobravatelju kada se kreira novi zahtjev."""
    title = f"Novi zahtjev: {request.title}"
    message = f"{requester_name} je kreirao novi zahtjev '{request.title}' (€{request.amount_gross})."
    link = f"/requests/{request.id}"
    html = f"""
    <h3>Novi zahtjev za nabavku</h3>
    <p><strong>{request.title}</strong></p>
    <p>Podnosioc: {requester_name}</p>
    <p>Iznos: €{request.amount_gross}</p>
    <p>Lokacija: {request.store}</p>
    <p>Sektor: {request.sector or '-'}</p>
    <p><a href="{link}">Pogledaj zahtjev</a></p>
    """
    # Uvijek obavijesti podnosioca (potvrda da je zahtjev kreiran)
    if request.requester_id:
        create_notification(
            db,
            request.requester_id,
            "Zahtjev kreiran",
            f"Vaš zahtjev '{request.title}' je uspješno kreiran. Možete ga poslati na odobrenje kada budete spremni.",
            "NEW_REQUEST",
            link,
        )
    admin = db.query(User).filter(User.email == "it@cungu.com").first()
    if admin and admin.id != request.requester_id:
        create_notification(db, admin.id, title, message, "NEW_REQUEST", link)
        send_email(db, admin.email, f"[IT Nabavka] Novi zahtjev: {request.title}", html)
    approver_id = request.assigned_approver_id
    if approver_id:
        approver = db.query(User).filter(User.id == approver_id).first()
        if approver and approver.id != request.requester_id and (not admin or approver.id != admin.id):
            create_notification(db, approver.id, title, f"{requester_name} Vas je odabrao za odobrenje.", "NEW_REQUEST", link)
            send_email(db, approver.email, f"[IT Nabavka] Novi zahtjev: {request.title}", html)


def notify_request_decision(db: Session, request: Request, approved: bool, decided_by: User):
    """Notifikacije kada odobravatelj odobri ili odbije zahtjev."""
    link = f"/requests/{request.id}"
    status_text = "odobren" if approved else "odbijen"
    title = f"Zahtjev je {status_text}: {request.title}"
    msg = f"Korisnik {decided_by.name} je {status_text} zahtjev '{request.title}'."
    # Podnosioc
    if request.requester_id:
        create_notification(
            db,
            request.requester_id,
            title,
            msg,
            "APPROVED" if approved else "REJECTED",
            link,
        )
    # Admin (it@cungu.com)
    admin = db.query(User).filter(User.email == "it@cungu.com").first()
    if admin and admin.id != request.requester_id:
        create_notification(
            db,
            admin.id,
            title,
            msg,
            "APPROVED" if approved else "REJECTED",
            link,
        )
