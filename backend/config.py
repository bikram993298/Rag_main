from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Use GEMINI_MODEL env var now (default left as a placeholder). Set this in your .env
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.0")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "data/embeddings/faiss_index.idx")
ID_MAP_PATH = os.getenv("ID_MAP_PATH", "data/embeddings/id_to_text.pkl")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
EMBED_DIR = DATA_DIR / "embeddings"
EMBED_DIR.mkdir(parents=True, exist_ok=True)
