import pathlib, pandas as pd
path = pathlib.Path('data/processed/test_features.parquet')
if path.exists():
    df = pd.read_parquet(path)
    print('Rows:', len(df))
    print('Columns:', len(df.columns))
    print(df.head())
    print('Class counts:')
    print(df['is_cheater'].value_counts())
else:
    print('Test file missing')
