---
type: index
created: 2026-11-06
updated: 2026-11-08
tags:
  - index
---

# Idle Adventure knowledge base

Browse the folders in Obsidian's file explorer, or use the direct links below.
Implementation snapshots were captured on 2026-11-06 and 2026-11-08. The main attack path
and skill-tree basics were checked against live code on 2026-11-08; owner design
notes extend through 2026-11-08. Verify live code for later changes.

## Useful starting notes

- [[wiki/Foundations/Game-Overview|Game overview]]
- [[wiki/Foundations/Game-Glossary|Game glossary]]
- [[wiki/Foundations/System-Map|Where systems are defined]]
- [[wiki/Systems/Town/Town-System|Town system]]
- [[wiki/Design/Town-Design-Intent|Town design intent and upgrade requirements]]
- [[wiki/Systems/Equipment/Equipment-Crafting|Anvil: equipment rerolling]]
- [[wiki/Systems/Equipment/Unique-Item-Effects|Unique item effects]]
- [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]]
- [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]]
- [[wiki/Design/Build-Design-Intent|Build design intent and balance boundaries]]
- [[wiki/Design/World-Progression-Design-Intent|World progression design intent]]

## Folders

- `wiki/Foundations/`: overview, terminology, and code ownership.
- `wiki/Systems/`: Town, Equipment, Combat, Progression, and Saves.
- `wiki/Design/`: owner goals, tentative ideas, and open choices.
- `wiki/Sources/`: evidence and provenance notes.
- `wiki/Maintenance/`: source inventory and changelog.

Use the relevant system notes and design direction before implementing changes.
Follow source citations when checking evidence, freshness, or exact details.
Smeltery means W2 Ore-to-Bars production, Anvil means rerolling, and Crafting
means creating items; see the glossary for the code-name mapping.

## Maintenance

- [[wiki/Maintenance/Sources|Source inventory]]
- [[wiki/Maintenance/Changelog|Changelog]]
- [[instructions/START-PROMPT|Import, question, and refresh prompts]]

## Graph view

Graph view shows note links; use the file explorer for the folder hierarchy.
An optional topic-note filter is `path:wiki/ [type:concept]`.
[[README|The vault guide]] explains topic filters and local graphs.

## Coverage gaps

Town definitions, progression, presentation, resource routing, simulation
integration, the main attack path, and skill-tree basics have a static code
review. Detailed skill rules and other systems still need focused review beyond their mapped catalogue
structures, entry points, or documentation-derived topic notes. Balance,
editors, and broader runtime verification remain further review areas. Three
targeted Town browser suites passed 86 checks on 2026-11-08 after removing
producer progression gates on Smeltery upgrades and Saw Mill prestige. The Reap original is missing from this checkout,
as recorded in [[wiki/Maintenance/Sources|the source inventory]].

For more coverage, add selected documents to a new `raw/` batch and run the
Import or update prompt from [[instructions/START-PROMPT|Agent prompts]]. Keep
working files in place and preserve existing snapshots.
