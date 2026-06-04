## 2024-06-04 - Native Buttons for Non-Semantic Clickable Divs
**Learning:** Interactive navigation tabs built with `<div>` elements lacked keyboard accessibility (no focus states or tab navigation) and semantic meaning for screen readers.
**Action:** Replaced `<div>` with `<button>` and applied style resets (`background: 'none'`, `borderTop: 'none'`, `borderLeft: 'none'`, `borderRight: 'none'`, `fontFamily: 'inherit'`) to preserve original visual aesthetics while securing accessibility benefits.
