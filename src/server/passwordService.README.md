# `src/server/passwordService.ts`

## What It Does

This module hashes passwords during registration and verifies passwords during login.

## Why It Exists

The server should never store raw passwords. `hashPassword()` turns a password into a salted derived key. `verifyPassword()` derives a key from the login attempt and compares it with the stored hash.

## Important Details

- Uses Node's built-in `crypto.scrypt`.
- Generates a random salt for every password.
- Stores hashes as `salt:derivedKey`.
- Uses `crypto.timingSafeEqual()` to reduce timing leak risk during comparison.

## Place In The Bigger Picture

`src/server/index.ts` calls this module from:

- `POST /auth/register`
- `POST /auth/login`

After login succeeds, the auth service issues a JWT for HTTP `/auth/me` and the Socket.IO handshake.

## Interview Talking Point

This is a clean place to discuss identity fundamentals:

```text
Passwords are not encrypted. They are salted and hashed with a slow key-derivation function.
On login, the server verifies the candidate password by deriving and comparing the same kind of key.
```

For an Okta-style role, connect this to customer support issues:

- a user can authenticate with the correct password;
- the server cannot recover or display the original password;
- failed login can be debugged without exposing secrets;
- password reset should be a separate token-based flow, not password lookup.

## Known Limits

This is good for a learning project, but production identity systems usually add:

- password reset tokens;
- account lockout or rate limiting;
- MFA;
- breached-password checks;
- audit logs;
- password policy configuration.

Those are strong future talking points because they map directly to identity support work.
