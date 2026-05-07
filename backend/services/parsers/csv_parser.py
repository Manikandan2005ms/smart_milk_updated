import pandas as pd
import io

def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    return pd.read_csv(io.StringIO(file_bytes.decode("utf-8", errors="replace")), dtype=str)
