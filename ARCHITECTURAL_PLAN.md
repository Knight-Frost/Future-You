# FutureYou — Architectural Plan
**Personal Financial Decision Engine**
Version 1.0 | March 2026

---

## 1. System Overview

FutureYou is a client-side financial decision engine that answers one question:

> "What happens to my financial future if I change this behavior today?"

### What It Solves

Traditional finance apps are backward-looking — they track what already happened. FutureYou is forward-looking. It projects consequences of decisions in real time and tells users what to do next.

### How It Differs

| Dimension         | Traditional Finance App    | FutureYou                        |
|-------------------|----------------------------|----------------------------------|
| Orientation       | Past (tracking)            | Future (projection)              |
| User interaction  | Data entry                 | Scenario exploration             |
| Output            | Reports and charts         | Decisions and recommendations    |
| Feedback loop     | Weekly / monthly review    | Instant, slider-driven           |
| Primary question  | "Where did my money go?"   | "What should I do next?"         |

---

## 2. Architectural Philosophy

### Decision Engine, Not a Tracker

The system is organized around the consequence of a decision, not the recording of a transaction. Every component exists to answer: "If I change X, what happens to Y?"

### Real-Time Feedback Design

The feedback loop is the product. A user must be able to move a slider and see the consequence of that choice within a single animation frame. Any latency breaks the core experience.

### Simplicity and Performance First

- No backend is required for MVP
- No network calls block the user interface
- The insight layer runs asynchronously and never delays rendering
- Complexity is deferred to future scaling phases

---

## 3. High-Level Architecture

```
+----------------------------------------------------------+
|                        USER                              |
+----------------------------------------------------------+
                            |
                     Input / Sliders
                            |
                            v
+----------------------------------------------------------+
|                     UI LAYER                             |
|   Input Forms | Sliders | Charts | Recommendation Cards  |
+----------------------------------------------------------+
                            |
                     State Events
                            |
                            v
+----------------------------------------------------------+
|                 FINANCIAL ENGINE                         |
|   Pure functions | Projection Models | Goal Calculator   |
+----------------------------------------------------------+
                            |
                     Computed Results
                            |
              +-------------+-------------+
              |                           |
              v                           v
+---------------------+     +------------------------+
|    DISPLAY LAYER    |     |     INSIGHT ENGINE     |
|  Charts | Timelines |     |  Rules | Suggestions   |
|  Goal Counters      |     |  (async, non-blocking) |
+---------------------+     +------------------------+
```

Data flows in one direction. The Financial Engine is pure — it takes inputs, returns outputs, and holds no state.

---

## 4. Component Breakdown

| Component          | Responsibility                                      | Key Behavior                                                   |
|--------------------|-----------------------------------------------------|----------------------------------------------------------------|
| Input System       | Collect baseline financial data from the user       | Validates and normalizes inputs into a standard financial model |
| Slider System      | Allow real-time adjustment of financial variables   | Triggers state updates on every change; debounced for AI calls |
| Calculation Engine | Project financial outcomes from current state       | Pure functions; no side effects; runs synchronously on client  |
| Insight Engine     | Generate actionable recommendations from results    | Rule-based for MVP; async AI calls deferred and non-blocking   |
| Display Layer      | Render results, charts, timelines, and goal status  | Reactive to state; re-renders only changed regions             |

---

## 5. Data Flow

```
[1] User Input
      |
      | (form submission or slider move)
      v
[2] State Update
      |
      | (centralized state store updated)
      v
[3] Calculation Engine
      |
      | (pure functions compute projection, goal timeline, delta)
      v
[4] UI Update
      |
      | (display layer re-renders instantly with new results)
      v
[5] Insight Generation
      |
      | (rule engine evaluates results; AI call if configured)
      v
[6] Recommendation Displayed
```

Steps 1–4 are synchronous and complete within a single render cycle.
Step 5 is asynchronous and does not block step 4.

---

## 6. Real-Time Processing Model

### Why Frontend-Based Calculation

- Eliminates network latency entirely
- No server required for core functionality
- Calculations are mathematical projections — no database needed
- Runs offline without degradation

### How Instant Updates Are Achieved

1. Slider emits a value change event
2. State store is updated synchronously
3. Calculation Engine runs pure functions against new state
4. React (or equivalent) re-renders only the affected components
5. Full cycle completes in under 16ms (one frame at 60fps)

### Performance Constraints

| Concern               | Strategy                                                    |
|-----------------------|-------------------------------------------------------------|
| Slider lag            | State updates are synchronous; no async in the hot path     |
| Expensive projections | Memoize results keyed on input hash; recompute only on change |
| Chart re-renders      | Use virtualized or canvas-based charts; avoid DOM thrashing |
| AI insight latency    | Debounce AI calls by 800ms; render results when ready       |

---

## 7. Insight Engine Design

### MVP: Rule-Based Logic

The insight engine evaluates the computed financial state against a set of deterministic rules.

Examples:
- If savings rate < 10%, recommend increasing by a specific amount
- If goal timeline > 10 years, flag high-impact levers the user can adjust
- If debt-to-income > 40%, prioritize debt reduction path

Rules are stored as configuration — not hardcoded logic — so they can be updated without changing the engine.

### Future: AI Integration

When AI recommendations are enabled:

```
Calculation Result
      |
      | (debounce 800ms)
      v
AI API Call (async, background)
      |
      v
Insight Panel Updates (non-blocking)
```

The UI renders rule-based insights immediately. AI insights appear when ready, replacing or supplementing them. The user experience is never blocked.

### Debounce Strategy

| Event Type       | Debounce Delay | Reason                                   |
|------------------|----------------|------------------------------------------|
| Slider move      | 800ms          | Avoid API calls mid-drag                 |
| Form field edit  | 1200ms         | User likely still typing                 |
| Explicit submit  | 0ms            | User has signaled intent; call immediately |

---

## 8. State Management Strategy

### Where Data Lives

All state is held in a single centralized store on the client. There is no server-side session for MVP.

```
+-------------------------------+
|        Central State          |
|-------------------------------|
|  financialInputs              |  <-- user-entered baseline data
|  sliderValues                 |  <-- current scenario adjustments
|  computedProjection           |  <-- output of Calculation Engine
|  insights                     |  <-- output of Insight Engine
+-------------------------------+
```

### How Updates Propagate

1. User interaction mutates `financialInputs` or `sliderValues`
2. A selector or derived state function triggers the Calculation Engine
3. `computedProjection` updates
4. Display Layer re-renders reactively
5. Insight Engine is notified asynchronously

### Why Centralized State

- Single source of truth prevents inconsistent UI states
- All components derive from the same computed projection
- Easier to debug, test, and extend
- Enables undo / history (future feature) with minimal change

---

## 9. Scalability Considerations

FutureYou is designed to scale incrementally without breaking the existing architecture.

### Phase 2: Backend API

- Financial Engine logic is extracted to a shared library
- API layer wraps the same pure functions
- Client falls back to local computation if API is unavailable

### Phase 3: Data Persistence

- User financial profiles saved to a database
- Scenario history stored per user
- No change to the core calculation or insight architecture

### Phase 4: User Accounts

- Authentication added as a wrapper layer
- State store gains a sync mechanism
- Local state remains the primary source during a session

```
MVP:     [Client] → [Engine] → [Display]
Phase 2: [Client] → [API] → [Engine] → [Display]
Phase 3: [Client] → [API] → [Engine + DB] → [Display]
Phase 4: [Client + Auth] → [API] → [Engine + DB] → [Display]
```

Each phase is additive. The core loop does not change.

---

## 10. Design Principles

| Principle          | Application                                                           |
|--------------------|-----------------------------------------------------------------------|
| Simplicity         | One core loop: Decision → Consequence → Action                        |
| Speed              | All critical calculations run synchronously on the client             |
| Clarity            | Every output maps directly to a decision the user can take            |
| Immediate feedback | Slider changes reflect in results within a single frame               |
| Actionable insight | Every recommendation tells the user exactly what to do next           |
| Non-blocking AI    | Insight generation never delays the rendering of core results         |
| Modular design     | Each component has one responsibility and can be replaced in isolation |
| Offline-first      | Core functionality requires no network connection                     |

---

## 11. Demo Execution Architecture

This section defines the exact system behavior during a live demonstration or real user session.

### Interaction Sequence

```
+-------+   [1] Move Slider        +---------------+
| USER  | -----------------------> |   UI LAYER    |
+-------+                          +---------------+
                                          |
                              [2] Synchronous state update
                                          |
                                          v
                                  +---------------+
                                  | CALC ENGINE   |  <-- instant (~1ms)
                                  +---------------+
                                          |
                              [3] Computed result returned
                                          |
                                          v
                                  +---------------+
                                  | DISPLAY LAYER |  <-- renders new values
                                  +---------------+
                                          |
                              [4] Debounce timer starts (800ms)
                                          |
                                          v
                                  +---------------+
                                  | INSIGHT ENGINE|  <-- background, async
                                  +---------------+
                                          |
                              [5] Recommendation card updates
```

### Operation Classification

| Operation                        | Type         | Timing           | Blocks UI |
|----------------------------------|--------------|------------------|-----------|
| State update on slider change    | Synchronous  | Immediate        | No        |
| Financial Engine recalculation   | Synchronous  | < 16ms           | No        |
| Chart and timeline re-render     | Synchronous  | < 16ms           | No        |
| Rule-based insight evaluation    | Synchronous  | < 5ms            | No        |
| AI recommendation API call       | Asynchronous | 800ms+ debounced | No        |
| Insight panel update (AI result) | Asynchronous | When ready       | No        |

The user perceives steps 1–4 as instantaneous. Step 5 is a progressive enhancement.

---

## 12. Core Decision Loop Integration

The entire architecture is an implementation of one repeating loop:

```
         +-------------------+
         |     DECISION      |
         |  Slider / Input   |
         +--------+----------+
                  |
                  v
         +-------------------+
         |    CONSEQUENCE    |
         |  Financial Engine |
         +--------+----------+
                  |
                  v
         +-------------------+
         |      ACTION       |
         |  Insight Engine   |
         +--------+----------+
                  |
                  | (user acts or adjusts)
                  |
                  +----> back to DECISION
```

### Loop Component Mapping

| Loop Stage  | System Component      | What It Does                                          |
|-------------|-----------------------|-------------------------------------------------------|
| Decision    | Slider / Input System | User expresses a change in financial behavior         |
| Consequence | Financial Engine      | Computes the projected outcome of that change         |
| Action      | Insight Engine        | Tells the user specifically what to do next           |
| Loop        | UI State              | Returns the user to the decision point with new data  |

This loop is not a feature — it is the system. Every architectural decision is evaluated against whether it supports or disrupts this loop.

---

## 13. Financial Calculation Model

The Financial Engine is composed entirely of the following explicit formulas. All calculations are deterministic, stateless, and computable in microseconds.

### Core Formulas

| Metric                  | Formula                                              | Description                                                  |
|-------------------------|------------------------------------------------------|--------------------------------------------------------------|
| Remaining Money         | `Income - Expenses`                                  | Net available funds after all monthly outgoings              |
| Monthly Contribution    | `Remaining Money × Savings Rate`                     | Amount directed toward a goal each month                     |
| Time to Goal (months)   | `Goal Amount / Monthly Contribution`                 | Months required to reach a savings target at current rate    |
| Time to Goal (years)    | `Time to Goal (months) / 12`                         | Human-readable projection                                    |
| Debt Payoff Time        | `Total Debt / Monthly Debt Payment`                  | Months until full debt clearance at current payment rate     |
| Savings Rate            | `(Monthly Contribution / Income) × 100`              | Percentage of income being saved                             |
| Debt-to-Income Ratio    | `(Monthly Debt Payment / Income) × 100`              | Percentage of income consumed by debt obligations            |
| Impact of Slider Change | `New Projection - Baseline Projection`               | Delta in goal timeline from a single behavior change         |

### Notes

- All formulas assume constant monthly values (MVP simplification)
- Compound interest and investment growth are deferred to a future phase
- Slider changes recompute the relevant formulas instantly; no formula depends on another formula's async result

---

## 14. UI State Behavior

This section defines the observable behavior of the interface in response to each system event.

### State Transition Table

| Trigger                        | System Change                              | User Sees                                          |
|--------------------------------|--------------------------------------------|----------------------------------------------------|
| User moves savings slider      | `sliderValues` updated → Engine reruns     | Goal timeline updates instantly in place           |
| User moves expense slider      | `sliderValues` updated → Engine reruns     | Remaining money and contribution recalculate live  |
| User changes income field      | `financialInputs` updated → Engine reruns  | All projections adjust simultaneously              |
| User changes goal amount       | `financialInputs` updated → Engine reruns  | Time to goal recalculates immediately              |
| Calculation completes          | `computedProjection` written to state      | Charts, counters, and timelines reflect new values |
| Rule insight triggers          | `insights` updated synchronously           | Recommendation card updates without delay          |
| AI call completes (debounced)  | `insights` updated asynchronously          | Recommendation card refreshes with richer content  |
| User resets to baseline        | All `sliderValues` cleared                 | System returns to initial computed state           |

### UI Rendering Contract

- No spinner or loading state is shown during core recalculation
- Charts animate to new values rather than jumping
- Insight cards show rule-based content immediately; AI content replaces it progressively
- All numeric values on screen are always consistent with the current engine output

---

## 15. Scope Definition

This section is the authoritative boundary between MVP and future work. If a feature is not listed under MVP, it is explicitly out of scope for the current build.

### Feature Scope Table

| Feature                              | MVP (Now)          | Future             |
|--------------------------------------|--------------------|--------------------|
| Income and expense input             | Included           | —                  |
| Savings goal input                   | Included           | —                  |
| Real-time slider interaction         | Included           | —                  |
| Goal timeline projection             | Included           | —                  |
| Debt payoff calculation              | Included           | —                  |
| Rule-based insight engine            | Included           | —                  |
| Savings rate and debt-to-income      | Included           | —                  |
| Client-side only (no backend)        | Included           | —                  |
| AI-powered recommendations           | —                  | Phase 2            |
| Compound interest / investment model | —                  | Phase 2            |
| Multiple simultaneous goals          | —                  | Phase 2            |
| Scenario save and compare            | —                  | Phase 2            |
| User accounts and authentication     | —                  | Phase 3            |
| Backend API and data persistence     | —                  | Phase 3            |
| Historical transaction import        | —                  | Phase 3            |
| Mobile native application            | —                  | Phase 4            |
| Shared financial plans               | —                  | Phase 4            |

---

## 16. Performance Guarantees

The following constraints are non-negotiable system requirements. Any implementation that violates these guarantees must be redesigned before shipping.

### Enforced Rules

| Rule | Requirement | Violation Condition |
|------|-------------|---------------------|
| P-01 | All financial calculations complete within 16ms | Any calculation that blocks a render frame |
| P-02 | UI updates are instantaneous on slider change | Any visible delay between slider move and value update |
| P-03 | No network call is permitted in the core interaction loop | Any fetch, XHR, or API call triggered synchronously on slider move |
| P-04 | The Insight Engine must never block UI rendering | Any insight operation that delays chart or value update |
| P-05 | AI calls must be debounced by a minimum of 800ms | Any AI call triggered in under 800ms of user interaction |
| P-06 | AI calls must be fully asynchronous | Any AI call that awaits a result before rendering |
| P-07 | The Calculation Engine must have no side effects | Any engine function that mutates state directly |
| P-08 | Memoization must be applied to repeated identical inputs | Any engine call with identical inputs that recomputes from scratch |

### Performance Budget

| Operation                       | Maximum Time |
|---------------------------------|--------------|
| State update on user event      | < 1ms        |
| Full financial engine run       | < 5ms        |
| Full UI re-render cycle         | < 16ms       |
| Rule-based insight evaluation   | < 5ms        |
| AI debounce wait                | >= 800ms     |
| AI API response (acceptable)    | < 3000ms     |

These guarantees are what make the system feel instant. They must be treated as architectural constraints, not performance targets.

---

*End of Architectural Plan*
