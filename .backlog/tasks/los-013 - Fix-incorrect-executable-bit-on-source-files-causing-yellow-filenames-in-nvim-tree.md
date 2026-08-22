---
id: LOS-013
title: >-
  Fix incorrect executable bit on source files causing yellow filenames in
  nvim-tree
status: Done
assignee: []
created_date: '2026-08-16 16:42'
updated_date: '2026-08-16 17:01'
labels:
  - bug
  - tooling
  - devx
dependencies: []
priority: low
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Many source files across the project had the executable bit set (100755) despite not being scripts (e.g. .go, .tsx, .ts, .json, .md, images, .gitignore, flake.nix, go.mod). nvim-tree colors executable files yellow via the NvimTreeExecFile highlight group, making them appear "modified" in the file tree even when git status was clean. Root cause was likely copying files from a filesystem that does not preserve unix permissions (Windows/exFAT/some Docker mounts) at some point in the project history.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All non-script source files use mode 100644 in git index
- [x] #2 Real binaries (bin/server, dev/first) and scripts (.envrc, justfile) retain 100755
- [x] #3 nvim-tree no longer displays unmodified files as yellow
- [ ] #4 Mode changes are committed to git
<!-- AC:END -->
