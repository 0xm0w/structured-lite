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

  // Append open user-action items so they survive compaction, /clear and resume.
  //
  // Two scopes, and both matter:
  //   1. THIS project, keyed by cwd the same way the memory dir is keyed:
  //      "D:\Projects\app" -> "D--Projects-app". Rendered in full.
  //   2. Every OTHER project's file. A session runs in one project at a time, so
  //      an item opened in one is invisible from every other and ages there
  //      unseen. Rendered compact and project-tagged.
  //
  // User-action items rot when they live in prose. These files are the one place
  // they live, and they are re-injected every time context is rebuilt.
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

    // One dash per separator, NOT per run, and whitespace counts as one:
    // "D:\Projects\app" -> "D--Projects-app", "C:\my app" -> "C--my-app", matching
    // the harness's own project-dir naming. A `+` here collapses ":\" into a single
    // dash and silently misses the file; omitting \s misses every path with a space.
    const key = cwd.replace(/[:\\/\s]/g, '-').replace(/^-+|-+$/g, '');
    const pendingDir = path.join(dir, 'pending');

    // Strip HTML comments before testing emptiness: the format documentation
    // lives in a comment inside each section, and it is not content. Without
    // this, an empty Parked section still emits its whole instruction block.
    const sectionOf = (text, name) =>
      (text.split(new RegExp(`^## ${name}$`, 'm'))[1]?.split(/^## /m)[0] || '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim();

    // Returns '' rather than throwing. A project with no file of its own must still
    // receive the other projects' items, and most projects have no file.
    const readItems = (file) => {
      try { return fs.readFileSync(path.join(pendingDir, file), 'utf8'); }
      catch (e) { return ''; }
    };

    // Open and Parked for this project. Closed items are a record, not context.
    const own = readItems(`${key}.md`);
    const open = sectionOf(own, 'Open');
    const parked = sectionOf(own, 'Parked');

    // Every other project's Open section, so an item is never invisible just
    // because the session happens to be running somewhere else.
    let elsewhere = '';
    try {
      for (const file of fs.readdirSync(pendingDir).sort()) {
        if (!file.endsWith('.md') || file === `${key}.md`) continue;
        const theirs = sectionOf(readItems(file), 'Open');
        if (theirs) elsewhere += `\n**${file.slice(0, -3)}**\n\n${theirs}\n`;
      }
    } catch (e) { /* unreadable pending dir => this project's items only */ }

    if (open || parked || elsewhere) {
      ruleset += `\n\n## The user's item list\n\n` +
        `Source of truth: ~/.claude/structured-lite/pending/<project-key>.md — edit that file when ` +
        `an item is added, parked or closed. This project's key is \`${key}\`` +
        (own
          ? `.\n`
          : `, and that file does not exist yet — create it, in the format pending/EXAMPLE.md uses, ` +
            `the first time an item is opened here.\n`);
    }
    if (open) {
      ruleset += `\n### Open — render every one, in full, under "### Next / Yours"\n\n` +
        `Decisions first, blocking first within each group. Never silently drop one. These are the ` +
        `project's items, not the session's: every session in this project writes to this same ` +
        `file, so treat the list as everything left undone here, whoever left it.\n\n${open}\n`;
    }
    if (parked) {
      // Injected so they cannot be re-proposed as new, NOT so they can be rendered.
      ruleset += `\n### Parked — do NOT render these\n\n` +
        `Deferred by the user on purpose. Render only a count line under Yours ` +
        `("N parked — say \\"show parked\\" to list them"), unless the user asks for them. ` +
        `Check each wake condition every turn; when one is met, move the item back to ## Open ` +
        `and say so. Never re-propose a parked item as if it were new.\n\n${parked}\n`;
    }
    if (elsewhere) {
      ruleset += `\n### Elsewhere — open items from the user's OTHER projects\n\n` +
        `Left undone by sessions that ran in another project. Still the user's, still open, and ` +
        `invisible from here unless rendered — which is how they age. Render them under Yours in ` +
        `their own \`*Elsewhere*\` group, after Decide and Do, continuing the same number sequence: ` +
        `one line each, project-tagged, item and age only. Past three, render the two oldest and a ` +
        `count line. Do NOT act on one from this session — that project is not checked out here — ` +
        `and never close one on inference; the change belongs in that project's file.\n${elsewhere}`;
    }
  } catch (e) { /* pending machinery unavailable => ruleset only, never a failed start */ }

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
