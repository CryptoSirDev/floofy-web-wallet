# 🐹 FloofyChain Web Wallet — Experimental Prototype

A community-built **FloofyChain browser-wallet research prototype** by [CryptoSirDev](https://github.com/CryptoSirDev). This repository documents an independent experiment in wallet UX, offline address generation, WIF recovery and password-protected browser storage.

> ⚠️ **TEST ONLY — DO NOT DEPOSIT REAL FLOOF.** This software is **not production-ready, audited or capable of spending coins**. Never import a real funded WIF or recovery phrase. Experimental browser addresses are not safe places to receive funds.

## Project status

This is an **experimental, educational proof of concept**, preserved openly for reference, testing and possible future contributions. FloofyChain's developer is separately working on wallet/BIP39 support. **This repository is not the official FloofyChain wallet**, is not endorsed by its maintainers and is not claimed to be compatible with any future official BIP39 implementation.

### Implemented

- React + TypeScript + Vite interface with a multi-step **Create Wallet** experience.
- **Experimental 24-word BIP39 test flow**: generate locally, verify a complete saved phrase, choose a password, encrypt a separate BIP39 browser vault, unlock/lock, recover the same saved test wallet using its 24-word phrase and a new password, re-authenticate in Settings to reveal/hide the original 24-word test phrase, and view the first derived public address. The provisional BIP44 coin type is 666; no interoperability with future official wallets is guaranteed.
- **Experimental BIP39 import preview**: derive public test addresses from an existing 24-word test phrase without saving or activating an imported wallet.
- Browser-side experimental single-key address and WIF generation using secp256k1, hashing and Base58Check.
- Offline WIF validation and address reconstruction; a recovered address **does not** mean the key was imported into Core.
- Password-protected **local experimental vault**, using Web Crypto AES-256-GCM and PBKDF2-SHA-256 (600,000 iterations, random salt and IV); only the encrypted record is persisted in browser local storage.
- Create-wallet flow with password confirmation, explicit WIF-backup acknowledgement and a **separate blind WIF verification step** before completing setup.
- Experimental vault unlock, lock, WIF-based replacement/recovery with a new password, and deletion confirmation warning.
- **Separate browser-wallet dashboard** showing its public address and unavailable balance/history until an address indexer exists.
- **Separate Core developer area** displaying the connected node wallet's read-only balance, receive address and recent transactions. This data **never represents the browser wallet's balance**.
- Send interface is a **simulation/preview only**: no transaction signing, broadcasting or spending.
- Offline research/test scripts under `lab/` for chain address and WIF round-trip compatibility checks.

### Not implemented / not guaranteed

- ❌ Production-ready or officially compatible BIP39/HD recovery. The test-only BIP39 vault is separate from the WIF vault; imported BIP39 phrases are not yet persisted.
- ❌ Browser-wallet address balance, UTXO indexing or transaction history.
- ❌ Transaction creation, signing, broadcasting or real-funds support.
- ❌ Audited key management, complete threat-model coverage, hardened production deployment or independent security review.
- ❌ A full multi-address HD wallet, automatic backup or guaranteed recovery if the password and recovery material are lost.

**BIP39 test-vault recovery:** the 24-word phrase must derive the same saved first address before the encrypted vault can be replaced with a new password. This does not recover a different wallet or enable spending. The BIP39 test vault remains separate from the WIF vault.\n\n**Important:** A WIF backs up only its corresponding single private key. A forgotten vault password cannot be retrieved; a separately saved, correct WIF can be used to create a replacement encrypted test vault. Browser storage can be cleared by the browser/user. A confirmation checkbox or successful WIF verification cannot guarantee that a backup will remain accessible in the future.

## Local development

Use a supported Node.js version compatible with Vite 5 (Node.js 20.19+ or 22.12+ recommended).

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The browser-only experimental wallet features can be explored without a running Core backend, but blockchain/Core information will not be available.

**Optional read-only Core backend (development machine only):**

1. Run a FloofyChain Core node with RPC bound **only to localhost**, preferably with a dedicated empty/test wallet and separate credentials.
2. Copy `backend/.env.example` to `backend/.env` and set the local RPC configuration **without committing it**.
3. In a separate terminal, run:

```bash
cd backend
npm start
```

4. Test `http://127.0.0.1:3001/api/health` and see `backend/README.md` for the restricted endpoints.

**Never** expose Core RPC, this backend or its credentials to the public internet, Render, ngrok or an untrusted network. Even read-only application code uses RPC credentials with potentially powerful wallet privileges.

## Architecture and safety boundaries

| Component | What it does | What it does **not** do |
| --- | --- | --- |
| Browser experimental wallet | Generates/recovers test addresses, encrypts a local test vault | Query a real balance, sign or spend |
| Browser dashboard | Displays the test public address and honest unavailable states | Display Core funds as browser-wallet funds |
| Local Node.js backend | Makes fixed, read-only requests to a local FloofyChain Core RPC | Accept browser-supplied RPC methods, handle browser keys or broadcast |
| Connected Core wallet | Supplies its **own** wallet balance and transaction information | Represent the generated browser wallet |

The design goal is for private keys to stay on the user's device. **This is a design goal, not a security certification.** Web applications can be compromised through scripts, dependencies, browser extensions or malicious hosting. Use only empty test wallets.

## Repository

- `frontend/` — browser wallet prototype, experimental WIF and separate BIP39 test vault modules
- `backend/` — local read-only Core JSON-RPC adapter
- `lab/` — offline address/WIF research and test scripts
- `docs/architecture.md` — architecture notes
- `docs/security.md` — security considerations
- `docs/chain-research.md` — FloofyChain protocol research
- `docs/wallet-creation-research.md` — wallet creation research

**Official FloofyChain Core source:** https://github.com/andyd1986/floofychain

## Contributions

Feedback, issues and carefully scoped pull requests are welcome, especially for UI, accessibility, documentation and test coverage. Do **not** submit private keys, WIFs, recovery phrases, passwords, wallet backups or `.env` files. Do not test this prototype with real funds.

Thanks to the FloofyChain community and its developer for their work on the ecosystem. This is an **independent community prototype**, not an official release.
