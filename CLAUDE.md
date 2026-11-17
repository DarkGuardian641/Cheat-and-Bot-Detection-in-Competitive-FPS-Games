# Cheat & Bot Detection in Competitive FPS Games

Guidelines and development instructions for this repository.

## Commands
- **Backend Run**: `uvicorn main:app --reload` (inside `backend/`)
- **Backend Tests**: `pytest tests` (inside `backend/`)
- **Frontend Run**: `npm run dev` (inside `frontend/`)
- **Frontend Build**: `npm run build` (inside `frontend/`)
- **Dataset Prep (CS2CD)**: `python -m ml.dataset --matches 2`
- **ML Training**: `python -m ml.train`

## Architecture
- `backend/`: FastAPI backend handling demo uploads, coordinating inference, and serving API requests.
- `ml/`: Feature engineering, model training, evaluation, and inference for anti-cheat detection.
- `frontend/`: React + Vite client for displaying analysis reports, match telemetry, and alerts.
- `data/`: Telemetry storage (`demos/` for raw replays, `processed/` for tabular features).
- `models/`: Saved model weights (`.joblib`).
