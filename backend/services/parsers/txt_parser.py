import pandas as pd
import re
import io

def parse_txt(file_bytes: bytes) -> pd.DataFrame:
    text = file_bytes.decode("utf-8", errors="replace")
    
    # Try CSV fallback if commas exist
    if "," in text and "\n" in text:
        try:
            df = pd.read_csv(io.StringIO(text), dtype=str)
            if len(df.columns) > 1:
                return df
        except:
            pass

    lines = text.split("\n")
    record = {}
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Support fat: 3.4, fat = 3.4, or fat 3.4
        match = re.match(r'^([^:=]+)[:=]\s*(.*)$', line)
        if match:
            key, val = match.groups()
            record[key.strip().lower()] = val.strip()

    if record:
        return pd.DataFrame([record])
    else:
        raise ValueError("Could not extract structured data from text file.")
