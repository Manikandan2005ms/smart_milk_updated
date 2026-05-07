import pandas as pd
import io

def parse_excel(file_bytes: bytes) -> pd.DataFrame:
    return pd.read_excel(io.BytesIO(file_bytes), dtype=str)
