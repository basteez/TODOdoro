---
stepsCompleted: [1, 2, 3, 4]
workflow_completed: true
session_active: false
inputDocuments: []
session_topic: 'Pomodoro-enhanced Todo app with monorepo architecture and modern JS stack'
session_goals: 'Explore tech stack and architecture choices, brainstorm innovative features, define UX direction, identify edge cases and test scenarios'
selected_approach: 'ai-recommended'
techniques_used: ['First Principles Thinking', 'SCAMPER Method', 'Chaos Engineering']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Tiziano
**Date:** 2026-03-09T17-13-54

## Session Overview

**Topic:** Pomodoro-enhanced Todo app — todos linked to Pomodoro sessions, tracking how many Pomodoros each todo took to complete.
**Goals:** Explore tech stack + architecture decisions, surface innovative beyond-basics features, define UX/design direction, identify edge cases for high test coverage.

### Session Setup

Monorepo (backend + frontend + shared packages), modern JS stack, glassmorphism / Apple-inspired UI with light/dark/system theme, global timer customization, pomodoro can run standalone, persistence strategy TBD.

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Pomodoro-enhanced Todo app with goals around innovation + architecture + edge cases

**Recommended Techniques:**

- **First Principles Thinking:** Strip away assumptions about what "todo" and "pomodoro" must be → reveal the genuine unique value and unexpected features
- **SCAMPER Method:** Systematically apply 7 creative lenses to generate 40–60+ ideas across features, UX, architecture, and testing strategy
- **Chaos Engineering:** Stress-test best ideas against worst-case scenarios → directly map to edge cases and test coverage requirements

**AI Rationale:** Complex technical product with known building blocks but requiring genuine innovation. First principles prevents copying existing apps. SCAMPER maximizes ideation breadth. Chaos Engineering converts ideas into robust, testable requirements.

---

## Technique Execution Results

### Technique 1: First Principles Thinking

**Core Insight:** A todo is not a reminder — it is a declaration of personal ownership. A Pomodoro is not a timer — it is a container for presence. Completion is not a condition to be verified — it is a sovereign declaration by the user. These three principles form the philosophical soul of the app: it is a mirror, not a manager.

**Ideas Generated:**

**[Feature #1]: The Release Ritual**
_Concept:_ When archiving a todo, the app asks a single question: "Are you releasing this because it no longer matters, or because it was never truly yours?" Two different archive states — "Completed its purpose" vs. "Returned to the world." Both treated as healthy outcomes, not failures.
_Novelty:_ No todo app distinguishes between these two forms of non-completion. Reframes archiving as intentional acts rather than giving up.

**[Feature #2]: The Devotion Record**
_Concept:_ Each todo has a visual timeline showing every Pomodoro invested — not just a count, but a history. A todo completed in 1 focused session looks different from one that took 3 months of scattered effort. The story of how you completed it is part of what you completed.
_Novelty:_ Transforms completion metrics into a personal narrative of perseverance rather than a simple done/not-done binary.

**[Feature #3]: The Gravity Signal**
_Concept:_ The app passively tracks Pomodoro frequency and recency per todo and surfaces a subtle "gravitational pull" indicator — not a notification, not a nudge, just a quiet visual weight. A todo you keep returning to glows differently. The app witnesses your behavior and reflects it back without judgment.
_Novelty:_ Turns behavioral data into emotional self-awareness. The app becomes a mirror, not a manager.

**[Feature #4]: The Unnamed Session**
_Concept:_ A Pomodoro started without a todo isn't incomplete data — it's a first-class citizen called an "Exploration." At session end, a single gentle prompt: "What were you present with?" Whatever is typed is offered as a new todo, an insight to file, or simply logged as a moment of focus.
_Novelty:_ Transforms the unassigned state from a missing field into a creative discovery mechanism.

**[Feature #5]: The Completion Moment**
_Concept:_ When a todo is declared done, the app briefly surfaces the devotion record: "You completed this across X Pomodoros over Y days." Not a confetti burst — a quiet, respectful acknowledgment. Then it archives. Clean.
_Novelty:_ Completion becomes a moment of reflection rather than a dopamine hit.

**[Design Principle #1]: Flat Effort Units**
_Concept:_ All Pomodoros are equal in weight regardless of when they occur. The count is honest and unambiguous — a simple, trustworthy measure of showed-up time.
_Novelty:_ Deliberately resists gamification or effort quality scoring.

**[Design Principle #2]: Declared Completion**
_Concept:_ "Done" is a deliberate act of self-declaration. The app marks it complete when the user says so — no validation, no "are you sure?", no progress percentage required.
_Novelty:_ Treats the user as the sole authority on their own achievement.

**[Architecture Idea #1]: Session-First Data Model**
_Concept:_ The core entity is the Pomodoro session. Todos are optional labels that sessions can belong to — not containers that sessions live inside. The timeline of the day is a stream of sessions, some labeled with intentions, some not.
_Novelty:_ Inverts the typical task-manager data model. Enables querying focus time independently of whether todos exist.

---

### Technique 2: SCAMPER Method

**S — Substitute**

**[Feature #6]: The Intention Canvas**
_Concept:_ The main view is a spatial canvas where todos live as freely-positioned cards. Cards with more Pomodoro investment are visually heavier (larger, more opaque). Completed ones fade gracefully to the edges, still visible as evidence of work done.
_Novelty:_ Spatial arrangement externalizes priority without tags or sorting logic. The canvas becomes a living map of focus life.

**[Architecture Idea #2]: Event-Sourced Backend**
_Concept:_ Every action is an immutable domain event — `TodoDeclared`, `SessionStarted`, `SessionCompleted`, `TodoReleased`, `TodoSealed`. State is derived by replaying events. The devotion record, gravity signal, and release ritual all emerge naturally from the event log.
_Novelty:_ Append-only event log is the perfect foundation for high test coverage. Each event is a pure, deterministic unit. Edge cases become unusual event sequences.

**C — Combine**

**[Feature #7]: The Living Card**
_Concept:_ The active todo card IS the timer. Tapping it starts the session; it pulses gently for 25 minutes. No separate timer screen, no context switch.
_Novelty:_ Eliminates the cognitive friction of switching between "what am I doing" and "how long have I been doing it."

**[Feature #8]: The Daily Echo**
_Concept:_ End-of-day opt-in summary, auto-generated from the event stream. A single honest sentence: "Today you showed up for [todo name] across 4 Pomodoros." No streaks, no scores.
_Novelty:_ Journaling without the effort. The data does the remembering.

**[Architecture Idea #3]: Isomorphic Domain Package**
_Concept:_ `@tododoro/domain` — a shared monorepo package containing all event types, aggregates, and business rules in pure TypeScript with zero framework dependencies. Backend and frontend both import from it. The event model is the contract.
_Novelty:_ Business logic lives exactly once. Tests for domain logic are framework-agnostic and blazing fast.

**[Feature #9]: Focus Mode Ambiance**
_Concept:_ During an active session the UI shifts subtly — a slight warmth, a soft deepening of the glassmorphism blur. Not a mode switch. The interface breathes differently while the user is present.
_Novelty:_ The UI becomes a participant in the focus state, not just a passive display.

**A — Adapt**

**[Feature #10]: The Shelf**
_Concept:_ Completed and released todos move to a "Shelf" view — like a record collection. Each archived todo is a sleeve to inspect: its devotion record, its lifecycle, whether it was sealed or released.
_Novelty:_ Archives become a source of identity and pride. "Look at everything I've shown up for" rather than "look at my completed tasks."

**[Feature #11]: The Analog Timer**
_Concept:_ The Pomodoro timer renders as a circular wipe — a slow, tactile sweep like a physical clock hand. No numbers unless explicitly requested. Time experienced as a shape completing itself.
_Novelty:_ Reduces anxiety by removing the quantified pressure of "18:42 remaining."

**M — Modify / Magnify**

**[Feature #12]: The Constellation Canvas**
_Concept:_ The canvas is the app's centerpiece and primary navigation paradigm. Fully zoomable — from a bird's-eye constellation of all intentions (visual weight = Pomodoro investment) down to a single card filling the screen. No lists, no sidebar, no tabs.
_Novelty:_ Navigation becomes spatial and gestural rather than hierarchical.

**[Design Principle #3]: Zero Onboarding**
_Concept:_ First launch: empty canvas, one ambient hint that dissolves after 3 seconds. No tutorial, no walkthrough, no get-started checklist.
_Novelty:_ Onboarding is itself a declaration of distrust. Removing it is a design statement.

**[Design Principle #4]: Radical Settings Minimalism**
_Concept:_ One settings screen. Timer durations. Theme toggle (light/dark/system). Nothing else.
_Novelty:_ The app's defaults are the product opinion. No invitation to endlessly configure.

**P — Put to Other Uses**

**[Feature #13]: Position Is Priority**
_Concept:_ No priority fields, no urgency levels, no labels. Cards are dragged on the canvas. Center = now. Edges = later. The spatial arrangement IS the priority system.
_Novelty:_ Eliminates an entire category of meta-work. Priority becomes a physical gesture.

**E — Eliminate**

**[Design Principle #5]: Local-First, No Accounts**
_Concept:_ The app is fully local. No sign-up, no login, no cloud sync. Data lives on the device from day one. Persistence in v1 is a local event log — JSON file or embedded SQLite. Migration to a backend later is a sync problem, not a schema problem.
_Novelty:_ Radical act of respect in an era where everything demands an email before it lets you think.

**R — Reverse / Rearrange**

**[Feature #14]: Session-First Entry**
_Concept:_ The prominent entry point on the canvas is "start a session," not "add todo." Focus first, then the app asks: "What were you present with?" Attach to existing todo, create new, or leave as Exploration.
_Novelty:_ Inverts the conventional productivity loop. You don't plan to focus — you focus, then reflect on what it meant.

**[Feature #15]: Focus Collapse**
_Concept:_ When a session is active, the canvas collapses — all other cards fade away and the active intention fills the screen. One thing. Everything else waits.
_Novelty:_ The app architecturally enforces single-tasking through its spatial model, not a setting.

**[Feature #16]: The Living Background**
_Concept:_ During an active session the canvas background itself becomes the timer — a slow, imperceptible shift in glassmorphism depth and warmth over 25 minutes. You're sitting inside the timer, not watching it.
_Novelty:_ Timer becomes spatial and environmental. Removes the last reason to glance at numbers.

**[Feature #17]: Retroactive Attribution**
_Concept:_ A completed session can be attached to a todo after the fact. The event stream records it honestly: `SessionAttributed` after `SessionCompleted`.
_Novelty:_ Accommodates how focus actually happens — messy, unplanned, often without prior intention.

---

### Technique 3: Chaos Engineering

**[Architecture Idea #4]: Tolerant Event Replay with Repair**
_Concept:_ The event log reader applies a repair pipeline before projecting state. Orphaned `SessionStarted` → auto-close with duration capped at timer max. Duplicate events → deduplicated via idempotency keys. Unknown event types → skipped with warning. The app always opens, always shows something coherent.
_Novelty:_ Resilience is first-class. The repair pipeline is itself a testable, isolated module — each recovery strategy is a pure function with its own test suite.

**Edge Cases — Event Log:**
- `SessionStarted` with no matching `SessionCompleted` → repair: auto-close
- Duplicate event IDs → repair: deduplicate on read
- `TodoSealed` before any session → valid (zero-Pomodoro completions are legal)
- Unknown event type in stream → repair: skip, continue replay
- Empty event log → valid: empty canvas
- Corrupted JSON mid-file → replay up to last valid event, discard remainder

**[Architecture Idea #5]: Relative Canvas Coordinates**
_Concept:_ Card positions stored as relative percentages of canvas dimensions. On any screen size, the constellation reflows correctly. Canvas boundaries are soft — cards dragged to edges are gently nudged back. Soft warning at 50 cards, hard cap at 100.
_Novelty:_ Canvas is resolution-independent by design. The 100-card limit is a philosophical guardrail.

**Edge Cases — Canvas:**
- Simultaneous drag collision → last-write-wins with 50ms debounce
- Off-canvas drag → elastic boundary snaps card back
- Resolution change → relative coordinates reflow automatically
- Double session trigger → domain rule: only one `SessionActive` state allowed, second start rejected with `SessionAlreadyActive` error

**[Architecture Idea #6]: Durable Session State**
_Concept:_ On `SessionStarted`, the event is immediately persisted with a wall-clock start timestamp. On reopen, app checks for unmatched `SessionStarted` — resumes if within duration, auto-completes if exceeded. Timer duration changes during a session apply to the next session only; active session carries its own duration snapshot.
_Novelty:_ The session is durable from moment of start. The clock is the source of truth, not an in-memory interval.

**Edge Cases — Timer:**
- App closed mid-session → resume on reopen if within duration, auto-complete if exceeded
- Timer duration changed mid-session → active session uses original duration
- System clock set backwards → `ClockAnomalyDetected` event logged, session preserved with last valid timestamp
- App backgrounded longer than session → auto-complete fires on foreground
- Multiple rapid open/close cycles → idempotent resume, no duplicate completions

**[Design Principle #6]: Minimum Session Threshold**
_Concept:_ Sessions under 60 seconds are automatically discarded — a `SessionAbandoned` event is written instead of `SessionCompleted`. Not user-configurable. Presence requires at least a minute of commitment.
_Novelty:_ Prevents accidental taps from polluting the devotion record. The 60-second rule is a philosophical statement.

**[Feature #18]: Release Eulogy**
_Concept:_ When releasing a todo with >5 Pomodoro sessions, the app pauses and shows the full devotion record one final time: "You invested 47 Pomodoros in this. It's okay to let it go." The Shelf shows released todos with full history and a `released` badge.
_Novelty:_ Prevents silent erasure of significant effort. Honors what was given without requiring completion.

**[Architecture Idea #7]: Immutable Todo Identity**
_Concept:_ Todo titles are mutable display metadata, but the todo's UUID (assigned at `TodoDeclared`) never changes. Renaming fires a `TodoRenamed` event. All historical sessions still belong to the same entity. The shelf shows the name as it was at each point in time.
_Novelty:_ Renaming never breaks history. The log is truth; the title is a label.

**Edge Cases — Philosophy:**
- Zero-Pomodoro completion (sealed immediately) → valid domain event sequence
- Releasing a todo with 47 sessions → Release Eulogy triggers at >5 threshold
- Session under 60 seconds → `SessionAbandoned`, never appears in devotion records
- Retroactive attribution to already-sealed todo → domain rule: `SessionAttributed` rejected for sealed todos
- Todo renamed after sessions → `TodoRenamed` event preserves full history under original identity

**[Architecture Idea #8]: Schema Versioning for Events**
_Concept:_ Every event carries a `schemaVersion` field. The domain package exports versioned schemas and an upgrade pipeline — v1→v2 migrations are pure functions transforming old events on read. Monorepo enforces same `@tododoro/domain` version across packages via workspace protocol pinning. CI runs cross-package type checks as a required gate.
_Novelty:_ The domain package is the single contract. Breaking it fails the build, not runtime.

**[Architecture Idea #9]: Snapshot-Based Replay**
_Concept:_ Every 500 events, the app writes a canvas snapshot — a fully-derived state checkpoint stored as a `SnapshotCreated` event. Replay begins from the most recent snapshot. Performance is O(n) from snapshot, not O(total history).
_Novelty:_ Performance degrades gracefully with usage. Not needed at v1 launch, but the model supports it without schema changes.

---

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: The Philosophy Layer** *(what makes this app unlike anything else)*
- Design Principle #1: Flat Effort Units
- Design Principle #2: Declared Completion
- Design Principle #3: Zero Onboarding
- Design Principle #4: Radical Settings Minimalism
- Design Principle #5: Local-First, No Accounts
- Design Principle #6: Minimum Session Threshold (60s)

**Theme 2: The Canvas & Spatial UX** *(the interface as a living landscape)*
- Feature #6: The Intention Canvas
- Feature #12: The Constellation Canvas (zoomable)
- Feature #13: Position Is Priority
- Feature #15: Focus Collapse
- Feature #16: The Living Background

**Theme 3: The Devotion System** *(recording and reflecting the effort you've given)*
- Feature #2: The Devotion Record
- Feature #3: The Gravity Signal
- Feature #5: The Completion Moment
- Feature #8: The Daily Echo
- Feature #18: Release Eulogy

**Theme 4: The Session Model** *(how focus is captured and honored)*
- Feature #4: The Unnamed Session / Exploration
- Feature #7: The Living Card
- Feature #9: Focus Mode Ambiance
- Feature #11: The Analog Timer
- Feature #14: Session-First Entry
- Feature #17: Retroactive Attribution

**Theme 5: The Lifecycle & Archive** *(what happens to things over time)*
- Feature #1: The Release Ritual
- Feature #10: The Shelf

**Theme 6: The Architecture** *(the invisible foundation)*
- Architecture #1: Session-First Data Model
- Architecture #2: Event-Sourced Backend
- Architecture #3: `@tododoro/domain` — Isomorphic Domain Package
- Architecture #4: Tolerant Event Replay with Repair
- Architecture #5: Relative Canvas Coordinates
- Architecture #6: Durable Session State
- Architecture #7: Immutable Todo Identity
- Architecture #8: Schema Versioning for Events
- Architecture #9: Snapshot-Based Replay

### Prioritization Results

**Top Priority: Theme 1 — The Philosophy Layer**
_Rationale:_ The six principles are the product's immune system. Codified first, they protect every future decision from scope creep. Encoded in the domain package, they become enforceable constraints rather than aspirational guidelines.

**Top Priority: Theme 2 — The Canvas & Spatial UX**
_Rationale:_ The canvas is the entire navigation paradigm. It is the first and only thing users encounter. It is the highest-risk UX bet and must be validated early, independently, and tested with real users before any other feature is built on top of it.

**Breakthrough Concepts:**
- Session-First Data Model + Event Sourcing — the architecture that makes all features coherent
- The Constellation Canvas — a genuinely new spatial metaphor for personal intention management
- Two Kinds of Letting Go — the Release Ritual distinction is the emotional core no other app has

### Action Planning

**Priority 1: The Philosophy Layer**

1. Write `PRODUCT_PHILOSOPHY.md` in the monorepo root — the six principles in plain language. Every contributor reads it before writing a line of code.
2. Encode principles as architectural constraints in `@tododoro/domain` — no account entities, no due date fields, no sub-task nesting at domain level.
3. Create a `decisions/` folder with ADR-style records — one per principle explaining why it exists, so future contributors don't accidentally undo it.

_Success Indicator:_ Any new feature proposal can be evaluated with: "Does this serve ownership, presence, or sovereignty — or does it undermine them?"

**Priority 2: The Canvas & Spatial UX**

1. Sketch the canvas in three states before writing code: empty (zero onboarding), mid-use (4–8 cards), active session (Focus Collapse). These become acceptance criteria.
2. Build the canvas as a standalone, framework-agnostic component first — pure pointer/touch events, zero state management dependencies.
3. Implement zoom levels early — bird's-eye constellation view and single-card focus view are the two extremes. Everything else is a transition.
4. Use relative coordinates from day one. The reflow test (resize → cards stay proportional) should be in CI from the first commit.

_Success Indicator:_ Someone opens the app for the first time with zero instructions and knows what to do within 10 seconds.

**Architecture Foundation (serves both priorities)**

Monorepo scaffold and `@tododoro/domain` are written first:

```
tododoro/
├── packages/
│   ├── domain/       ← pure TS, zero deps, all events + aggregates
│   ├── storage/      ← local event log adapter (JSON/SQLite)
│   └── ui/           ← canvas component library
├── apps/
│   └── web/          ← the app
├── PRODUCT_PHILOSOPHY.md
└── decisions/
```

Domain package is complete when: all event types defined, repair pipeline handles all 6 corruption scenarios, and test coverage is 100% on valid + invalid event sequences.

---

## Session Summary and Insights

**Key Achievements:**
- Discovered the philosophical soul of the app: ownership, presence, sovereignty — a mirror, not a manager
- Designed a genuinely novel spatial UX paradigm: the Constellation Canvas with positional priority
- Identified a session-first, event-sourced data model that makes every feature emerge naturally from one source of truth
- Generated 18 features, 6 design principles, 9 architecture decisions, and 25+ named edge cases / test scenarios
- Defined a clear v1 build sequence: philosophy → domain package → canvas → features

**Breakthrough Moments:**
- "A todo is something that truly belongs to me" — reframed the entire product away from obligation and toward ownership
- The two kinds of letting go (not important vs. not mine) — an emotional distinction no productivity app has ever made
- Session-first data model: todos are labels, sessions are the primary record — inverted the conventional architecture

**Creative Facilitation Narrative:**
This session moved from the deeply personal (what a todo fundamentally *is* to this user) to the concretely technical (event schema versioning, snapshot-based replay performance) without ever losing the thread. The philosophy didn't constrain the architecture — it *generated* it. Every technical decision traced back to a human truth discovered in the first 10 minutes. The app that emerged from this session is coherent at every layer because it started from first principles rather than feature lists.

**User Creative Strengths:** Tiziano's instinct for what to keep and what to cut was consistently precise. Short responses that carried high conviction: "I decide when a todo is done." "Should be recoverable." These weren't just preferences — they were product decisions made in real time.

**What Makes This App Different:**
It is the only productivity tool designed around the premise that your time and attention are acts of devotion, not units of output. The Constellation Canvas, the Devotion Record, the Release Ritual, and the event-sourced architecture are all expressions of the same truth Tiziano articulated at the very start: a todo is something that truly belongs to you.
