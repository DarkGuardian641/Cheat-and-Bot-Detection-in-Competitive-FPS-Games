from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "ok"})
    app: str = Field(..., json_schema_extra={"example": "FPS Cheat & Bot Detection API"})
    default_model: str = Field(..., json_schema_extra={"example": "best_detector.joblib"})
    model_exists: bool = Field(..., json_schema_extra={"example": True})
    storage: dict[str, str] = Field(..., json_schema_extra={"example": {"demos": "...", "analysis": "...", "logs": "..."}})


class UploadResponse(BaseModel):
    analysis_id: str = Field(..., json_schema_extra={"example": "analysis_123456789abc"})
    match_id: str = Field(..., json_schema_extra={"example": "analysis_123456789abc"})
    status: str = Field(..., json_schema_extra={"example": "pending"})
    filename: str = Field(..., json_schema_extra={"example": "match1.dem"})
    message: str = Field(..., json_schema_extra={"example": "Demo uploaded and validated successfully. Background processing initiated."})


class AnalysisStatusResponse(BaseModel):
    analysis_id: str = Field(..., json_schema_extra={"example": "analysis_123456789abc"})
    status: str = Field(..., json_schema_extra={"example": "completed"}, description="pending | processing | completed | failed")
    created_at: str | None = Field(None, json_schema_extra={"example": "2026-11-17T06:30:00"})
    completed_at: str | None = Field(None, json_schema_extra={"example": "2026-11-17T06:31:00"})
    error: str | None = Field(None, json_schema_extra={"example": None})
    filename: str | None = Field(None, json_schema_extra={"example": "match1.dem"})


class AnalysisListItem(BaseModel):
    analysis_id: str = Field(..., json_schema_extra={"example": "analysis_123456789abc"})
    filename: str = Field(..., json_schema_extra={"example": "match1.dem"})
    status: str = Field(..., json_schema_extra={"example": "completed"})
    created_at: str | None = None
    completed_at: str | None = None
    total_windows: int = Field(0, json_schema_extra={"example": 120})
    suspicious_players_count: int = Field(0, json_schema_extra={"example": 1})
    error: str | None = None


class EvidenceWindow(BaseModel):
    steamid: str = Field(..., json_schema_extra={"example": "76561198000000001"})
    player_name: str = Field(..., json_schema_extra={"example": "Player1"})
    start_tick: int = Field(..., json_schema_extra={"example": 1280})
    end_tick: int = Field(..., json_schema_extra={"example": 1536})
    start_time: float = Field(..., json_schema_extra={"example": 20.0})
    end_time: float = Field(..., json_schema_extra={"example": 24.0})
    suspicion_score: float = Field(..., json_schema_extra={"example": 0.8842})


class PlayerSummary(BaseModel):
    steamid: str = Field(..., json_schema_extra={"example": "76561198000000001"})
    player_name: str = Field(..., json_schema_extra={"example": "Player1"})
    total_windows: int = Field(..., json_schema_extra={"example": 50})
    suspicious_windows: int = Field(..., json_schema_extra={"example": 12})
    suspicious_ratio: float = Field(..., json_schema_extra={"example": 0.24})
    mean_suspicion_score: float = Field(..., json_schema_extra={"example": 0.4821})
    max_suspicion_score: float = Field(..., json_schema_extra={"example": 0.9124})
    status: str = Field(..., json_schema_extra={"example": "Flagged"}, description="'Flagged' or 'Clean'")


class ModelProvenance(BaseModel):
    model_name: str = Field("XGBoost v2.4", json_schema_extra={"example": "XGBoost v2.4"})
    model_version: str = Field("2.4.1", json_schema_extra={"example": "2.4.1"})
    calibrated_threshold: float = Field(0.61, json_schema_extra={"example": 0.61})
    target_max_fpr: float = Field(0.08, json_schema_extra={"example": 0.08})
    empirical_fpr: float = Field(0.0666, json_schema_extra={"example": 0.0666})
    training_dataset: str = Field("CS2CD (Hugging Face) - 399,156 windows", json_schema_extra={"example": "CS2CD (Hugging Face)"})
    split_method: str = Field("Stratified match-held-out split (no round leakage)", json_schema_extra={"example": "Stratified match-held-out split"})
    decision_support_only: bool = Field(True, json_schema_extra={"example": True})


class AnalysisLimitations(BaseModel):
    uncertainty_notes: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    unsupported_cheat_categories: list[str] = Field(default_factory=list)
    research_track_signals: list[str] = Field(default_factory=list)


class AnalysisResultsResponse(BaseModel):
    analysis_id: str
    match_id: str | None = None
    status: str
    threshold_used: float | None = 0.61
    total_windows: int | None = 0
    suspicious_windows_count: int | None = 0
    suspicious_players: list[dict[str, Any]] | None = []
    player_summaries: dict[str, PlayerSummary] | None = {}
    evidence_windows: list[EvidenceWindow] | None = []
    forensic_proofs: dict[str, Any] | None = None
    match_info: dict[str, Any] | None = {}
    model_provenance: ModelProvenance | None = None
    limitations: AnalysisLimitations | None = None
    message: str | None = None


class MatchListItem(BaseModel):
    match_id: str = Field(..., json_schema_extra={"example": "analysis_123456789abc"})
    filename: str = Field(..., json_schema_extra={"example": "match1.dem"})
    status: str = Field(..., json_schema_extra={"example": "completed"})
    total_windows: int = Field(0, json_schema_extra={"example": 120})
    suspicious_players_count: int = Field(0, json_schema_extra={"example": 1})
    completed_at: str | None = None


class PlayerMatchHistory(BaseModel):
    match_id: str
    demo_filename: str
    total_windows: int
    suspicious_windows: int
    suspicious_ratio: float
    mean_suspicion_score: float
    max_suspicion_score: float
    verdict: str


class PlayerListItem(BaseModel):
    player_id: str
    player_name: str
    matches_analyzed: int
    total_windows: int
    suspicious_windows: int
    overall_suspicious_ratio: float
    overall_verdict: str
    last_seen: str | None = None


class PlayerDetailResponse(BaseModel):
    player_id: str
    player_name: str
    matches_analyzed: int
    total_windows: int
    suspicious_windows: int
    overall_suspicious_ratio: float
    overall_verdict: str
    matches: list[PlayerMatchHistory]


class ErrorResponse(BaseModel):
    detail: str = Field(..., json_schema_extra={"example": "Resource not found"})
