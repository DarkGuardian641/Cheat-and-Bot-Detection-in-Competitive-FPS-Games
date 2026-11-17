import json
import logging
from datetime import datetime
from pathlib import Path
import shutil
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.parser import validate_demo_file
from backend.pipeline import analyze_demo_file

# Setup file and console logger
logger = logging.getLogger("backend")
logger.setLevel(logging.INFO)

log_file_handler = logging.FileHandler(settings.LOGS_DIR / "backend.log", encoding="utf-8")
log_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log_file_handler.setFormatter(log_formatter)
if not logger.handlers:
    logger.addHandler(log_file_handler)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_formatter)
    logger.addHandler(console_handler)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="FastAPI Backend for CS2 Demo Analysis, Asynchronous Job Processing, and ML Anomaly Detection",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_analysis_path(analysis_id: str) -> Path:
    return settings.ANALYSIS_DIR / f"{analysis_id}.json"


def _read_analysis_data(analysis_id: str) -> Dict[str, Any]:
    path = _get_analysis_path(analysis_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading analysis file {path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load analysis record.")


def _save_analysis_data(analysis_id: str, data: Dict[str, Any]) -> None:
    path = _get_analysis_path(analysis_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def run_demo_pipeline_task(demo_path: Path, analysis_id: str):
    """
    Background worker:
    Executes parsing and ML inference completely outside the HTTP request lifecycle.
    Updates job status: processing -> completed / failed.
    """
    logger.info(f"Background task started: analysis_id={analysis_id}, file={demo_path.name}")
    try:
        # Mark as processing
        current_data = _read_analysis_data(analysis_id)
        current_data["status"] = "processing"
        current_data["updated_at"] = datetime.utcnow().isoformat()
        _save_analysis_data(analysis_id, current_data)

        # Run demo parsing, feature extraction & ML inference
        report = analyze_demo_file(
            demo_path=demo_path,
            model_path=settings.DEFAULT_MODEL_PATH,
            config_path=settings.DEFAULT_CONFIG_PATH,
            output_dir=settings.ANALYSIS_DIR,
        )

        # Merge job metadata
        report["analysis_id"] = analysis_id
        report["match_id"] = analysis_id
        report["status"] = "completed"
        report["completed_at"] = datetime.utcnow().isoformat()
        report["demo_path"] = str(demo_path)

        _save_analysis_data(analysis_id, report)
        logger.info(f"Background task completed: analysis_id={analysis_id}")

    except Exception as e:
        logger.error(f"Background task failed for analysis {analysis_id}: {e}", exc_info=True)
        try:
            failed_record = _read_analysis_data(analysis_id)
        except Exception:
            failed_record = {"analysis_id": analysis_id, "match_id": analysis_id}

        failed_record["status"] = "failed"
        failed_record["error"] = str(e)
        failed_record["failed_at"] = datetime.utcnow().isoformat()
        _save_analysis_data(analysis_id, failed_record)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "default_model": settings.DEFAULT_MODEL_PATH.name,
        "model_exists": settings.DEFAULT_MODEL_PATH.exists(),
        "storage": {
            "demos": str(settings.DEMOS_DIR),
            "analysis": str(settings.ANALYSIS_DIR),
            "logs": str(settings.LOGS_DIR),
        },
    }


# --------------------------------------------------------------------------
# 1. Analyses REST APIs
# --------------------------------------------------------------------------

@app.post("/analyses/upload", status_code=202)
@app.post("/api/upload", status_code=202)
async def upload_analysis_demo(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    POST /analyses/upload
    Accept, validate and store a CS2 .dem file.
    Initiates asynchronous background ML processing.
    """
    if not file.filename or not file.filename.lower().endswith(".dem"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only Counter-Strike 2 (.dem) replay files are supported.",
        )

    analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
    safe_filename = f"{analysis_id}_{Path(file.filename).name}"
    save_path = settings.DEMOS_DIR / safe_filename

    # Save to disk
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving uploaded demo: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store demo file: {e}")

    # Validate file format and size
    is_valid, err_msg = validate_demo_file(save_path, max_size_mb=settings.MAX_DEMO_SIZE_MB)
    if not is_valid:
        save_path.unlink(missing_ok=True)
        logger.warning(f"Demo file validation failed for {file.filename}: {err_msg}")
        raise HTTPException(status_code=400, detail=f"Demo validation error: {err_msg}")

    # Record initial pending state
    initial_record = {
        "analysis_id": analysis_id,
        "match_id": analysis_id,
        "status": "pending",
        "filename": file.filename,
        "saved_path": str(save_path),
        "created_at": datetime.utcnow().isoformat(),
        "total_windows": 0,
        "suspicious_players": [],
    }
    _save_analysis_data(analysis_id, initial_record)

    # Queue background processing
    background_tasks.add_task(run_demo_pipeline_task, save_path, analysis_id)

    return {
        "analysis_id": analysis_id,
        "match_id": analysis_id,
        "status": "pending",
        "filename": file.filename,
        "message": "Demo uploaded and validated successfully. Background processing initiated.",
    }


@app.get("/analyses/{id}")
def get_analysis_status(id: str):
    """
    GET /analyses/{id}
    Retrieve current processing status (pending, processing, completed, failed) of an analysis job.
    """
    data = _read_analysis_data(id)
    return {
        "analysis_id": id,
        "status": data.get("status", "unknown"),
        "created_at": data.get("created_at"),
        "completed_at": data.get("completed_at"),
        "error": data.get("error"),
        "filename": data.get("match_info", {}).get("demo_filename") or data.get("filename", "unknown"),
    }


@app.get("/analyses/{id}/results")
@app.get("/api/analysis/{id}")
def get_analysis_results(id: str):
    """
    GET /analyses/{id}/results
    Retrieve full ML predictions, suspicious players, window scores, and match statistics.
    """
    data = _read_analysis_data(id)
    if data.get("status") in ["pending", "processing"]:
        return {
            "analysis_id": id,
            "status": data.get("status"),
            "message": "Analysis is still in progress. Please poll again shortly.",
        }
    return data


# --------------------------------------------------------------------------
# 2. Matches REST APIs
# --------------------------------------------------------------------------

@app.get("/matches")
@app.get("/api/matches")
def list_matches():
    """
    GET /matches
    List all processed matches and current statuses.
    """
    matches = []
    for report_file in settings.ANALYSIS_DIR.glob("*.json"):
        try:
            with open(report_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            matches.append({
                "match_id": data.get("analysis_id", report_file.stem),
                "filename": data.get("match_info", {}).get("demo_filename") or data.get("filename", "unknown"),
                "status": data.get("status", "unknown"),
                "total_windows": data.get("total_windows", 0),
                "suspicious_players_count": len(data.get("suspicious_players", [])),
                "completed_at": data.get("completed_at"),
            })
        except Exception as e:
            logger.warning(f"Could not parse analysis file {report_file}: {e}")

    # Sort newest first
    matches.sort(key=lambda x: str(x.get("completed_at", "")), reverse=True)
    return matches


# --------------------------------------------------------------------------
# 3. Players REST APIs
# --------------------------------------------------------------------------

@app.get("/players/{id}")
def get_player_details(id: str):
    """
    GET /players/{id}
    Retrieve historical analysis metrics and cheat flags for a specific player across matches.
    """
    player_matches = []
    total_evaluated_windows = 0
    total_suspicious_windows = 0
    player_name = "Unknown"

    for report_file in settings.ANALYSIS_DIR.glob("*.json"):
        try:
            with open(report_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            if data.get("status") != "completed":
                continue

            summaries = data.get("player_summaries", {})
            if id in summaries:
                p_summary = summaries[id]
                player_name = p_summary.get("player_name", player_name)
                total_evaluated_windows += p_summary.get("total_windows", 0)
                total_suspicious_windows += p_summary.get("suspicious_windows", 0)

                player_matches.append({
                    "match_id": data.get("analysis_id", report_file.stem),
                    "demo_filename": data.get("match_info", {}).get("demo_filename", "unknown"),
                    "total_windows": p_summary.get("total_windows", 0),
                    "suspicious_windows": p_summary.get("suspicious_windows", 0),
                    "suspicious_ratio": p_summary.get("suspicious_ratio", 0.0),
                    "mean_suspicion_score": p_summary.get("mean_suspicion_score", 0.0),
                    "max_suspicion_score": p_summary.get("max_suspicion_score", 0.0),
                    "verdict": p_summary.get("status", "Clean"),
                })
        except Exception as e:
            logger.warning(f"Error reading report {report_file} for player {id}: {e}")

    if not player_matches:
        raise HTTPException(status_code=404, detail=f"Player with ID '{id}' not found in any processed matches.")

    overall_suspicious_ratio = (
        round(total_suspicious_windows / total_evaluated_windows, 4)
        if total_evaluated_windows > 0 else 0.0
    )

    return {
        "player_id": id,
        "player_name": player_name,
        "matches_analyzed": len(player_matches),
        "total_windows": total_evaluated_windows,
        "suspicious_windows": total_suspicious_windows,
        "overall_suspicious_ratio": overall_suspicious_ratio,
        "overall_verdict": "Flagged" if overall_suspicious_ratio >= 0.15 else "Clean",
        "matches": player_matches,
    }
