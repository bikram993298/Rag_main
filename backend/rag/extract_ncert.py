"""
Utility to extract text from NCERT PDF files into .txt files
for ingestion by ingest.py.

Usage:
    python -m backend.rag.extract_ncert <pdf_path> <output_txt_path>

Or call pdf_to_txt() directly from other scripts.

Requires: pymupdf  (pip install pymupdf)
"""

import sys
from pathlib import Path


def pdf_to_txt(pdf_path: str, output_path: str) -> int:
    """Extract all text from a PDF and write to a .txt file. Returns page count."""
    try:
        import fitz  # pymupdf
    except ImportError:
        raise ImportError("pymupdf is not installed. Run: pip install pymupdf")

    pdf_path = Path(pdf_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(pdf_path))
    pages = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text)

    full_text = "\n\n".join(pages)
    output_path.write_text(full_text, encoding="utf-8")

    print(f"Extracted {len(doc)} pages → {output_path}  ({len(full_text)} chars)")
    return len(doc)


def extract_directory(pdf_dir: str, output_dir: str) -> None:
    """Recursively extract all PDFs in pdf_dir into mirrored .txt files in output_dir."""
    pdf_dir = Path(pdf_dir)
    output_dir = Path(output_dir)

    pdfs = sorted(pdf_dir.rglob("*.pdf"))
    if not pdfs:
        print(f"No PDF files found in {pdf_dir}")
        return

    print(f"Found {len(pdfs)} PDF(s) in {pdf_dir}")
    for pdf in pdfs:
        relative = pdf.relative_to(pdf_dir)
        out = output_dir / relative.with_suffix(".txt")
        try:
            pdf_to_txt(str(pdf), str(out))
        except Exception as exc:
            print(f"  ✗ {pdf.name}: {exc}")


if __name__ == "__main__":
    if len(sys.argv) == 3:
        pdf_to_txt(sys.argv[1], sys.argv[2])
    elif len(sys.argv) == 2:
        # Single arg: treat as directory → extract all PDFs into data/ncert/
        base = Path(__file__).resolve().parents[2]
        out = base / "data" / "ncert"
        extract_directory(sys.argv[1], str(out))
    else:
        print("Usage:")
        print("  python -m backend.rag.extract_ncert <file.pdf> <output.txt>")
        print("  python -m backend.rag.extract_ncert <pdf_directory/>")
        sys.exit(1)
