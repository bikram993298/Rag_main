from sentence_transformers import SentenceTransformer
from sentence_transformers import CrossEncoder
import faiss
import numpy as np
import pickle
from pathlib import Path
from backend.config import FAISS_INDEX_PATH, ID_MAP_PATH, EMBEDDING_MODEL

_model = None
_reranker = None
_index = None
_id_map = None

def _load_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _load_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker

def _load_index():
    global _index
    if _index is None:
        if not Path(FAISS_INDEX_PATH).exists():
            raise FileNotFoundError(f"FAISS index not found at {FAISS_INDEX_PATH}. Run rag/ingest.py")
        _index = faiss.read_index(str(FAISS_INDEX_PATH))
    return _index

def _load_id_map():
    global _id_map
    if _id_map is None:
        with open(ID_MAP_PATH, 'rb') as f:
            _id_map = pickle.load(f)
    return _id_map


def _extract_chunk(id_map, idx: int):
    value = id_map.get(idx)
    if value is None:
        value = id_map.get(str(idx))
    if value is None:
        return None
    if isinstance(value, dict):
        return value.get("text")
    return value

def retrieve_context(query: str, k: int = 5):
    model = _load_model()
    index = _load_index()
    id_map = _load_id_map()

    candidate_k = max(20, k * 4)
    candidate_k = min(candidate_k, index.ntotal) if index.ntotal > 0 else k

    q_emb = model.encode([query], convert_to_numpy=True)
    _, indices = index.search(q_emb.astype('float32'), candidate_k)

    candidates = []
    for idx in indices[0]:
        chunk = _extract_chunk(id_map, int(idx))
        if chunk:
            candidates.append(chunk)

    if not candidates:
        return ""

    try:
        reranker = _load_reranker()
        pairs = [[query, chunk] for chunk in candidates]
        scores = reranker.predict(pairs)
        ranked = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
        final_chunks = [chunk for _, chunk in ranked[:k]]
    except Exception:
        # Fallback to plain FAISS ranking if reranker fails to load.
        final_chunks = candidates[:k]

    return "\n\n---\n\n".join(final_chunks)
