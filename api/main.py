"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import get_settings
from api.core.database import init_db, get_db
from api.dependencies import get_current_user
from api.models import User
from api.routers import auth, requests, documents, invoices, assets, subscriptions, reports, vendors, dashboard, locations, sectors, notifications, settings_api, users
from api.seed_data import seed

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="IT Procurement & Finance API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["vendors"])
app.include_router(locations.router, prefix="/api/locations", tags=["locations"])
app.include_router(sectors.router, prefix="/api/sectors", tags=["sectors"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["settings"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


@app.post("/api/seed")
def run_seed(db=Depends(get_db), user: User = Depends(get_current_user)):
    """Popuni bazu demo podacima (samo za admin nalog)."""
    if user.role != "ADMIN":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Samo administrator")
    seed(db)
    return {"ok": True, "message": "Demo podaci ubačeni."}


@app.get("/health")
def health():
    return {"status": "ok"}
