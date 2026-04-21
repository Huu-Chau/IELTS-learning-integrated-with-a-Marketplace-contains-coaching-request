How It Works
Already have code? Run /gsd:map-codebase first. It spawns parallel agents to analyze your stack, architecture, conventions, and concerns. Then /gsd:new-project knows your codebase — questions focus on what you're adding, and planning automatically loads your patterns.

1. Initialize Project
/gsd:new-project
One command, one flow. The system:

Questions — Asks until it understands your idea completely (goals, constraints, tech preferences, edge cases)
Research — Spawns parallel agents to investigate the domain (optional but recommended)
Requirements — Extracts what's v1, v2, and out of scope
Roadmap — Creates phases mapped to requirements
You approve the roadmap. Now you're ready to build.

Creates: PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, .planning/research/

2. Discuss Phase
/gsd:discuss-phase 1
This is where you shape the implementation.

Your roadmap has a sentence or two per phase. That's not enough context to build something the way you imagine it. This step captures your preferences before anything gets researched or planned.

The system analyzes the phase and identifies gray areas based on what's being built:

Visual features → Layout, density, interactions, empty states
APIs/CLIs → Response format, flags, error handling, verbosity
Content systems → Structure, tone, depth, flow
Organization tasks → Grouping criteria, naming, duplicates, exceptions
For each area you select, it asks until you're satisfied. The output — CONTEXT.md — feeds directly into the next two steps:

Researcher reads it — Knows what patterns to investigate ("user wants card layout" → research card component libraries)
Planner reads it — Knows what decisions are locked ("infinite scroll decided" → plan includes scroll handling)
The deeper you go here, the more the system builds what you actually want. Skip it and you get reasonable defaults. Use it and you get your vision.

Creates: {phase_num}-CONTEXT.md

3. Plan Phase
/gsd:plan-phase 1
The system:

Researches — Investigates how to implement this phase, guided by your CONTEXT.md decisions
Plans — Creates 2-3 atomic task plans with XML structure
Verifies — Checks plans against requirements, loops until they pass
Each plan is small enough to execute in a fresh context window. No degradation, no "I'll be more concise now."

Creates: {phase_num}-RESEARCH.md, {phase_num}-{N}-PLAN.md

4. Execute Phase
/gsd:execute-phase 1
The system:

Runs plans in waves — Parallel where possible, sequential when dependent
Fresh context per plan — 200k tokens purely for implementation, zero accumulated garbage
Commits per task — Every task gets its own atomic commit
Verifies against goals — Checks the codebase delivers what the phase promised
Walk away, come back to completed work with clean git history.

How Wave Execution Works:

Plans are grouped into "waves" based on dependencies. Within each wave, plans run in parallel. Waves run sequentially.

┌────────────────────────────────────────────────────────────────────┐
│  PHASE EXECUTION                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  WAVE 1 (parallel)          WAVE 2 (parallel)          WAVE 3      │
│  ┌─────────┐ ┌─────────┐    ┌─────────┐ ┌─────────┐    ┌─────────┐ │
│  │ Plan 01 │ │ Plan 02 │ →  │ Plan 03 │ │ Plan 04 │ →  │ Plan 05 │ │
│  │         │ │         │    │         │ │         │    │         │ │
│  │ User    │ │ Product │    │ Orders  │ │ Cart    │    │ Checkout│ │
│  │ Model   │ │ Model   │    │ API     │ │ API     │    │ UI      │ │
│  └─────────┘ └─────────┘    └─────────┘ └─────────┘    └─────────┘ │
│       │           │              ↑           ↑              ↑      │
│       └───────────┴──────────────┴───────────┘              │      │
│              Dependencies: Plan 03 needs Plan 01            │      │
│                          Plan 04 needs Plan 02              │      │
│                          Plan 05 needs Plans 03 + 04        │      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
Why waves matter:

Independent plans → Same wave → Run in parallel
Dependent plans → Later wave → Wait for dependencies
File conflicts → Sequential plans or same plan
This is why "vertical slices" (Plan 01: User feature end-to-end) parallelize better than "horizontal layers" (Plan 01: All models, Plan 02: All APIs).

Creates: {phase_num}-{N}-SUMMARY.md, {phase_num}-VERIFICATION.md

5. Verify Work
/gsd:verify-work 1
This is where you confirm it actually works.

Automated verification checks that code exists and tests pass. But does the feature work the way you expected? This is your chance to use it.

The system:

Extracts testable deliverables — What you should be able to do now
Walks you through one at a time — "Can you log in with email?" Yes/no, or describe what's wrong
Diagnoses failures automatically — Spawns debug agents to find root causes
Creates verified fix plans — Ready for immediate re-execution
If everything passes, you move on. If something's broken, you don't manually debug — you just run /gsd:execute-phase again with the fix plans it created.

Creates: {phase_num}-UAT.md, fix plans if issues found

6. Repeat → Complete → Next Milestone
/gsd:discuss-phase 2
/gsd:plan-phase 2
/gsd:execute-phase 2
/gsd:verify-work 2
...
/gsd:complete-milestone
/gsd:new-milestone
Loop discuss → plan → execute → verify until milestone complete.

If you want faster intake during discussion, use /gsd:discuss-phase <n> --batch to answer a small grouped set of questions at once instead of one-by-one.

Each phase gets your input (discuss), proper research (plan), clean execution (execute), and human verification (verify). Context stays fresh. Quality stays high.

When all phases are done, /gsd:complete-milestone archives the milestone and tags the release.

Then /gsd:new-milestone starts the next version — same flow as new-project but for your existing codebase. You describe what you want to build next, the system researches the domain, you scope requirements, and it creates a fresh roadmap. Each milestone is a clean cycle: define → build → ship.