const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface MatchAnalysis {
  match_id: string;
  status: string;
  suspicious_players: string[];
  evidence_windows: Array<{
    timestamp: number;
    tick: number;
    confidence: number;
    reason: string;
  }>;
}

export const api = {
  getHealth: () => fetch(`${BASE_URL}/health`).then((res) => res.json()),
  getAnalysis: (matchId: string): Promise<MatchAnalysis> =>
    fetch(`${BASE_URL}/api/analysis/${matchId}`).then((res) => res.json()),
  uploadDemo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    }).then((res) => res.json());
  },
};
