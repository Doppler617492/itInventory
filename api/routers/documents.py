"""Documents router - upload and download."""
from __future__ import annotations
import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from api.core.config import get_settings
from api.core.database import get_db
from api.dependencies import get_current_user
from api.models import User, Document

router = APIRouter()

ALLOWED_EXT = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".gif"}
ALLOWED_MIME = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/gif",
}


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    request_id: Optional[int] = Form(None),
    invoice_id: Optional[int] = Form(None),
    doc_type: str = Form("OTHER"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = get_settings()
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, f"File type not allowed. Use: {', '.join(ALLOWED_EXT)}")
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = file.file.read()
    if len(content) > max_bytes:
        raise HTTPException(400, f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    stem = uuid.uuid4().hex[:12]
    save_name = f"{stem}{ext}"
    save_path = upload_dir / save_name
    with open(save_path, "wb") as f:
        f.write(content)
    rel_path = str(save_path)
    doc = Document(
        request_id=request_id,
        invoice_id=invoice_id,
        uploaded_by=user.id,
        doc_type=doc_type,
        filename=file.filename or save_name,
        mime=file.content_type,
        size=len(content),
        storage_path=rel_path,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "filename": doc.filename,
        "size": doc.size,
        "mime": doc.mime,
    }


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not os.path.isfile(doc.storage_path):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(
        doc.storage_path,
        filename=doc.filename,
        media_type=doc.mime or "application/octet-stream",
    )
