# Product Requirements Document

## Learning Progress Architect

- Date: 2026-04-09
- Status: Working PRD
- Product Stage: MVP -> v1 hardening
- Audience: Product, Design, Engineering

## 1. Executive Summary

Learning Progress Architect is an AI-guided learning workspace for self-directed learners who need structure, momentum, and retention support more than they need content abundance or social features.

The product already delivers a meaningful end-to-end loop:

- define a learning goal
- generate a starter roadmap
- begin a focused study session
- get contextual AI help during study
- capture reflection and confidence
- schedule follow-up review

The current system proves the core concept. It does not yet deliver the full level of trust, clarity, and lifecycle completeness required for a strong v1 product. Several product seams are still visible to the user:

- the experience behaves mostly like a single-active-goal product even though the data model allows multiple goals
- study-session notes appear important but are not persisted
- reviews are scheduled but not completed as a distinct workflow
- the app is highly informative, but not always decisive about the next best action
- the system relies on one large workspace payload and repeated local derivation across pages

This PRD defines the next product iteration: turn the current MVP into a reliable single-learner execution system that helps users move from intention to repeated learning progress with low cognitive overhead.

## 2. Problem Statement

Motivated learners do not usually fail because they lack ambition. They fail because the operational burden of learning is too high. They must decide what to learn, break it into steps, choose materials, start studying, assess whether they understood anything, and remember to revisit weak areas later.

Most tools solve only one slice of that problem:

- planners create a plan but do not drive execution
- note apps capture information but do not schedule reinforcement
- chatbots answer questions but do not preserve learning state
- course platforms provide content but do not adapt around the learner's real constraints

Learning Progress Architect should solve the operational problem end to end:

- convert an ambiguous goal into a clear plan
- turn the plan into a near-term next action
- support the learner while they study
- capture understanding and confusion after each effort
- bring weak topics back at the right time

## 3. Product Vision

Learning Progress Architect becomes the default operating layer for self-directed learning: a calm, opinionated workspace that always answers one question first:

What should I do next to make real progress on this goal?

AI should function as a bounded accelerator inside that workflow, not as an unstructured conversation surface.

## 4. Target User

### Primary User

A self-directed learner who is motivated, cognitively busy, and trying to master a practical topic without a teacher, cohort, or formal curriculum.

Common examples:

- an engineer learning a new technical domain
- a career switcher building capability for a new role
- a student running an independent study plan
- a professional upskilling outside work hours

### User Characteristics

- willing to study consistently, but struggles with planning overhead
- values clarity and momentum over customization depth
- often has limited weekly study time
- wants help deciding, not just documenting
- expects modern AI support, but does not want to manage prompts all day

### Non-Target Users for This Phase

- teams or study groups
- instructors or coaches managing multiple learners
- enterprise administrators
- users looking for a general-purpose note-taking tool
- users primarily seeking a content marketplace

## 5. Jobs To Be Done

### Core Job

When I want to learn something complex on my own, help me turn that goal into a realistic plan and keep me moving without constantly re-deciding what to do next.

### Supporting Jobs

- When I sit down to study, show me the highest-leverage next task immediately.
- When I get stuck, help me understand the concept in the context of my current task.
- When I finish a session, capture what I understood and what remains weak.
- When I am at risk of forgetting something, bring it back at the right time.
- When I lose momentum, remind me of progress in a way that is actionable, not just informational.

## 6. Current Product Truth

This PRD is grounded in the current repository and application behavior as of 2026-04-09.

### What Exists Today

- local email and password authentication
- onboarding flow for goal, level, time budget, target date, study style, and resource mode
- AI-backed or fallback roadmap generation
- exactly three generated tasks per goal today
- scheduled placeholder study events
- learner-supplied and system-suggested resources
- session timer and task-focused study screen
- four in-session AI quick actions: `explain`, `example`, `analogy`, `confused`
- post-session reflection, blockers, and confidence capture
- review scheduling based on confidence
- dashboard, roadmap, goals, reviews, progress, and reflections pages
- bilingual UI support for English and Indonesian
- fallback behavior when AI planning or quick-action generation is unavailable

### Current Product Gaps

- the product model is implicitly single-active-goal, but not formally enforced
- workflow creation is not transactional, so partial setup is possible on failure
- session notes are not persisted
- reviews do not have a dedicated completion lifecycle
- most pages depend on the same full workspace payload and compute their own derived state
- mobile navigation and page hierarchy still create avoidable decision cost

## 7. Product Goals

### Primary Goals

1. Make the product decisional, not just informational.
2. Make the full learning loop trustworthy from planning through review.
3. Reduce cognitive overhead for a single active learner goal.
4. Preserve graceful fallback behavior when AI services are unavailable.
5. Create a product foundation that can later support deeper roadmap intelligence and stronger retrieval without changing the user contract.

### Success Definition

The product is successful when a learner can create a goal, start the right next session quickly, capture what happened, and return for reinforcement without confusion about state, priority, or whether their work was saved.

## 8. Non-Goals

The following are explicitly out of scope for this phase:

- multi-user collaboration
- instructor dashboards
- social features or community accountability
- direct calendar sync with Google Calendar or Outlook
- a broad open-ended chatbot product
- user-generated course publishing
- full enterprise-grade identity and administration

## 9. Product Principles

### 1. Next Action First

Every major surface should make the next best action obvious before it shows supporting information.

### 2. AI Inside the Workflow

AI should strengthen planning, understanding, and reinforcement inside a bounded product flow. It should not replace product structure.

### 3. Trust Through State Clarity

If something is saved, scheduled, completed, or still draft-only, the UI must make that explicit. No important input should appear persistent if it is not.

### 4. Opinionated by Default

The product should make smart defaults on behalf of the learner wherever possible.

### 5. Graceful Degradation

Core learning workflows must remain operable even when AI generation quality degrades or provider availability is constrained.

## 10. Scope for This PRD

This PRD covers the next meaningful product version of Learning Progress Architect for a single learner.

### In Scope

- onboarding and goal creation
- roadmap generation and roadmap consumption
- active goal semantics
- task execution and in-session support
- session reflection and confidence capture
- spaced review lifecycle
- progress and reflection visibility
- mobile and desktop navigation clarity
- reliability improvements required for user trust

### Out of Scope for This Document

- infrastructure migration details
- vendor-level AI implementation details
- experimental collaborative or B2B features

## 11. User Experience Requirements

### A. Goal Creation and Activation

The product must support a clear concept of the learner's active goal.

Requirements:

- A learner can create a new goal from onboarding.
- The system must make it explicit which goal is currently active.
- The rest of the product must use the active goal consistently across Dashboard, Roadmap, Session, Reviews, and Progress.
- If multiple goals exist, the product must either:
  - formally support switching active goals everywhere, or
  - enforce a single-active-goal model for this phase.

Recommendation for this phase:

- treat the product as a single-active-goal system
- allow historical goals to remain visible
- avoid shipping partial multi-goal semantics

### B. Roadmap Generation

The learner must receive a credible starter roadmap immediately after onboarding.

Requirements:

- The system generates a roadmap from goal, level, time budget, target date, study style, and resource context.
- The roadmap must be structured, comprehensible, and sequenced.
- Each task must include a title, description, and study objective.
- Each task should have at least one attached reference path, either learner-provided or system-suggested.
- Workflow creation must be atomic from the learner's perspective. The user should not end up with a partially created goal.

Phase requirement:

- keep the current three-task roadmap if needed for simplicity, but position it as a starter roadmap rather than a full curriculum

### C. Dashboard and Action Hierarchy

The dashboard must function as an operational control surface.

Requirements:

- The primary block on the page must surface the next best task or review action.
- Supporting information such as plan notes, metrics, and signals must not compete with the primary CTA.
- The learner should understand within a few seconds:
  - what goal is active
  - what to do next
  - why that action matters now

### D. Study Session Experience

The session experience must support focused execution.

Requirements:

- A learner can start or resume a task session.
- The page must clearly indicate session state: not started, in progress, paused, completed.
- The timer must be visible and understandable.
- Attached resources must be accessible in-session.
- Quick actions must provide contextual help anchored to the current task and goal.
- Any notes field presented as part of the session must be intentionally handled:
  - persisted with clear save behavior, or
  - removed if the product does not intend to store it

Recommendation:

- persist session notes and make their save state visible

### E. Quick Action Assistance

AI help should feel constrained, useful, and fast.

Requirements:

- Quick actions must be task-contextual, not generic.
- The system should cache generated outputs where appropriate.
- If AI generation is unavailable, the user should receive a graceful, understandable failure state.
- Quick actions should remain tightly framed around comprehension, not become a free-form chat feature.

### F. Reflection and Comprehension Capture

The product must capture meaningful learning outcomes after each study effort.

Requirements:

- After a session, the learner records:
  - what they understood
  - where they are confused
  - how confident they feel
- Submission of this step must complete the task session reliably.
- The user should know what was saved and what happens next after submission.

### G. Review Lifecycle

Reviews must become a true reinforcement workflow, not only a scheduled reminder.

Requirements:

- Reviews are scheduled based on confidence after task completion.
- Reviews should have a dedicated learner flow and clear completion behavior.
- The product must distinguish initial learning from reinforcement activity.
- Completing a review should update review state and preserve future reinforcement logic.
- Reviews should clearly separate due-now items from upcoming items.

### H. Progress and Reflection Surfaces

The product should help the learner interpret momentum, not just inspect raw data.

Requirements:

- Progress should summarize effort, completion, and confidence in a way that reinforces direction.
- Reflections should remain readable over time and easy to scan for patterns.
- Metrics should connect back to action, not just performance reporting.

### I. Navigation and Accessibility

The product must remain clear across desktop and mobile.

Requirements:

- Authenticated navigation must work well on mobile, not only desktop.
- The learner must always be able to recover orientation and move between core routes.
- Important controls must not imply functionality that does not exist.

## 12. Functional Requirements

### FR-1: Authentication

- Users can sign up and sign in with email and password.
- Authenticated routes require a valid session.
- Session failure states should be understandable and recoverable.

### FR-2: Onboarding

- The user can submit a goal, level, weekly hours, optional target date, preferred style, and resource mode.
- If the learner claims to have materials, at least one valid resource is required.

### FR-3: Workflow Creation

- On successful onboarding, the system creates the goal, roadmap tasks, schedule placeholders, notes, and resource links.
- Workflow creation should succeed or fail cleanly as one unit from the user's perspective.

### FR-4: Resource Handling

- Learner-supplied resources can be attached during onboarding.
- System-generated references may supplement missing materials.
- Resource relevance should remain tied to the task context.

### FR-5: Session Start and Resume

- Starting a task creates or resumes an open session.
- Starting a pending task should move it into `in_progress`.

### FR-6: Session Completion

- Completing the comprehension flow stores reflection, blockers, confidence, and duration.
- Completing the session marks the task complete and schedules a review.

### FR-7: Quick Actions

- The learner can request contextual assistance during a session with one tap.
- Generated outputs can be reused for the same task and action when appropriate.

### FR-8: Reviews

- The learner can see pending reviews grouped by urgency.
- The learner can complete a review as a distinct event.
- Review completion updates review state and future scheduling logic.

### FR-9: Goals

- The learner can view current and past goals.
- The product must define and enforce active-goal semantics consistently.

### FR-10: Progress and Reflection

- The learner can review past sessions, confidence, and reflection history.
- The system should make recent progress feel directional and usable.

## 13. Non-Functional Requirements

### Reliability

- No silent partial workflow creation
- No important learner-authored text should be presented as persistent if it is not
- Core workflows must work even without AI provider availability

### Performance

- Core screens should feel responsive on mobile and desktop
- Data fetching should not create unnecessary repeat-load friction as the workspace grows

### Trust and Clarity

- Every major action should have a clear outcome state
- Error messaging should help the learner recover, not simply report failure

### Privacy and Security

- Learner data is private to the authenticated user
- Session management should move toward expiry and cleanup as the product matures

## 14. Success Metrics

### Primary Metrics

- Goal-to-first-session start rate
- Task completion rate per active goal
- Review completion rate
- Weekly active learners
- Average sessions per active goal

### Quality Metrics

- Quick-action usage rate during sessions
- Reflection completion rate after session start
- Percentage of learners with at least one completed review cycle

### Guardrail Metrics

- Workflow creation failure rate
- Partial workflow creation incidents
- Session completion drop-off rate
- Authentication-related failure rate

Note:

The current product does not yet appear to have a mature analytics layer for these metrics. Instrumentation should be added before launch-readiness decisions depend on them.

## 15. Risks and Dependencies

### Product Risks

- The roadmap may feel too shallow if exactly three tasks are interpreted as a full learning plan rather than a starter plan.
- Partial multi-goal behavior can create confusion unless the active-goal model is formalized.
- If reviews continue to route back into the same task flow without lifecycle distinction, the reinforcement promise will feel incomplete.
- If notes remain non-persistent, trust in the session surface will erode.

### Technical Dependencies

- AI planning and quick-action reliability
- data-model consistency between goals, tasks, sessions, reviews, and resources
- frontend read-model strategy as workspace complexity grows
- transactional persistence for workflow creation

## 16. Recommended Release Plan

### Phase 1: Trust and Loop Completion

- formalize active-goal semantics
- make workflow creation transactional
- persist or remove in-session notes
- create a real review completion path
- clarify save states and post-action outcomes

### Phase 2: Decisional UX and Navigation

- strengthen next-best-action hierarchy across Dashboard, Roadmap, and Reviews
- add robust mobile navigation
- reduce visual and informational competition on key pages

### Phase 3: Intelligence and Depth

- improve roadmap depth beyond the starter structure
- deepen reference quality and retrieval grounding
- improve adaptation across confidence, history, and weak areas

## 17. Open Questions

1. Should the product remain intentionally single-active-goal through v1, or is explicit goal switching important enough to justify broader complexity now?
2. Should roadmap generation remain fixed at three starter tasks, or should roadmap depth vary by goal complexity and time horizon?
3. Should in-session notes live on the `study_sessions` record, in `notes`, or both?
4. What is the ideal review interaction model: lightweight check-in, full revisit session, or hybrid?
5. Which learner-facing metrics genuinely motivate action versus adding reporting noise?

## 18. Launch Criteria for v1 Hardening

The next version should be considered ready when:

- the learner can complete the full loop from onboarding through review without trust-breaking gaps
- the active-goal model is explicit and consistent
- study-session inputs have clear persistence behavior
- review state is lifecycle-managed
- the product communicates a clear next best action across core surfaces
- fallback behavior preserves the core user contract when AI services fail

## 19. Summary

Learning Progress Architect already has the right product shape: plan, execute, reflect, reinforce. The next step is not to add breadth for its own sake. It is to make the existing loop more coherent, trustworthy, and decisive.

If this phase is executed well, the product will move from an impressive MVP into a disciplined learning system with a clear right to expand.
