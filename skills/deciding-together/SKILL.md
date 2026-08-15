---
name: deciding-together
description: >
  Use before asking the user to choose anything consequential — during brainstorming, spec work, TDD
  design, dependency and architecture calls. Grounds the options in the repo's own settled decisions
  and current external facts, then presents them as a table with cost, reversibility and certainty
  before the question is asked. Additive to superpowers brainstorming; it governs how choices are
  presented, never the flow itself.
---

A recommendation with no stated cost of being wrong is an instruction with extra steps. Taking it is
then the only rational move, and the choice was never really offered.

This skill exists to make the cost visible before the question is asked.

## When it applies

**Consequential or hard to reverse.** Architecture, data model, a new dependency, a public interface,
anything that changes the shape of the code, anything touching money, keys or user data, anything
that will be lived with for months.

**Not** for cheap, easily-undone choices — naming, ordering, which file to touch first, formatting.
Those get one line each and the question immediately. A full table on a naming question is ceremony,
and ceremony everywhere is the same failure as no ceremony at all: it gets skimmed.

When unsure, ask one question: **if this turns out wrong, what does undoing it cost?** Hours means
table it. Minutes means just ask.

## Ground the options first

Never present options assembled from memory. Three passes, in this order, before any table exists.

### 1. The governing documents

Read what the project has already decided that bears on this choice, and cite `file:line`. Typical
sources: `CLAUDE.md` / `AGENTS.md`, goal and vision documents, brand and copy guidelines, legal or
compliance constraints, architecture decision records, the design docs for the surface being changed.

**An option that contradicts a settled decision is not a live option.** Present it under a *Rejected
by existing decisions* heading with the citation, so the user can see it was considered and see why
it is unavailable. Silently omitting it looks like it was never thought of; silently including it
invites relitigating something already settled.

### 2. The actual code

Read the real call sites, not a summary of them. Cite `file:line` for every claim about how the
codebase currently behaves.

**Do not build or trust a whole-repo map.** A map is a stale snapshot the moment it is made, and a
confident claim sourced from a stale map is worse than no claim — it is the failure mode this
grounding pass exists to prevent. Search and read on demand instead. Anything recalled from memory
or from an earlier turn gets re-read before it appears in a table, because memory is point-in-time.

### 3. Current external facts

Version numbers, API shapes, pricing, rate limits, vendor behaviour, licence terms — anything owned
by someone else. **Training data is stale by construction.** Fetch the current source and cite it
with the date retrieved.

Where a claim rests on training data and was not verified, say so in the certainty column and
downgrade it. An unverified external claim presented at full confidence is how a plan gets built on
an API that changed six months ago.

## The table

One row per option, and every column filled. An empty cell means the option is not understood well
enough to offer.

| Option | What you get | What it costs | Reversible? | Certainty |
|---|---|---|---|---|
| A: … | the actual capability | build time, complexity, new dependency, ongoing burden | minutes / hours / months / one-way | with its basis |

- **What it costs** is not just effort. Name the ongoing burden: a dependency to track, a migration
  to run later, a surface to keep in sync, a concept every future reader must learn.
- **Reversible?** is the column that decides how hard to think. Use a duration, not "yes/no".
  "One-way" earns its own sentence explaining what locks in.
- **Certainty always carries its basis.** "High" is a feeling. "Done twice in this repo, both under
  an hour" and "vendor docs read today, no prior use here" are data. If the basis is training data,
  say that.

Below the table, in prose:

- **The recommendation**, with the cost of it being wrong.
- **The runner-up, and what would make it win.** This is what turns a recommendation into a position
  the user can argue with rather than a verdict they can only accept.
- **Whether the top two are close.** Say so explicitly when they are. A close call is exactly when
  discussing further pays, and the user should not have to detect that themselves.

Then ask the question.

## Anti-patterns

- **Strawman options.** Three rows where two exist to make the third look inevitable. Every option
  presented must be one a competent engineer could reasonably choose.
- **Asking before analysing.** The question comes after the table, never instead of it.
- **Adjectives where numbers belong.** "Fast", "clean", "robust", "high confidence" — replace each
  with a measurement or delete it.
- **A recommendation with no downside stated.** If it has no cost, it is not a choice, and the table
  was theatre.
- **Hiding the settled-decision conflict** to keep an attractive option on the table.
- **Options that differ only in wording.** Two rows describing the same approach is padding.

## Interaction with other skills

This is additive. `superpowers:brainstorming` still drives discovery and still asks the questions;
this governs only how a consequential choice is presented once it arrives. `superpowers:writing-plans`
and TDD inherit the same rule: the design decisions inside a plan are choices, and the ones that are
hard to reverse get the same treatment before the plan is written.

Nothing here overrides the existing flow, the spec gate, or the test-first discipline.
