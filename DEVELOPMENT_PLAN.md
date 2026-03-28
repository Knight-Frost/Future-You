# DEVELOPMENT PLAN
## FutureYou — Personalized Financial Decision Engine

**Version:** 1.1
**Created:** 2026-03-27
**Updated:** 2026-03-27
**Status:** Active

**Changelog v1.1:**
- Added hybrid insight system (rule-based + AI layers)
- Added investment future value projection to MVP scope
- Added parallel development strategy
- Added demo impact considerations
- Updated feature prioritization and scope control
- Updated performance requirements for AI debounce

---

## 1. Objective

### What Is Being Built

FutureYou is a personalized financial decision engine. It is not a finance tracker.

The system shows users the real-world consequences of financial decisions in real time, then provides clear, actionable recommendations.

### What Success Looks Like

- A user enters their financial data
- They adjust a slider (e.g., savings rate, spending)
- The system instantly updates outcomes and displays a recommendation
- The user understands what to do next

---

## 2. Core System Definition

The foundation consists of five components. Every other feature is secondary.

| Component | Description |
|---|---|
| Input System | Collects user financial data (income, expenses, savings) |
| Financial Engine | Calculates current state and projected outcomes |
| Slider System | Allows real-time adjustment of financial variables |
| Real-Time Update System | Instantly recalculates on any change, no delay |
| Insight System | Generates a clear recommendation based on calculated state — operates in two layers: rule-based (instant) and AI-generated (asynchronous) |

These five components form the foundation. Nothing else is built until these work correctly.

---

## 3. Development Philosophy

### Foundation-First

Build the core loop first. Make it reliable. Add enhancements only after the core is stable.

**Why:**
- A complex UI on a broken engine delivers no value
- A simple, working engine delivers immediate value
- Every feature built before the core is a liability

### Avoid Overbuilding

- Do not build features that are not required for the demo flow
- Do not generalize or abstract prematurely
- Do not add configuration, customization, or settings until the core works

### Simplicity and Reliability Over Completeness

A system that does three things perfectly is better than one that does ten things unreliably.

---

## 4. Critical Demo Flow

This flow must work perfectly before any other work proceeds.

```
+------------------+
|   User Input     |  Income, expenses, savings, debt
+--------+---------+
         |
         v
+------------------+
| Financial Engine |  Calculate current state + projections
+--------+---------+
         |
         v
+------------------+
|  Slider Adjusted |  User changes a variable (e.g., savings rate)
+--------+---------+
         |
         v
+------------------+
| Real-Time Update |  Engine recalculates instantly (<16ms)
+--------+---------+
         |
         v
+------------------+
|  Insight Shown   |  System recommends a clear next action
+------------------+
```

**Rule:** If a feature does not support this loop, it is deferred.

---

## 5. Development Phases

### PHASE 1 — Setup

**Goal:** Establish the project foundation and development environment.

**Tasks:**
- Initialize React project
- Configure project structure (components, engine, state)
- Set up local state management
- Define data models for financial inputs and outputs

**Output:** A running blank application with correct architecture in place.

---

### PHASE 2 — Input System

**Goal:** Allow users to enter their financial data.

**Tasks:**
- Build input form (income, expenses, savings, debt)
- Validate inputs (numbers only, no negatives where not applicable)
- Store inputs in local state
- Display current values back to user

**Output:** User can enter and edit financial data. Values are held in state correctly.

---

### PHASE 3 — Financial Engine

**Goal:** Calculate the user's current financial state and projections, including future value.

**Tasks:**
- Implement core calculation functions (surplus, savings rate, runway, projection)
- Implement future value projection using compound growth formula (see Section 3a below)
- Define output data structure (current state + projected outcomes)
- Write unit tests for calculation correctness
- Connect engine to input state

**Note:** Engine development can begin in parallel with UI (Track A). See Section 14 — Parallel Development Strategy.

**Output:** Given valid inputs, the engine returns correct calculated outputs including future value projections. Calculations are verified.

---

### PHASE 4 — Slider System

**Goal:** Allow users to adjust financial variables and trigger recalculation.

**Tasks:**
- Build slider components tied to key variables (e.g., savings rate, spending)
- Connect slider changes to engine input
- Ensure recalculation triggers on every slider change
- Display updated output immediately

**Output:** Moving a slider updates the calculated output with no perceptible delay.

---

### PHASE 5 — Real-Time Display

**Goal:** Present calculated outcomes clearly and instantly.

**Tasks:**
- Build output display panel (key metrics, projections)
- Connect display to engine output state
- Ensure all values update in sync with slider changes
- No loading states, no spinners — updates must be synchronous

**Output:** All displayed values update instantly when the user adjusts any slider.

---

### PHASE 6 — Insight Engine

**Goal:** Generate a clear, actionable recommendation based on the user's current state using a two-layer hybrid system.

**Layer 1 — Rule-Based (Synchronous):**
- Define rule set (e.g., if savings rate < 10%, recommend increase)
- Executes instantly on every slider or input change
- Provides immediate text feedback
- Must never block or delay UI updates

**Layer 2 — AI Insight (Asynchronous):**
- Triggered after user stops interacting (~800ms debounce)
- Generates natural language explanation of the user's financial position
- Replaces or augments rule-based insight when available
- Must NEVER be in the synchronous update path

**Tasks:**
- Implement Layer 1: rule-based insight function (synchronous)
- Display Layer 1 insight immediately after every calculation
- Implement debounce timer (~800ms) on user interaction
- On debounce trigger: call AI layer asynchronously
- Display AI insight when response arrives — do not block for it
- Show a loading indicator only in the AI insight area (not in the core output)

**Output:** Rule-based insight appears instantly. AI insight appears within ~1-2 seconds of the user pausing interaction. Core UI is never blocked.

---

### PHASE 7 — Polish

**Goal:** Make the experience clear, stable, and presentable for demo.

**Tasks:**
- Refine UI layout and readability
- Ensure all edge cases in inputs are handled gracefully
- Test the full demo flow end to end
- Remove any dead code or unused components
- Verify performance meets requirements

**Output:** The full demo flow works without errors. The UI is clear and professional.

---

## 6. Feature Prioritization

Priority definitions:

| Priority | Meaning |
|---|---|
| Critical | Must be built — system does not function without it |
| High | Strong demo impact — build after Critical items are stable |
| Optional | Nice to have — defer until all Critical and High items are complete |

| Feature | Priority | Notes |
|---|---|---|
| Financial input form | Critical | Core — must be built first |
| Financial calculation engine | Critical | Core — all outputs depend on this |
| Slider-driven variable adjustment | Critical | Core — defines the interaction model |
| Real-time output display | Critical | Core — no delay acceptable |
| Rule-based insight layer | Critical | Core — instant feedback on every change |
| Input validation | Critical | Required for correct calculations |
| Key metrics display | Critical | User must see outcomes clearly |
| Future value / investment projection | High | Compound growth formula — creates emotional demo impact |
| AI insight layer (async) | High | Natural language explanation — must be asynchronous, never blocking |
| UI layout and styling | High | Needed for demo readability and professionalism |
| Multiple scenario comparison | Optional | Deferred to post-MVP |
| Charts and visualizations | Optional | Deferred — add only if time allows |
| Export or save functionality | Optional | Deferred to post-MVP |
| User accounts | Optional | Post-MVP — requires backend |
| Historical data tracking | Optional | Post-MVP |
| Mobile responsiveness | Optional | Polish phase only if time permits |

---

## 7. Scope Control

| Feature | Status |
|---|---|
| Financial input form | MVP |
| Core calculation engine | MVP |
| Slider system | MVP |
| Real-time output updates | MVP |
| Insight/recommendation display | MVP |
| Input validation | MVP |
| Key output metrics display | MVP |
| Basic UI layout | MVP |
| Future value projection (compound growth) | MVP |
| Rule-based insight layer | MVP |
| AI insight layer (async, debounced) | MVP |
| Charts and graphs | Deferred |
| Scenario comparison | Deferred |
| Export / PDF | Deferred |
| User accounts | Deferred |
| Backend / database | Deferred |
| Advanced investment modeling (tax, retirement) | Deferred |
| Mobile-specific design | Deferred |
| Dark mode / theming | Deferred |
| Onboarding flow | Deferred |

**Rule:** If a feature is not in the MVP column, do not build it until all MVP features are complete and verified.

---

## 8. System Dependencies

| Dependency | Requirement | Notes |
|---|---|---|
| React | Required | UI layer and component model |
| Local state (useState / useReducer) | Required | No external state library needed for MVP |
| No backend | Required | All calculations run in the browser |
| No database | Required | No persistence needed for MVP |
| No network calls in core loop | Required | All updates must be synchronous |
| Debounce utility | Required | Controls AI insight trigger timing (~800ms); use lodash.debounce or equivalent |
| AI API access | Required for AI layer | Used only asynchronously, outside the core loop |
| Build tool (Vite or CRA) | Required | Standard React setup |

---

## 9. Risk Management

| Risk | Impact | Mitigation |
|---|---|---|
| Overbuilding before core is stable | High | Enforce phase gates — do not advance until output criteria are met |
| Performance issues on slider drag | High | Keep calculations synchronous and lightweight; avoid async in core loop |
| Calculation errors | High | Write unit tests in Phase 3 before connecting to UI |
| UI complexity delaying demo | Medium | Lock UI scope to MVP list; defer all visual enhancements |
| Time lost on optional features | Medium | Review scope table before starting any new feature |
| Insight engine producing poor recommendations | Medium | Define and test insight rules explicitly before integrating |
| AI layer blocking the UI (incorrect async integration) | High | Enforce rule: AI call must never be awaited in synchronous update path |
| AI API latency making insight feel slow | Medium | Debounce ensures AI is called only when user pauses; rule-based layer covers interim |
| Parallel tracks diverging on data model | Medium | Define and freeze shared data model before either track begins |
| State management growing complex | Low | Use simple local state; introduce patterns only when necessary |

---

## 10. Success Criteria

The system is ready for demo when all of the following are true:

- [ ] User can enter income, expenses, savings, and debt
- [ ] Financial engine calculates correct outputs from those inputs
- [ ] At least two sliders adjust key financial variables
- [ ] Slider adjustment updates all displayed outputs with no visible delay
- [ ] A rule-based insight is shown immediately after every calculation
- [ ] The rule-based insight is clear and relevant to the user's current state
- [ ] Future value projection is displayed and updates with slider changes
- [ ] AI insight appears within ~2 seconds of the user pausing interaction
- [ ] AI insight never causes a delay or block in core UI updates
- [ ] No errors occur during the full demo flow
- [ ] The UI is readable and understandable without explanation

---

## 11. Performance Requirements

| Requirement | Target | Reason |
|---|---|---|
| Slider update latency | < 16ms | Must feel instantaneous (60fps) |
| Initial calculation time | < 50ms | Page must feel responsive on load |
| No blocking operations in core loop | Mandatory | Blocking causes visible lag |
| AI/async operations | Must be non-blocking | Run outside the core update loop |
| AI insight debounce delay | ~800ms after last interaction | Prevents excessive API calls during slider drag |
| No network calls during calculation | Mandatory | Network latency breaks real-time feel |
| No API call in critical interaction path | Mandatory | API calls belong in the debounced async layer only |

**Rule:** The core loop (slider change → recalculate → display) must be entirely synchronous and complete within a single frame.

**AI Rule:** The AI insight layer must operate exclusively in the debounced async path. It must never be awaited in the synchronous update flow.

---

## 12. Execution Order

Developers must follow this order. Steps 4 and 5 (Track A / Track B) may run in parallel — see Section 14.

1. Initialize project and configure structure
2. Define data models (input schema, output schema, insight schema)
3. Implement and unit-test the financial engine (Track A — can start immediately)
4. Build and validate the input form (Track B — can start alongside Track A)
5. Connect engine to input state — verify outputs are correct
6. Verify future value projection outputs are correct
7. Build slider components and connect to engine input
8. Verify sliders trigger recalculation with no delay
9. Build output display and connect to engine output
10. Verify all values update instantly on slider change
11. Implement Layer 1 rule-based insight — verify instant display
12. Implement debounce timer and AI insight (Layer 2) — verify async behavior
13. Verify AI layer never blocks UI updates
14. Polish UI for demo readability
15. Run full demo flow end to end — fix any issues
16. Lock scope — do not add features after this point

---

## 3a. Investment / Future Value Projection

This section supplements Section 2 (Financial Engine) and defines the compound growth model included in MVP scope.

### Formula

```
Future Value = P x (1 + r)^t
```

### Variable Definitions

| Variable | Name | Description |
|---|---|---|
| P | Principal | Current savings amount (user input) |
| r | Annual Rate | Assumed annual return rate (e.g., 0.07 for 7%) |
| t | Time | Number of years projected (e.g., 10, 20, 30) |
| FV | Future Value | Projected value of savings after t years |

### Implementation Notes

- This is a simplified model for demo purposes
- Rate (r) can be a fixed default (e.g., 7%) or a slider-controlled variable
- Run as part of the synchronous engine — no async required
- Display alongside current state metrics in the output panel
- Slider for time horizon (t) creates strong demo impact

### Why This Is MVP

Showing a user that increasing savings by $200/month results in $180,000 more in 20 years creates immediate emotional engagement. This is central to the Decision → Consequence → Action loop.

---

## 3b. Hybrid Insight System

This section supplements Section 2 (Insight System) and defines the two-layer architecture.

### Architecture

```
User Interaction
      |
      +-----> Rule Engine (synchronous) -----> UI Update (instant)
      |
      +-----> Debounce Timer (~800ms)
                    |
                    v
              AI Engine (async) -----------> AI Insight Panel (when ready)
```

### Layer Definitions

| Layer | Type | Timing | Purpose |
|---|---|---|---|
| Layer 1 — Rule-Based | Synchronous | Instant (< 16ms) | Immediate actionable feedback on every change |
| Layer 2 — AI Insight | Asynchronous | ~800ms debounce + API response time | Natural language explanation of financial position |

### Behavioral Rules

- Layer 1 always runs first and displays immediately
- Layer 2 is triggered only after the user stops interacting for ~800ms
- Layer 2 result augments or replaces Layer 1 when it arrives
- If Layer 2 is loading, show a subtle indicator in the AI panel only — never in the core output
- If Layer 2 fails, Layer 1 insight remains visible — the system degrades gracefully

---

## 14. Parallel Development Strategy

Certain components have no dependencies between them and can be developed simultaneously to increase efficiency.

### Track Structure

```
Track A: Financial Engine
+----------------------------------+
| Define data models               |
| Implement calculations           |
| Add future value projection      |
| Write unit tests                 |
+----------------------------------+
         |
         | Integration Point
         v
Track B: UI Layer          +---------------------------+
+------------------------+ | Connect engine to state    |
| Build input form       | | Bind sliders to engine     |
| Build output display   | | Connect insight display    |
| Build slider controls  | | End-to-end testing         |
| Build insight panels   | +---------------------------+
+------------------------+
```

### Track Definitions

| Track | Focus | Can Start | Depends On |
|---|---|---|---|
| Track A | Financial Engine + tests | Immediately after data models | Data model definition only |
| Track B | UI input forms + layout | Immediately after data models | Data model definition only |
| Integration | Connect A + B | After both tracks have stable outputs | Both tracks complete |

### Rules

- Tracks A and B must share the same data model — define it first before either track begins
- Do not integrate until both tracks have verified outputs
- Do not extend scope of either track during parallel development — focus on defined outputs only

---

## 15. Demo Impact Strategy

This section defines why each architectural choice improves the demo experience.

### Why Instant Feedback Matters

| Cause | Effect |
|---|---|
| Slider moves, output updates instantly | User perceives the system as responsive and intelligent |
| Any visible delay on slider drag | Trust breaks — the system feels unreliable |
| Rule-based insight updates in sync | User sees consequences of their decision immediately |

### Why AI Explanation Enhances Experience

| Aspect | Impact |
|---|---|
| Natural language explanation | Makes numbers feel human and relatable |
| Personalized to the user's actual data | Feels like advice, not a calculator |
| Appears after a short pause | Does not compete with the real-time interaction — feels deliberate |

### Why Investment Projection Creates Emotional Impact

| Aspect | Impact |
|---|---|
| Shows future value of current decisions | Makes abstract savings rates feel concrete |
| Slider changes update the projection | User directly sees how their decisions compound over time |
| Long time horizon (20-30 years) amplifies numbers | Creates a memorable "wow" moment in the demo |

### Design Principle

The system should make the user feel that they are looking at their own future, not a generic financial model. Every data point displayed must be derived from the user's actual inputs.

---

## 13. Post-MVP Expansion

The following can be added after the MVP is verified and stable.

| Area | Description |
|---|---|
| Backend | Persist user data, enable accounts and history |
| Database | Store sessions, scenarios, and user profiles |
| Advanced investment modeling | Tax modeling, inflation adjustment, retirement projections (compound growth is MVP) |
| Enhanced AI insights | Streaming responses, personalized coaching tone, multi-turn context |
| Scenario comparison | Allow side-by-side comparison of two financial paths |
| Charts and visualizations | Add projection charts and timeline graphs |
| User accounts | Authentication, saved profiles, history |
| Mobile design | Responsive layout optimized for small screens |

Post-MVP work begins only after the full MVP flow is working, tested, and demo-ready.

---

*End of Document*
