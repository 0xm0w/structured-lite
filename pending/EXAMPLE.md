# Open items — <project>

Copy to `~/.claude/structured-lite/pending/<sanitized-cwd>.md`. `D:\Projects\app` becomes
`D--Projects-app`; `/home/you/app` becomes `home-you-app`.

Rendered under "### Next / Yours" in every structured response until closed. Decisions before
actions; blocking first within each. Never edit an opened-date.

Format: `- [decide|do] [blocking|when-you-can] <item> — <what it unblocks or why> (opened YYYY-MM-DD, source)`

- `decide` — a word from you unblocks assistant work. Cheap for you, high leverage.
- `do` — hands-on action only you can perform: credentials, funding, account access, a browser
  session the assistant does not hold.

## Open

- [do] [blocking] Rotate the expired deploy key in CI settings — releases fail until it is replaced (opened 2026-07-16, docs/ops/deploy.md)
- [decide] [when-you-can] Approve or reject the new export format — implemented behind a flag, off pending you (opened 2026-08-01, docs/decisions/export-format.md)

## Parked

<!-- Deferred on purpose, not forgotten. NOT rendered in responses — only a count line, unless you
     ask. Every item needs a wake condition; the assistant checks them each turn and moves an item
     back to ## Open when one is met. Only you park your own items. Preserve the opened-date.
     Format: - [decide|do] <item> — <why> (opened YYYY-MM-DD, parked YYYY-MM-DD, wake: <condition>) -->

- [decide] Expand the docs into guides plus a glossary — scoped, no demand signal yet (opened 2026-07-15, parked 2026-08-16, wake: two users ask for it, or the first support thread about it)

## Closed

<!-- Move items here with a closed-date when done. Kept as a record; not rendered in responses. -->
