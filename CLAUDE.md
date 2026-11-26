# Cheat & Bot Detection in Competitive FPS Games

Guidelines and development instructions for this repository.

## Commands
- **Backend Run**: `uvicorn main:app --reload` (inside `backend/`)
- **Backend Tests**: `pytest` (from root or inside `backend/`)
- **Frontend Run**: `npm run dev` (inside `frontend/`)
- **Frontend Build**: `npm run build` (inside `frontend/`)
- **Dataset Prep (CS2CD)**: `python -m ml.dataset --matches 2`
- **ML Training**: `python -m ml.train`
- **ML Evaluation**: `python -m ml.evaluate`

## Architecture
- `backend/`: FastAPI backend handling `.dem` and `.parquet` match uploads, coordinating inference, and serving API requests.
- `ml/`: 31-feature engineering engine, model training, evaluation, and inference for anti-cheat detection.
- `frontend/`: React + TypeScript dashboard for displaying analysis reports, match telemetry, player profiles, and forensic proof cards.
- `crazy_demos/`: Pre-curated match datasets (`c_match_*.parquet` and `no_match_*.parquet`) for immediate upload testing.
- `data/`: Telemetry storage (`demos/` for raw replays, `processed/` for tabular features, `analysis/` for reports).
- `models/`: Saved model weights (`.joblib` and `.json` configs).
