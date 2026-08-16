# Google Calendar OAuth Setup Runbook

OAuth credentials for Google Calendar integration in LifeOS.

Calendar events are bidirectional: LifeOS both displays Google Calendar events
and creates/edits/deletes events on the user's primary Google Calendar.

## Prerequisites

- A Google account with access to [Google Cloud Console](https://console.cloud.google.com/)
- The LifeOS backend running on port `6060` (the redirect URI target)

## Step 1 — Create or pick a Google Cloud project

1. Open <https://console.cloud.google.com/>
2. Click the project dropdown at the top → pick an existing project or click **New Project**
   - If creating: name (e.g., `thein3rovert`), leave organization/folder blank if personal.

## Step 2 — Enable the Google Calendar API

1. <https://console.cloud.google.com/apis/library>
2. Search **Google Calendar API**
3. Click → **Enable**

You can verify it's enabled at <https://console.cloud.google.com/apis/dashboard>.

## Step 3 — Configure the OAuth consent screen

1. <https://console.cloud.google.com/auth/audience>
2. Pick your project at the top if not already selected
3. **App name**: `Lifeos`
4. **User support email**: your email
5. **Developer contact information**: your email
6. **App type**: **External** (unless you have an internal Workspace). LifeOS is
   a single-user personal app — testing with yourself is enough to get started.
7. Add scope: **`.../auth/calendar.events`** (read/write access to events).
   - Do NOT request `calendar.readonly` — this task needs write access.
8. Add yourself as a **test user** under the "Test users" section.

## Step 4 — Create OAuth credentials

1. <https://console.cloud.google.com/apis/credentials>
2. **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: **Web application**
4. **Name**: `Lifeos Web client`
5. Under **Authorized redirect URIs**, click **+ ADD URI** and paste:

   ```
   http://localhost:6060/api/calendar/oauth/callback
   ```

6. Click **Create**

A modal opens with:
- **Client ID** — long string ending in `.apps.googleusercontent.com`
- **Client Secret** — keep this private — Google won't show it again after this dialog.

Copy both values somewhere safe immediately.

## Step 5 — Wire credentials into LifeOS

Append the following to your local `.env` (this file is git-ignored):

```
GOOGLE_CLIENT_ID=<paste client id>
GOOGLE_CLIENT_SECRET=<paste secret>
GOOGLE_REDIRECT_URI=http://localhost:6060/api/calendar/oauth/callback
```

`.env.example` already documents placeholders for these vars — do NOT put real
values there; `.env.example` is committed.

## Step 6 — Verify the backend loads the credentials

With the new vars added, restart the backend. The Go server reads them via
`server/internal/config/config.go`:

```go
GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
GoogleRedirectURI:  getEnv("GOOGLE_REDIRECT_URI", "http://localhost:6060/api/calendar/oauth/callback"),
```

No smoke test yet for the full OAuth flow — that's covered by **LOS-014.02**
(backend OAuth handler + callback route). This runbook only sets up the creds +
config so LOS-014.02 has everything it needs.

## Rotation / revoke

- Revoke a user's granted access: <https://myaccount.google.com/permissions>
- Rotate a client secret: <https://console.cloud.google.com/apis/credentials> →
  open the client → **Reset secret** (immediately expires the old one).
- Delete the credential entirely: open the client → **DELETE**

## Troubleshooting

| Error | Cause / Fix |
|-------|-------------|
| `redirect_uri_mismatch` | The `GOOGLE_REDIRECT_URI` in `.env` doesn't match exactly what's registered in the Google Cloud console (must match to the trailing slash) |
| `invalid_client` | Client ID / secret typo. Re-copy from Google Cloud |
| `access_denied` on consent | App is in "Testing" mode and your account isn't listed as a test user — add yourself under the consent screen's **Test users** section |
| `insufficient_permissions` on events write | Consent only granted `calendar.readonly` — re-auth with the `calendar.events` scope. Remove access at <https://myaccount.google.com/permissions> and retry |

## Deploying to a real host

If the backend isn't running on `localhost:6060` (e.g., Tailscale IP or a
public hostname), update both:

1. The `GOOGLE_REDIRECT_URI` in `.env` → `https://your-host/api/calendar/oauth/callback`
2. The **Authorized redirect URIs** for the OAuth client in Google Cloud Console
   → add the new URI

Never use `http://` in production — Google rejects plain HTTP redirect URIs
for non-localhost hosts.