---
name: MediTrack build workflow preferences
description: How the user wants code changes delivered during the MediTrack build
type: feedback
---

Deliver code changes one file at a time, slow pace, with screenshots to verify before moving to next step. Everything done inside VS Code — user creates files manually.

**Why**: User is building this as a portfolio project and wants to understand each piece; also catches paste/syntax issues early (e.g. `<a>` tag stripping).

**How to apply**:
- For edits to existing files: give the exact `Ctrl+F` search string + replacement, or explicit line location. User has called out "where exactly?" when location is vague — always specify.
- Reference the *current* state of files accurately before giving instructions. User corrected me for missing Medicines/Vitals sidebar entries — do NOT reconstruct navItems from memory, read the file.
- After each change, ask for a screenshot before proceeding.
- Before starting any new feature, list the full build plan (files to create vs modify) and get explicit confirmation.
- Keep JSX `<a href=...>` openings on one line to survive copy-paste.
