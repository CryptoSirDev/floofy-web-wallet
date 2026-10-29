# Offline address laboratory (NO FUNDS)

This folder is intentionally separate from the frontend and the RPC backend.

Run with Node.js (no npm install required):

```powershell
& "C:\Program Files\nodejs\node.exe" lab/offline-address-test.mjs
```

Run from the **repository root** (folder containing `lab`, `frontend` and `backend`).

What it tests:
- secp256k1 compressed public key from the publicly known test scalar **1**;
- FloofyChain mainnet P2PKH version 35 and WIF version 163;
- SHA256, RIPEMD160, Base58Check checksum and decode/encode round trips;
- rejects a modified checksum.

**Safety:** The test private scalar is globally known and intentionally insecure. Its WIF is not printed, and it must never be used for receiving or holding FLOOF. This script has no RPC calls, no transaction signing or broadcasting, no imports from personal Core wallets, and no storage.

This is a **format-level test**, not proof that the address is accepted by the running FloofyChain Core. Next: compare the resulting address and WIF format against the exact official Core version in an isolated disposable environment, then build independent vectors. Do not use real funds.

Do not run this code in the main wallet UI as a production key generator.
