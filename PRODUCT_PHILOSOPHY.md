# tododoro — Product Philosophy

## Non-Negotiable Constraints

These constraints are the product. Violating them is not a feature request; it is a product defect.

### What This App Is

tododoro is a spatial, Pomodoro-first canvas for tracking personal intentions. Position declares priority. Sessions declare devotion. The Devotion Record is the truth.

### Hard Prohibitions

1. **No due dates.** Time pressure is not part of this product. No deadline fields, no overdue states, no urgency signals.

2. **No priorities.** Spatial position *is* priority. A card's location on the canvas communicates everything. Never add a priority enum, importance flag, or ordering field.

3. **No sub-tasks.** Intentions are not decomposable in this model. A todo is a single, whole intention. No children, no hierarchical breakdown.

4. **No accounts, login, or sync.** All data lives locally on the user's device. No backend, no user ID, no authentication surface. `connect-src 'none'` in the CSP is a product statement, not just a security control.

5. **No gamification.** No streaks, no achievement badges, no point systems, no leaderboards. The Devotion Record is reflective, not motivational.

6. **No global primary CTA.** There is no "Add Task" button. The canvas is the call to action. A persistent action button would violate the spatial model.

7. **No success toasts or loading indicators.** User-initiated actions produce visible feedback within 100ms or silent ceremony (CompletionMoment). Nothing in between.

8. **No external data transmission.** Ever. Not for analytics, not for error tracking, not for feature flags. The CSP's `connect-src 'none'` enforces this at the browser level.

### The Session-First Inversion

Sessions can start *without* a linked todo (Exploration sessions). You can focus before knowing what you are focusing on. This is intentional and sacred.

### The Devotion Record is Immutable Identity

The Devotion Record is keyed on `todoId`, not on the todo's title. Renaming a todo never erases its history. This is a domain invariant, not a UI concern.

### For AI Agents and Contributors

Before adding any field, component, or behaviour, ask: does this belong in a priority manager, a calendar app, or a gamified habit tracker? If yes, it does not belong here.
