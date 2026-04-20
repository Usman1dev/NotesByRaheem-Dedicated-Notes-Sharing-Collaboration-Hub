// AI Notes Service
// Provides CRUD operations for AI notes using Supabase

import { supabase } from '../integrations/supabase/client';
import { Database, Json } from '../integrations/supabase/types';
import {
  AiNoteRecord,
  InsertAiNote,
  UpdateAiNote,
  CourseSummary,
  ChapterSummary,
  NoteSummary,
  ValidationResult,
  AiNoteContent
} from '../types/ai-notes';

type AiNoteTable = Database['public']['Tables']['ai_notes'];
export type AiNoteRow = AiNoteTable['Row'];
export type AiNoteInsert = AiNoteTable['Insert'];
export type AiNoteUpdate = AiNoteTable['Update'];

// Convert database row to AiNoteRecord
function rowToAiNoteRecord(row: AiNoteRow): AiNoteRecord {
  // Type guard to ensure content is AiNoteContent
  const content = row.content;
  let aiNoteContent: AiNoteContent;
  
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    // Basic validation that it has the expected structure
    const obj = content as Record<string, any>;
    if (obj.title && typeof obj.title === 'string' && Array.isArray(obj.sections)) {
      aiNoteContent = obj as AiNoteContent;
    } else {
      // Fallback to empty content if structure is invalid
      console.warn('Invalid AI note content structure, using fallback');
      aiNoteContent = {
        title: row.title,
        sections: []
      };
    }
  } else {
    // Fallback if content is not an object
    console.warn('AI note content is not an object, using fallback');
    aiNoteContent = {
      title: row.title,
      sections: []
    };
  }
  
  return {
    id: row.id,
    title: row.title,
    lecture: row.lecture,
    course: row.course,
    chapter_title: row.chapter_title || '', // Use the actual chapter_title column
    week_number: row.week_number ?? undefined,
    content: aiNoteContent,
    created_at: row.created_at,
    owner_id: row.owner_id,
    tags: row.tags ?? undefined,
    is_published: row.is_published,
    updated_at: row.updated_at
  };
}

// Convert InsertAiNote to database insert format
function insertAiNoteToDb(note: InsertAiNote, ownerId: string): AiNoteInsert {
  return {
    title: note.title,
    lecture: note.lecture,
    course: note.course,
    week_number: note.week_number, // Include week_number
    chapter_title: note.chapter_title, // Store chapter_title in its own column
    content: note.content as unknown as Json, // Cast to Json type for Supabase
    owner_id: ownerId,
    tags: [], // Empty tags array for now
    is_published: true // Default to published
  };
}

// Convert UpdateAiNote to database update format
function updateAiNoteToDb(note: UpdateAiNote): AiNoteUpdate {
  const update: AiNoteUpdate = {};
  
  if (note.title !== undefined) update.title = note.title;
  if (note.lecture !== undefined) update.lecture = note.lecture;
  if (note.course !== undefined) update.course = note.course;
  if (note.week_number !== undefined) update.week_number = note.week_number;
  if (note.content !== undefined) update.content = note.content as unknown as Json;
  if (note.chapter_title !== undefined) update.chapter_title = note.chapter_title;
  
  return update;
}

/**
 * Create a new AI note
 */
export async function createAiNote(note: InsertAiNote, ownerId: string): Promise<AiNoteRecord> {
  const dbNote = insertAiNoteToDb(note, ownerId);
  
  // Try the normal insert first
  const { data, error } = await supabase
    .from('ai_notes')
    .insert(dbNote)
    .select()
    .single();
    
  if (error) {
    // If we get a schema cache error, try raw SQL as a fallback
    if (error.message.includes('schema cache') || error.message.includes('owner_id')) {
      console.warn('Schema cache error detected, falling back to raw SQL insert');
      
      // Build raw SQL insert
      const { data: sqlData, error: sqlError } = await supabase.rpc('insert_ai_note_raw', {
        p_title: dbNote.title,
        p_lecture: dbNote.lecture,
        p_course: dbNote.course,
        p_chapter_title: dbNote.chapter_title,
        p_content: dbNote.content,
        p_owner_id: dbNote.owner_id,
        p_tags: dbNote.tags || [],
        p_is_published: dbNote.is_published !== undefined ? dbNote.is_published : true
      });
      
      if (sqlError) {
        console.error('Raw SQL insert also failed:', sqlError);
        throw new Error(`Failed to create AI note: ${sqlError.message}`);
      }
      
      // The RPC should return the inserted row, but if not, fetch it
      if (sqlData) {
        // Try to get the inserted note
        const { data: fetchedData, error: fetchError } = await supabase
          .from('ai_notes')
          .select('*')
          .eq('title', dbNote.title)
          .eq('owner_id', dbNote.owner_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch created AI note: ${fetchError.message}`);
        }
        
        return rowToAiNoteRecord(fetchedData);
      }
    }
    
    // If it's not a schema cache error, throw the original error
    console.error('Error creating AI note:', error);
    throw new Error(`Failed to create AI note: ${error.message}`);
  }
  
  return rowToAiNoteRecord(data);
}

/**
 * Get an AI note by ID
 */
export async function getAiNoteById(id: string): Promise<AiNoteRecord | null> {
  const { data, error } = await supabase
    .from('ai_notes')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching AI note:', error);
    throw new Error(`Failed to fetch AI note: ${error.message}`);
  }
  
  return rowToAiNoteRecord(data);
}

/**
 * Update an AI note
 */
export async function updateAiNote(id: string, updates: UpdateAiNote): Promise<AiNoteRecord> {
  const dbUpdates = updateAiNoteToDb(updates);
  
  const { data, error } = await supabase
    .from('ai_notes')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating AI note:', error);
    throw new Error(`Failed to update AI note: ${error.message}`);
  }
  
  return rowToAiNoteRecord(data);
}

/**
 * Delete an AI note
 */
export async function deleteAiNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_notes')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting AI note:', error);
    throw new Error(`Failed to delete AI note: ${error.message}`);
  }
}

/**
 * Get all unique courses (for landing page)
 */
export async function getCourses(): Promise<CourseSummary[]> {
  // Fetch all courses from the courses table
  const { data, error } = await supabase
    .from('courses')
    .select('code, name, created_at')
    .order('name', { ascending: true });
    
  if (error) {
    console.error('Error fetching courses:', error);
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }
  
  // For each course, count how many AI notes exist
  const coursesWithCounts: CourseSummary[] = [];
  
  for (const course of data) {
    // Count AI notes for this course - use course.code as the identifier
    const { count, error: countError } = await supabase
      .from('ai_notes')
      .select('*', { count: 'exact', head: true })
      .eq('course', course.code);
    
    if (countError) {
      console.error('Error counting notes for course:', course.code, countError);
      // Continue with count = 0
    }
    
    // Get latest note date for this course
    const { data: latestNote, error: latestError } = await supabase
      .from('ai_notes')
      .select('created_at')
      .eq('course', course.code)
      .order('created_at', { ascending: false })
      .limit(1);
    
    coursesWithCounts.push({
      course: course.code,
      course_name: course.name,
      note_count: count || 0,
      latest_note_date: latestNote && latestNote.length > 0 ? latestNote[0].created_at : null
    });
  }
  
  return coursesWithCounts;
}

/**
 * Get all courses from the courses table (for dropdown selection)
 */
export async function getAllCourses(): Promise<{ code: string; name: string }[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('code, name')
      .order('name', { ascending: true });
      
    if (error) {
      console.error('Error fetching all courses:', error);
      // Return empty array instead of throwing to allow UI to show helpful message
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Use a Map to ensure unique courses by code (normalized)
    const courseMap = new Map<string, { code: string; name: string }>();
    
    data.forEach(row => {
      if (!row.code || !row.name) return;
      
      const code = row.code.trim();
      const name = row.name.trim();
      
      if (code && name) {
        // Use normalized code (lowercase) as key to prevent duplicates with different casing
        const normalizedCode = code.toLowerCase();
        if (!courseMap.has(normalizedCode)) {
          courseMap.set(normalizedCode, { code, name });
        }
      }
    });
    
    return Array.from(courseMap.values());
  } catch (err) {
    console.error('Unexpected error in getAllCourses:', err);
    return [];
  }
}

/**
 * Get weeks for a specific course (week-based organization)
 */
export async function getWeeksByCourse(course: string): Promise<ChapterSummary[]> {
  // Fetch with week_number column
  const { data, error } = await supabase
    .from('ai_notes')
    .select('lecture, chapter_title, created_at, week_number')
    .eq('course', course);
    
  if (error) {
    console.error('Error fetching weeks:', error);
    throw new Error(`Failed to fetch weeks: ${error.message}`);
  }
  
  // Group by week number (or lecture if week_number is null)
  const weekMap = new Map<string, ChapterSummary>();
  
  data.forEach(row => {
    const lecture = row.lecture;
    const chapterTitle = row.chapter_title || '';
    
    // Determine week number - use week_number column if available
    // Otherwise try to extract from lecture
    let weekNumber = row.week_number;
    if (weekNumber === null && lecture) {
      const weekMatch = lecture.match(/Week\s*(\d+)/i);
      if (weekMatch) {
        weekNumber = parseInt(weekMatch[1], 10);
      } else if (lecture && /^\d+$/.test(lecture)) {
        weekNumber = parseInt(lecture, 10);
      }
    }
    
    // Default to 1 if still null
    if (weekNumber === null) {
      weekNumber = 1;
    }
    
    // Create a display title for the week
    // Use chapter_title if it exists and is meaningful, otherwise create one
    let displayTitle = chapterTitle;
    if (!displayTitle || displayTitle.trim() === '') {
      displayTitle = `Week ${weekNumber}`;
    }
    
    // Create a queryable lecture identifier
    // Use the original lecture if it exists, otherwise use "Week X"
    let lectureIdentifier = lecture;
    if (!lectureIdentifier || lectureIdentifier.trim() === '') {
      lectureIdentifier = `Week ${weekNumber}`;
    }
    
    // Create a unique key for the week - use week number for grouping
    const weekKey = `${course}-${weekNumber}`;
    
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        course,
        lecture: lectureIdentifier,
        chapter_title: displayTitle,
        note_count: 0,
        latest_note_date: row.created_at,
        week_number: weekNumber
      });
    }
    
    const summary = weekMap.get(weekKey)!;
    summary.note_count++;
    
    // Update latest date if this note is newer
    if (row.created_at > (summary.latest_note_date || '')) {
      summary.latest_note_date = row.created_at;
    }
  });
  
  // Convert to array and sort by week number
  return Array.from(weekMap.values()).sort((a, b) => {
    return (a.week_number || 0) - (b.week_number || 0);
  });
}

/**
 * Get chapters for a specific course (legacy - for backward compatibility)
 */
export async function getChaptersByCourse(course: string): Promise<ChapterSummary[]> {
  const { data, error } = await supabase
    .from('ai_notes')
    .select('lecture, chapter_title, created_at')
    .eq('course', course);
    
  if (error) {
    console.error('Error fetching chapters:', error);
    throw new Error(`Failed to fetch chapters: ${error.message}`);
  }
  
  // Group by lecture (chapter)
  const chapterMap = new Map<string, ChapterSummary>();
  
  data.forEach(row => {
    const lecture = row.lecture;
    const chapterTitle = row.chapter_title || lecture;
    
    if (!chapterMap.has(lecture)) {
      chapterMap.set(lecture, {
        course,
        lecture,
        chapter_title: chapterTitle,
        note_count: 0,
        latest_note_date: row.created_at
      });
    }
    
    const summary = chapterMap.get(lecture)!;
    summary.note_count++;
    
    // Update latest date if this note is newer
    if (row.created_at > (summary.latest_note_date || '')) {
      summary.latest_note_date = row.created_at;
    }
  });
  
  return Array.from(chapterMap.values());
}

/**
 * Get notes for a specific course and chapter
 */
export async function getNotesByCourseAndChapter(course: string, lecture: string): Promise<NoteSummary[]> {
  // Try to extract week number from lecture parameter (e.g., "Week 3" -> 3)
  let weekNumber: number | undefined;
  const weekMatch = lecture.match(/Week\s*(\d+)/i);
  if (weekMatch) {
    weekNumber = parseInt(weekMatch[1], 10);
  } else if (/^\d+$/.test(lecture)) {
    weekNumber = parseInt(lecture, 10);
  }
  
  let query = supabase
    .from('ai_notes')
    .select('id, title, course, lecture, chapter_title, created_at, owner_id, week_number')
    .eq('course', course)
    .order('created_at', { ascending: false });
  
  // Try to match by week_number if available and lecture parameter looks like a week
  if (weekNumber !== undefined) {
    // First try exact lecture match
    const { data: exactData, error: exactError } = await query.eq('lecture', lecture);
    if (!exactError && exactData && exactData.length > 0) {
      // Found notes with exact lecture match
      return exactData.map(row => ({
        id: row.id,
        title: row.title,
        course: row.course,
        lecture: row.lecture,
        week: row.lecture,
        week_number: (row as any).week_number,
        chapter_title: row.chapter_title || lecture,
        created_at: row.created_at,
        owner_id: row.owner_id
      }));
    }
    
    // If no exact match, try week_number
    try {
      const { data: weekData, error: weekError } = await supabase
        .from('ai_notes')
        .select('id, title, course, lecture, chapter_title, created_at, owner_id, week_number')
        .eq('course', course)
        .eq('week_number', weekNumber)
        .order('created_at', { ascending: false });
        
      if (!weekError && weekData) {
        return weekData.map(row => ({
          id: row.id,
          title: row.title,
          course: row.course,
          lecture: row.lecture,
          week: row.lecture,
          week_number: (row as any).week_number,
          chapter_title: row.chapter_title || lecture,
          created_at: row.created_at,
          owner_id: row.owner_id
        }));
      }
    } catch (err) {
      // week_number column might not exist, fall through
      console.log('week_number query failed, falling back to lecture match:', err);
    }
  }
  
  // Fallback: exact lecture match or empty result
  const { data, error } = await query.eq('lecture', lecture);
    
  if (error) {
    console.error('Error fetching notes:', error);
    throw new Error(`Failed to fetch notes: ${error.message}`);
  }
  
  return data.map(row => ({
    id: row.id,
    title: row.title,
    course: row.course,
    lecture: row.lecture,
    week: row.lecture,
    week_number: (row as any).week_number,
    chapter_title: row.chapter_title || lecture,
    created_at: row.created_at,
    owner_id: row.owner_id
  }));
}

/**
 * Search AI notes by keyword
 */
export async function searchAiNotes(query: string, limit = 20): Promise<NoteSummary[]> {
  // Try to select week_number, but fall back to basic columns if it doesn't exist
  const { data, error } = await supabase
    .from('ai_notes')
    .select('id, title, course, lecture, chapter_title, created_at')
    .or(`title.ilike.%${query}%,course.ilike.%${query}%,lecture.ilike.%${query}%`)
    .limit(limit);
    
  if (error) {
    console.error('Error searching AI notes:', error);
    throw new Error(`Failed to search AI notes: ${error.message}`);
  }
  
  return data.map(row => ({
    id: row.id,
    title: row.title,
    course: row.course,
    lecture: row.lecture,
    week: row.lecture, // Fallback to lecture as week
    week_number: undefined, // Will be populated after migration
    chapter_title: row.chapter_title || row.lecture,
    created_at: row.created_at
  }));
}

/**
 * Validate AI note content structure
 */
export function validateAiNoteContent(content: any): ValidationResult {
  const errors: string[] = [];
  
  if (!content) {
    errors.push('Content is required');
    return { isValid: false, errors };
  }
  
  if (typeof content !== 'object') {
    errors.push('Content must be an object');
    return { isValid: false, errors };
  }
  
  if (!content.title || typeof content.title !== 'string') {
    errors.push('Content must have a title string');
  }
  
  if (!Array.isArray(content.sections)) {
    errors.push('Content must have a sections array');
  } else {
    content.sections.forEach((section: any, sectionIndex: number) => {
      // Generate an ID if not present
      if (!section.id || typeof section.id !== 'string') {
        // Auto-generate an ID based on index
        section.id = `section-${sectionIndex}`;
      }
      if (!section.title || typeof section.title !== 'string') {
        errors.push(`Section ${sectionIndex} must have a title string`);
      }
      if (!Array.isArray(section.blocks)) {
        errors.push(`Section ${sectionIndex} must have a blocks array`);
      } else {
        section.blocks.forEach((block: any, blockIndex: number) => {
          if (!block || typeof block !== 'object') {
            errors.push(`Section ${sectionIndex}, Block ${blockIndex}: Block must be an object`);
            return;
          }
          
          if (!block.type || typeof block.type !== 'string') {
            errors.push(`Section ${sectionIndex}, Block ${blockIndex}: Block must have a type string`);
            return;
          }
          
          // Validate based on block type
          switch (block.type) {
            case 'text':
              if (!block.content || typeof block.content !== 'string') {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (text): Must have content string`);
              }
              break;
              
            case 'definition':
              if (!block.term || typeof block.term !== 'string') {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (definition): Must have term string`);
              }
              if (!block.definition || typeof block.definition !== 'string') {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (definition): Must have definition string`);
              }
              break;
              
            case 'examTip':
              // Accept both 'content' and 'tip' fields
              const examTipContent = block.content || block.tip;
              if (!examTipContent || typeof examTipContent !== 'string') {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (examTip): Must have content or tip string`);
              }
              break;
              
            case 'callout':
              if (!block.variant || typeof block.variant !== 'string') {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (callout): Must have variant string`);
              } else if (!['info', 'warn', 'success', 'danger'].includes(block.variant)) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (callout): Variant must be one of: info, warn, success, danger`);
              }
              if (!block.content || typeof block.content !== 'string') {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (callout): Must have content string`);
              }
              break;
              
            case 'compare':
              // Accept both 'items' array format and 'left'/'right' object format
              if (Array.isArray(block.items)) {
                // Validate items array format (like in example JSON)
                if (block.items.length === 0) {
                  errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Items array cannot be empty`);
                } else {
                  block.items.forEach((item: any, itemIndex: number) => {
                    if (!item || typeof item !== 'object') {
                      errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare), Item ${itemIndex}: Must be an object`);
                    } else {
                      if (!item.title || typeof item.title !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare), Item ${itemIndex}: Must have title string`);
                      }
                      if (!item.description || typeof item.description !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare), Item ${itemIndex}: Must have description string`);
                      }
                    }
                  });
                }
              } else if (block.left && block.right) {
                // Validate left/right object format
                if (!block.left || typeof block.left !== 'object') {
                  errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Must have left object`);
                } else {
                  if (!block.left.title || typeof block.left.title !== 'string') {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Left must have title string`);
                  }
                  // Accept content as either string or array of strings
                  if (!block.left.content) {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Left must have content`);
                  } else if (typeof block.left.content !== 'string' && !Array.isArray(block.left.content)) {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Left content must be string or array of strings`);
                  } else if (Array.isArray(block.left.content)) {
                    // Validate each item in the array is a string
                    block.left.content.forEach((item: any, itemIndex: number) => {
                      if (typeof item !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare), Left content item ${itemIndex}: Must be string`);
                      }
                    });
                  }
                }
                if (!block.right || typeof block.right !== 'object') {
                  errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Must have right object`);
                } else {
                  if (!block.right.title || typeof block.right.title !== 'string') {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Right must have title string`);
                  }
                  // Accept content as either string or array of strings
                  if (!block.right.content) {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Right must have content`);
                  } else if (typeof block.right.content !== 'string' && !Array.isArray(block.right.content)) {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Right content must be string or array of strings`);
                  } else if (Array.isArray(block.right.content)) {
                    // Validate each item in the array is a string
                    block.right.content.forEach((item: any, itemIndex: number) => {
                      if (typeof item !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare), Right content item ${itemIndex}: Must be string`);
                      }
                    });
                  }
                }
              } else {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (compare): Must have either 'items' array or 'left' and 'right' objects`);
              }
              break;
              
            case 'list':
              if (!Array.isArray(block.items)) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (list): Must have items array`);
              } else if (block.items.length === 0) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (list): Items array cannot be empty`);
              } else {
                block.items.forEach((item: any, itemIndex: number) => {
                  if (typeof item !== 'string') {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (list), Item ${itemIndex}: Must be a string`);
                  }
                });
              }
              break;
              
            case 'table':
              if (!Array.isArray(block.headers)) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table): Must have headers array`);
              } else if (block.headers.length === 0) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table): Headers array cannot be empty`);
              } else {
                block.headers.forEach((header: any, headerIndex: number) => {
                  if (typeof header !== 'string') {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table), Header ${headerIndex}: Must be a string`);
                  }
                });
              }
              
              if (!Array.isArray(block.rows)) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table): Must have rows array`);
              } else {
                block.rows.forEach((row: any, rowIndex: number) => {
                  if (!Array.isArray(row)) {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table), Row ${rowIndex}: Must be an array`);
                  } else if (block.headers && row.length !== block.headers.length) {
                    errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table), Row ${rowIndex}: Must have ${block.headers.length} columns (matching headers)`);
                  } else {
                    row.forEach((cell: any, cellIndex: number) => {
                      if (typeof cell !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (table), Row ${rowIndex}, Cell ${cellIndex}: Must be a string`);
                      }
                    });
                  }
                });
              }
              break;
              
            case 'steps':
              // Accept either 'steps' array of objects or 'items' array of strings
              let stepsArray: any[] | null = null;
              let isItemsArray = false;
              
              if (Array.isArray(block.steps)) {
                stepsArray = block.steps;
                isItemsArray = false;
              } else if (Array.isArray(block.items)) {
                stepsArray = block.items;
                isItemsArray = true;
              }
              
              if (!stepsArray) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (steps): Must have either 'steps' array of objects or 'items' array of strings`);
              } else if (stepsArray.length === 0) {
                errors.push(`Section ${sectionIndex}, Block ${blockIndex} (steps): Array cannot be empty`);
              } else {
                if (isItemsArray) {
                  // Validate each item in the array is a string
                  stepsArray.forEach((item: any, itemIndex: number) => {
                    if (typeof item !== 'string') {
                      errors.push(`Section ${sectionIndex}, Block ${blockIndex} (steps), Item ${itemIndex}: Must be string`);
                    }
                  });
                } else {
                  // Validate each step is an object with title and content
                  stepsArray.forEach((step: any, stepIndex: number) => {
                    if (!step || typeof step !== 'object') {
                      errors.push(`Section ${sectionIndex}, Block ${blockIndex} (steps), Step ${stepIndex}: Must be an object`);
                    } else {
                      if (!step.title || typeof step.title !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (steps), Step ${stepIndex}: Must have title string`);
                      }
                      if (!step.content || typeof step.content !== 'string') {
                        errors.push(`Section ${sectionIndex}, Block ${blockIndex} (steps), Step ${stepIndex}: Must have content string`);
                      }
                    }
                  });
                }
              }
              break;
              
            default:
              errors.push(`Section ${sectionIndex}, Block ${blockIndex}: Unknown block type "${block.type}". Valid types: text, definition, examTip, callout, compare, list, table, steps`);
          }
        });
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get notes by owner (for owner dashboard)
 */
export async function getNotesByOwner(ownerId: string): Promise<AiNoteRecord[]> {
  const { data, error } = await supabase
    .from('ai_notes')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching owner notes:', error);
    throw new Error(`Failed to fetch owner notes: ${error.message}`);
  }
  
  return data.map(rowToAiNoteRecord);
}

/**
 * Get recent notes (for dashboard)
 */
export async function getRecentNotes(limit = 10): Promise<NoteSummary[]> {
  const { data, error } = await supabase
    .from('ai_notes')
    .select('id, title, course, lecture, chapter_title, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Error fetching recent notes:', error);
    throw new Error(`Failed to fetch recent notes: ${error.message}`);
  }
  
  return data.map(row => ({
    id: row.id,
    title: row.title,
    course: row.course,
    lecture: row.lecture,
    week: row.lecture, // Fallback to lecture as week
    week_number: undefined, // Will be populated after migration
    chapter_title: row.chapter_title || row.lecture,
    created_at: row.created_at
  }));
}