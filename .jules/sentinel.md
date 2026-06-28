## 2026-05-24 - [CRITICAL] Prevent DOM-based XSS via Electron Webview
**Vulnerability:** User-provided URLs for Custom Quick Actions were passed directly to the `src` attribute of the Electron `<webview>` component without validation.
**Learning:** In Electron, passing unvalidated user input to `<webview src="...">` allows execution of `javascript:` or `data:` URIs, leading to severe DOM-based XSS which is particularly dangerous in desktop environments with potential node integration depending on configuration.
**Prevention:** Always validate and sanitize user-provided URLs before setting them as an iframe or webview source. Enforce a strict allowlist of URL schemes (e.g., `http://` or `https://`) and explicitly reject dangerous schemes like `javascript:`, `data:`, and `vbscript:`.
## 2026-06-12 - [HIGH] Prevent DOM-based XSS via innerHTML in Webview Scripts
**Vulnerability:** Dynamic strings (like seller names and error messages) from the API were directly concatenated into HTML strings and injected into the DOM via `innerHTML` inside the overlay script in `TornView.js`.
**Learning:** When executing custom scripts within an Electron `<webview>` using `executeJavaScript` or similar overlay execution, standard React XSS protections (which automatically escape text nodes) do not apply. If the script manually constructs HTML strings and uses `innerHTML`, it introduces a DOM-based XSS vulnerability within the guest context.
**Prevention:** When building HTML strings manually in injected scripts, always define and apply a custom `escapeHtml` function to sanitize dynamic variables before concatenation.
## 2026-06-06 - [CRITICAL] Prevent DOM-based XSS via New Tab Inputs
**Vulnerability:** User-provided URLs in the "New Tab" page (for direct navigation and adding favorites) were not validated for unsafe URL schemes before being passed to `onNavigate`, which eventually sets the `src` attribute of the Electron `<webview>`.
**Learning:** Even internal UI components like custom "New Tab" pages that accept URL inputs must validate the URL scheme when running in an environment where setting iframe/webview sources to `javascript:` or `data:` is dangerous (like Electron with nodeIntegration).
**Prevention:** Apply the same strict URL scheme validation (rejecting `javascript:`, `data:`, `vbscript:`) to all user inputs that resolve to navigation targets, not just external or saved configurations like Custom Quick Actions.
## 2024-05-18 - SSRF and Credential Leak in Webview IPC
**Vulnerability:** Untrusted guest webview could emit an IPC message to `handleBridgeMessage` commanding the host app to `fetch` an arbitrary URL while blindly appending the user's `apiKey` to the request, resulting in Server-Side Request Forgery (SSRF) and leaking the API key to external servers. The raw `apiKey` was also directly injected into the guest context.
**Learning:** In electron applications combining `webview` with IPC bridges, do not inject secrets into the guest context directly. Always perform authenticated fetch requests on the host context on behalf of the guest, and strictly validate the target URL.
**Prevention:**
1. Use boolean flags (e.g. `has_api_key = !!apiKey`) instead of injecting the actual API key string into the guest.
2. In the host IPC handler (`handleBridgeMessage`), explicitly validate URLs (`url.startsWith('https://api.torn.com/')`) before executing a `fetch` on behalf of the guest.
