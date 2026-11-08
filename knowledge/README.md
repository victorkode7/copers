# Idle Adventure knowledge library

Open `D:\victo\Desktop\copers\knowledge` as your Obsidian vault.
Start at [Home](wiki/Home.md), or browse topic folders in the file explorer.
Each note has one primary folder; links connect relevant topics across folders.

```text
knowledge/
  raw/                         Original bytes; append new versions
  wiki/
    Home.md                    Entry point
    Foundations/               Overview, glossary, system map
    Systems/
      Town/
      Equipment/
      Combat/
      Progression/
      Saves/
    Design/                    Owner goals and open ideas
    Sources/                   Individual evidence/provenance notes
    Maintenance/               Sources.md inventory and Changelog.md
  instructions/                Rules, prompts, and templates
```

Folders contain notes directly, without category landing pages. Source notes
live in `wiki/Sources/`; the inventory is `wiki/Maintenance/Sources.md`.

## 1. Open and browse

In Obsidian, choose **Open folder as vault**, select this `knowledge` folder,
and open Home. The notes remain ordinary local files.
[Official vault instructions](https://obsidian.md/help/manage-vaults).

Use folders to find a topic. Read current mechanics in `wiki/Systems/`,
goals and tentative decisions in `wiki/Design/`, and terminology/overview in
`wiki/Foundations/`. Follow source links when evidence needs checking.

## 2. Configure notes and templates

Templates, Graph view, Search, and Backlinks are core plugins. The template
folder is `instructions/templates`; templates use `{{title}}` and `{{date}}`.
[Templates documentation](https://obsidian.md/help/plugins/templates).

Under **Files and links**, keep Wikilinks and automatic internal-link updates
enabled. Create notes inside the appropriate category folder. If a manual new
note starts in `wiki/`, move it into its category. Keep
Home as the root entry point. Never rename or edit existing raw snapshots.
[Settings documentation](https://obsidian.md/help/settings).

## 3. Use the graph

To show topic notes, enter this optional **Graph view > Filters > Search files** query:

```text
path:wiki/ [type:concept]
```

This uses existing `type` properties to show concepts and hide source records
and administrative pages. It changes the displayed graph, not stored links.
For all wiki notes use `path:wiki/`. For a Town concept graph use:

```text
path:wiki/ [type:concept] tag:town
```

For a note's neighborhood, run **Open local graph** and start with depth 1.
If an already-open graph retains the old filter, enter the query above in
Search files. [Graph documentation](https://obsidian.md/help/plugins/graph),
[property/search documentation](https://obsidian.md/help/plugins/search).

## 4. Import and update

Copy selected documents, images, spreadsheets, or code into a new dated batch
under `raw/`. Keep the live originals in the project. Existing snapshots are
immutable: changed versions get new raw paths.

Use **Import or update** in [START-PROMPT](instructions/START-PROMPT.md).
Following [the rules](instructions/AGENT.md), the agent compares hashes with
the inventory and processes new material incrementally. Source notes go under
`wiki/Sources/`, current behavior under the relevant system/foundation folder,
and owner direction under `wiki/Design/`. Update useful Home links, the
inventory, and the changelog.

PDFs/scans may need a reader or OCR; spreadsheets need a suitable reader.
Unreadable inputs remain preserved and are reported as blocked. This vault
does not install converters or an LLM integration.

## 5. Ask questions and maintain the library

Use **Ask the wiki** in START-PROMPT. Begin with Home and the relevant topic folder;
retrieve needed notes and useful neighbors. Follow source links for quotations,
missing details, contradictions, or freshness. Verify live code for current
implementation questions.

Use **Refresh project snapshots** after changes to imported project files.
No background watcher or scheduled updater is configured. Obsidian supplies
browsing, search, and the graph; the filesystem agent performs imports and
maintenance when invoked.

Token savings remain unmeasured for this project. Compare the same questions
using raw input versus selected notes, including ingestion/instruction costs,
before claiming a 70-90% reduction.
