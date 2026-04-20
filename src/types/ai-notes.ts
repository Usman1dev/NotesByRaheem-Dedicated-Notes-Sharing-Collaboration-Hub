// AI Notes TypeScript Types
// This file defines the types for the AI Notes system

// Block types
export type BlockType = 
  | 'text' 
  | 'definition' 
  | 'examTip' 
  | 'callout' 
  | 'compare' 
  | 'list' 
  | 'table' 
  | 'steps';

// Base block interface
export interface BaseBlock {
  type: BlockType;
}

// Text block
export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

// Definition block
export interface DefinitionBlock extends BaseBlock {
  type: 'definition';
  term: string;
  definition: string;
}

// Exam tip block
export interface ExamTipBlock extends BaseBlock {
  type: 'examTip';
  content: string;
}

// Callout block variants
export type CalloutVariant = 'info' | 'warn' | 'success' | 'danger';

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: CalloutVariant;
  content: string;
}

// Compare block
export interface CompareItem {
  title: string;
  content: string | string[];
}

export interface CompareBlock extends BaseBlock {
  type: 'compare';
  left: CompareItem;
  right: CompareItem;
}

// List block
export interface ListBlock extends BaseBlock {
  type: 'list';
  items: string[];
  ordered?: boolean;
}

// Table block
export interface TableBlock extends BaseBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

// Steps block
export interface StepItem {
  title: string;
  content: string;
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  // Allow either steps array of objects or items array of strings
  steps?: StepItem[];
  items?: string[];
}

// Union type for all blocks
export type Block = 
  | TextBlock 
  | DefinitionBlock 
  | ExamTipBlock 
  | CalloutBlock 
  | CompareBlock 
  | ListBlock 
  | TableBlock 
  | StepsBlock;

// Section interface
export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

// AI Note content structure (the JSON stored in content column)
export interface AiNoteContent {
  title: string;
  description?: string;
  sections: Section[];
}

// Database record for ai_notes table
export interface AiNoteRecord {
  id: string;
  title: string;
  lecture: string;
  course: string;
  chapter_title: string;
  content: AiNoteContent;
  created_at: string;
  week_number?: number;
  owner_id?: string;
  tags?: string[];
  is_published?: boolean;
  updated_at?: string;
}

// For inserting new AI notes
export interface InsertAiNote {
  title: string;
  lecture: string;
  course: string;
  chapter_title: string;
  content: AiNoteContent;
  week_number?: number;
  tags?: string[];
  is_published?: boolean;
}

// For updating AI notes
export interface UpdateAiNote {
  title?: string;
  lecture?: string;
  course?: string;
  chapter_title?: string;
  content?: AiNoteContent;
  week_number?: number;
  tags?: string[];
  is_published?: boolean;
}

// Course summary for landing page
export interface CourseSummary {
  course: string; // course code (e.g., "CS101")
  course_name?: string; // full course name (e.g., "Introduction to Computer Science")
  note_count: number;
  latest_note_date?: string;
}

// Chapter summary for course page (backward compatibility)
export interface ChapterSummary {
  course: string;
  lecture: string;
  chapter_title: string;
  note_count: number;
  latest_note_date?: string;
  week_number?: number;
}

// Week summary for course page (new interface)
export interface WeekSummary {
  course: string;
  week: string;
  week_number?: number;
  note_count: number;
  latest_note_date?: string;
}

// Note summary for week page (with backward compatibility)
export interface NoteSummary {
  id: string;
  title: string;
  course: string;
  lecture: string; // Backward compatibility
  week: string; // New field
  week_number?: number;
  chapter_title?: string; // Backward compatibility
  created_at: string;
  owner_id?: string; // For owner permission checks
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Helper function to check if a block is of a specific type
export function isBlockType<T extends Block>(block: Block, type: T['type']): block is T {
  return block.type === type;
}