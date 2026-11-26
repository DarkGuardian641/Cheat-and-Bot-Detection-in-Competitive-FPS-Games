const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface HealthInfo {
  status: string;
  app: string;
  default_model: string;
  model_exists: boolean;
  storage: {
    demos: string;
    analysis: string;
    logs: string;
  };
}

export interface AnalysisStatus {
  analysis_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | string;
  created_at?: string;
  completed_at?: string;
  error?: string;
  filename?: string;
}

export interface AnalysisListItem {
  analysis_id: string;
  filename: string;
  status: string;
  created_at?: string;
  completed_at?: string;
  total_windows: number;
  suspicious_players_count: number;
  error?: string;
}

export interface MatchListItem {
  match_id: string;
  filename: string;
  status: string;
  total_windows: number;
  suspicious_players_count: number;
  completed_at?: string;
}

export interface EvidenceWindow {
  steamid: string;
  player_name: string;
  start_tick: number;
  end_tick: number;
  start_time: number;
  end_time: number;
  suspicion_score: number;
}

export interface PlayerSummary {
  steamid: string;
  player_name: string;
  total_windows: number;
  suspicious_windows: number;
  suspicious_ratio: number;
  mean_suspicion_score: number;
  max_suspicion_score: number;
  status: 'Flagged' | 'Clean' | string;
}

export interface ProofIncident {
  category: string;
  cheat_type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  player_name: string;
  steamid: string;
  tick: number;
  weapon: string;
  victim: string;
  evidence: string;
  reasoning: string;
}

export interface PlayerKillBreakdown {
  player_name: string;
  total_kills: number;
  headshot_count: number;
  headshot_rate: number;
  blind_kills: number;
  smoke_kills: number;
  wallbang_kills: number;
  air_kills: number;
  hitgroups: Record<string, number>;
  weapons: Record<string, number>;
}

export interface ForensicProofs {
  kill_breakdowns: Record<string, PlayerKillBreakdown>;
  proof_incidents: ProofIncident[];
}

export interface ModelProvenance {
  model_name: string;
  model_version: string;
  calibrated_threshold: number;
  target_max_fpr: number;
  empirical_fpr: number;
  training_dataset: string;
  split_method: string;
  decision_support_only: boolean;
}

export interface AnalysisLimitations {
  uncertainty_notes: string[];
  missing_fields: string[];
  unsupported_cheat_categories: string[];
  research_track_signals: string[];
}

export interface MatchAnalysisResults {
  analysis_id: string;
  match_id?: string;
  status: string;
  threshold_used?: number;
  total_windows?: number;
  suspicious_windows_count?: number;
  suspicious_players?: Array<{
    steamid: string;
    player_name: string;
    total_windows: number;
    suspicious_windows: number;
    suspicious_ratio: number;
    mean_suspicion_score: number;
    max_suspicion_score: number;
    status: string;
  }>;
  player_summaries?: Record<string, PlayerSummary>;
  evidence_windows?: EvidenceWindow[];
  forensic_proofs?: ForensicProofs;
  match_info?: {
    demo_filename?: string;
    map_name?: string;
    server_name?: string;
    model_name?: string;
  };
  model_provenance?: ModelProvenance;
  limitations?: AnalysisLimitations;
  message?: string;
}

export interface TrackedPlayer {
  player_id: string;
  player_name: string;
  matches_analyzed: number;
  total_windows: number;
  suspicious_windows: number;
  overall_suspicious_ratio: number;
  overall_verdict: 'Flagged' | 'Clean' | string;
  last_seen?: string;
}

export interface PlayerDetail {
  player_id: string;
  player_name: string;
  matches_analyzed: number;
  total_windows: number;
  suspicious_windows: number;
  overall_suspicious_ratio: number;
  overall_verdict: 'Flagged' | 'Clean' | string;
  matches: Array<{
    match_id: string;
    demo_filename: string;
    total_windows: number;
    suspicious_windows: number;
    suspicious_ratio: number;
    mean_suspicion_score: number;
    max_suspicion_score: number;
    verdict: string;
  }>;
}

export const api = {
  getHealth: async (): Promise<HealthInfo> => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  listAnalyses: async (): Promise<AnalysisListItem[]> => {
    const res = await fetch(`${BASE_URL}/analyses`);
    if (!res.ok) throw new Error(`Failed to list analyses: ${res.statusText}`);
    return res.json();
  },

  listMatches: async (): Promise<MatchListItem[]> => {
    const res = await fetch(`${BASE_URL}/matches`);
    if (!res.ok) throw new Error(`Failed to list matches: ${res.statusText}`);
    return res.json();
  },

  getAnalysisStatus: async (id: string): Promise<AnalysisStatus> => {
    const res = await fetch(`${BASE_URL}/analyses/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to get status for ${id}: ${res.statusText}`);
    return res.json();
  },

  getAnalysisResults: async (id: string): Promise<MatchAnalysisResults> => {
    const res = await fetch(`${BASE_URL}/analyses/${encodeURIComponent(id)}/results`);
    if (!res.ok) throw new Error(`Failed to get results for ${id}: ${res.statusText}`);
    return res.json();
  },

  getPlayerDetails: async (playerId: string): Promise<PlayerDetail> => {
    const res = await fetch(`${BASE_URL}/players/${encodeURIComponent(playerId)}`);
    if (!res.ok) throw new Error(`Failed to get player ${playerId}: ${res.statusText}`);
    return res.json();
  },

  listPlayers: async (): Promise<TrackedPlayer[]> => {
    const res = await fetch(`${BASE_URL}/players`);
    if (!res.ok) throw new Error(`Failed to list players: ${res.statusText}`);
    return res.json();
  },

  /**
   * Upload a .dem file. Uses XHR (not fetch) so callers can show real
   * transfer progress for large demos via `onProgress` (0 to 1).
   */
  uploadDemo: (
    file: File,
    onProgress?: (fraction: number) => void,
  ): Promise<{ analysis_id: string; status: string; filename: string; message: string }> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/analyses/upload`);
      xhr.responseType = 'json';

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(e.loaded / e.total);
        };
      }

      xhr.onload = () => {
        const body = xhr.response;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          reject(new Error(body?.detail || xhr.statusText || 'Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Could not reach the backend. Is it running on port 8000?'));
      xhr.send(formData);
    });
  },
};
