from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import chat as chat_router
from backend.api.routes import auth as auth_router
from backend.config import HOST, PORT
from backend.utils.database import init_db

app = FastAPI(title="jee-neet-rag (RAG + Auth)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
@app.on_event("startup")
async def startup_event():
    init_db()

app.include_router(auth_router.router, prefix="/api")
app.include_router(chat_router.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api.main:app",
        host=HOST,
        port=PORT,
        reload=True,
        reload_excludes=["backend/.venv/*", ".venv/*", "**/__pycache__/*", "**/*.pyc"],
    )
