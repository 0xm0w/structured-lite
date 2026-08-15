# Contributing

## Every change goes through a pull request

Adopted 2026-08-16. Nothing is pushed straight to `main` any more — not a typo fix, not a one-line
README correction.

The reason is narrow and worth stating: this repository is public, so a push is a publication. Before
this, every change went live the moment it left the machine, with no point at which a human could
look first. That is acceptable while someone is watching each change land. It stops being acceptable
the moment work happens less closely supervised, which is the normal case for an agent.

```bash
git checkout -b <type>/<short-description>
```

Then commit, push, and open a PR. The PR waits for the repository owner to merge it. An agent
working in this repository does not merge its own pull request.

## Merge style

Squash, to keep `main` linear. The PR title becomes the commit subject, so write it as one.

## Commit authorship

Commits carry no `Co-Authored-By` trailer. Let `git config` supply the identity — never pass
`-c user.email` from a session environment, which stamps commits with whatever address the harness
happens to expose and can attribute them to the wrong account entirely.

## What gets verified before a PR opens

- `node --check hooks/inject.js`
- The hook produces its ruleset: `node hooks/inject.js < /dev/null` prints JSON whose
  `hookSpecificOutput.additionalContext` is non-empty.
- It still fails safe: writing `off` to the level file makes it print nothing and exit 0.
- No project-specific identifiers in the diff. This repository is generic by construction; hostnames,
  addresses, internal PR numbers and product terms do not belong in it.
