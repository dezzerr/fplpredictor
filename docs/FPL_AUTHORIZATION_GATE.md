# FPL Third-Party Authorization Gate

## Decision record

**Current decision:** FPL Companion is read-only. No FPL-issued third-party client registration or approved write API access is available.

**Out of scope:** consumer login form automation, credential proxies, cookie import, browser automation, undocumented endpoints, and inferred OAuth clients.

**Approval required before engineering resumes:** written confirmation from FPL covering the protocol, client registration, redirect URI, scopes, token/session lifetime, refresh/revocation, permitted automation, rate limits, terms, and a test environment or approved staging procedure.

## Partner-support request template

Subject: Request for approved third-party Fantasy Premier League API authorization

Hello FPL Support/Partnerships,

We operate FPL Companion, a planning tool that currently imports public team data by Team ID only. We do not collect FPL passwords or automate consumer login pages.

Please confirm whether FPL offers an approved third-party integration for a user to authorize our application to read team data and, if permitted, submit lineup, transfer, and chip changes. If so, please provide:

1. Client-registration process and approved redirect-URI requirements.
2. Authorization protocol, endpoints, supported scopes, and token lifecycle requirements.
3. Whether picks, transfers, Free Hit, Wildcard, Bench Boost, and Triple Captain writes are permitted.
4. Rate limits, automation restrictions, terms, and any required user disclosures.
5. A sandbox, test account process, or approved non-production validation method.

We will keep the integration read-only unless we receive written approval and the official technical documentation needed to implement it safely.
