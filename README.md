# structured-lite

A response contract for Claude Code: a terse professional voice, and a closing summary that has to
tell the truth about whether the work is finished.

It is one skill file plus one `SessionStart` hook. No plugin, no proxy, no network, no dependencies.

```
### Done
**Scope: complete** — 4 of 4 requested, plus 1 added along the way.

- ✅ Fixed the ordering assertion in parser.test.ts.
- ✅ **added** — Hardened the payload parse. Blocker: a bad payload was dropping the pending list.
- ❌ Did not adopt the upstream plugin — it overrides model selection from env vars.

### Verifications
- ✅ `npm run test:unit` — 1,210 passed, 0 failed (was 1,204; the 6 new specs are collected).
- ❌ `tsc --noEmit` — 2 errors in Row.tsx, optional chain returns undefined. Fix queued in Mine.

### Next

**Mine**
- 🔜 Plan 3 of 3 — the trading rail, after plan 2 merges.

**Yours** — open until closed

*Decide*
- [when you can] Approve or reject the new export format (opened 2026-08-01)

*Do*
- [blocking] Rotate the expired deploy key — releases fail until it is replaced (opened 2026-07-16)
```

## Why it exists

Two problems, both of which cost real time.

**Agents claim completion that is not true.** Rarely by lying — usually because a check reported
success while the thing was broken. A background runner's exit code turns out to be the wrapper's.
A test lane silently dies and every spec reports a connection error. A new spec file is collected by
no runner at all, so the suite is green and proves nothing. "Complete" is the most dangerous word an
agent can write, and it is almost always written in good faith.

**Things only the human can do get lost.** An agent says "you'll need to rotate that key" once, in
prose, in a turn that scrolls away. Nobody sees it again. In the project this was built for, six
such items were open across the project instructions and five memory files, the oldest untouched for
a month. None had been forgotten deliberately; they had simply never been re-surfaced.

structured-lite answers the first with a **scope line** that must carry the evidence proving it, a
**Verifications** section where every check reports its actual result, and a rule that only verified
work may appear under Done. It answers the second with a **Yours** list that lives in a file, is
re-injected whenever context is rebuilt, and renders in every structured response until closed.

## Install

Requires Node 18+ and Claude Code.

### Let your agent do it

Paste this into Claude Code (or any coding agent with shell access) and it will perform the whole
installation. It edits your global `settings.json`, so read it before you run it.

```text
Install the structured-lite skill for Claude Code from https://github.com/0xm0w/structured-lite.
Do all of this yourself, then report what changed.

1. Determine my Claude config directory: $CLAUDE_CONFIG_DIR if set, otherwise ~/.claude
   (on Windows, %USERPROFILE%\.claude). Create it if it does not exist.

2. Get the repo: git clone https://github.com/0xm0w/structured-lite into a temporary
   directory. If git is unavailable, download the raw files instead.

3. Install the two pieces, creating parent directories as needed:
   - skills/structured-lite/SKILL.md -> <config>/skills/structured-lite/SKILL.md
   - hooks/inject.js                 -> <config>/structured-lite/inject.js
   Create the empty directory        <config>/structured-lite/pending/
   Write the single word "structured-lite", with no trailing newline, to
                                     <config>/structured-lite/level

4. Register the SessionStart hook in <config>/settings.json.
   READ THE FILE FIRST AND MERGE INTO IT. Never overwrite it, and never drop a key.
   Copy it to settings.json.bak before editing. If hooks.SessionStart already exists,
   APPEND this group to that array and leave every existing entry untouched:

   {"hooks":[{"type":"command","command":"node",
     "args":["<ABSOLUTE path to <config>/structured-lite/inject.js>"],
     "timeout":5,"statusMessage":"Loading structured-lite..."}]}

   Use an absolute path with this platform's own separators. On Windows, escape
   backslashes for JSON, or use forward slashes - node accepts both.

5. Verify, and show me the actual output of each check:
   - settings.json still parses as JSON, and still contains every top-level key it had
     before. Diff it against settings.json.bak and show me the diff.
   - Running `node <config>/structured-lite/inject.js` with empty stdin prints JSON whose
     hookSpecificOutput.additionalContext contains the string "### Done".
   - Deliberately break it to prove it fails safe: write "off" to the level file, confirm
     the hook prints nothing and exits 0, then write "structured-lite" back.

6. Report: the files you created, the settings.json diff, and the fact that this takes
   effect at my NEXT session start - a SessionStart hook cannot fire in the session that
   installed it, so nothing will change until I restart.

Do not install anything else, add dependencies, or change any other setting. If any step
fails, stop and tell me which one - do not work around it.
```

After it finishes, restart your session. Then read the "Tune it before you trust it" section below;
the shipped list of failure modes belongs to someone else's project and is the one part that will
not work for you unedited.

### Manual install

```bash
git clone https://github.com/0xm0w/structured-lite && cd structured-lite
```

Copy the two pieces into your Claude config directory:

```bash
mkdir -p ~/.claude/skills/structured-lite ~/.claude/structured-lite/pending
cp skills/structured-lite/SKILL.md ~/.claude/skills/structured-lite/SKILL.md
cp hooks/inject.js ~/.claude/structured-lite/inject.js
printf structured-lite > ~/.claude/structured-lite/level
```

Register the hook in `~/.claude/settings.json`, merging with any hooks already there:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["/absolute/path/to/.claude/structured-lite/inject.js"],
            "timeout": 5,
            "statusMessage": "Loading structured-lite..."
          }
        ]
      }
    ]
  }
}
```

Verify before relying on it:

```bash
node ~/.claude/structured-lite/inject.js < /dev/null
```

It should print JSON containing the ruleset. It takes effect at the next session start.

## Tune it before you trust it

**Replace the mechanical-liars list.** `SKILL.md` ships with six from one real project — a wrapper's
exit code, a dropped test lane, uncollected spec files, a stale build cache, hidden untracked files,
a dropped commit in a squash merge. Yours will be different. This list is what makes "verified" mean
something, and a generic list means nothing.

**Adjust the voice.** The filler list, the banned pleasantries, and the tool-call anti-patterns are
worth editing to match phrases your agent actually emits. Watch a few transcripts and copy the real
ones in; a rule quoting a phrase you have actually seen survives longer than an abstract one.

## How persistence works

The `SessionStart` hook fires on startup, resume, `/clear` and compaction — exactly the moments a
ruleset held only in context would be lost. It reads a one-word level file, resolves the ruleset
from `SKILL.md` (so the skill is the single source of truth and cannot go stale against a copy), and
appends the open items for the current working directory.

Items live in `~/.claude/structured-lite/pending/<sanitized-cwd>.md`, one file per project, keyed the
same way Claude Code keys project directories: `D:\Projects\app` becomes `D--Projects-app`.

Every failure path exits 0 and injects nothing. A missing file, an unknown level, a malformed
payload — none of them can stop a session starting. `printf off > ~/.claude/structured-lite/level`
disables it without touching settings.

## Cost

The ruleset is roughly 4,900 tokens, injected per session start, resume, `/clear` and compaction —
not per turn. On a long session with several compactions, budget around 20k tokens.

That is a real cost and worth weighing. It buys shorter responses (evidence appears once, in
Verifications, instead of being restated), and it buys not shipping a "complete" that was not.

## Design notes

- **The skill file is the ruleset.** The hook reads `SKILL.md` at runtime rather than embedding a
  copy. The prior art this was modelled on shipped a hardcoded copy that went stale and silently
  served old rules to every session.
- **Three status glyphs, closed set.** `✅` `❌` `🔜`, only inside the closing sections, always
  inside a real `- ` list item so they render with a hanging indent like any other bullet.
- **`❌` means still broken.** A failure fixed during the turn is reported as a pass. Flagging
  resolved problems in red trains the reader to ignore the marker.
- **One item, one owner.** A decision waiting on the human lives in *Yours / Decide*; the work it
  unblocks lives in *Mine* as a gated `🔜`. Never both.
- **Added work is counted separately.** Folding discovered work into the original denominator hides
  the true scope and the fact that the plan was wrong about something.

## License

MIT. See [LICENSE](LICENSE).
