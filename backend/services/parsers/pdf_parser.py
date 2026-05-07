import pandas as pd
import pdfplumber
import io
import re

def parse_pdf(file_bytes: bytes) -> pd.DataFrame:
    records = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            # 1. Try extracting tables
            tables = page.extract_tables()
            for table in tables:
                if len(table) > 1:
                    headers = [str(h).lower().strip().replace('\n', ' ') for h in table[0] if h]
                    for row in table[1:]:
                        if len(row) == len(headers):
                            tbl_record = {headers[i]: str(row[i]).replace('%', '').strip() for i in range(len(headers))}
                            records.append(tbl_record)
            
            # 2. Try text key-value extraction if no tables matched cleanly
            text = page.extract_text()
            if text:
                lines = text.split("\n")
                record = {}
                for line in lines:
                    match = re.match(r'^([^:=]+)[:=]\s*(.*)$', line)
                    if match:
                        key, val = match.groups()
                        val = val.replace('%', '').strip()
                        record[key.strip().lower()] = val
                if record and not any(record == r for r in records):
                    records.append(record)

    if records:
        return pd.DataFrame(records)
    else:
        raise ValueError("Could not extract any data or tables from PDF.")
