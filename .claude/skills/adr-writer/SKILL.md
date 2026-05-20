---
name: adr-writer
description: Write Architectural Decision Records (ADRs) in the Omniscope/Elemar Jr. style — concise Markdown with Context / Decision / Alternatives / Consequences (Positive + Negative) / Implementation sections. Use WHENEVER the user mentions ADRs, architectural decision records, decision logs, or asks to document/register/record an architectural or technical decision and the reasoning behind it. Also trigger on Portuguese: "escreve um ADR", "documenta essa decisão", "registra essa decisão arquitetural", "cria um registro de decisão". Trigger even without the word "ADR" when the user is clearly capturing WHY a technical choice was made (stack pick, library swap, architecture migration, naming convention, framework adoption, deprecation). Do NOT use for READMEs, design docs, RFCs, or runbooks — only for single-decision records with rationale, alternatives, and consequences.
---

# ADR Writer

Writes Architectural Decision Records in the exact format used in the Omniscope repository (github.com/ElemarJR/omniscope/tree/main/doc/architectural-decision-records), which is the reference standard Mateus has chosen.

## When to use this skill

Trigger this skill any time the user wants to capture a single architectural or technical decision in a structured, lightweight document. Typical situations:

- A new stack / library / framework was just picked and the rationale needs to be recorded
- A previous decision is being reversed, deprecated, or superseded
- A pattern or convention is being formalized (date handling, state management, component structure, etc.)
- A migration is being committed to (e.g., Dash → React, JS → TypeScript)
- The user pastes a slack thread, meeting transcript, or rough notes and says "turn this into an ADR"

Do **not** use this skill for: general design docs, RFCs (those are proposals with much more detail), READMEs, runbooks, or post-mortems. ADRs are specifically retrospective records of a decision that has been (or is being) made.

## The format — non-negotiable structure

Every ADR follows this exact skeleton. Section order matters; do not invent new sections.

```markdown
# ADR NNN: <Title in Title Case>

**Status:** <Status>

## Context
<One or two short paragraphs explaining the situation, problem, or pressure that triggered the decision. Plain business-technical voice. Past or present tense.>

## Decision
<What was decided, in 1–3 sentences. Bold the key technology, library, framework, or approach when first introduced. For complex decisions, follow with `###` sub-sections (e.g., "### Key Principles", "### Standards", "### <Topic> Structure").>

## Alternatives Considered
<What else was looked at and why it was rejected. Either short prose or a bullet list. Each alternative gets one line or one short paragraph.>

## Consequences
### Positive:
- **<Lead-in>**: <One-sentence explanation>
- **<Lead-in>**: <One-sentence explanation>
- ...

### Negative:
- **<Lead-in>**: <One-sentence explanation>
- **<Lead-in>**: <One-sentence explanation>
- ...

## Implementation
- <Concrete bullet describing how the decision is being / will be applied>
- <One bullet per implementation detail>
- ...
```

### Section rules

**Title**
- Format: `# ADR NNN: <Descriptive Title in Title Case>`
- `NNN` is zero-padded to **three digits** (001, 012, 045, 120).
- Title is short (5–10 words), Title Case, no trailing period.
- Examples observed: "Use of Python + Dash + Plotly in Omniscope", "Adoption of GraphQL and React for Omniscope", "Removal of Dash Frontend Support", "Date Handling Patterns", "Minimal Frontend Processing Strategy".

**Status**
- One of: `Proposed`, `Approved`, `Obsolete`, `Superseded`, `Deprecated`.
- In the Omniscope canon, almost everything is `Approved`; ADRs that have been replaced get changed to `Obsolete` and gain an `## Update` section pointing forward.
- Default to `Approved` unless the user explicitly says the decision is still under discussion.

**Context**
- 1–2 short paragraphs (3–6 sentences total). Resist the urge to write a wall of text — the entire ADR is usually 25–50 lines.
- Establish the *pressure* or *gap*: what problem made this decision necessary. Do not describe the solution here.
- First person plural ("we identified", "we observed", "our team was…").

**Decision**
- Lead with one sentence of the form *"We decided to [adopt/implement/use/migrate to] **X**"* or *"We have decided to [...] **X**"*.
- **Bold the key noun** (the technology, pattern, or approach) on its first mention.
- For simple decisions, this section is 2–4 sentences. For complex ones (like a layered architecture or a multi-rule convention), use `###` sub-sections such as: `### Key Principles`, `### Standards`, `### Structure`, `### <Domain> Layer`, etc. See ADR 014, 015, 018, 020 in Omniscope for examples.

**Alternatives Considered**
- Either a short prose paragraph naming each rejected option with a brief reason, OR a bullet list of the form: `- <Alternative> (<brief reason it was rejected>)`.
- Don't be exhaustive — list the alternatives that were genuinely considered, usually 1–3.

**Consequences**
- Two sub-sections, **always in this order**: `### Positive:` then `### Negative:`.
- Note the trailing colon on each sub-header (`Positive:`, not `Positive`).
- Bullets use this pattern: `- **<Two-to-four-word lead-in>**: <one-sentence explanation>`.
- Typically 3–5 positive bullets and 2–3 negative bullets. Be honest about the negatives; this is the most valuable section of the document long-term.

**Implementation** (include for any decision that has been or is being executed)
- Bullet list of concrete steps already taken or planned. Each bullet is one short sentence.
- Reference specific files, modules, libraries, or actors when known (e.g., "GraphQL resolvers were created to handle accountManagers, clients, sponsors").
- Omit this section only for purely proposed decisions where no implementation has started.

**Update** (only when an ADR is being changed to `Obsolete` or `Superseded`)
- One short paragraph pointing to the superseding ADR: `This decision has been superseded by ADR NNN, which details <what changed>.`
- This goes at the very end of the file.

## Voice and style

- **Tense**: past or present perfect for the decision itself ("We decided", "We have decided"). Present tense for description ("Pydantic provides…").
- **Pronouns**: first person plural ("we", "our team", "our application"). Never "I". Never "you" except in implementation instructions.
- **Tone**: neutral, business-technical, confident but not promotional. No marketing language, no exclamation marks, no hedging like "we feel that" or "it seems".
- **Length**: target 25–50 lines, ~1500–2500 bytes. If the ADR is sprawling past this, split it into multiple ADRs.
- **Bold usage**: only on (a) key technology/approach names in the Decision paragraph and (b) the lead-in of each Consequences bullet. Do not bold for emphasis in prose.
- **Cross-references**: use the form `ADR 005` or `ADR-005` (both are seen in the canon — pick one and stay consistent within a single ADR). Use them whenever a related decision exists.

## File naming and numbering

**File name**: `adr-NNN-kebab-case-title.md`
- `NNN` is the same zero-padded number used in the title.
- The slug after the number is a lowercase kebab-case version of the title, omitting filler words like "the", "of", "for" only if it helps readability. Match what Mateus uses in his target repo when possible.
- Examples: `adr-001-use-of-python-dash-and-plotly.md`, `adr-013-removal-of-dash-frontend-support.md`, `adr-020-minimal-frontend-processing.md`.

**Picking the number**:
1. If the user references a specific target directory (e.g., "add this to my repo's `doc/adrs/` folder"), and the directory is accessible, list the existing files and pick the next available number.
2. If the user provides the number explicitly, use it.
3. Otherwise, ask: *"What ADR number should this be? (You can also point me at the directory with existing ADRs and I'll pick the next free number.)"*

## Workflow when the user asks for an ADR

1. **Confirm the decision in one sentence.** Before writing anything, restate back to the user what decision is being captured. If the user's input is rough notes / a slack thread / a transcript, parse out the actual decision first and confirm it.
2. **Identify the number and status.** Ask if not obvious (see above).
3. **Draft the ADR** following the skeleton exactly.
4. **Output as a `.md` file** in the working directory using the correct file name, then present it. Do *not* paste the entire ADR inline in the chat unless the user explicitly asks for inline. ADRs are deliverables.
5. **If the new ADR supersedes an existing one**, also offer to update the old one: change its status to `Obsolete` and append an `## Update` section pointing to the new ADR.

## What to do when the user gives messy input

The user often pastes context that isn't yet decision-shaped (meeting notes, Slack threads, a list of pros/cons, a rambling rationale). The job is to:

1. Extract **the single decision**. If there are multiple decisions hiding in the input, surface them and ask which one(s) to write up — one ADR per decision.
2. Sort the supporting material into the four buckets: *context*, *alternatives*, *positive consequences*, *negative consequences*. Anything that doesn't fit one of those buckets probably doesn't belong in the ADR.
3. Compress aggressively. The Omniscope ADRs are short by design — losing detail is the point.

## Anti-patterns to refuse

- ❌ ADRs longer than ~80 lines. If it's that long, split it.
- ❌ Marketing or persuasive language ("game-changing", "best-in-class", "robust").
- ❌ Missing the `### Negative:` section, or making it perfunctory. Honest trade-offs are the whole point of an ADR.
- ❌ Wandering into design-doc territory (full API specs, code samples, sequence diagrams). Keep code references to file/module names; if more detail is needed, link out to a separate design doc.
- ❌ Inventing alternatives that were never actually considered. If only one option was on the table, say so plainly.

## Reference: a minimal exemplar

This is what a well-formed, simple ADR looks like (modeled on ADR 011 of Omniscope):

```markdown
# ADR 011: Adoption of TypeScript

**Status:** Approved

## Context
As our frontend codebase grew, we encountered an increasing number of type-related runtime errors and integration bugs between components. Plain JavaScript made it difficult to refactor confidently or reason about data flowing through our React component tree.

## Decision
We have decided to adopt **TypeScript** across the entire frontend codebase, with `strict` mode enabled in `tsconfig.json`.

## Alternatives Considered
- Continuing with plain JavaScript and relying on JSDoc annotations (too easy to ignore, no compile-time guarantees).
- Flow (less community momentum, smaller ecosystem than TypeScript).

## Consequences
### Positive:
- **Type Safety**: Catches a large class of bugs at compile time rather than runtime.
- **Better Tooling**: Editor autocomplete, inline documentation, and safer refactoring.
- **Self-Documenting Code**: Types serve as living documentation of component contracts.

### Negative:
- **Learning Curve**: Team members unfamiliar with TypeScript will need ramp-up time.
- **Build Complexity**: Adds a compilation step to the development workflow.

## Implementation
- All new `.js` and `.jsx` files are written as `.ts` and `.tsx`.
- Existing files are migrated opportunistically as they are touched.
- Shared types live under `src/types/` and are imported where needed.
- `strict`, `noImplicitAny`, and `strictNullChecks` are enabled in `tsconfig.json`.
```

That's the standard. When in doubt, match this rhythm.
