import React, { useEffect, useState } from 'react';
import { api } from './services/api';

export const App: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<string>('Connecting...');

  useEffect(() => {
    api.getHealth()
      .then((data) => setServerStatus(`Connected (${data.app})`))
      .catch(() => setServerStatus('Backend server unreachable'));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: '#1e293b' }}>FPS Anti-Cheat & Bot Detection</h1>
        <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>
          CS2 Telemetry Analysis & Evidence Dashboard
        </p>
        <span style={{
          display: 'inline-block',
          marginTop: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          backgroundColor: serverStatus.includes('Connected') ? '#dcfce7' : '#fee2e2',
          color: serverStatus.includes('Connected') ? '#166534' : '#991b1b',
        }}>
          {serverStatus}
        </span>
      </header>

      <main>
        <section style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: '#334155' }}>Upload CS2 Demo (.dem)</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Upload a match replay file to extract tick telemetry, view angles, and detect suspicious aiming or bot movement.
          </p>
          <input type="file" accept=".dem" style={{ marginTop: '0.5rem' }} />
        </section>

        <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', color: '#334155' }}>Match Overview</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            No match selected yet. Upload a .dem file to view player risk assessments, angular velocity graphs, and evidence timelines.
          </p>
        </section>
      </main>
    </div>
  );
};

export default App;
