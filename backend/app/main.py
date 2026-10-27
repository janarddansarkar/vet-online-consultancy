from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db_setup import prepare_database
from app.routers import admin, appointments, auth, pets


@asynccontextmanager
async def lifespan(app: FastAPI):
    prepare_database()
    yield


# Interactive API docs only for local development; the live site doesn't expose the API schema.
_is_local = settings.app_base_url.startswith("http://localhost")
app = FastAPI(
    title="Vet Online Consultancy API",
    lifespan=lifespan,
    docs_url="/docs" if _is_local else None,
    redoc_url=None,
    openapi_url="/openapi.json" if _is_local else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(appointments.router)
app.include_router(admin.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
