# AI Notes System — Roo Code Implementation Guide

## ⚠️ CRITICAL RULES FOR ROO CODE — READ BEFORE WRITING ANY CODE

```
1. IMPLEMENT ONE STEP AT A TIME.
   - Complete each step fully before moving to the next.
   - After each step, stop and confirm: "Step X complete. Ready for Step X+1?"
   - NEVER combine multiple steps in one response.

2. FILE SIZE LIMIT — MAXIMUM 350 LINES PER FILE.
   - If a file needs more than 350 lines, SPLIT it into smaller modules.
   - Example: NoteRenderer.tsx → split into NoteRenderer.tsx + BlockComponents.tsx
   - Always prefer multiple smaller files over one large file.

3. NEVER LEAVE A FILE INCOMPLETE.
   - Do NOT start a new file until the current one is fully written and closed.
   - If you are approaching the response limit mid-file, STOP, finish the current
     file with a minimal valid closing, then in the next response expand it.
   - Never write "// ... rest of file" or "// TODO" placeholders and move on.

4. WRITE MAXIMUM 2 FILES PER RESPONSE.
   - If a step requires more than 2 files, split it into sub-steps: 3a, 3b, 3c.
   - Always finish one file completely before starting the next.

5. CONFIRM BEFORE PROCEEDING.
   - After every step or sub-step, list exactly what was created or changed.
   - Wait for user confirmation before moving to the next step.
```

---

## 🔴 CORE CONSTRAINTS

1. DO NOT change existing theme, layout, or styling system.
2. REUSE existing UI patterns (cards, sidebar, containers).
3. FOLLOW current routing and folder structure conventions.
4. KEEP code modular — no single file exceeds 350 lines.
5. ENSURE TypeScript types are properly defined throughout.

---

## 🟢 FEATURE OVERVIEW

A system where:
- **Owner** can paste and upload structured JSON notes via a dedicated panel
- **All users** (Student, Admin, Owner) can browse: AI Notes → Courses → Chapters → Notes Page
- Notes are stored as JSONB in Supabase and rendered dynamically via a block-based render engine

---

## ✅ STEP 1 — DATABASE ONLY

> Do Step 1 only. Stop after. Confirm completion before proceeding.

Using Supabase MCP, create the following table:

**Table name:** `ai_notes`

| Column | Type | Constraint | Default |
|---|---|---|---|
| id | uuid | PRIMARY KEY | uuid_generate_v4() |
| title | text | NOT NULL | — |
| lecture | text | NOT NULL | — |
| course | text | NOT NULL | — |
| chapter_title | text | NOT NULL | — |
| content | jsonb | NOT NULL | — |
| created_at | timestamptz | — | now() |

- Create an index on `course`
- Create an index on `lecture`
- Enable RLS on the table
- Add RLS policy: all authenticated users can SELECT
- Add RLS policy: only owner/admin roles can INSERT, UPDATE, DELETE — match the exact RLS pattern already used in the existing project tables

**After Step 1:** Show the SQL that was executed and confirm the table exists. Then stop and wait for confirmation.

---

## ✅ STEP 2 — TYPESCRIPT TYPES ONLY

> Do Step 2 only. Create 1 file only. Stop after. Confirm completion before proceeding.

Create file: `src/types/aiNotes.ts`

Define the following types:

**`AiNote`** — mirrors the database row exactly:
- `id: string`
- `title: string`
- `lecture: string`
- `course: string`
- `chapter_title: string`
- `content: NoteContent`
- `created_at: string`

**`NoteContent`**:
- `title: string`
- `sections: Section[]`

**`Section`**:
- `id: string`
- `title: string`
- `blocks: Block[]`

**`Block`** — discriminated union of all block types:

- `TextBlock`: `{ type: 'text'; content: string }`
- `DefinitionBlock`: `{ type: 'definition'; term: string; definition: string }`
- `ExamTipBlock`: `{ type: 'examTip'; tip: string }`
- `CalloutBlock`: `{ type: 'callout'; variant: 'info' | 'warn' | 'success'; message: string }`
- `CompareBlock`: `{ type: 'compare'; leftLabel?: string; rightLabel?: string; left: string; right: string }`
- `ListBlock`: `{ type: 'list'; items: string[] }`
- `TableBlock`: `{ type: 'table'; headers: string[]; rows: string[][] }`
- `StepsBlock`: `{ type: 'steps'; steps: string[] }`

Export all types individually and export `Block` as a union of all block types.

**After Step 2:** Confirm file path and that all types are exported. Then stop and wait for confirmation.

---

## ✅ STEP 3 — SUPABASE SERVICE FUNCTIONS ONLY

> Do Step 3 only. Create 1 file only. Stop after. Confirm completion before proceeding.

Create file: `src/lib/aiNotesService.ts`

Import the existing Supabase client using the exact same import pattern already used in other service files in the project.

Implement these functions:

**`insertAiNote`**
- Params: `data: Omit<AiNote, 'id' | 'created_at'>`
- Inserts a new row into `ai_notes`
- Returns: `Promise<void>`
- Throws on error

**`fetchCourses`**
- No params
- Fetches all distinct `course` values from `ai_notes`
- Returns: `Promise<string[]>`
- Throws on error

**`fetchLecturesByCourse`**
- Params: `course: string`
- Fetches rows where course matches, selecting only: `id, title, lecture, chapter_title`
- Returns: `Promise<Pick<AiNote, 'id' | 'title' | 'lecture' | 'chapter_title'>[]>`
- Orders by `lecture` ascending
- Throws on error

**`fetchNoteByLectureAndCourse`**
- Params: `course: string, lecture: string`
- Fetches single full row matching both course and lecture
- Returns: `Promise<AiNote | null>`
- Throws on error

**After Step 3:** Confirm file path and all 4 functions are present and complete. Then stop and wait for confirmation.

---

## ✅ STEP 4 — OWNER UPLOAD PAGE (Split into 4a and 4b)

> Do Step 4a first. 1 file only. Stop after 4a and confirm before doing 4b.

### Step 4a — Upload page component

Create file: `src/pages/owner/UploadAiNotes.tsx`

Build a full page UI with:
- Text input: Course Name (maps to `course`)
- Text input: Lecture (e.g. L01, L02 — maps to `lecture`)
- Text input: Chapter Title (maps to `chapter_title`)
- Large textarea: JSON Content (maps to `content` after parsing)
- Submit button: "Upload Notes"

Logic:
- On submit, parse the textarea JSON with try/catch
- Validate: parsed JSON must contain `title` (string) and `sections` (array)
- If invalid JSON, show inline error: "Invalid JSON format"
- If validation fails, show inline error describing what is missing
- If valid, call `insertAiNote()` with all fields
- `title` field in the database row should be pulled from `parsedJson.title`
- On success, show success message and clear the form
- On Supabase error, show the error message inline
- Show a loading state on the button while submitting
- Use existing form/input/button styles from the project — do not invent new styles

**After Step 4a:** Confirm file is complete and closed. Then stop and wait for confirmation.

### Step 4b — Wire upload page into Owner routing and sidebar

> Do Step 4b only after 4a is confirmed. Modify maximum 2 existing files. Stop after.

- Locate the Owner sidebar config or navigation component
- Add one sidebar entry: label `"Upload AI Notes"`, path `/owner/upload-ai-notes`, with an appropriate icon already used in the project
- Locate the Owner route definitions file
- Add route: `/owner/upload-ai-notes` → `UploadAiNotes` (lazy import if project uses lazy loading)
- Do not change anything else in these files

**After Step 4b:** List exactly which files were modified, what lines changed, and confirm. Then stop and wait for confirmation.

---

## ✅ STEP 5 — GLOBAL ROUTING + SIDEBAR LINKS (Split into 5a and 5b)

> Do Step 5a first. Stop after 5a and confirm before doing 5b.

### Step 5a — Register AI Notes routes

- Locate the main/shared route definitions file (or whichever file handles Student/Admin routes)
- Register these 3 routes:
  - `/ai-notes` → `AiNotesHome`
  - `/ai-notes/:course` → `AiNotesCourse`
  - `/ai-notes/:course/:lecture` → `AiNotesPage`
- Use lazy imports if the project uses them
- Create 3 placeholder page files for now (just a `<div>Coming soon</div>` default export) so imports don't break:
  - `src/pages/aiNotes/AiNotesHome.tsx`
  - `src/pages/aiNotes/AiNotesCourse.tsx`
  - `src/pages/aiNotes/AiNotesPage.tsx`

**After Step 5a:** Confirm route file modified and 3 placeholder files created. Then stop and wait for confirmation.

### Step 5b — Add AI Notes to all sidebars

- Locate the Student sidebar config/component
- Locate the Admin sidebar config/component
- Locate the Owner sidebar config/component (if not already added in Step 4b)
- Add one entry to each: label `"AI Notes"`, path `/ai-notes`, with an appropriate existing icon
- Do not change anything else

**After Step 5b:** List exactly which files were modified. Then stop and wait for confirmation.

---

## ✅ STEP 6 — BLOCK COMPONENTS (Split into 6a, 6b, and 6c)

> Do one sub-step at a time. 1 file per sub-step. Stop and confirm after each.

### Step 6a — Simple block components

Create file: `src/components/aiNotes/BlockComponents.tsx`

Export the following React components. Use only Tailwind classes or CSS patterns already present in the project. Do not hardcode colors outside of the existing theme system.

**`TextBlockRenderer({ block }: { block: TextBlock })`**
- Renders a `<p>` tag with the block's content

**`DefinitionBox({ block }: { block: DefinitionBlock })`**
- Renders a styled box with the term in bold/highlighted and the definition below it
- Should look like a glossary card

**`ExamTip({ block }: { block: ExamTipBlock })`**
- Renders a visually distinct highlighted tip box
- Include a small "Exam Tip" label at the top
- Use a warm accent color from the existing theme (yellow or amber if available)

**`Callout({ block }: { block: CalloutBlock })`**
- Renders a callout box with 3 variants: `info`, `warn`, `success`
- Each variant should have a distinct left border color or background tint
- Include an appropriate icon if the project uses an icon library

**After Step 6a:** Confirm file is fully written and closed. Then stop and wait for confirmation.

### Step 6b — Complex block components

Create file: `src/components/aiNotes/ComplexBlocks.tsx`

Export the following components:

**`CompareBlockRenderer({ block }: { block: CompareBlock })`**
- Renders a 2-column layout
- Left column header = `block.leftLabel` or "Option A"
- Right column header = `block.rightLabel` or "Option B"
- Each column shows the respective content in a card/panel

**`ListBlockRenderer({ block }: { block: ListBlock })`**
- Renders a styled `<ul>` with `<li>` for each item
- Use existing list styling from the project

**`TableBlockRenderer({ block }: { block: TableBlock })`**
- Renders a full styled `<table>` with `<thead>` and `<tbody>`
- Headers from `block.headers`, rows from `block.rows`
- Use existing table styling from the project

**`StepsBlockRenderer({ block }: { block: StepsBlock })`**
- Renders a numbered step list
- Each step has a circle number badge and text beside it
- Steps are visually connected (e.g. line between circles) if project styling allows

**After Step 6b:** Confirm file is fully written and closed. Then stop and wait for confirmation.

### Step 6c — Render engine

Create file: `src/components/aiNotes/NoteRenderer.tsx`

- Import all block components from `BlockComponents.tsx` and `ComplexBlocks.tsx`
- Import types from `src/types/aiNotes.ts`

Export **`renderBlock(block: Block): JSX.Element`**:
- A function that switches on `block.type` and returns the correct component
- Handle all 8 block types
- Return a `<p className="text-red-500">Unknown block type</p>` fallback for unrecognized types

Export **`NoteRenderer({ sections }: { sections: Section[] })`**:
- Maps over sections
- For each section, renders a `<section>` tag with `id={section.id}`
- Renders an `<h2>` with the section title
- Maps over `section.blocks` and calls `renderBlock(block)` for each
- Each block should be wrapped with a key

**After Step 6c:** Confirm file is fully written and closed. Then stop and wait for confirmation.

---

## ✅ STEP 7 — NOTES PAGE SIDEBAR COMPONENT

> Do Step 7 only. 1 file only. Stop after. Confirm completion before proceeding.

Create file: `src/components/aiNotes/NotesSidebar.tsx`

Props: `{ sections: Section[] }`

Behavior:
- Renders a vertical list of anchor links, one per section
- Each link's `href` = `#${section.id}`, label = `section.title`
- On click, smooth scrolls to the section
- Uses `IntersectionObserver` to detect which section is currently in the viewport
- Highlights the active section link (use existing active/selected styles from the project)
- On mobile, this sidebar should either collapse or stack above the content — follow existing responsive patterns in the project

**After Step 7:** Confirm file is fully written and closed. Then stop and wait for confirmation.

---

## ✅ STEP 8 — FILL IN THE 3 PAGES (One at a time)

> Do one sub-step at a time. 1 file per sub-step. Stop and confirm after each.

### Step 8a — AiNotesHome page

Replace placeholder in `src/pages/aiNotes/AiNotesHome.tsx`:

- On mount, call `fetchCourses()` to get the list of course names
- Show a loading spinner while fetching (use existing spinner/loader component)
- Show an error message if fetch fails
- If no courses exist, show a friendly empty state message
- Render each course as a card (use existing card component/pattern from the project)
- Each card shows the course name and links to `/ai-notes/:course`
- Page should have a heading "AI Notes" and a subtitle

**After Step 8a:** Confirm file is complete and closed. Then stop and wait for confirmation.

### Step 8b — AiNotesCourse page

Replace placeholder in `src/pages/aiNotes/AiNotesCourse.tsx`:

- Read `:course` from URL params
- On mount, call `fetchLecturesByCourse(course)`
- Show a loading spinner while fetching
- Show an error message if fetch fails
- If no lectures exist, show a friendly empty state
- Render each result as a card showing: `chapter_title` as heading, `lecture` as a badge/subtitle
- Each card links to `/ai-notes/:course/:lecture`
- Page should have a back link to `/ai-notes` and a heading showing the course name

**After Step 8b:** Confirm file is complete and closed. Then stop and wait for confirmation.

### Step 8c — AiNotesPage (notes viewer)

Replace placeholder in `src/pages/aiNotes/AiNotesPage.tsx`:

- Read `:course` and `:lecture` from URL params
- On mount, call `fetchNoteByLectureAndCourse(course, lecture)`
- Show a loading spinner while fetching
- Show an error message if fetch fails
- If note is null/not found, show a "Note not found" message with a back link
- Layout: two-column on desktop — left column is `NotesSidebar`, right column is `NoteRenderer`
- Pass `note.content.sections` to both `NotesSidebar` and `NoteRenderer`
- Page heading should show `note.title`
- Include a back link to `/ai-notes/:course`
- On mobile, sidebar stacks above the content

**After Step 8c:** Confirm file is complete and closed. Then stop and wait for confirmation.

---

## ✅ STEP 9 — FINAL CHECK

> Do Step 9 only after ALL previous steps are confirmed complete.

Go through this checklist and report the status of each item:

- [ ] `ai_notes` table created in Supabase with correct columns, indexes, and RLS
- [ ] `src/types/aiNotes.ts` — all types exported correctly
- [ ] `src/lib/aiNotesService.ts` — all 4 functions present and complete
- [ ] Owner can upload notes via `/owner/upload-ai-notes`
- [ ] Owner sidebar has "Upload AI Notes" entry
- [ ] All 3 sidebars (Student, Admin, Owner) have "AI Notes" entry
- [ ] All 3 routes registered and resolving correctly
- [ ] All 8 block types render without errors
- [ ] Notes page sidebar scrollspy highlights active section
- [ ] All pages handle loading, error, and empty states
- [ ] No file exceeds 350 lines
- [ ] No existing files or UI are broken
- [ ] Feature is fully responsive on mobile and desktop

If any item fails, fix it before marking the step complete.

---

## 🔁 REQUIRED RESPONSE FORMAT FOR EVERY STEP

After completing any step or sub-step, always respond in exactly this format:

```
✅ Step [X] Complete

Files created:
- path/to/file.ts (XX lines)

Files modified:
- path/to/existing.ts (added: brief description of change)

Issues encountered: (none / describe if any)

Ready for Step [X+1]? Waiting for your confirmation.
```
