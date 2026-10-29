import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import QRCode from 'qrcode';
import './style.css';
import { createEphemeralWallet, restoreExperimentalAddress } from './experimentalWallet';
import { hasTestVault, testVaultAddress, saveTestVault, unlockTestVault, clearTestVault } from './experimentalVault';

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
  const [experimentalWallet, setExperimentalWallet] = useState<{address: string; wif: string} | null>(null);
  const [showExperimentalWif, setShowExperimentalWif] = useState(false);
  const [testWifInput, setTestWifInput] = useState('');
  const [restoredTestAddress, setRestoredTestAddress] = useState<string | null>(null);
  const [restoreTestError, setRestoreTestError] = useState<string | null>(null);
  const [experimentalError, setExperimentalError] = useState<string | null>(null);
  const [creationStage, setCreationStage] = useState<'password' | 'backup' | 'verify'>('password');
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [backupWifCheck, setBackupWifCheck] = useState('');
  const [backupVerified, setBackupVerified] = useState(false);
  const [backupCheckError, setBackupCheckError] = useState('');
  const [vaultPresent, setVaultPresent] = useState(() => hasTestVault());
  const [vaultAddress, setVaultAddress] = useState<string | null>(() => { try { return testVaultAddress(); } catch { return null; } });
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultConfirm, setVaultConfirm] = useState('');
  const [vaultWif, setVaultWif] = useState('');
  const [vaultMode, setVaultMode] = useState<'save' | 'unlock' | 'recover'>('unlock');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultNotice, setVaultNotice] = useState('');
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

  const sendAmountValid = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(sendAmount) && Number(sendAmount) > 0 && Number.isFinite(Number(sendAmount));
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
      {(!vaultPresent || (experimentalWallet && (creationStage === 'backup' || creationStage === 'verify'))) && <section className="panel setup-panel" id="wallet-setup">
        <p className="eyebrow">EXPERIMENTAL · LOCAL BROWSER WALLET</p>
        <h2>Create or import a wallet</h2>
        <p className="muted">Create a disposable single-key address locally in your browser. No backend receives the key. Experimental WIF restoration is available. Never fund experimental addresses.</p>
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
                <p>Generate a new experimental single-key FLOOF address locally using the browser's cryptographic randomness.</p>
                <p className="setup-notice">⚠️ TEST ONLY. Not audited. Local encryption is experimental; there is no HD recovery or signing. Never send FLOOF to this address. Keep the WIF backup separate from the browser.</p>
                <button type="button" onClick={() => {
                  try {
                    if (vaultPresent) throw Error('Vault already exists');
                    setExperimentalWallet(createEphemeralWallet());
                    setCreationStage('password'); setBackupConfirmed(false); setBackupWifCheck(''); setBackupVerified(false); setBackupCheckError('');
                    setShowExperimentalWif(false);
                    setExperimentalError(null);
                  } catch {
                    setExperimentalWallet(null);
                    setExperimentalError('Could not create test wallet. Check browser support or delete existing test vault first.');
                  }
                }}>Generate experimental wallet</button>
                {experimentalError && <p role="alert">{experimentalError}</p>}
                {experimentalWallet && <div className="send-preview">
                  <h3>{creationStage === 'password' ? 'Step 2 — Secure your wallet' : creationStage === 'backup' ? 'Step 3 — Save your test WIF' : 'Step 4 — Verify your saved WIF'}</h3>
                  <p>Public address: <code>{experimentalWallet.address}</code></p>
                  {creationStage === 'password' ? <form className="send-form" autoComplete="off" onSubmit={async event => {
                    event.preventDefault(); setVaultBusy(true); setVaultNotice('');
                    try {
                      if (vaultPassword.length < 12 || vaultPassword !== vaultConfirm) throw Error('Invalid password');
                      await saveTestVault(experimentalWallet.wif, vaultPassword);
                      setVaultPresent(true); setVaultAddress(experimentalWallet.address);
                      setCreationStage('backup');
                    } catch { setVaultNotice('Could not save. Passwords must match (12+ characters), and no previous test vault may exist.'); }
                    finally { setVaultPassword(''); setVaultConfirm(''); setVaultBusy(false); }
                  }}>
                    <p>Choose a password to encrypt your empty experimental wallet in this browser.</p>
                    <label htmlFor="creation-password">Password (12+ characters)</label>
                    <input id="creation-password" type="password" autoComplete="new-password" value={vaultPassword} onChange={e => setVaultPassword(e.target.value)} />
                    <label htmlFor="creation-confirm">Confirm password</label>
                    <input id="creation-confirm" type="password" autoComplete="new-password" value={vaultConfirm} onChange={e => setVaultConfirm(e.target.value)} />
                    <button type="submit" disabled={vaultBusy || !vaultPassword || !vaultConfirm}>{vaultBusy ? 'Encrypting…' : 'Encrypt & continue'}</button>
                  </form> : creationStage === 'backup' ? <>
                    <p className="setup-notice">TEST ONLY. Never fund this wallet. Save your private test WIF in a safe place. You will need it to pass the next step. Never share it.</p>
                    <button type="button" onClick={() => setShowExperimentalWif(v => !v)}>{showExperimentalWif ? 'Hide test WIF' : 'Reveal test WIF'}</button>
                    {showExperimentalWif && <p>Private test WIF: <code className="send-destination">{experimentalWallet.wif}</code></p>}
                    <div className="send-form">
                      <label><input type="checkbox" checked={backupConfirmed} onChange={e => setBackupConfirmed(e.target.checked)} /> I saved my experimental WIF somewhere safe</label>
                      <button type="button" disabled={!backupConfirmed} onClick={() => {
                        setShowExperimentalWif(false);
                        setBackupWifCheck(''); setBackupVerified(false); setBackupCheckError('');
                        setCreationStage('verify');
                      }}>Continue to backup verification</button>
                    </div>
                  </> : <>
                    <p className="setup-notice">The private WIF is no longer shown on this step. Use the backup you saved previously to verify the same wallet address. Verification stays in your browser.</p>
                    <div className="send-form">
                      <label htmlFor="backup-wif-check">Enter your saved test WIF</label>
                      <input id="backup-wif-check" type="password" autoComplete="off" spellCheck={false} value={backupWifCheck} onChange={e => { setBackupWifCheck(e.target.value); setBackupVerified(false); setBackupCheckError(''); }} placeholder="Enter the test WIF from your backup" />
                      <button type="button" disabled={!backupWifCheck.trim()} onClick={() => {
                        try {
                          if (restoreExperimentalAddress(backupWifCheck.trim()) !== experimentalWallet.address) throw Error('mismatch');
                          setBackupVerified(true); setBackupCheckError(''); setBackupWifCheck('');
                        } catch {
                          setBackupVerified(false); setBackupCheckError('The WIF is invalid or belongs to a different wallet. Check your backup.');
                        }
                      }}>Verify saved WIF</button>
                      {backupCheckError && <p role="alert" className="setup-notice">{backupCheckError}</p>}
                      {backupVerified && <p role="status">✓ Backup verified locally: the WIF matches your wallet address.</p>}
                      <button type="button" disabled={!backupVerified} onClick={() => {
                        setExperimentalWallet(null); setBackupWifCheck(''); setBackupVerified(false);
                        setVaultMode('unlock'); setVaultNotice('Test wallet setup complete. Unlock with your password.');
                      }}>Finish test setup</button>
                    </div>
                  </>}
                  {vaultNotice && <p role="alert" className="setup-notice">{vaultNotice}</p>}
                </div>}
              </>
            ) : (
              <>
                <h3>Import Existing Wallet</h3>
                <div className="actions">
                  <button className={importMethod === 'wif' ? 'selected' : ''} onClick={() => setImportMethod('wif')}>Private key (WIF)</button>
                  <button className={importMethod === 'bip39' ? 'selected' : ''} onClick={() => setImportMethod('bip39')}>12 / 24 words (BIP39)</button>
                </div>
                {importMethod === 'wif' ? <>
                  <p>Restore the address of an EMPTY experimental wallet from its WIF. Local computation only; no Core import, funds, network access or storage.</p>
                  <p className="setup-notice">⚠️ EXPERIMENTAL TEST ONLY. Never enter a WIF from a real wallet or a wallet containing funds. Do not use browser extensions or screen recordings that might capture your test WIF.</p>
                  <form className="send-form" autoComplete="off" onSubmit={event => {
                    event.preventDefault();
                    try {
                      const address = restoreExperimentalAddress(testWifInput.trim());
                      setRestoredTestAddress(address);
                      setRestoreTestError(null);
                    } catch {
                      setRestoredTestAddress(null);
                      setRestoreTestError('Invalid WIF: check Base58, checksum, network and compressed key format.');
                    } finally {
                      setTestWifInput('');
                    }
                  }}>
                    <label htmlFor="test-wif">Experimental WIF (never use a real funded wallet)</label>
                    <input id="test-wif" type="password" value={testWifInput} maxLength={128} autoComplete="off" spellCheck={false} placeholder="Paste a test-only WIF" onChange={event => {
                      setTestWifInput(event.target.value);
                      setRestoredTestAddress(null);
                      setRestoreTestError(null);
                    }} />
                    <button type="submit" disabled={!testWifInput.trim()}>Restore Test Wallet Address</button>
                    <button type="button" onClick={() => { setTestWifInput(''); setRestoredTestAddress(null); setRestoreTestError(null); }}>Clear test input and result</button>
                  </form>
                  {restoreTestError && <p role="alert" className="setup-notice">{restoreTestError}</p>}
                  {restoredTestAddress && <div className="send-preview" role="status">
                    <h3>Test address recovered offline!</h3>
                    <p><strong>Recovered public address:</strong> <code className="send-destination">{restoredTestAddress}</code></p>
                    <p className="setup-notice">This only reconstructs an address. It does not import keys into Core, check balance or enable spending. DO NOT FUND.</p>
                  </div>}
                </> : <>
                  <p>FloofyChain Core does not currently implement BIP39 recovery. Compatibility and derivation paths still need verification.</p>
                  <p className="setup-notice">Preview only. Never paste a real recovery phrase into this prototype.</p>
                </>}
              </>
            )}
          </div>
        )}
      </section>}
      {vaultPresent && !(experimentalWallet && (creationStage === 'backup' || creationStage === 'verify')) && <section className="panel setup-panel" id="experimental-vault">
        <p className="eyebrow">EXPERIMENTAL · ENCRYPTED LOCAL STORAGE</p>
        <h2>Unlock or recover your test wallet</h2>
        <p className="setup-notice">⚠️ EMPTY TEST WALLETS ONLY. Browser storage is not a secure hardware wallet. Never use real funded keys. A forgotten password cannot be recovered; a saved WIF can be used to replace the test vault with a new password.</p>
        <p>Saved test wallet: {vaultPresent ? <strong>{vaultAddress ?? 'Saved vault (metadata unavailable)'}</strong> : 'None'}</p>
        <div className="actions">

          <button type="button" onClick={() => { setVaultMode('unlock'); setVaultNotice(''); setVaultUnlocked(false); }}>Unlock</button>
          <button type="button" onClick={() => { setVaultMode('recover'); setVaultNotice(''); setVaultUnlocked(false); }}>Forgot password? Restore with WIF</button>
        </div>
        <form className="send-form" autoComplete="off" onSubmit={async event => {
          event.preventDefault();
          setVaultBusy(true); setVaultNotice(''); setVaultUnlocked(false);
          try {
            if (vaultMode === 'unlock') {
              const address = await unlockTestVault(vaultPassword);
              setVaultAddress(address); setVaultUnlocked(true);
              setVaultNotice('PASS: encrypted test wallet unlocked. Address verified offline.');
            } else {
              if (vaultPassword !== vaultConfirm) throw Error('Passwords do not match');
              if (vaultPassword.length < 12) throw Error('Use at least 12 characters');
              if (vaultMode === 'save' && vaultPresent) throw Error('A vault exists. Use WIF recovery to replace it.');
              const sourceWif = vaultMode === 'save' && experimentalWallet ? experimentalWallet.wif : vaultWif.trim();
              if (!sourceWif) throw Error('Create a test wallet or enter its test WIF first');
              const address = await saveTestVault(sourceWif, vaultPassword, vaultMode === 'recover');
              setVaultAddress(address); setVaultPresent(true);
              setVaultNotice(vaultMode === 'recover' ? 'PASS: test wallet restored from WIF and encrypted with NEW password.' : 'PASS: test wallet encrypted and saved in this browser.');
            }
          } catch (err) {
            setVaultNotice('Error: ' + (err instanceof Error && ['Passwords do not match','Use at least 12 characters','A vault exists. Use WIF recovery to replace it.','Create a test wallet or enter its test WIF first'].includes(err.message) ? err.message : 'Invalid password, WIF or saved test wallet.'));
          } finally {
            setVaultPassword(''); setVaultConfirm(''); setVaultWif(''); setVaultBusy(false);
          }
        }}>
          {vaultMode !== 'unlock' && <><label htmlFor="vault-wif">Test WIF {vaultMode === 'save' && experimentalWallet ? '(uses the newly generated test wallet above)' : '(experimental only)'}</label>
            {!(vaultMode === 'save' && experimentalWallet) && <input id="vault-wif" type="password" autoComplete="off" spellCheck={false} value={vaultWif} onChange={e => setVaultWif(e.target.value)} placeholder="Test-only WIF — never a funded wallet" />}</>}
          <label htmlFor="vault-password">{vaultMode === 'unlock' ? 'Password' : 'New password (12+ characters)'}</label>
          <input id="vault-password" type="password" autoComplete="new-password" value={vaultPassword} onChange={e => setVaultPassword(e.target.value)} />
          {vaultMode !== 'unlock' && <><label htmlFor="vault-confirm">Confirm new password</label><input id="vault-confirm" type="password" autoComplete="new-password" value={vaultConfirm} onChange={e => setVaultConfirm(e.target.value)} /></>}
          <button type="submit" disabled={vaultBusy || !vaultPassword || (vaultMode !== 'unlock' && !vaultConfirm)}>{vaultBusy ? 'Working…' : vaultMode === 'unlock' ? 'Unlock test wallet' : vaultMode === 'recover' ? 'Recover and set new password' : 'Encrypt & save test wallet'}</button>
        </form>
        {vaultNotice && <p role="status" className="setup-notice">{vaultNotice}</p>}
        {vaultUnlocked && <p>Unlocked address: <code>{vaultAddress}</code> — no signing or funds access enabled.</p>}
        {vaultPresent && <button type="button" onClick={() => { if (window.confirm('WARNING: This permanently deletes the encrypted TEST vault from this browser. If you do not have the correct WIF backup, you may permanently lose access to this wallet and any funds associated with it. This action cannot be undone. Are you absolutely sure?')) { clearTestVault(); setVaultPresent(false); setVaultAddress(null); setVaultUnlocked(false); setVaultNotice(''); setVaultMode('unlock'); setVaultPassword(''); setVaultConfirm(''); setVaultWif(''); setWalletSetupView('home'); } }}>Delete encrypted test vault</button>}
      </section>}

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
