import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'qrcode';
import './style.css';

type WalletSummary = {
  source: 'local-node-wallet';
  balance: number;
  unconfirmed: number;
  blocks: number;
  chain: string;
  updatedAt: string;
};

type WalletTransaction = { txid: string; category: 'send' | 'receive' | 'other'; amount: number; confirmations: number; time: number | null; address: string | null };
const API = 'http://127.0.0.1:3001';
const formatFloof = (amount: number) =>
  new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(amount);

function App() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [walletSetupView, setWalletSetupView] = useState<'home' | 'create' | 'import'>('home');
  const [importMethod, setImportMethod] = useState<'wif' | 'bip39'>('wif');
  const [loading, setLoading] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendPreview, setSendPreview] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [receiveAddress, setReceiveAddress] = useState<string | null>(null);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      try {
        const historyResponse = await fetch(API + '/api/wallet/transactions', { cache: 'no-store' });
        if (!historyResponse.ok) throw new Error('History unavailable');
        const history = await historyResponse.json();
        if (history.source !== 'local-node-wallet' || !Array.isArray(history.transactions)) throw new Error('Invalid history');
        setTransactions(history.transactions);
        setHistoryError(false);
      } catch { setHistoryError(true); }
    } catch {
      setError('Não foi possível contactar o backend local. Confirma que o servidor está ligado na porta 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(API + '/api/wallet/receive', { cache: 'no-store' });
        if (!response.ok) throw new Error('Invalid receive address');
        const data = await response.json();
        if (!active) return;
        if (data.source !== 'local-node-wallet' || !data.configured) {
          setReceiveError('Configure RECEIVE_ADDRESS in backend/.env with an existing address from this Core wallet.');
          return;
        }
        if (typeof data.address !== 'string' || !data.address) throw new Error('Invalid address');
        const qr = await QRCode.toDataURL(data.address, { errorCorrectionLevel: 'M', margin: 2, width: 240 });
        if (active) { setReceiveAddress(data.address); setQrDataUrl(qr); setReceiveError(null); }
      } catch { if (active) setReceiveError('Receive is unavailable. Check RECEIVE_ADDRESS and restart the local backend.'); }
    })();
    return () => { active = false; };
  }, []);

  const sendAmountValid = /^(?:0|[1-9]\\d*)(?:\\.\\d{1,8})?$/.test(sendAmount) && Number(sendAmount) > 0 && Number.isFinite(Number(sendAmount));
  const sendAddressPresent = sendAddress.trim().length > 0;

  const copyAddress = async () => {
    if (!receiveAddress) return;
    try { await navigator.clipboard.writeText(receiveAddress); setCopied(true); }
    catch { setCopied(false); setReceiveError('Copy failed. Select and copy the address manually.'); }
  };

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
      <section className="panel setup-panel" id="wallet-setup">
        <p className="eyebrow">NEXT MILESTONE · INTERFACE PREVIEW ONLY</p>
        <h2>Create or import a wallet</h2>
        <p className="muted">Explore the planned wallet setup. This prototype does not generate, accept, store, or import private keys or recovery phrases.</p>
        {walletSetupView === 'home' ? (
          <div className="setup-options">
            <button className="setup-option" onClick={() => setWalletSetupView('create')}>
              <span className="setup-icon">＋</span><strong>Create New Wallet</strong><span>Explore the future new-wallet setup</span>
            </button>
            <button className="setup-option" onClick={() => setWalletSetupView('import')}>
              <span className="setup-icon">↳</span><strong>Import Existing Wallet</strong><span>See the planned recovery methods</span>
            </button>
          </div>
        ) : (
          <div className="setup-detail">
            <button onClick={() => setWalletSetupView('home')}>← Back to wallet options</button>
            {walletSetupView === 'create' ? (
              <>
                <h3>Create New Wallet</h3>
                <p>Planned steps: generate keys locally, encrypt the wallet, verify a recovery backup, and display the new receiving address.</p>
                <p className="setup-notice">Not available yet. No wallet or keys have been created. Do not use this prototype to store funds.</p>
              </>
            ) : (
              <>
                <h3>Import Existing Wallet</h3>
                <div className="actions">
                  <button className={importMethod === 'wif' ? 'selected' : ''} onClick={() => setImportMethod('wif')}>Private key (WIF)</button>
                  <button className={importMethod === 'bip39' ? 'selected' : ''} onClick={() => setImportMethod('bip39')}>12 / 24 words (BIP39)</button>
                </div>
                {importMethod === 'wif'
                  ? <p>WIF import is planned after we verify FloofyChain key and address formats.</p>
                  : <p>FloofyChain Core does not currently implement BIP39 recovery. Compatibility and derivation paths still need verification.</p>}
                <p className="setup-notice">Preview only. Never paste a real private key or recovery phrase into this prototype.</p>
              </>
            )}
          </div>
        )}
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
          <div className="actions"><button onClick={() => document.getElementById('send')?.scrollIntoView({ behavior: 'smooth' })}>Send</button><button onClick={() => document.getElementById('receive')?.scrollIntoView({ behavior: 'smooth' })}>Receive</button><button onClick={() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' })}>History</button></div>
          <p className="muted">No keys, signing or transaction creation are implemented.</p>
        </article>
      </section>
      <section className="panel next" id="send">
        <p className="eyebrow">INTERFACE PREVIEW · NO TRANSACTIONS</p>
        <h2>Send FLOOF <span className="muted">· Simulation only</span></h2>
        <p className="muted">Plan a transfer without signing, broadcasting, or moving funds. Address validation and network fees are not implemented.</p>
        <form className="send-form" onSubmit={event => { event.preventDefault(); if (sendAddressPresent && sendAmountValid) setSendPreview(true); }}>
          <label htmlFor="send-address">Recipient FLOOF address (public address only)</label>
          <input id="send-address" type="text" value={sendAddress} maxLength={120} placeholder="Paste a public address for a UI preview" autoComplete="off" spellCheck={false} onChange={event => { setSendAddress(event.target.value); setSendPreview(false); }} />
          <label htmlFor="send-amount">Amount (FLOOF)</label>
          <input id="send-amount" type="text" inputMode="decimal" value={sendAmount} placeholder="e.g. 10.5" onChange={event => { setSendAmount(event.target.value); setSendPreview(false); }} />
          <p className="muted">Use a dot for decimals. Up to 8 decimal places. No address or balance checks are performed.</p>
          <button type="submit" disabled={!sendAddressPresent || !sendAmountValid}>Preview transfer</button>
        </form>
        {sendPreview && <div className="send-preview" role="status">
          <h3>Transfer preview — NOT SENT</h3>
          <p><strong>Recipient:</strong> <code className="send-destination">{sendAddress.trim()}</code></p>
          <p><strong>Amount:</strong> {sendAmount} FLOOF</p>
          <p><strong>Network fee:</strong> Unknown — not estimated</p>
          <p className="setup-notice">This is only a visual preview. The destination has NOT been validated, no transaction was created, and no FLOOF was sent.</p>
          <button onClick={() => setSendPreview(false)}>Edit details</button>
        </div>}
      </section>
      <section className="panel next" id="receive">
        <h2>Receive FLOOF <span className="muted">· Connected Core wallet</span></h2>
        <p className="muted">Existing address verified against the connected Core wallet. No new keys are generated.</p>
        {receiveError && <p role="status" className="muted">{receiveError}</p>}
        {receiveAddress && <div className="receive-box">
          {qrDataUrl && <img src={qrDataUrl} alt="QR code for the displayed FLOOF receiving address" width={240} height={240} className="receive-qr" />}
          <div className="receive-details"><p className="muted">Your FLOOF receiving address</p><code className="receive-address">{receiveAddress}</code><p><button onClick={() => void copyAddress()}>{copied ? '✓ Copied!' : 'Copy address'}</button></p><p className="muted">Verify the full address in FloofyChain Core before sharing or using this QR code.</p></div>
        </div>}
      </section>
      <section className="panel next" id="history">
        <h2>Recent transactions <span className="muted">· Connected Core wallet</span></h2>
        <p className="muted">Last 10 wallet entries. These are not transactions for an arbitrary public address.</p>
        {historyError && <p role="alert">Transaction history is unavailable. Check the local Core RPC connection.</p>}
        {!historyError && transactions.length === 0 && <p className="muted">No recent transactions found.</p>}
        <div className="tx-list">{transactions.map((tx, index) => (
          <div className="tx-item" key={tx.txid + ':' + index}>
            <div><strong>{tx.category === 'receive' ? '↓ Received' : tx.category === 'send' ? '↑ Sent' : 'Transaction'}</strong><p className="muted tx-id" title={tx.txid}>{tx.txid || 'Unknown transaction ID'}</p><p className="muted">{tx.time ? new Date(tx.time * 1000).toLocaleString('pt-PT') : 'Unknown date'} · {tx.confirmations} confirmations</p></div>
            <strong className={tx.amount >= 0 ? 'tx-positive' : 'tx-negative'}>{tx.amount > 0 ? '+' : ''}{formatFloof(tx.amount)} FLOOF</strong>
          </div>
        ))}</div>
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
