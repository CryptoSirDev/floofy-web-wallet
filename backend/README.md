# Local read-only backend (prototype)

This backend reads the **faucet node's own wallet** balance using the FloofyChain Core JSON-RPC interface. It does **not** query arbitrary addresses, create wallets, sign transactions or broadcast transactions.

## Requirements

- Node.js 20+ installed on the same Windows machine as the faucet Core
- FloofyChain Core running with localhost-only RPC enabled
- A newly rotated RPC password (do not reuse a password shared in chat)

## Run

From the `backend` folder:

1. Copy `.env.example` to `.env`.
2. Edit `.env` locally and set `RPC_USER` and `RPC_PASSWORD` to the credentials for your **faucet node**, not your personal wallet.
3. Run `npm start`.
4. Visit `http://127.0.0.1:3001/api/health` to test connectivity.
5. Visit `http://127.0.0.1:3001/api/wallet/summary` for the **faucet node wallet balance**.

Only two fixed GET endpoints are supported. The RPC method is chosen in server code; browser input never selects RPC methods. The API binds only to localhost and does not enable remote RPC. Never use ngrok or expose this prototype to the internet.

## Safety

The Core RPC credentials are highly privileged even though this backend only invokes read commands. Do not commit `.env` or share its contents. Prefer a dedicated read-only/indexing node in future, because the faucet Core itself holds funds.
