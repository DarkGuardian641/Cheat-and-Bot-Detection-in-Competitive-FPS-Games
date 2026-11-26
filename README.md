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
│   ├── demos/                # Uploaded CS2 match replay files (.dem / .parquet)
│   ├── analysis/             # Persisted match analysis JSON results
│   ├── logs/                 # Backend server logs (backend.log)
│   └── processed/            # Extracted CSV / Parquet feature datasets
│
├── crazy_demos/              # Pre-sorted evaluation matches (c_match_*.parquet & no_match_*.parquet)
│
├── models/                   # Saved trained model files & calibrated configs
│   ├── best_detector.joblib  # Trained champion model (XGBoost)
│   └── best_detector.json    # Calibrated decision threshold (0.61) & feature list
│
├── docs/                     # Project documentation & reference
│   ├── architecture.md       # High-level system architecture & diagrams
│   ├── calibration_and_evaluation.md # Advanced threshold sweep & calibration curves
│   ├── dataset_audit.md      # CS2CD dataset provenance & ground truth audit
│   ├── evaluation_results.md # Window-level model comparison results
│   ├── metrics.md            # Retrained player-level evaluation metrics (>80% all)
│   ├── CS2_Cheat_Detection_Research_Report.docx # Comprehensive research report manuscript
│   ├── CS2_AntiCheat_Presentation.pptx # Project presentation slide deck
│   ├── diagrams/             # Architecture, data flow & cleaning flowcharts
│   └── assets/               # Institutional logo assets
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
- `POST /analyses/upload` (or `POST /api/upload`) — Upload CS2 `.dem` replay file or `.parquet` pre-extracted match dataset (asynchronous background processing).
- `GET /analyses` — List all historical and in-progress analysis jobs.
- `GET /analyses/{analysis_id}` — Check status (`pending`, `processing`, `completed`, `failed`).
- `GET /analyses/{analysis_id}/results` — Fetch complete prediction report, suspicious player summaries, and 256-tick window evidence.
- `GET /matches` — List all analyzed matches with aggregated verdicts.
- `GET /players` — List tracked players across all uploaded and analyzed matches.
- `GET /players/{player_id}` — Detailed history, match appearances, and flagged incidents for a specific player.

---

## Documentation Index (`docs/`)

| Document | Description |
|:---|:---|
| [`docs/architecture.md`](docs/architecture.md) | High-level system architecture, dual-path ingestion pipeline & flowcharts |
| [`docs/evaluation_results.md`](docs/evaluation_results.md) | Window-level and player-level model comparison benchmarks (XGBoost, RF, IF) |
| [`docs/calibration_and_evaluation.md`](docs/calibration_and_evaluation.md) | Probability calibration, threshold sweeping ($\tau = 0.61$), and false-positive clustering |
| [`docs/metrics.md`](docs/metrics.md) | Aggregated player-level evaluation metrics (>80% Precision, Recall, F1) |
| [`docs/dataset_audit.md`](docs/dataset_audit.md) | CS2CD dataset audit, label provenance, schema, and known limitations |
| [`docs/codebase-review.md`](docs/codebase-review.md) | Implementation roadmap and historical review resolution notes |

