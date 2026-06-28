# Auth Flow

## Anonymous User
1. Extension creates or requests an anonymous ID with `POST /api/auth/anonymous`.
2. Free features work with limited quotas.
3. Paid or AI features show a login/upgrade prompt.

## Website Login
1. User opens `/login.html?source=extension`.
2. V1 production should authenticate through Supabase email/password or Google OAuth.
3. After login, the website creates a short-lived `extension_login_code`.
4. Extension exchanges the code through `POST /api/auth/exchange-extension-code`.
5. Extension stores session details in `chrome.storage.local`.

## Logout
1. User logs out in the extension or website.
2. Extension clears local session.
3. Server session is invalidated through `POST /api/auth/logout`.
4. Paid features become unavailable on the next entitlement refresh.

## V1 Local Placeholder
Because production Supabase credentials are not available yet, local code uses mock responses when `MOCK_MODE=true`. This is not a substitute for production Auth QA.

