# Experimental encrypted browser vault

**DO NOT USE WITH REAL FUNDS.** This is a local test-only prototype, not audited wallet storage.

The UI supports:
- Encrypting a newly generated test WIF, or entering an empty test WIF, with a 12+ character password.
- Unlocking the stored vault after a browser reload and checking that the address matches.
- Recovering with a test WIF and choosing a new password. This overwrites the old encrypted test vault.
- Deleting the test vault from localStorage.

The encrypted record uses AES-256-GCM and a random 96-bit IV, with PBKDF2-SHA256 (600,000 iterations) and a random 128-bit salt. Only ciphertext and public metadata are stored in localStorage. The decrypted WIF is used transiently for address validation, not exposed by the unlock UI.

Security caveats:
- LocalStorage is accessible to JavaScript running on the same origin. XSS, malicious dependencies, browser extensions, compromised machines, weak passwords, and dev-server compromise are risks.
- Clearing browser storage or changing origin loses the encrypted vault. The WIF is the independent backup for this single-key wallet.
- Deleting the record does not guarantee secure erasure of browser storage or RAM.
- This is not HD/BIP39 recovery; one WIF restores one private key.
- The displayed Core balance and transactions are unrelated to this experimental vault.
- The prototype cannot sign or send FLOOF. No funds should be sent to experimental addresses.

Manual smoke test (empty experimental wallet only):
1. Generate a new experimental wallet and retain its WIF privately for the test.
2. Encrypt & save with a disposable 12+ character test password.
3. Reload browser and Unlock with correct password; verify same public address.
4. Try a wrong password; it must fail.
5. Use Forgot password? Restore with WIF and a different password.
6. Reload; old password must fail, new password must unlock to the same address.
7. Delete the encrypted test vault and verify Unlock fails.
8. Never post the WIF or password in screenshots, chat, issues, or GitHub.

The implementation has not yet been independently audited or validated across browsers.
