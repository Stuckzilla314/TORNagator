## 2026-05-24 - [CRITICAL] Prevent DOM-based XSS via Electron Webview
**Vulnerability:** User-provided URLs for Custom Quick Actions were passed directly to the `src` attribute of the Electron `<webview>` component without validation.
**Learning:** In Electron, passing unvalidated user input to `<webview src="...">` allows execution of `javascript:` or `data:` URIs, leading to severe DOM-based XSS which is particularly dangerous in desktop environments with potential node integration depending on configuration.
**Prevention:** Always validate and sanitize user-provided URLs before setting them as an iframe or webview source. Enforce a strict allowlist of URL schemes (e.g., `http://` or `https://`) and explicitly reject dangerous schemes like `javascript:`, `data:`, and `vbscript:`.

## 2024-06-14 - [HIGH] Fix DOM-based XSS in WebView executeJavaScript innerHTML
**Vulnerability:** The application was dynamically injecting API data (`seller.name` and `res.name`) directly into DOM elements via `innerHTML` strings inside the `webview.executeJavaScript` context during the "Buy Mug" scan feature.
**Learning:** Even though the data originates from an external API, it represents user-controlled input (player names). Injecting this directly into `innerHTML` within the privileged Electron webview allows for DOM-based XSS if a player uses malicious HTML as their name.
**Prevention:** Always manually sanitize dynamic variables using an HTML escaping function (e.g., escaping `&`, `<`, `>`, `"`, `'`) before interpolating them into HTML strings that will be rendered via `innerHTML` or `insertAdjacentHTML`.
