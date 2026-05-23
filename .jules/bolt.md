## 2024-05-23 - App.js Timer Causing Deep Tree Re-renders
**Learning:** The root `App.js` component re-renders frequently (e.g., every second) due to the `travelTimeLeft` timer. This causes all heavy child components (like `UserDashboard`, `OverseasStock`, etc.) to unnecessarily re-render if they are not memoized and if the functions passed to them are not stabilized.
**Action:** Always ensure that heavy child components are wrapped in `React.memo()` and that any functions passed to them as props from a frequently re-rendering parent are stabilized using `useCallback()`.
