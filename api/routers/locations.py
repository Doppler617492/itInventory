"""Locations (stores) router - for dropdown and add new."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Location

router = APIRouter()


class LocationOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class LocationCreate(BaseModel):
    name: str


@router.get("", response_model=list[LocationOut])
def list_locations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Location).order_by(Location.name).all()


@router.post("", response_model=LocationOut)
def create_location(
    data: LocationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(400, "Naziv je obavezan")
    existing = db.query(Location).filter(Location.name == name).first()
    if existing:
        return existing
    loc = Location(name=name)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc
