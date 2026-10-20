# FPL Integration Boundary

> **Status:** Read-only Team ID import only
> **Updated:** July 15, 2026

## Current behaviour

FPL Companion imports public squad data using an FPL Team ID. A saved Team ID may be associated with a signed-in FPL Companion account to pre-fill future imports.

The app does not collect FPL passwords, store FPL session cookies, proxy FPL logins, or submit lineup, transfer, or chip changes to FPL. The former direct-sync endpoints return `410 Gone` with `code: "fpl_write_sync_unavailable"` so stale clients fail safely.

## Why direct sync is retired

The legacy password/session login endpoint is unsupported. Consumer Premier League login pages, reverse-engineered endpoints, cookie import, browser automation, and password proxies are not acceptable authorization methods for this product.

## Conditions for reconsidering writes

Direct writes remain unavailable unless FPL provides all of the following in writing:

- An approved third-party client registration and exact callback URL.
- Documented authorization and token lifecycle endpoints, supported scopes, rate limits, and automation terms.
- Explicit permissions for picks, transfers, and chip operations.
- A safe staging or test method.

If those conditions are met, a new implementation must use the authorization-code flow with PKCE, state/nonce validation, server-only encrypted token storage, expiry/revocation handling, and explicit disconnect. Any restored write route must retain the existing preview, deadline, fingerprint, idempotency, audit, rate-limit, manager-allowlist, and canary safeguards.
