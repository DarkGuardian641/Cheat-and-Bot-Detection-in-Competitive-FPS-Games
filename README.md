# Cheat & Bot Detection in Competitive FPS Games

A machine-learning-assisted detection and investigation platform for competitive first-person shooter games (Counter-Strike 2).

## Folder Structure

```
cheat-and-bot-detection-in-competitive-fps/
├── backend/                  # FastAPI Backend API & Server
│   ├── main.py               # API routes (matches, analysis, demo upload)
│   ├── parser.py             # CS2 demo (.dem) parsing via demoparser2
│   ├── config.py             # App configuration & settings
│   └── tests/                # Backend unit tests
│       └── test_api.py
│
├── ml/                       # Machine Learning Pipeline
│   ├── dataset.py            # Data loading & match-separated train/test splits
│   ├── features.py           # Feature extraction (aim kinematics, movement velocity)
│   ├── train.py              # Model training (Random Forest & XGBoost)
│   ├── evaluate.py           # Evaluation metrics (ROC-AUC, Precision, Recall, FPR)
│   ├── predict.py            # Model loading & window-based prediction
│   └── notebooks/            # Jupyter notebooks for data exploration & plotting
│
├── frontend/                 # React + Vite Dashboard
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
├── data/                     # Data Storage
│   ├── demos/                # Raw CS2 match replay files (.dem)
│   └── processed/            # Extracted CSV / Parquet feature datasets
│
├── models/                   # Saved trained model files (.joblib / .pkl)
├── docs/                     # Project documentation & reference
│   └── architecture.md
│
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
└── README.md
```

## Running the Application

### 1. Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

- API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Frontend

```bash
cd frontend
npm run dev
```

- Dashboard: `http://localhost:3000/`

### 3. Machine Learning (CS2CD Dataset)

The ML pipeline integrates the [CS2CD Counter-Strike 2 Cheat Detection dataset](https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection) from Hugging Face:

```bash
# 1. Download and extract sliding telemetry windows (e.g. 5 matches per category)
python -m ml.dataset --matches 5 --window 256 --step 128

# 2. Train baseline XGBoost / Random Forest model
python -m ml.train --model xgboost
```
