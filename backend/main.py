from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
from config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}

@app.get("/api/matches")
def list_matches():
    """List processed matches."""
    return []

@app.get("/api/analysis/{match_id}")
def get_match_analysis(match_id: str):
    """Retrieve cheat detection analysis for a match."""
    return {
        "match_id": match_id,
        "status": "completed",
        "suspicious_players": [],
        "evidence_windows": [],
    }

@app.post("/api/upload")
async def upload_demo(file: UploadFile = File(...)):
    """Upload a CS2 .dem file for analysis."""
    if not file.filename.endswith(".dem"):
        raise HTTPException(status_code=400, detail="Only .dem CS2 replay files are supported.")
    
    demos_dir = settings.DATA_DIR / "demos"
    demos_dir.mkdir(parents=True, exist_ok=True)
    save_path = demos_dir / file.filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": file.filename,
        "saved_path": str(save_path),
        "status": "uploaded",
    }
