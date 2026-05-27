## 2024-05-27 - Inline Form Validation UX
**Learning:** Utilizing inline form validation utilizing `role="alert"`, `aria-invalid`, and `aria-describedby` provides vastly superior UX and accessibility over native browser `alert()` dialogs, especially for core interaction flows like login prompts.
**Action:** Always favor inline error states tied directly to the relevant input field using ARIA attributes rather than relying on disruptive browser pop-ups for validation feedback.
