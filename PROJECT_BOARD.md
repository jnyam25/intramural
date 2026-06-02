# GitHub Projects Workflow for Vertical Slice MVP

This repository uses a vertical slice methodology. Each slice is a thin, end-to-end vertical flow from database to UI.

## GitHub Project Board Columns

- Backlog: All future slices and tasks.
- Slice Design: Defining the exact UI, API, and DB requirements for the current slice.
- In Progress: Currently being coded (Frontend + Backend concurrently).
- In Review: Pull request open, undergoing peer review and automated CI checks.
- QA / UAT: Deployed to staging, manually tested by the team or early adopters.
- Done: Merged to main and deployed to production.

## Issue Template

Use the `Vertical Slice` issue template for every new user story.

Required fields:
- Slice name
- User role / persona
- What the user wants
- Why the user wants it
- Acceptance criteria
- Tech tasks broken out by DB, API, and UI

## Pull Request Template

Every PR should include:
- Summary of the change
- Related slice and issue number
- Checklist for linting, tests, UI validation, API validation, DB review, and documentation
- Testing notes
- Deployment notes

## Execution Plan: 4 Vertical Slices for the MVP

### Slice 0: The Foundation (Week 1)
Goal: Repo setup, CI/CD, DB connection, Auth.

Tasks:
- Initialize Next.js App Router.
- Connect MongoDB Atlas.
- Set up NextAuth/Auth.js.
- Configure Vercel environment variables.
- Set up GitHub Actions for linting and basic tests.

### Future MVP slices

Use the board to track the next vertical slices, such as:
- Slice 1: Waiver execution and signature capture.
- Slice 2: Player roster enrollment and attendance.
- Slice 3: Event scheduling, notifications, and status updates.

## Notes

- Keep slices small and end-to-end.
- Work frontend and backend together within a slice.
- Move issues through the board as the slice progresses.
