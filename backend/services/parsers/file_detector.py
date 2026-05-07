from typing import Tuple, List, Dict
import logging

logger = logging.getLogger(__name__)

from .excel_parser import parse_excel
from .csv_parser import parse_csv
from .txt_parser import parse_txt
from .pdf_parser import parse_pdf
from .validator import validate_and_normalize

def process_file(file_bytes: bytes, filename: str) -> Tuple[List[Dict], List[str]]:
    ext = filename.rsplit(".", 1)[-1].lower()
    
    try:
        if ext in ("xlsx", "xls"):
            df = parse_excel(file_bytes)
        elif ext == "csv":
            df = parse_csv(file_bytes)
        elif ext == "txt":
            df = parse_txt(file_bytes)
        elif ext == "pdf":
            df = parse_pdf(file_bytes)
        else:
            return [], [f"Unsupported file type: .{ext}"]
            
        if df.empty:
            return [], ["The uploaded file contains no data."]
            
        return validate_and_normalize(df)
    except Exception as e:
        logger.error(f"Error parsing file {filename}: {e}", exc_info=True)
        return [], [f"Could not read or parse file: {e}"]
