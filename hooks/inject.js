#!/usr/bin/env node
// SessionStart hook — re-injects the response ruleset so the contract survives
// context compaction, /clear and resume.
//
// Level lives in ./level (one word). `off` disables injection without touching
// settings.json. Unknown level, missing file, or ANY error => inject nothing and
// exit 0. This hook must never be the reason a session fails to start.

const fs = require('fs');
const path = require('path');

try {
  const dir = __dirname;

  let level = 'lite';
  try {
    const raw = fs.readFileSync(path.join(dir, 'level'), 'utf8').trim().toLowerCase();
    if (raw) level = raw;
  } catch (e) { /* no level file => default lite */ }

  if (level === 'off') process.exit(0);

  // Only levels we have a vetted ruleset for. Anything else = silent no-op,
  // so a typo in the level file degrades to normal prose, never to a crash.
  if (!/^[a-z-]{1,20}$/.test(level)) process.exit(0);

  // Two sources, in order:
  //   1. ./ruleset-<level>.md          — rulesets owned by this hook
  //   2. ../skills/<level>/SKILL.md    — a skill IS the ruleset (structured-lite)
  // Reading the skill directly means one source of truth. A hardcoded copy of
  // the rules inside the hook goes stale against SKILL.md and silently serves
  // the old ruleset — a real bug in the prior art this was modelled on.
  const candidates = [
    path.join(dir, `ruleset-${level}.md`),
    path.join(dir, '..', 'skills', level, 'SKILL.md'),
  ];

  let ruleset = '';
  for (const candidate of candidates) {
    try {
      ruleset = fs.readFileSync(candidate, 'utf8');
      break;
    } catch (e) { /* try next */ }
  }
  if (!ruleset.trim()) process.exit(0);

  // Strip YAML frontmatter — the description exists to trigger the skill, and
  // re-injecting it invites the model to talk about the style it is in.
  ruleset = ruleset.replace(/^---[\s\S]*?\n---\s*/, '');

  // Append this project's open user-action items, so they survive compaction,
  // /clear and resume. Keyed by cwd the same way the memory dir is keyed:
  // "D:\Projects\app" -> "D--Projects-app".
  //
  // User-action items rot when they live in prose. This file is the one place
  // they live, and it is re-injected every time context is rebuilt.
  // action items go to die; this file is the one place they live.
  try {
    // Nested try: a missing or malformed payload must fall back to process.cwd(),
    // not skip the pending list. Losing the list is the one failure that matters
    // here — an unrendered item is an item the user forgets.
    let cwd = '';
    try {
      if (!process.stdin.isTTY) {
        const raw = fs.readFileSync(0, 'utf8');
        if (raw) cwd = (JSON.parse(raw) || {}).cwd || '';
      }
    } catch (e) { /* fall through to process.cwd() */ }
    if (!cwd) cwd = process.cwd();

    // One dash per separator, NOT per run: "D:\Projects\app" -> "D--Projects-app",
    // matching the harness's own project-dir convention. A `+` here collapses
    // ":\" into a single dash and silently misses the file.
    const key = cwd.replace(/[:\\/]/g, '-').replace(/^-+|-+$/g, '');
    const pending = fs.readFileSync(path.join(dir, 'pending', `${key}.md`), 'utf8');

    // Open and Parked. Closed items are a record, not context.
    // Strip HTML comments before testing emptiness: the format documentation
    // lives in a comment inside each section, and it is not content. Without
    // this, an empty Parked section still emits its whole instruction block.
    const section = (name) =>
      (pending.split(new RegExp(`^## ${name}$`, 'm'))[1]?.split(/^## /m)[0] || '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();
    const open = section('Open');
    const parked = section('Parked');

    if (open || parked) {
      ruleset += `\n\n## The user's item list\n\n` +
        `Source of truth: ~/.claude/structured-lite/pending/${key}.md — edit that file when an item is ` +
        `added, parked or closed.\n`;
    }
    if (open) {
      ruleset += `\n### Open — render every one, in full, under "### Next / Yours"\n\n` +
        `Decisions first, blocking first within each group. Never silently drop one.\n\n${open}\n`;
    }
    if (parked) {
      // Injected so they cannot be re-proposed as new, NOT so they can be rendered.
      ruleset += `\n### Parked — do NOT render these\n\n` +
        `Deferred by the user on purpose. Render only a count line under Yours ` +
        `("N parked — say \\"show parked\\" to list them"), unless the user asks for them. ` +
        `Check each wake condition every turn; when one is met, move the item back to ## Open ` +
        `and say so. Never re-propose a parked item as if it were new.\n\n${parked}\n`;
    }
  } catch (e) { /* no pending file for this project => nothing to append */ }

  process.stdout.write(JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: ruleset,
    },
  }));
} catch (e) {
  if (process.env.STRUCTURED_LITE_DEBUG === '1') console.error('structured-lite inject failed:', e.message);
}

process.exit(0);
