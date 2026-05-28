## 2026-05-24 - [CRITICAL] Prevent DOM-based XSS via Electron Webview
**Vulnerability:** User-provided URLs for Custom Quick Actions were passed directly to the `src` attribute of the Electron `<webview>` component without validation.
**Learning:** In Electron, passing unvalidated user input to `<webview src="...">` allows execution of `javascript:` or `data:` URIs, leading to severe DOM-based XSS which is particularly dangerous in desktop environments with potential node integration depending on configuration.
**Prevention:** Always validate and sanitize user-provided URLs before setting them as an iframe or webview source. Enforce a strict allowlist of URL schemes (e.g., `http://` or `https://`) and explicitly reject dangerous schemes like `javascript:`, `data:`, and `vbscript:`.
