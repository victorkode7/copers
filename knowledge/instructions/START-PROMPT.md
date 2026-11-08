# Prompts for your filesystem agent

Use these from the existing `copers` project workspace. If you open only the
vault as an agent workspace, replace `knowledge/` with the vault's absolute path.

## Import or update

```text
Maintain my Obsidian library at knowledge/.

Read knowledge/instructions/AGENT.md first and follow its rules and templates.
Read wiki/Home.md and wiki/Maintenance/Sources.md inside that vault. Compare files in raw/
with the source inventory using SHA-256. Process unregistered sources and retry
previously blocked sources only if the needed reader is now available. Skip
completed sources whose hashes are unchanged.

Preserve all original bytes. Put source notes in wiki/Sources/, current behavior
in the relevant wiki/Systems/ or wiki/Foundations/ folder, and owner intent in
wiki/Design/. Keep useful direct links on Home up to date.
Clean the extracted content into cited source notes, reuse or create relevant
concept notes, and add meaningful wikilinks.
Record source versions, uncertainty, contradictions, and extraction blockers.
Update the source inventory, home page, and changelog. Validate metadata,
source hashes, and internal links.

Work in a small batch if the input is large, saving a resumable inventory after
each completed source. Report processed, unchanged, duplicate, and blocked
counts, the notes changed, and any remaining batches. Do not claim that the
whole library is complete if pending or blocked files remain.
```

## Ask the wiki

```text
Use my Obsidian library at knowledge/ to answer this question:

[Replace this line with your question.]

Read knowledge/instructions/AGENT.md and wiki/Home.md, then search the relevant
topic folders. Retrieve only the needed notes and related design direction.
Consult wiki/Maintenance/Sources.md for provenance, coverage, or freshness as needed.
Cite the notes and the source sections supporting the answer. Consult raw evidence
for missing details, exact quotations, ambiguity, or contradictions. State the
source date and distinguish documented behavior from verified current code.
If current behavior is required, verify the original project files as needed.
Explain gaps without guessing. Answer without editing the library.
```

## Refresh project snapshots

```text
Refresh already-imported project documents in my knowledge/ Obsidian library.
Read knowledge/instructions/AGENT.md and wiki/Maintenance/Sources.md. For each registered
source with a known original project path, compare the live file's SHA-256 to
the latest recorded snapshot. Report missing originals. Skip unchanged files.
For changed files, copy the exact bytes into a new dated raw/ path without
overwriting anything. Import the new version, mark the old inventory entry
superseded, and update only affected source/concept notes and navigation.
Preserve old snapshots and history. Report what changed and any blockers.
```
