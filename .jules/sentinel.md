## 2026-05-24 - [CRITICAL] Prevent DOM-based XSS via Electron Webview
**Vulnerability:** User-provided URLs for Custom Quick Actions were passed directly to the `src` attribute of the Electron `<webview>` component without validation.
**Learning:** In Electron, passing unvalidated user input to `<webview src="...">` allows execution of `javascript:` or `data:` URIs, leading to severe DOM-based XSS which is particularly dangerous in desktop environments with potential node integration depending on configuration.
**Prevention:** Always validate and sanitize user-provided URLs before setting them as an iframe or webview source. Enforce a strict allowlist of URL schemes (e.g., `http://` or `https://`) and explicitly reject dangerous schemes like `javascript:`, `data:`, and `vbscript:`.
## 2024-05-28 - Removed API key injection into untrusted Webview context
**Vulnerability:** The application was injecting a user's API key into a string literal evaluated inside an Electron `<webview>` guest page to fetch market catalog items on demand.
**Learning:** Never pass secrets or sensitive data (like API keys) to an untrusted guest context. Even with context isolation, injecting variables into a string literal evaluated via `executeJavaScript` allows the guest page to access the secret.
**Prevention:** Data fetching that requires secrets must always happen in the main host context, and only sanitized, non-sensitive data should be passed to or read from the guest context.
