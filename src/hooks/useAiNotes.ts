// AI Notes Hook
// Provides React hooks for fetching and managing AI notes data

import { useState, useEffect, useCallback } from 'react';
import {
  createAiNote,
  getAiNoteById,
  updateAiNote,
  deleteAiNote,
  getCourses,
  getChaptersByCourse,
  getWeeksByCourse,
  getNotesByCourseAndChapter,
  searchAiNotes,
  validateAiNoteContent,
  getNotesByOwner,
  getRecentNotes
} from '../services/aiNotesService';
import { 
  AiNoteRecord, 
  InsertAiNote, 
  UpdateAiNote, 
  CourseSummary, 
  ChapterSummary, 
  NoteSummary,
  ValidationResult 
} from '../types/ai-notes';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for fetching all courses (for landing page)
 */
export function useCourses() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

/**
 * Hook for fetching chapters for a specific course
 */
export function useChapters(course: string) {
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    if (!course) {
      setChapters([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getChaptersByCourse(course);
      setChapters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chapters');
      console.error('Error fetching chapters:', err);
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { chapters, loading, error, refetch: fetchChapters };
}

/**
 * Hook for fetching weeks for a specific course (week-based organization)
 */
export function useWeeks(course: string) {
  const [weeks, setWeeks] = useState<ChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeks = useCallback(async () => {
    if (!course) {
      setWeeks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getWeeksByCourse(course);
      setWeeks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weeks');
      console.error('Error fetching weeks:', err);
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    fetchWeeks();
  }, [fetchWeeks]);

  return { weeks, loading, error, refetch: fetchWeeks };
}

/**
 * Hook for fetching notes for a specific course and chapter
 */
export function useNotes(course: string, lecture: string) {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!course || !lecture) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getNotesByCourseAndChapter(course, lecture);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [course, lecture]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}

/**
 * Hook for fetching a single AI note by ID
 */
export function useAiNote(id: string | null) {
  const [note, setNote] = useState<AiNoteRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNote = useCallback(async () => {
    if (!id) {
      setNote(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAiNoteById(id);
      setNote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch note');
      console.error('Error fetching note:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  return { note, loading, error, refetch: fetchNote };
}

/**
 * Hook for searching AI notes
 */
export function useAiNotesSearch(query: string, limit = 20) {
  const [results, setResults] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await searchAiNotes(query, limit);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search notes');
      console.error('Error searching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [query, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      search();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [search]);

  return { results, loading, error, search };
}

/**
 * Hook for managing AI note creation, updates, and deletion
 */
export function useAiNoteManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNote = useCallback(async (noteData: InsertAiNote) => {
    if (!user) {
      throw new Error('User must be authenticated to create notes');
    }

    try {
      setLoading(true);
      setError(null);
      const result = await createAiNote(noteData, user.id);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create note';
      setError(message);
      console.error('Error creating note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateNote = useCallback(async (id: string, updates: UpdateAiNote) => {
    try {
      setLoading(true);
      setError(null);
      const result = await updateAiNote(id, updates);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update note';
      setError(message);
      console.error('Error updating note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteAiNote(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note';
      setError(message);
      console.error('Error deleting note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateContent = useCallback((content: any): ValidationResult => {
    return validateAiNoteContent(content);
  }, []);

  return {
    createNote,
    updateNote,
    deleteNote,
    validateContent,
    loading,
    error,
    clearError: () => setError(null)
  };
}

/**
 * Hook for fetching notes owned by the current user (for owner dashboard)
 */
export function useOwnerNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AiNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOwnerNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getNotesByOwner(user.id);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch owner notes');
      console.error('Error fetching owner notes:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOwnerNotes();
  }, [fetchOwnerNotes]);

  return { notes, loading, error, refetch: fetchOwnerNotes };
}

/**
 * Hook for fetching recent notes (for dashboard display)
 */
export function useRecentNotes(limit = 10) {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentNotes(limit);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recent notes');
      console.error('Error fetching recent notes:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentNotes();
  }, [fetchRecentNotes]);

  return { notes, loading, error, refetch: fetchRecentNotes };
}

/**
 * Hook for managing AI note upload/import (for owner panel)
 */
export function useAiNoteUpload() {
  const { createNote, validateContent, loading, error } = useAiNoteManagement();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const uploadNote = useCallback(async (noteData: InsertAiNote) => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(0);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const result = await createNote(noteData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      // Reset after 2 seconds
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);
      
      return result;
    } catch (err) {
      setUploadStatus('error');
      throw err;
    }
  }, [createNote]);

  const uploadMultipleNotes = useCallback(async (notesData: InsertAiNote[]) => {
    const results: AiNoteRecord[] = [];
    const errors: Array<{ index: number; error: string }> = [];
    
    setUploadStatus('uploading');
    setUploadProgress(0);
    
    for (let i = 0; i < notesData.length; i++) {
      try {
        const result = await createNote(notesData[i]);
        results.push(result);
      } catch (err) {
        errors.push({
          index: i,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
      
      // Update progress
      setUploadProgress(Math.round((i + 1) / notesData.length * 100));
    }
    
    setUploadStatus(errors.length > 0 ? 'error' : 'success');
    
    return { results, errors };
  }, [createNote]);

  const resetUpload = useCallback(() => {
    setUploadStatus('idle');
    setUploadProgress(0);
  }, []);

  return {
    uploadNote,
    uploadMultipleNotes,
    validateContent,
    uploadProgress,
    uploadStatus,
    loading,
    error,
    resetUpload
  };
}