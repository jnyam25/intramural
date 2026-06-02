---
name: Vertical Slice
about: Create a new vertical slice using a strict user story template.
labels: backlog
---

**Slice:** [e.g., Waiver Execution]

**As a:** [student]

**I want to:** [digitally sign the liability waiver]

**So that:** [I can be cleared to play]

### Acceptance Criteria
- User sees the active waiver template.
- User can click "I Agree" (mock signature).
- System captures IP, User-Agent, and Timestamp.
- `waiver_signatures` document is created and immutable.
- Audit log entry is created.

### Tech Tasks
- DB: Create `waiver_signatures` schema.
- API: `POST /api/waivers/sign` endpoint.
- UI: Next.js component with scroll-to-bottom enforcement before enabling the button.
