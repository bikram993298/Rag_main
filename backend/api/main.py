from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import chat as chat_router
from backend.api.routes import auth as auth_router
from backend.api.routes import dashboard as dashboard_router
from backend.api.routes import flashcards as flashcards_router
from backend.api.routes import exam as exam_router
from backend.config import HOST, PORT
from backend.utils.database import init_db

app = FastAPI(title="jee-neet-rag (RAG + Auth + Dashboard)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

app.include_router(auth_router.router, prefix="/api")
app.include_router(chat_router.router, prefix="/api")
app.include_router(dashboard_router.router, prefix="/api")
app.include_router(flashcards_router.router, prefix="/api")
app.include_router(exam_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api.main:app",
        host=HOST,
        port=PORT,
        reload=True,
        reload_excludes=["backend/.venv/*", ".venv/*", "**/__pycache__/*", "**/*.pyc"],
    )
