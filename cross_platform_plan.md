# Cross-Platform Migration Plan (Electron & Android)

This document outlines the strategy for evolving **TORNagator** into a cross-platform application that runs seamlessly on both Desktop (via Electron) and Mobile (via Android/Capacitor).

The goal is to maintain a near 1:1 parity between the two platforms, ensuring future features developed in React are immediately available to both without duplicating effort.

To avoid merge conflicts, this plan is broken down into independent chunks that can be executed by different agents concurrently.

---

## Architecture Decision: Capacitor

Since TORNagator is already a React application wrapped in Electron, the most straightforward path to Android without rewriting the UI is to use **Capacitor**. Capacitor allows packaging standard web applications into native mobile containers.

### Key Challenges
1. **The Webview Component**: The current app relies heavily on the Electron `<webview>` tag (in `src/TornView.js`) which does not exist in standard mobile browsers.
2. **CORS & X-Frame-Options**: TORNagator currently uses Electron's session API to strip `X-Frame-Options` and `Content-Security-Policy` headers so that Torn.com can be embedded. Mobile webviews will block these frames by default unless native interception is implemented.
3. **DOM Injection & Scripts**: The current implementation injects custom CSS and JS into the Electron `<webview>` to read data and manipulate the DOM (e.g., adding profit margins).

---

## Agent Task Chunks

These tasks are designed to be independent.

### Chunk 1: Capacitor Integration & Project Setup
**Goal:** Initialize the Capacitor project and setup Android build configurations.
- **Action 1:** Install `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android` in `package.json`.
- **Action 2:** Initialize Capacitor (`npx cap init`) and create `capacitor.config.json` setting the web directory to `build`.
- **Action 3:** Add the Android platform (`npx cap add android`).
- **Action 4:** Update `package.json` scripts to include Android sync and run commands.

### Chunk 2: Component Abstraction (Webview vs Iframe/Native Browser)
**Goal:** Modify React components to gracefully fallback when the Electron `<webview>` tag is unavailable.
- **Action 1:** Create a utility function (e.g., in `src/utils.js`) to detect the environment: `export const isElectron = !!(window && window.process && window.process.type);`.
- **Action 2:** Modify `src/TornView.js` (specifically the `WebviewTab` component). If `!isElectron`, the app should render a standard `<iframe>` or hook into a native Capacitor browser plugin instead of the `<webview>` tag.
- **Action 3:** Abstract the `webview.executeJavaScript` and `webview.insertCSS` calls so they do not crash the app when running in a non-Electron environment.

### Chunk 3: Android Native HTTP/Frame Interception
**Goal:** Solve the `X-Frame-Options` and CSP blockages on Android so Torn.com can be embedded.
- **Action 1:** Research and implement a Capacitor plugin (or native Android code in `MainActivity.java`) that intercepts HTTP headers, similar to what `public/electron.js` currently does.
- **Action 2:** If native interception for iframes is not feasible in Capacitor, implement a fallback using the Capacitor Browser plugin (`@capacitor/browser`) for Android users, sacrificing the side-by-side UI for a popup native browser approach, OR setup a local proxy server within the Android app to rewrite headers.

### Chunk 4: UI/UX Mobile Responsiveness
**Goal:** Ensure the React UI is usable on smaller screens.
- **Action 1:** Review and update `src/App.css` to include mobile media queries. Ensure the sidebar in `TornView.js` can be fully collapsed or turned into a bottom navigation bar on mobile.
- **Action 2:** Ensure touch targets are adequately sized (at least 44x44px) for Android users.
- **Action 3:** Hide or adapt hover-specific interactions (like the tooltips and DOM injections) that rely on a mouse pointer.
