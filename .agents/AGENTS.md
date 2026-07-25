# Agent Rules for GoJim Workspace

## Phone Number Validation
- Every time the system takes a phone number in any popup, modal, form, or input field, you must import and use the global phone helper utilities from `@/lib/utils`:
  - Use `cleanPhone` in the input's `onChange` event to strip any non-numeric characters and enforce a maximum length of 10 digits in real-time.
  - Use `validatePhone` on form submit to verify that the phone number contains exactly 10 digits before saving or sending.
- Do not duplicate regex patterns or manually write ad-hoc phone validators; always use these central `@/lib/utils` helper functions.
