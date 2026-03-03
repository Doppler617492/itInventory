"""Users API - list approvers, CRUD for admin."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.core.database import get_db
from api.core.security import get_password_hash
from api.dependencies import get_current_user
from api.models import User, Location, Sector, UserLocation, UserSector, AuditLog
from api.models.request import Request, Approval
from api.models.document import Document
from api.models.asset import Asset
from api.models.subscription import Subscription
from api.services.notifications import get_approvers, send_email_password_changed, send_email_account_deleted

router = APIRouter()


class UserOption(BaseModel):
    id: int
    name: str
    email: str
    role: str
    location_names: list[str] = []
    sector_names: list[str] = []


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str  # ADMIN, APPROVER, MANAGER, FINANCE, CEO
    location_id: int | None = None
    approver_location_ids: list[int] = []
    approver_sector_ids: list[int] = []


class ApproverScopeUpdate(BaseModel):
    location_ids: list[int] = []
    sector_ids: list[int] = []


class PasswordResetBody(BaseModel):
    new_password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    location_id: int | None
    location_name: str | None
    approver_location_ids: list[int] = []
    approver_sector_ids: list[int] = []
    approver_location_names: list[str] = []
    approver_sector_names: list[str] = []


def _require_admin(user: User) -> None:
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Samo administrator")


def _approver_matches_scope(u: User, store: str | None, sector: str | None) -> bool:
    """True ako odobravatelj pokriva store/sector (ili nema ograničenja = prima sve)."""
    loc_ids = [ul.location_id for ul in u.approver_locations]
    sec_ids = [us.sector_id for us in u.approver_sectors]
    has_scope = len(loc_ids) > 0 or len(sec_ids) > 0
    if not has_scope:
        return True  # Global - prima sve
    if store:
        for ul in u.approver_locations:
            if ul.location and ul.location.name == store:
                return True
    if sector:
        for us in u.approver_sectors:
            if us.sector and us.sector.name == sector:
                return True
    return False


@router.get("/approvers", response_model=list[UserOption])
def list_approvers(
    store: str | None = Query(None, description="Filtriraj po prodavnici/lokaciji"),
    sector: str | None = Query(None, description="Filtriraj po sektoru"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Lista odobravatelja. Opciono filtriraj po store/sector."""
    approvers = get_approvers(db)
    result = []
    for u in approvers:
        if store or sector:
            if not _approver_matches_scope(u, store, sector):
                continue
        loc_names = [ul.location.name for ul in u.approver_locations if ul.location]
        sec_names = [us.sector.name for us in u.approver_sectors if us.sector]
        result.append(UserOption(
            id=u.id, name=u.name, email=u.email, role=u.role,
            location_names=loc_names, sector_names=sec_names,
        ))
    return result


def _user_to_out(u: User) -> UserOut:
    loc_ids = [ul.location_id for ul in u.approver_locations]
    sec_ids = [us.sector_id for us in u.approver_sectors]
    loc_names = [ul.location.name for ul in u.approver_locations if ul.location]
    sec_names = [us.sector.name for us in u.approver_sectors if us.sector]
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        location_id=u.location_id,
        location_name=u.location.name if u.location else None,
        approver_location_ids=loc_ids,
        approver_sector_ids=sec_ids,
        approver_location_names=loc_names,
        approver_sector_names=sec_names,
    )


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Lista aktivnih korisnika (samo admin). Neaktivni/obrisani se ne prikazuju."""
    _require_admin(current)
    users = db.query(User).filter(User.is_active == True).order_by(User.name).all()
    return [_user_to_out(u) for u in users]


def _set_approver_scope(db: Session, user_id: int, location_ids: list[int], sector_ids: list[int]) -> None:
    """Postavi lokacije i sektore za odobravatelja."""
    db.query(UserLocation).filter(UserLocation.user_id == user_id).delete()
    db.query(UserSector).filter(UserSector.user_id == user_id).delete()
    for lid in location_ids:
        db.add(UserLocation(user_id=user_id, location_id=lid))
    for sid in sector_ids:
        db.add(UserSector(user_id=user_id, sector_id=sid))


@router.post("", response_model=UserOut)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Kreira novog korisnika (samo admin)."""
    _require_admin(current)
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email već postoji")
    loc_id = body.location_id
    loc = None
    if loc_id:
        loc = db.query(Location).filter(Location.id == loc_id).first()
        if not loc:
            raise HTTPException(status_code=400, detail="Lokacija nije pronađena")
    u = User(
        email=body.email,
        name=body.name.strip(),
        password_hash=get_password_hash(body.password),
        role=body.role,
        location_id=loc_id,
    )
    db.add(u)
    db.flush()
    if body.role == "APPROVER" and (body.approver_location_ids or body.approver_sector_ids):
        _set_approver_scope(db, u.id, body.approver_location_ids, body.approver_sector_ids)
    db.commit()
    db.refresh(u)
    return _user_to_out(u)


@router.patch("/{user_id}/password", response_model=UserOut)
def reset_password(
    user_id: int,
    body: PasswordResetBody,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Resetuj lozinku korisniku (samo admin). Šalje email obavijest."""
    _require_admin(current)
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Lozinka mora imati najmanje 6 karaktera")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    u.password_hash = get_password_hash(body.new_password)
    db.commit()
    db.refresh(u)
    try:
        send_email_password_changed(db, u.email, u.name)
    except Exception:
        pass
    return _user_to_out(u)


def _get_fallback_admin_id(db: Session, exclude_user_id: int) -> int | None:
    """Prvi ADMIN korisnik (za reassign), isključujući exclude_user_id."""
    u = db.query(User).filter(User.role == "ADMIN", User.id != exclude_user_id).first()
    return u.id if u else None


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Ukloni korisnika iz baze (hard delete). Reassignira requeste i dokumente, šalje email."""
    _require_admin(current)
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Ne možete ukloniti vlastiti nalog")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    email, name = u.email, u.name

    admin_id = _get_fallback_admin_id(db, user_id) or current.id

    db.query(Request).filter(Request.requester_id == user_id).update({"requester_id": admin_id})
    db.query(Request).filter(Request.assigned_approver_id == user_id).update({"assigned_approver_id": None})
    db.query(Approval).filter(Approval.approver_id == user_id).update({"approver_id": None})
    db.query(Document).filter(Document.uploaded_by == user_id).update({"uploaded_by": admin_id})
    db.query(Asset).filter(Asset.assigned_to == user_id).update({"assigned_to": None})
    db.query(Subscription).filter(Subscription.owner_user_id == user_id).update({"owner_user_id": None})
    db.query(AuditLog).filter(AuditLog.actor_id == user_id).update({"actor_id": None})

    db.delete(u)
    db.flush()
    db.commit()
    try:
        send_email_account_deleted(db, email, name)
    except Exception:
        pass
    return {"ok": True, "message": "Korisnik uklonjen"}


@router.patch("/{user_id}/approver-scope", response_model=UserOut)
def update_approver_scope(
    user_id: int,
    body: ApproverScopeUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Ažuriraj scope odobravatelja (prodavnice i sektori) - samo admin."""
    _require_admin(current)
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")
    if u.role not in ("APPROVER", "ADMIN", "MANAGER", "CEO"):
        raise HTTPException(status_code=400, detail="Samo odobravatelji mogu imati scope")
    _set_approver_scope(db, user_id, body.location_ids, body.sector_ids)
    db.commit()
    db.refresh(u)
    return _user_to_out(u)
