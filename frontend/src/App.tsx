import React, { useState, useEffect } from 'react';
import { api, AnalysisListItem, MatchListItem, HealthInfo } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
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

  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Poll system health and match listings
  const loadOverviewData = async () => {
    try {
      const [healthData, analysesData, matchesData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.listAnalyses().catch(() => []),
        api.listMatches().catch(() => []),
      ]);

      if (healthData) {
        setHealth(healthData);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }

      setAnalyses(analysesData);
      setMatches(matchesData);
    } catch {
      setServerOnline(false);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadOverviewData();
    const interval = setInterval(loadOverviewData, 8000);
    return () => clearInterval(interval);
  }, []);

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
    setSelectedPlayerId(playerId);
    setCurrentTab('player-detail');
  };

  const handleUploadSuccess = (analysisId: string) => {
    loadOverviewData();
    handleSelectMatch(analysisId);
  };

  return (
    <div className="min-h-screen bg-surface-bg font-sans text-text-primary antialiased flex selection:bg-cs-orange/30 selection:text-cs-orange">
      {/* Authentic Tactical CS2 Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        serverOnline={serverOnline}
        defaultModel={health?.default_model || 'XGBoost v2.4'}
      />

      {/* Main Content Pane */}
      <div className="pl-64 flex flex-col flex-1 min-h-screen">
        <Header />

        <main className="w-full pt-20 px-6 pb-8 flex-1 bg-surface-bg">
          <div className="max-w-[1600px] mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardPage
                analyses={analyses}
                matches={matches}
                onSelectMatch={handleSelectMatch}
                onNavigateTab={handleTabChange}
                loading={loadingData}
              />
            )}

            {currentTab === 'new-analysis' && (
              <UploadDemoPage onUploadSuccess={handleUploadSuccess} />
            )}

            {currentTab === 'matches' && (
              <MatchesPage
                matches={matches}
                onSelectMatch={handleSelectMatch}
                onNavigateUpload={() => handleTabChange('new-analysis')}
                loading={loadingData}
              />
            )}

            {currentTab === 'players' && (
              <PlayersIndexPage onSelectPlayer={handleSelectPlayer} />
            )}

            {currentTab === 'match-detail' && selectedMatchId && (
              <MatchAnalysisPage
                matchId={selectedMatchId}
                onBack={() => handleTabChange('dashboard')}
                onSelectPlayer={handleSelectPlayer}
              />
            )}

            {currentTab === 'player-detail' && selectedPlayerId && (
              <PlayerDetailsPage
                playerId={selectedPlayerId}
                onBack={() => handleTabChange('players')}
                onSelectMatch={handleSelectMatch}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
