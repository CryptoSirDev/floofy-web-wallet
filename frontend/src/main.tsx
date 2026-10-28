import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

type WalletSummary = {
  source: 'local-node-wallet';
  balance: number;
  unconfirmed: number;
  blocks: number;
  chain: string;
  updatedAt: string;
};

const API = 'http://127.0.0.1:3001';
const formatFloof = (amount: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(amount);

function App() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API + '/api/wallet/summary', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data: WalletSummary = await response.json();
      if (data.source !== 'local-node-wallet' || !Number.isFinite(data.balance)) {
        throw new Error('Resposta inesperada');
      }
      setSummary(data);
    } catch {
      setError('Não foi possível contactar o backend local. Confirma que o servidor está ligado na porta 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand"><span className="mascot">🐹</span> FloofyChain <span className="muted">Web Wallet</span></span>
        <span className="chip">Phase 1 · Local preview</span>
      </header>
      <section className="warning" role="status">
        ⚠️ Local development only. This displays the connected Core node's wallet balance,
        NOT a non-custodial browser wallet. Do not enter seed phrases or use this with real funds.
      </section>
      <section className="hero">
        <p className="eyebrow">FLOOFYCHAIN · READ-ONLY PROTOTYPE</p>
        <h1>Your FLOOF. Your keys. Your control.</h1>
        <p className="subtitle">First milestone: live data from a locally running FloofyChain Core node.</p>
      </section>
      <section className="grid">
        <article className="panel balance">
          <p className="muted">Connected node wallet balance (not a browser wallet)</p>
          <h2>{summary ? formatFloof(summary.balance) + ' FLOOF' : '— FLOOF'}</h2>
          <p className="muted">{summary
            ? 'Unconfirmed: ' + formatFloof(summary.unconfirmed) + ' FLOOF · Block ' + summary.blocks + ' · ' + summary.chain
            : 'No balance loaded'}</p>
          <button onClick={() => void refresh()} disabled={loading}>
            {loading ? 'A atualizar…' : '↻ Refresh balance'}
          </button>
          {error && <p role="alert" style={{ color: '#ffcbaf' }}>{error}</p>}
          {summary && <p className="muted">Last updated: {new Date(summary.updatedAt).toLocaleString('pt-PT')}</p>}
        </article>
        <article className="panel">
          <h2>Wallet actions</h2>
          <div className="actions"><button disabled>Send</button><button disabled>Receive</button><button disabled>History</button></div>
          <p className="muted">No keys, signing or transaction creation are implemented.</p>
        </article>
      </section>
      <section className="panel next">
        <h2>What's next?</h2>
        <p>Verify node identity and build a separate public-address query service without exposing a funds-holding Core RPC endpoint.</p>
        <a href="https://github.com/CryptoSirDev/floofy-web-wallet" target="_blank" rel="noopener noreferrer">Follow development on GitHub ↗</a>
      </section>
      <footer>Local-only read-only prototype · Not for real funds · CryptoSirDev</footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
