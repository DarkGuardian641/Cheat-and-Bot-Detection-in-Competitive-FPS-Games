import React, { useState, useEffect, useCallback } from 'react';
import { api, AnalysisListItem, MatchListItem, HealthInfo, TrackedPlayer } from './services/api';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { UploadDemoPage } from './pages/UploadDemoPage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchAnalysisPage } from './pages/MatchAnalysisPage';
import { PlayerDetailsPage } from './pages/PlayerDetailsPage';
import { PlayersIndexPage } from './pages/PlayersIndexPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // Where "back" from a player page should go: the match it was opened from, or the player list.
  const [playerOrigin, setPlayerOrigin] = useState<'players' | 'match'>('players');

  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(true);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [players, setPlayers] = useState<TrackedPlayer[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Poll system health, analyses, matches and players.
  const loadOverviewData = useCallback(async () => {
    try {
      const [healthData, analysesData, matchesData, playersData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.listAnalyses().catch(() => []),
        api.listMatches().catch(() => []),
        api.listPlayers().catch(() => []),
      ]);

      setHealth(healthData);
      setServerOnline(Boolean(healthData));
      setAnalyses(analysesData);
      setMatches(matchesData);
      setPlayers(playersData);
    } catch {
      setServerOnline(false);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewData();
    const interval = setInterval(loadOverviewData, 8000);
    return () => clearInterval(interval);
  }, [loadOverviewData]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentTab, selectedMatchId, selectedPlayerId]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setSelectedMatchId(null);
    setSelectedPlayerId(null);
  };

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setSelectedPlayerId(null);
    setCurrentTab('match-detail');
  };

  const handleSelectPlayer = (playerId: string) => {
    setPlayerOrigin(currentTab === 'match-detail' ? 'match' : 'players');
    setSelectedPlayerId(playerId);
    setCurrentTab('player-detail');
  };

  const handlePlayerBack = () => {
    if (playerOrigin === 'match' && selectedMatchId) {
      setSelectedPlayerId(null);
      setCurrentTab('match-detail');
    } else {
      handleTabChange('players');
    }
  };

  const handleUploadSuccess = (analysisId: string) => {
    loadOverviewData();
    handleSelectMatch(analysisId);
  };

  return (
    <div className="min-h-screen lg:pl-60">
      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-8 lg:pt-12">
        {currentTab === 'dashboard' && (
          <DashboardPage
            analyses={analyses}
            players={players}
            health={health}
            serverOnline={serverOnline}
            onSelectMatch={handleSelectMatch}
            onSelectPlayer={handleSelectPlayer}
            onNavigateTab={handleTabChange}
            loading={loadingData}
          />
        )}

        {currentTab === 'new-analysis' && <UploadDemoPage health={health} onUploadSuccess={handleUploadSuccess} />}

        {currentTab === 'matches' && (
          <MatchesPage
            matches={matches}
            onSelectMatch={handleSelectMatch}
            onNavigateUpload={() => handleTabChange('new-analysis')}
            loading={loadingData}
          />
        )}

        {currentTab === 'players' && (
          <PlayersIndexPage players={players} loading={loadingData} onSelectPlayer={handleSelectPlayer} />
        )}

        {currentTab === 'match-detail' && selectedMatchId && (
          <MatchAnalysisPage
            matchId={selectedMatchId}
            onBack={() => handleTabChange('matches')}
            onSelectPlayer={handleSelectPlayer}
            onAnalysisSettled={loadOverviewData}
          />
        )}

        {currentTab === 'player-detail' && selectedPlayerId && (
          <PlayerDetailsPage
            playerId={selectedPlayerId}
            backLabel={playerOrigin === 'match' && selectedMatchId ? 'Back to match' : 'Players'}
            onBack={handlePlayerBack}
            onSelectMatch={handleSelectMatch}
          />
        )}
      </main>
    </div>
  );
};

export default App;
