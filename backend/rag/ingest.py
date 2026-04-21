import os
import re
from pathlib import Path
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import pickle
from tqdm import tqdm

BASE = Path(__file__).resolve().parents[2]  # Go up one more level to reach project root
DATA_DIR = BASE / "data"
NCERT_DIR = DATA_DIR / "ncert"
EMBED_DIR = DATA_DIR / "embeddings"
EMBED_DIR.mkdir(parents=True, exist_ok=True)
INDEX_PATH = EMBED_DIR / "faiss_index.idx"
ID_MAP_PATH = EMBED_DIR / "id_to_text.pkl"
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

CHUNK_SIZE = 450
CHUNK_OVERLAP = 80

model = SentenceTransformer(MODEL_NAME)

def smart_chunk(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    sentences = re.split(r'(?<=[.!?])\s+', text.replace("\n", " ").strip())
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current and current_len + sentence_len > chunk_size:
            chunk = " ".join(current).strip()
            if chunk:
                chunks.append(chunk)

            overlap_sentences = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) > overlap:
                    break
                overlap_sentences.insert(0, s)
                overlap_len += len(s)

            current = overlap_sentences + [sentence]
            current_len = sum(len(s) for s in current)
        else:
            current.append(sentence)
            current_len += sentence_len

    if current:
        chunk = " ".join(current).strip()
        if chunk:
            chunks.append(chunk)

    return chunks


def infer_subject_and_chapter(file_path: Path):
    rel = file_path.relative_to(NCERT_DIR)
    parts = rel.parts
    if len(parts) >= 2:
        subject = parts[0]
        chapter = file_path.stem
    else:
        subject = "general"
        chapter = file_path.stem
    return subject, chapter

if __name__ == "__main__":
    print(f"Looking for text files in: {NCERT_DIR}")
    texts = []
    ids = []
    metadata = []
    file_paths = sorted(NCERT_DIR.rglob("*.txt"))
    print(f"Found {len(file_paths)} text files")
    idx_counter = 0

    for fp in file_paths:
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read()
        chunks = smart_chunk(content)
        subject, chapter = infer_subject_and_chapter(fp)
        for c in chunks:
            texts.append(c)
            ids.append(idx_counter)
            metadata.append(
                {
                    "subject": subject,
                    "chapter": chapter,
                    "source": str(fp.relative_to(BASE)),
                }
            )
            idx_counter += 1

    if not texts:
        print("No text files found in data/ncert/. Add .txt files first.")
        exit(1)

    print(f"Embedding {len(texts)} chunks with {MODEL_NAME} ...")
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    dim = embeddings.shape[1]

    print("Building FAISS index...")
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings.astype('float32'))

    print(f"Saving index -> {INDEX_PATH}")
    faiss.write_index(index, str(INDEX_PATH))

    print(f"Saving id->text map -> {ID_MAP_PATH}")
    id_to_text = {
        i: {"text": t, "metadata": m}
        for i, t, m in zip(ids, texts, metadata)
    }
    with open(ID_MAP_PATH, 'wb') as f:
        pickle.dump(id_to_text, f)

    print("Done.")
