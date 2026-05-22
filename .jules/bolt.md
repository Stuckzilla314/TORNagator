## 2025-10-24 - Wrapped UserDashboard with React.memo()
**Learning:** The root App.js component re-renders frequently (e.g., every second due to a timer or interval), causing heavy child components like UserDashboard to re-render needlessly unless wrapped in React.memo().
**Action:** Use React.memo() on heavy child components to prevent deep tree re-renders.
