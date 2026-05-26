## 2024-05-24 - React.memo() alone doesn't prevent deep renders
**Learning:** Wrapping child components with `React.memo()` only works if all props passed to the child are referentially stable. Functions created inside the parent render body without `useCallback()` change their reference on every render, invalidating the child's memoization.
**Action:** Always wrap functions passed as props to heavy components in `useCallback()`, and explicitly add a comment indicating the purpose (e.g. `// Memoized to prevent deep tree re-renders`).
