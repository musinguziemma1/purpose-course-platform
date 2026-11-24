# Sign in with Google

"Continue with Google" lets people with an **existing, active** Purpose Course
account sign in with the Google account that uses the same email address.
Google never creates accounts: new students still apply and are approved by
staff, and staff/mentors still join through an invitation. A Google address
without an account is sent to the application form.

The flow is OpenID Connect (authorization code with PKCE, `state` and `nonce`).
The server exchanges the code with Google, verifies the ID token's RS256
signature against Google's published keys, and checks its issuer, audience,
expiry, nonce and `email_verified` before matching the email. Sign-ins are
recorded in the activity log as `auth.google_sign_in`.

## 1. Create the Google OAuth client

1. Open <https://console.cloud.google.com/> and create or select a project.
2. **Google Auth Platform → Branding** (older consoles: *APIs & Services → OAuth
   consent screen*): app name *Purpose Course*, a support email, your home page,
   privacy policy (`https://YOUR-DOMAIN/privacy`) and your domain under
   *Authorized domains*.
3. **Audience**: choose *External*. While the app is in *Testing*, only listed test
   users can sign in; select **Publish app** for everyone. The scopes used
   (`openid`, `email`, `profile`) are non-sensitive, so no Google review is needed.
4. **Clients → Create client** (older consoles: *Credentials → Create credentials →
   OAuth client ID*): type **Web application**.
5. **Authorized redirect URIs** — must match exactly:
   - `https://YOUR-DOMAIN/api/auth/google/callback` (the value of `APP_URL`)
   - optional for local development: `http://localhost:3000/api/auth/google/callback`
6. Create, then copy the **Client ID** and **Client secret**. Do not paste the
   secret into chat, Git or screenshots.

## 2. Configure the application

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | `….apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | The client secret (server-only, never `NEXT_PUBLIC_`) |
| `APP_URL` | Canonical HTTPS origin, identical to the redirect URI's origin |

Add them in Vercel (*Project → Settings → Environment Variables*, Production
environment, marked Sensitive) and redeploy. The button appears on `/login` only
when both Google variables are valid. Preview deployments hand the flow over to
`APP_URL`, because Google only returns to registered addresses.

## 3. Check it

1. Open `/login` and choose **Continue with Google**.
2. Pick a Google account whose email matches an active Purpose Course account:
   you land in your workspace (or profile completion first).
3. A Google account without a matching account lands on the application page with
   an explanation. Disabled accounts see a clear message and are not signed in.

If sign-in fails, the server log contains a line starting `[google]` with the
reason (for example `invalid_client` for a wrong secret or `redirect_uri_mismatch`
when the redirect URI in Google differs from `APP_URL`).
