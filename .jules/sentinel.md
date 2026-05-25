## 2024-05-18 - Fix DOM-based XSS in Custom Quick Actions
**Vulnerability:** The application allowed users to create "Custom Quick Actions" with arbitrary URLs. These URLs were passed directly to the `src` attribute of Electron `<webview>` tags without validation. This allowed executing arbitrary JavaScript (DOM-based XSS) via `javascript:` URIs.
**Learning:** In Electron, `<webview>` tags can execute JavaScript if `src` is set to a `javascript:` URI. We must treat all user-provided URLs as potentially malicious and validate their schemes.
**Prevention:** Always validate and sanitize user-provided URLs. Ensure the scheme is strictly `http:` or `https:` and explicitly reject `javascript:`, `data:`, and `vbscript:` schemes before passing them to `<webview>` or `<iframe>` components.
