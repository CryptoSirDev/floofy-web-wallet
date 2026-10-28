import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <span className="brand"><span className="mascot">🐹</span> FloofyChain <span className="muted">Web Wallet</span></span>
        <span className="chip">Phase 1 · Prototype</span>
      </header>
      <section className="warning" role="status">
        ⚠️ UI preview only. No blockchain connection, no real balance, no wallet creation or transactions. Never enter a seed phrase here.
      </section>
      <section className="hero">
        <p className="eyebrow">NON-CUSTODIAL WALLET · COMING SOON</p>
        <h1>Your FLOOF. Your keys. Your control.</h1>
        <p className="subtitle">Building a secure, open-source FloofyChain wallet one verified step at a time.</p>
      </section>
      <section className="grid">
        <article className="panel balance">
          <p className="muted">Wallet balance</p>
          <h2>— FLOOF</h2>
          <p className="muted">Not connected to the blockchain</p>
          <button disabled>Refresh balance · Coming soon</button>
        </article>
        <article className="panel">
          <h2>Wallet actions</h2>
          <div className="actions"><button disabled>Send</button><button disabled>Receive</button><button disabled>History</button></div>
          <p className="muted">These features will be enabled after protocol verification and security testing.</p>
        </article>
      </section>
      <section className="panel next">
        <h2>What's next?</h2>
        <p>Verify FloofyChain address formats and RPC capabilities, then implement a read-only balance and UTXO service.</p>
        <a href="https://github.com/CryptoSirDev/floofy-web-wallet" target="_blank" rel="noopener noreferrer">Follow development on GitHub ↗</a>
      </section>
      <footer>Open-source prototype · Not for real funds · CryptoSirDev</footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
