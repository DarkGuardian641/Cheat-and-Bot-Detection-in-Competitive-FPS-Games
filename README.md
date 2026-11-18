# Cheat & Bot Detection in Competitive FPS Games

A machine-learning-assisted detection and investigation platform for competitive first-person shooter games (Counter-Strike 2).

---

## Folder Structure

```
cheat-and-bot-detection-in-competitive-fps/
├── backend/                  # FastAPI Backend API & Server
│   ├── main.py               # REST API endpoints (upload, analyses, matches, players)
│   ├── schemas.py            # Pydantic request and response schemas
│   ├── parser.py             # CS2 demo (.dem) parsing via demoparser2
│   ├── pipeline.py           # Preprocessing, 256-tick window extraction & ML scoring
│   ├── config.py             # App configuration, settings & local storage directories
│   ├── README.md             # Backend detailed documentation
│   └── tests/                # Comprehensive unit and integration test suite
│       ├── test_api.py
│       └── test_pipeline.py
│
├── ml/                       # Machine Learning Pipeline
│   ├── dataset.py            # Data loading & match-separated train/test splits
│   ├── features.py           # Feature extraction engine (31 aim, movement, weapon & reaction features)
│   ├── train.py              # Model training (XGBoost, Random Forest, Isolation Forest + tuning)
│   ├── evaluate.py           # Evaluation metrics (PR-AUC, ROC-AUC, threshold optimization)
│   ├── predict.py            # Model loading & window-based prediction helpers
│   └── notebooks/            # Jupyter notebooks for data exploration & plotting
│
├── frontend/                 # React + Vite + TypeScript Dashboard
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # View pages (Dashboard, Analysis)
│   │   ├── services/         # API client (api.ts)
│   │   ├── App.tsx           # Main application view & shell
│   │   ├── main.tsx          # React DOM entry point
│   │   └── vite-env.d.ts     # TypeScript environment definitions
│   ├── package.json
│   └── vite.config.ts
│
├── data/                     # Local Storage (Zero external database dependency)
│   ├── demos/                # Uploaded CS2 match replay files (.dem)
│   ├── analysis/             # Persisted match analysis JSON results
│   ├── logs/                 # Backend server logs (backend.log)
│   └── processed/            # Extracted CSV / Parquet feature datasets
│
├── models/                   # Saved trained model files & calibrated configs
│   ├── best_detector.joblib  # Trained champion model (XGBoost)
│   ├── best_detector.json    # Calibrated decision threshold (0.61) & feature list
│   └── detector_baseline.joblib
│
├── docs/                     # Project documentation & reference
│   └── evaluation_results.md
│
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
└── README.md
```

---

## Quickstart Guide

### 1. Backend Setup & Startup

Activate the Python environment and run the backend:

```powershell
# Activate Python 3.11 environment
.\.python311\Scripts\activate.ps1

# Run tests
python -m pytest

# Start FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 2. Frontend Dashboard Setup

```powershell
cd frontend
npm install
npm run dev
```

---

## REST API Overview

- `GET /health` — Check server status, active ML model, and local storage layout.
- `POST /analyses/upload` — Upload CS2 `.dem` replay file (asynchronous background processing).
- `GET /analyses` — List all historical and in-progress analysis jobs.
- `GET /analyses/{analysis_id}` — Check status (`pending`, `processing`, `completed`, `failed`).
- `GET /analyses/{analysis_id}/results` — Fetch complete prediction report, suspicious player summaries, and 256-tick window evidence.
- `GET /matches` — List all analyzed matches.
- `GET /players/{player_id}` — Get aggregate analysis history and suspicion scores across matches for a specific player.
