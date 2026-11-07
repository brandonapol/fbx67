# Contributing

## The workflow

1. Branch off `main`.
2. Keep your branch rebased on `main`.
3. Open a pull request that fills in the template, with `Closes #N` for the issue it finishes.
4. CI runs `make check` and the sweep. A red job is yours to fix.

We keep a linear history. One focused commit per pull request is the norm; a stack of commits gets squashed or
rebased cleanly before merge. [This post](https://www.bitsnbites.eu/a-tidy-linear-git-history/) explains why.

## Commit messages

Imperative and concise, under 80 characters for the subject. A body, wrapped at 120, explains why.

## Before you push

```bash
make setup
```

```bash
make check
```

`make setup` installs a pre-commit hook that runs `make check/fast` on what you staged.

## Story changes

Read [`design.md`](design.md) first. A change that moves a golden transcript needs `make generate/routes` and the
regenerated files committed. Read the transcript diff before you commit it.

## Found a bug or have an idea?

[Open an issue](https://github.com/brandonapol/fbx67/issues/new/choose).
