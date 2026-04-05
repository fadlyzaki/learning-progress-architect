# UI/UX Review Report

Date: 2026-04-05
Project: Learning Progress Architect
Scope: Existing UI and UX only, with no feature changes proposed

## Review Setup

### Artifact

The artifact reviewed is the full React application flow:

1. Landing
2. Authentication
3. Onboarding
4. Authenticated shell and navigation
5. Dashboard
6. Goals
7. Roadmap
8. Study session
9. Comprehension check
10. Reviews
11. Progress
12. Reflections

### North Star

Help a single self-directed learner turn a vague goal into the next clear study action with as little cognitive overhead as possible.

### User

Primary user assumption: a motivated but cognitively busy learner who wants structure, clarity, and momentum more than customization. Technical proficiency is mixed, but patience for UI friction is low once they are inside the product.

### Constraints

- No feature changes
- Existing routes and workflows stay intact
- Improvements should come from hierarchy, copy, affordance, responsiveness, accessibility, and state feedback
- Must work across desktop and mobile layouts

## Surface-by-Surface Audit

### Landing

- Strong visual identity and product voice.
- The page communicates philosophy well, but the copy density is high before the user sees the concrete first action.
- The desktop nav is usable, but the mobile story is weaker because the top navigation links disappear.

### Authentication

- Clear single-column form with good focus.
- Validation is minimal and understandable.
- The page lacks stronger guidance about what happens next after sign-in or sign-up, so the transition into onboarding feels a bit mechanical.

### Onboarding

- This is the strongest structured flow in the app.
- The split-panel layout gives context and reduces blank-form anxiety.
- The final resource step is visually heavier than the earlier steps, and the amount of form surface grows quickly when the user adds materials.
- There is no visible progress bar, only step text, so the sense of progress is more conceptual than felt.

### Authenticated Shell and Navigation

- Desktop navigation is clear and consistent.
- Mobile navigation is the biggest structural UX gap in the app: the sidebar disappears below `md`, but the mobile header does not replace it with route navigation.
- Theme and language controls are useful, but they visually compete with product navigation in some contexts.

### Dashboard

- The "recommended next task" card is the clearest expression of product value.
- The page has too many competing panels with similar visual weight: roadmap progress, notes, signals, and active goal all fight for attention.
- The plan notes card is especially text-heavy and slows scanning.

### Goals

- Goal cards are understandable and data-rich.
- The page is stable but generic; it reads more like a data table in card form than a decision-oriented workspace.
- The primary action is clear, but the page does not strongly guide which goal matters most right now.

### Roadmap

- The vertical timeline metaphor is a good fit for the product.
- The active goal card is readable, but task descriptions and badges create visual repetition.
- The page emphasizes status more than action priority, so it is still possible to hesitate about what to do next.

### Study Session

- The timer creates a strong focal point.
- The session structure is conceptually good: objective, materials, notes, quick actions, completion.
- Trust breaks in this screen because several "quick action" buttons look actionable but have no behavior, and the notes area appears important but is not persisted.
- The completion CTA is visually powerful, but it is not clearly gated by meaningful session state.

### Comprehension Check

- The three-step reflection flow is simple and emotionally appropriate after a session.
- The confidence selector is the most immediately understandable control in the whole app.
- The page is strong overall, but it could better reassure the learner about what gets saved and what happens after finishing.

### Reviews

- The due-now and upcoming split is correct and easy to understand.
- Weak areas are surfaced helpfully.
- The page works, but it is visually similar to other dashboard-like pages and lacks a stronger "start the most urgent review now" hierarchy.

### Progress

- The page gives a decent summary of effort, completion, streak, and confidence.
- The metric cards are useful but generic; they communicate data more than meaning.
- The recent activity timeline is solid, but the page needs clearer narrative interpretation of progress.

### Reflections

- Reflection history is readable and emotionally grounded.
- The page is one of the calmer surfaces in the app.
- Repetition across cards makes longer histories feel heavier than necessary, especially on smaller screens.

## `ux_review` Persona Matrix

### Don Norman

- Critical Insight: The product's core strength is not planning, but turning ambiguity into a visible next action.
- Friction Point: On mobile, the user can enter the app shell and lose clear discoverability of where the rest of the product lives.
- Score: 5/10
- Kill-Switch Feedback: Add explicit mobile navigation or the app fails discoverability for a large class of users.

### Dieter Rams

- Critical Insight: Too many cards use the same weight, glow, border treatment, and uppercase typography, which weakens the signal of what matters most.
- Friction Point: On the dashboard, secondary information competes with the recommended next step.
- Score: 6/10
- Kill-Switch Feedback: Reduce visual equivalence across panels so the primary action remains visually dominant.

### Jakob Nielsen

- Critical Insight: The system has decent consistency, but some controls suggest functionality that is not actually available.
- Friction Point: The study session quick-action buttons create expectation without feedback or outcome.
- Score: 5/10
- Kill-Switch Feedback: Remove, disable, or clearly mark non-functional controls until they have behavior.

### Jony Ive

- Critical Insight: The design language has conviction, but hierarchy is being spent on style instead of guidance.
- Friction Point: Repeated uppercase mono headings and dense bordered panels flatten the interface.
- Score: 6/10
- Kill-Switch Feedback: Reserve high-contrast, uppercase, and glow treatments for moments that truly deserve emphasis.

### Steve Jobs

- Critical Insight: The product promise is compelling when the user sees "here is your next task," but that sharpness fades across the rest of the app.
- Friction Point: Several pages feel like reports about learning instead of tools that accelerate learning.
- Score: 5/10
- Kill-Switch Feedback: Make every major page answer one question first: "What should I do now?"

### Sam Altman

- Critical Insight: The app can increase learner leverage, but only if it consistently reduces decision cost.
- Friction Point: The learner still has to interpret too much raw status data to choose the next move.
- Score: 6/10
- Kill-Switch Feedback: Build stronger default action hierarchy so the system feels decisional, not just informative.

### Bret Victor

- Critical Insight: The strongest interactions are the session timer and confidence loop because they make action and consequence feel immediate.
- Friction Point: Notes, plan summaries, and progress surfaces feel static rather than responsive to user intent.
- Score: 6/10
- Kill-Switch Feedback: Increase immediate feedback around session state, completion, and data persistence to make the system feel alive.

## Synthesis

### Conflict Map

- Rams wants less chrome and fewer panels; Nielsen still requires clear structure and status labels.
- Ive wants stronger hierarchy; Norman wants stronger discoverability.
- Jobs and Altman both push toward decisive action, while Bret Victor pushes toward more immediate feedback after each action.

Resolution: prioritize clarity of next action first, then simplify visual treatment around that action. This best serves the app's North Star.

### Cognitive Load Estimate

- Intrinsic load: medium. Learning planning and reflection are naturally effortful tasks.
- Extraneous load: medium-high. The interface adds extra effort through repeated card styling, dense copy blocks, all-caps headings, weak mobile navigation, and some ambiguous interaction states.

### Surgical Recommendations

1. The 80/20 Cut

Reduce the number of equally prominent panels on the dashboard and demote long note content to preview state. This would sharpen the product's strongest moment immediately.

2. The Aha Moment

Make the authenticated shell consistently center a single "next best action" with clearer urgency, status, and recovery cues.

## Final Verdict

REFACTOR

The app has a strong core mental model and a coherent visual language, but there are enough navigation, hierarchy, and trust papercuts that the UX still feels promising rather than deeply reliable.

## Five Improvements Without Changing Features

### 1. Add Real Mobile Navigation to the Authenticated Shell

Problem:
The desktop sidebar is hidden on smaller screens, but the mobile header in `Layout.tsx` does not provide replacement route navigation.

Why it matters:
This is the most serious UX issue in the app because it harms discoverability, orientation, and task continuity.

Improvement:
Add a mobile bottom navigation or a compact slide-over menu with the same destinations already present in the desktop sidebar:

- Today
- Goals
- Roadmap
- Reviews
- Progress
- Reflections

No feature changes:
This only exposes existing routes on mobile.

Primary files:

- `src/components/Layout.tsx`

### 2. Rebuild Visual Hierarchy Around "Next Best Action"

Problem:
The app's best idea is the recommended next task, but many authenticated screens distribute attention too evenly across cards, notes, badges, and stats.

Why it matters:
The learner should not need to interpret multiple panels before deciding what to do next.

Improvement:
Across Dashboard, Roadmap, and Reviews:

- make the primary CTA visually dominant
- demote supporting cards with lighter borders and less saturated surfaces
- show one primary action and one fallback action only
- convert long note content into compact previews with stronger headings

No feature changes:
This is hierarchy and presentation work on existing information and CTAs.

Primary files:

- `src/pages/DashboardPage.tsx`
- `src/pages/RoadmapPage.tsx`
- `src/pages/ReviewsPage.tsx`
- `src/components/ui/Card.tsx`

### 3. Reduce Scan Fatigue From Repeated All-Caps and Uniform Card Weight

Problem:
The design system uses uppercase mono text, bordered cards, and similar surfaces almost everywhere. That creates brand consistency, but it also makes the app harder to scan over time.

Why it matters:
Users need visual contrast between metadata, explanation, status, and action. Right now, many elements look equally important.

Improvement:

- keep uppercase mono for labels, chips, and micro-metadata
- shift longer headings and content blocks toward more natural sentence-case reading
- increase whitespace between sections
- reduce border/glow intensity on secondary cards
- use stronger contrast only for active or urgent elements

No feature changes:
This is purely visual hierarchy and typography tuning.

Primary files:

- `src/index.css`
- `src/components/ui/Card.tsx`
- `src/components/ui/Button.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/ProgressPage.tsx`
- `src/pages/ReflectionsPage.tsx`

### 4. Make Session and Comprehension Flows Feel Trustworthy

Problem:
The session page contains controls that imply behavior without confirming it. The quick-action buttons appear functional, and the notes field appears important, but the current screen does not communicate persistence or state strongly enough.

Why it matters:
This is the most sensitive point in the product. If users do not trust the session flow, they stop trusting the learning loop.

Improvement:

- clearly label non-functional quick actions as unavailable until implemented, or visually demote them
- add explicit session state messaging such as "Not started", "In progress", "Paused"
- make the completion CTA reflect whether the session has actually started
- add save-state language for the notes area or style it as scratch notes if it is intentionally temporary
- show stronger completion reassurance on the comprehension page

No feature changes:
This is about state communication, affordance accuracy, and feedback.

Primary files:

- `src/pages/SessionPage.tsx`
- `src/pages/ComprehensionPage.tsx`

### 5. Upgrade Empty, Loading, and Recovery States Across the App

Problem:
Several pages fall back to plain text errors or generic spinners. That keeps the app functional, but it does not help the user recover, reorient, or stay confident.

Why it matters:
State transitions are part of UX, especially in a productivity tool where users return often and may be interrupted.

Improvement:

- replace generic spinners with page-shaped skeletons
- turn plain empty/error text into contextual cards with next-step CTAs
- use more specific copy about what is loading and what the user can do
- keep page layout stable during loading to reduce visual jumps
- use consistent inline recovery actions for auth/session expiry

No feature changes:
This refines existing system states and messaging only.

Primary files:

- `src/hooks/useAppData.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/GoalsPage.tsx`
- `src/pages/RoadmapPage.tsx`
- `src/pages/ReviewsPage.tsx`
- `src/pages/ProgressPage.tsx`
- `src/pages/ReflectionsPage.tsx`

## Priority Order

1. Mobile navigation
2. Next-best-action hierarchy
3. Session/comprehension trust fixes
4. Loading and recovery states
5. Typography and card-weight refinement

## Summary

The product already has a clear mental model: define a goal, generate a roadmap, study, reflect, review, and track progress. The UX improvements should focus on making that loop feel more navigable, more decisive, and more trustworthy rather than more complex.
