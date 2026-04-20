# AI Notes System Implementation Plan

## Overview
Implement a complete AI Notes system that integrates cleanly into the existing React 18 + TypeScript project with Supabase. The system will allow owners to upload structured JSON notes and all users to browse them through a hierarchical navigation.

## Architecture

### Database Schema
```sql
-- Table: ai_notes
-- Columns:
-- id (uuid, primary key, default uuid_generate_v4())
-- title (text)
-- lecture (text) e.g., "L01", "L02"
-- course (text)
-- chapter_title (text)
-- content (jsonb)
-- created_at (timestamp, default now())

-- Indexes:
-- CREATE INDEX idx_ai_notes_course ON ai_notes(course);
-- CREATE INDEX idx_ai_notes_lecture ON ai_notes(lecture);
```

### RLS Policies
1. **SELECT**: All authenticated users can read
2. **INSERT**: Only owner role can insert
3. **UPDATE**: Only owner role can update
4. **DELETE**: Only owner role can delete

## TypeScript Types

### Core Types
```typescript
// Block types
type BlockType = 'text' | 'definition' | 'examTip' | 'callout' | 'compare' | 'list' | 'table' | 'steps';

interface TextBlock {
  type: 'text';
  content: string;
}

interface DefinitionBlock {
  type: 'definition';
  term: string;
  definition: string;
}

interface ExamTipBlock {
  type: 'examTip';
  content: string;
}

interface CalloutBlock {
  type: 'callout';
  variant: 'info' | 'warn' | 'success' | 'danger';
  content: string;
}

interface CompareBlock {
  type: 'compare';
  left: { title: string; content: string };
  right: { title: string; content: string };
}

interface ListBlock {
  type: 'list';
  items: string[];
  ordered?: boolean;
}

interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

interface StepsBlock {
  type: 'steps';
  steps: { title: string; content: string }[];
}

type Block = TextBlock | DefinitionBlock | ExamTipBlock | CalloutBlock | CompareBlock | ListBlock | TableBlock | StepsBlock;

interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

interface AiNoteContent {
  title: string;
  sections: Section[];
}

interface AiNoteRecord {
  id: string;
  title: string;
  lecture: string;
  course: string;
  chapter_title: string;
  content: AiNoteContent;
  created_at: string;
}
```

## Implementation Steps

### Phase 1: Database Setup
1. Create Supabase migration for `ai_notes` table
2. Add RLS policies
3. Create indexes for performance

### Phase 2: TypeScript Infrastructure
1. Create `src/types/ai-notes.ts` with all type definitions
2. Update `src/integrations/supabase/types.ts` to include new table
3. Create `src/services/aiNotesService.ts` with CRUD operations

### Phase 3: Owner Panel Integration
1. Add "Upload AI Notes" to Owner Dashboard sidebar
2. Create `/owner/upload-ai-notes` page
3. Implement JSON upload form with validation
4. Add success/error feedback

### Phase 4: Routing & Navigation
1. Add routes to `src/App.tsx`:
   - `/ai-notes` → AINotesLandingPage
   - `/ai-notes/:course` → AINotesCoursePage
   - `/ai-notes/:course/:lecture` → AINotesChapterPage
   - `/ai-notes/:course/:lecture/:noteId` → AINotesDetailPage
2. Update all dashboard sidebars to include "AI Notes" navigation item

### Phase 5: Pages Implementation
1. **AINotesLandingPage**: Fetch unique courses, display as cards
2. **AINotesCoursePage**: Fetch notes by course, display chapters
3. **AINotesChapterPage**: Fetch notes by course+lecture, display notes list
4. **AINotesDetailPage**: Render note content with dynamic renderer

### Phase 6: Dynamic Render Engine
1. Create `src/components/ai-notes/` directory
2. Implement `renderBlock(block: Block): JSX.Element`
3. Create specialized components:
   - `DefinitionBox`
   - `ExamTip`
   - `Callout`
   - `Compare`
   - `Table`
   - `Steps`
4. Create `AiNoteRenderer` component

### Phase 7: Sidebar Navigation
1. Create `AiNotesSidebar` component
2. Generate anchor links from sections
3. Implement scroll spy for active section highlighting
4. Add smooth scrolling

### Phase 8: Styling & UI Consistency
1. Use existing shadcn/ui components
2. Follow project's theme tokens
3. Ensure responsive design
4. Match existing note styling patterns

### Phase 9: Error Handling & Validation
1. JSON parsing error handling
2. Empty state components
3. Loading states
4. Graceful fallbacks for missing data

### Phase 10: Testing & Polish
1. Test all user flows
2. Verify responsive design
3. Check TypeScript compilation
4. Ensure no breaking changes to existing features

## File Structure
```
src/
├── types/
│   └── ai-notes.ts
├── services/
│   └── aiNotesService.ts
├── components/
│   └── ai-notes/
│       ├── AiNoteRenderer.tsx
│       ├── DefinitionBox.tsx
│       ├── ExamTip.tsx
│       ├── Callout.tsx
│       ├── Compare.tsx
│       ├── Table.tsx
│       ├── Steps.tsx
│       └── AiNotesSidebar.tsx
├── pages/
│   ├── AINotesLandingPage.tsx
│   ├── AINotesCoursePage.tsx
│   ├── AINotesChapterPage.tsx
│   ├── AINotesDetailPage.tsx
│   └── OwnerAINotes.tsx
└── integrations/
    └── supabase/
        └── types.ts (updated)
```

## Dependencies
- No new external dependencies required
- Uses existing: React, TypeScript, Supabase, shadcn/ui, Tailwind CSS

## Success Criteria
1. Owner can upload JSON notes successfully
2. All users can navigate AI notes hierarchy
3. Notes render correctly with all block types
4. Sidebar navigation works with smooth scrolling
5. No breaking changes to existing functionality
6. Fully responsive design
7. TypeScript types are comprehensive and accurate