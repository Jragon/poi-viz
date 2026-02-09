# AGENTS.md — Poi Visualizer


## Non-Negotiable Rules

### 1. Single source of truth
- Engine math lives in `src/engine/`
- VTG relations live in `src/vtg/`
- Units, wrapping, and clamping must come from one shared utility
- UI must not re-derive domain math

If you detect multiple competing truths, stop and propose a unification plan.

---

### 2. Engine invariants must not break
- Math must remain deterministic
- Tests and fixtures define correctness
- Do not change engine behaviour without updating or adding tests

If unsure whether behaviour changes, stop and ask.

---

### 3. Layer boundaries are strict
- `engine` must not import UI, render, or persistence
- `state` must not import render utilities
- `render` must not own timing or policy
- UI must not become the owner of domain logic

If a change crosses layers, explain why before proceeding.

---

### 4. Small, explainable changes only
- One concept per commit
- Prefer deletion and simplification
- Do not “clean up” unrelated code opportunistically

If a task requires a large refactor, stop and propose a plan instead of acting.

---

### 5. Ask before acting when:
- Refactoring `App.vue` orchestration
- Changing timing / RAF / transport ownership
- Changing persistence or hydration order
- Introducing new abstractions (sequencer, transitions, 3D planes)

---

## Documentation & Tests (Principle, not process)
- Code, tests, and docs must agree
- Every non-obvious behaviour must be pinned by tests or explained in docs
- Prefer tests over prose when possible

Do not generate documentation that is not grounded in code or tests.

---

## Definition of Done
A task is done when:
- Behaviour matches the request
- Relevant tests pass
- Changes can be explained clearly in plain English
- No new competing truths were introduced
