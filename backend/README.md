# FPS Cheat & Bot Detection Backend

FastAPI service for Counter-Strike 2 (`.dem`) replay analysis, telemetry feature extraction, and ML-assisted cheat/bot detection.

---

## 1. Installation

Ensure Python 3.11 is configured (or use the built-in repository environment `.\.python311`):

```powershell
# From project root:
.\.python311\Scripts\activate.ps1

# Install requirements
pip install -r requirements.txt
```

---

## 2. Starting the FastAPI Server

Start the API with Uvicorn:

```powershell
# Standard run (host 127.0.0.1, port 8000)
.\.python311\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 3. REST API Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health status, model artifact presence, storage paths | `200 OK` |
| `POST` | `/analyses/upload` | Upload `.dem` CS2 replay file for asynchronous processing | `202 Accepted` |
| `GET` | `/analyses` | List all historical analysis jobs and processing states | `200 OK` |
| `GET` | `/analyses/{analysis_id}` | Retrieve processing status (`pending`, `processing`, `completed`, `failed`) | `200 OK` / `404` |
| `GET` | `/analyses/{analysis_id}/results` | Retrieve full suspicion scores, flagged players, and window evidence | `200 OK` / `404` |
| `GET` | `/matches` | List all analyzed matches with summarized suspicion indicators | `200 OK` |
| `GET` | `/players/{player_id}` | Historical aggregate cheat statistics for a specific player across matches | `200 OK` / `404` |

---

## 4. Demo Upload & Analysis Workflow

1. **Upload (`POST /analyses/upload`)**:
   - Accepts `.dem` binary uploads via multipart form data (`file`).
   - Validates file format, size limits (`MAX_DEMO_SIZE_MB = 500 MB`), non-empty payloads, and Valve demo headers (`HL2DEMO` / `PBDEMS`).
   - Returns unique `analysis_id` immediately with status `pending`.
2. **Background Processing**:
   - Slices telemetry into 256-tick sliding windows (128-tick step).
   - Computes 31 kinematic and behavioral features (`ml.features`).
   - Runs model inference (`models/best_detector.joblib`).
   - Applies the calibrated decision threshold (`0.61`).
3. **Polling & Results (`GET /analyses/{id}` & `GET /analyses/{id}/results`)**:
   - Clients poll status until `completed`.
   - Returns structured evidence windows, player summaries, and match metadata.

---

## 5. Local Storage Architecture

No external database (PostgreSQL, SQLite, Redis) is required. Data is stored on disk:

- `data/demos/`: Uploaded `.dem` demo files.
- `data/analysis/`: Analysis output JSON files (`{analysis_id}.json`).
- `data/logs/`: Backend server and worker execution logs (`backend.log`).

---

## 6. Testing

Run the test suite using pytest:

```powershell
.\.python311\python.exe -m pytest -v
```

Tests cover:
- Health check verification.
- Valid `.dem` upload and background task dispatch.
- Invalid file formats (e.g., `.txt`) and 0-byte corrupt demo rejections.
- Oversized file upload protection.
- Analysis status and missing analysis ID handling.
- Telemetry preprocessing and 256-tick window extraction.
- Feature dimensional compatibility with `models/best_detector.joblib`.
- Model loading, probability inference, and threshold application.

---

## 7. Known Limitations

- **Reaction Latency Telemetry**: Target visibility timestamps are currently stubs (`0.0`) in the public CS2CD dataset, so reaction features return baseline values until visibility tracking is enabled.
- **Model Predictions are Suspicion Scores**: Predictions indicate statistical kinematic anomaly, **never** an automatic ban verdict. Human review is recommended for flagged evidence windows.
