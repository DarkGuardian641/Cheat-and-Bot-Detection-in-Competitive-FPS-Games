# Cheat & Bot Detection in Competitive FPS Games

A machine-learning-assisted detection and investigation platform for competitive first-person shooter games (Counter-Strike 2). Ingests raw `.dem` replay files or extracted `.parquet` match windows, extracts 31 kinematic features, and identifies suspicious players and automated aim anomalies using a calibrated XGBoost champion classifier.

---

## Architecture & System Overview

```
[ CS2 Replay (.dem) ] ──> [ demoparser2 ] ──┐
                                            ├──> [ 256-Tick Windowing ] ──> [ 31 Kinematic Features ] ──> [ XGBoost Model (τ = 0.61) ] ──> [ React UI ]
[ Extracted Match (.parquet) ] ─────────────┘
```

- **Dual-Input Ingestion**: Supports raw Valve Counter-Strike 2 match demos (`.dem`) and pre-windowed dataset files (`.parquet`).
- **Feature Pipeline**: Computes 31 physical and kinematic features across 256-tick (~4 second) sliding windows, including angular velocity, acceleration, jerk, snap ratios, directional entropy, and recoil dampening.
- **Champion ML Model**: Tuned and probability-calibrated **XGBoost Classifier** with decision threshold $\tau = 0.61$ to strictly protect innocent skilled players ($\text{FPR} \le 6.66\%$).
- **Full-Stack Architecture**: Python 3.11 FastAPI asynchronous backend with zero external database dependencies + modern React (Vite + TypeScript + Tailwind CSS) dashboard.

---

## Repository Structure

```
cheat-and-bot-detection-in-competitive-fps/
├── backend/                  # FastAPI Backend API & Server
│   ├── main.py               # REST API endpoints (upload, analyses, matches, players)
│   ├── schemas.py            # Pydantic request and response schemas
│   ├── parser.py             # CS2 demo (.dem) parsing via demoparser2
│   ├── pipeline.py           # Preprocessing, window extraction & ML scoring
│   ├── config.py             # App configuration, settings & local storage paths
│   ├── README.md             # Backend detailed documentation
│   └── tests/                # Unit and integration test suite (pytest)
│       ├── test_api.py
│       └── test_pipeline.py
│
├── ml/                       # Machine Learning Pipeline
│   ├── dataset.py            # CS2CD loading & match-separated train/test splits
│   ├── features.py           # 31-feature kinematic extraction engine
│   ├── train.py              # Model training (XGBoost, Random Forest, Isolation Forest)
│   ├── evaluate.py           # PR-AUC, ROC-AUC, calibration & threshold optimization
│   ├── predict.py            # Model loading & window-based prediction helpers
│   └── notebooks/            # Jupyter notebooks for data exploration & plotting
│
├── frontend/                 # React + Vite + TypeScript Dashboard
│   ├── src/
│   │   ├── components/       # UI components (ProofCard, MetricCard, Timeline)
│   │   ├── pages/            # View pages (Dashboard, Match Details, Upload)
│   │   ├── services/         # API client (api.ts)
│   │   ├── App.tsx           # Main application view & routing
│   │   └── main.tsx          # React DOM entry point
│   ├── package.json
│   └── vite.config.ts
│
├── data/                     # Local Storage (Excluded from Git)
│   ├── demos/                # Uploaded CS2 match replay files (.dem / .parquet)
│   ├── analysis/             # Persisted match analysis JSON results
│   ├── logs/                 # Backend server logs (backend.log)
│   └── processed/            # Extracted CSV / Parquet feature datasets
│
├── crazy_demos/              # Pre-sorted test matches (c_match_*.parquet & no_match_*.parquet)
│
├── models/                   # Saved trained model files & calibrated configs
│   ├── best_detector.joblib  # Trained champion model (XGBoost)
│   └── best_detector.json    # Calibrated decision threshold (0.61) & feature list
│
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
└── README.md
```

---

## Local Setup & Quickstart Guide

### Prerequisites

- **Python 3.11+** installed (recommended: Python 3.11 64-bit on Windows/Linux/macOS).
- **Node.js 18+** & **npm** for running the frontend dashboard.
- **Git**.

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/atharva-shingote/Cheat-and-Bot-Detection-in-Competitive-FPS-Games.git
cd Cheat-and-Bot-Detection-in-Competitive-FPS-Games
```

---

### Step 2: Backend Setup (FastAPI)

1. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

2. **Install Python dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Verify backend setup with tests**:
   ```bash
   python -m pytest backend/tests/
   ```
   *(All 15 tests should pass with 100% green).*

4. **Start the FastAPI backend server**:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   Once running, access:
   - **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
   - **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Alternative API Docs (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### Step 3: Frontend Setup (React + Vite)

Open a **new terminal window**:

```bash
cd frontend
npm install
npm run dev
```

Open your browser to:
👉 **[http://localhost:5173](http://localhost:5173)**

From the dashboard:
- Navigate to **Upload Demo**.
- Drag & drop a CS2 replay (`.dem`) file or pre-windowed match dataset (`.parquet`). You can find pre-sorted evaluation files in the `crazy_demos/` directory (`c_match_*.parquet` for matches with cheaters, `no_match_*.parquet` for clean matches).
- Track the job status in real time and inspect detailed player-by-player forensic proof cards.

---

## Machine Learning Pipeline: Training & Evaluation

The ML pipeline is completely modular and located in `ml/`. It handles feature extraction, model benchmarking, hyperparameter tuning, and probability calibration.

### 1. Ingest Dataset & Extract Features

To prepare and extract kinematic features from the CS2CD dataset:

```bash
python -m ml.dataset --help
```

This generates train and test feature splits in `data/processed/` grouped strictly by match (`split_by_match`) to avoid spatial and player-identity data leakage.

### 2. Train and Benchmark Models

To run the complete training pipeline across **XGBoost**, **Random Forest**, and **Isolation Forest**:

```bash
python -m ml.train
```

To run with hyperparameter tuning and save the best detector to `models/`:

```bash
python -m ml.train --data-dir data/processed --tune --output models/best_detector.joblib
```

The script:
1. Trains candidate models on stratified match-held-out splits.
2. Conducts a threshold sweep across $\tau \in [0.10, 0.90]$ to maximize F1 under a strict False Positive Rate cap ($\text{FPR} \le 8.0\%$).
3. Saves the champion model (`models/best_detector.joblib`) and its configuration (`models/best_detector.json`).

### 3. Evaluate the Model

Evaluate performance and generate calibration metrics:

```bash
python -m ml.evaluate
```

You can also run predictions on raw feature arrays programmatically:

```python
import joblib
from ml.predict import score_player_windows

# Load champion model
model = joblib.load("models/best_detector.joblib")

# Score 256-tick sliding telemetry windows (X is shape [N_windows, 31])
scores = score_player_windows(model, feature_matrix)
print("Cheat probability scores:", scores)
```

---

## Model Benchmark Results

### 1. Window-Level Evaluation (108,406 held-out 256-tick windows)

| Model | Threshold ($\tau$) | ROC-AUC | PR-AUC | F1 Score | Precision | Recall | FPR |
|:---|---:|---:|---:|---:|---:|---:|---:|
| **XGBoost (Champion)** | **0.61** | **0.7127** | **0.5143** | **0.3498** | **0.5686** | **0.2526** | **0.0666** |
| Random Forest | 0.61 | 0.7006 | 0.5041 | 0.3026 | 0.6440 | 0.1978 | 0.0380 |
| Isolation Forest | 0.26 | 0.4866 | 0.2573 | 0.1185 | 0.2551 | 0.0772 | 0.0783 |

### 2. Player-Level Aggregation (200 held-out competitive players)

When individual 256-tick window scores are aggregated per player across rounds using out-of-fold feature stacking:

| Metric | Score | Note |
|:---|---:|:---|
| **ROC-AUC** | **95.28%** | Outstanding separation between legitimate and cheating players |
| **PR-AUC** | **90.33%** | High precision retention across all recall thresholds |
| **Precision** | **84.91%** | Less than 1 in 6 flagged players are false alarms |
| **Recall** | **80.36%** | Captures over 8 out of 10 players toggling cheats in match |
| **False Positive Rate** | **5.56%** | Conservative referee triage threshold ($\tau = 0.45$) |

---

## REST API Overview

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/health` | Server heartbeat, active model name, and storage verification |
| `POST` | `/analyses/upload` | Upload `.dem` or `.parquet` file; dispatches async analysis |
| `GET` | `/analyses` | List all historical and active analysis jobs |
| `GET` | `/analyses/{analysis_id}` | Check job status (`pending`, `processing`, `completed`, `failed`) |
| `GET` | `/analyses/{analysis_id}/results` | Full prediction payload: player verdicts, proof cards, and timeline windows |
| `GET` | `/matches` | List all processed matches with cheater-count badges |
| `GET` | `/players` | List all tracked players across historical matches |
| `GET` | `/players/{player_id}` | Historical aggregate metrics and flagged match instances for a player |

---

## Running Automated Tests

Run the full backend test suite:

```bash
# Run pytest with verbose output
python -m pytest backend/tests/ -v

# Run lint checks with ruff
python -m ruff check backend/
```

Run frontend build verification:

```bash
cd frontend
npm run build
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
