import pdfplumber
import os
from pathlib import Path

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file and save it to a text file in the same directory."""
    try:
        # Convert PDF path to Path object
        pdf_path = Path(pdf_path)
        
        # Create output path (same name but with .txt extension)
        output_path = pdf_path.with_suffix('.txt')
        
        # Extract text from PDF
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        
        # Save the extracted text
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        print(f"✅ Successfully extracted text from {pdf_path.name}")
        return True
    except Exception as e:
        print(f"❌ Error processing {pdf_path.name}: {str(e)}")
        return False

def process_pdfs():
    """Process all PDF files in the ncert directory."""
    # Get the base directory (project root)
    base_dir = Path(__file__).resolve().parent.parent
    ncert_dir = base_dir / "data" / "ncert"
    
    # Ensure the directory exists
    if not ncert_dir.exists():
        print(f"Directory not found: {ncert_dir}")
        return
    
    # Find all PDF files
    pdf_files = list(ncert_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("No PDF files found in data/ncert")
        return
    
    print(f"Found {len(pdf_files)} PDF files to process...")
    
    # Process each PDF file
    success_count = 0
    for pdf_file in pdf_files:
        if extract_text_from_pdf(pdf_file):
            success_count += 1
    
    print(f"\nProcessing complete!")
    print(f"Successfully processed {success_count} out of {len(pdf_files)} files")

if __name__ == "__main__":
    process_pdfs()
