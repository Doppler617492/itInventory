"""Sectors router - for dropdown and add new."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Sector

router = APIRouter()


class SectorOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class SectorCreate(BaseModel):
    name: str


@router.get("", response_model=list[SectorOut])
def list_sectors(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Sector).order_by(Sector.name).all()


@router.post("", response_model=SectorOut)
def create_sector(
    data: SectorCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "Naziv je obavezan")
    existing = db.query(Sector).filter(Sector.name == name).first()
    if existing:
        return existing
    sec = Sector(name=name)
    db.add(sec)
    db.commit()
    db.refresh(sec)
    return sec
