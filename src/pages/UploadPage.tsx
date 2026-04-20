import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TopNav from '@/components/TopNav';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { autoFormatText } from '@/lib/autoFormat';

type UploadMode = 'file' | 'text';
type NoteCategory = 'lecture_slides' | 'student_notes' | 'other_resources';

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCourse = searchParams.get('course');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState(preselectedCourse || '');
  const [courses, setCourses] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<UploadMode>('file');
  const [textContent, setTextContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('lecture_slides');

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    const { data } = await supabase.from('courses').select('id, code, name, semester').order('semester').order('code');
    setCourses(data || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
      setFile(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
      setFile(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !user) { toast.error('Please fill in all required fields'); return; }
    if (mode === 'file' && !file) { toast.error('Please select a file to upload'); return; }
    if (mode === 'text' && !textContent.trim()) { toast.error('Please enter your notes content'); return; }

    setUploading(true);
    setProgress(20);

    if (mode === 'text') {
      // Text note - auto-format and save content directly
      const formattedContent = autoFormatText(textContent);
      setProgress(60);

      const { error } = await supabase.from('notes').insert({
        title: title.trim(),
        description: description.trim() || null,
        course_id: courseId,
        file_name: title.trim() + '.txt',
        file_path: '',
        file_size: new Blob([formattedContent]).size,
        file_type: 'TEXT',
        uploaded_by: user.id,
        status: 'pending',
        content: formattedContent,
        category,
      });

      if (error) { toast.error('Failed to save note: ' + error.message); setUploading(false); return; }
    } else {
      // File upload
      const ext = file!.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      setProgress(40);

      const { error: uploadError } = await supabase.storage.from('notes-files').upload(filePath, file!);
      if (uploadError) { toast.error('Upload failed: ' + uploadError.message); setUploading(false); return; }

      setProgress(70);
      const { error: insertError } = await supabase.from('notes').insert({
        title: title.trim(),
        description: description.trim() || null,
        course_id: courseId,
        file_name: file!.name,
        file_path: filePath,
        file_size: file!.size,
        file_type: ext?.toUpperCase() || 'FILE',
        uploaded_by: user.id,
        status: 'pending',
        category,
      });

      if (insertError) { toast.error('Failed to save note: ' + insertError.message); setUploading(false); return; }
    }

    setProgress(100);
    toast.success('Note submitted for review!');
    setTimeout(() => navigate('/dashboard'), 1000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background relative z-[1]">
      <TopNav backTo="/dashboard" rightContent={
        <Link to="/dashboard" className="inline-flex items-center gap-2 py-2 px-5 rounded-lg border border-border-hover text-muted-foreground hover:text-foreground text-sm">Dashboard</Link>
      } />

      <div className="max-w-[800px] mx-auto pt-24 px-4 sm:px-8 pb-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Upload a Note</h1>
          <p className="text-muted-foreground">Share your study materials with fellow CS students at Air University.</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5">Note Title</label>
              <input type="text" className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary" placeholder="e.g., Data Structures Midterm Notes" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary min-h-[80px] resize-y" placeholder="Briefly describe what this note covers..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5">Course</label>
              <select className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                <option value="">Select a course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name} (Sem {c.semester})</option>)}
              </select>
            </div>

            {/* Note Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Note Category</label>
              <div className="flex gap-3 flex-wrap">
                {([
                  { value: 'lecture_slides', label: '📑 Lecture Slides/Notes', desc: 'Teacher-provided materials' },
                  { value: 'student_notes', label: '✍️ Student Notes', desc: 'Your own handwritten/typed notes' },
                  { value: 'other_resources', label: '📎 Other Resources', desc: 'Quiz solutions, exam papers, links' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`flex-1 min-w-[140px] py-3 px-3 rounded-lg text-sm font-medium border transition-all text-left ${category === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    <div>{opt.label}</div>
                    <div className={`text-xs mt-0.5 ${category === opt.value ? 'text-primary-foreground/70' : 'text-muted-foreground/50'}`}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Mode Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Upload Type</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setMode('file')} className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all ${mode === 'file' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
                  📄 File Upload
                </button>
                <button type="button" onClick={() => setMode('text')} className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-all ${mode === 'text' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
                  ✍️ Text Notes
                </button>
              </div>
            </div>

            {mode === 'file' ? (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1.5">File Upload</label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center bg-background hover:border-primary hover:bg-surface cursor-pointer transition-all"
                  onClick={() => document.getElementById('fileInput')?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="text-4xl mb-4 text-primary">📄</div>
                  <p className="text-muted-foreground mb-2">
                    <strong className="text-foreground">Drag & drop your file here</strong><br />or click to browse
                  </p>
                  <p className="text-muted-foreground text-sm">Accepted: PDF, DOCX, PPTX, TXT, PNG, JPG • Max: 10MB</p>
                  <input type="file" id="fileInput" className="hidden" accept=".pdf,.docx,.pptx,.txt,.png,.jpg" onChange={handleFileChange} />
                </div>
                {file && (
                  <div className="mt-4 p-4 bg-background rounded-lg border border-border">
                    <div className="font-semibold">{file.name}</div>
                    <div className="text-muted-foreground text-sm">{formatSize(file.size)}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1.5">Notes Content</label>
                <p className="text-muted-foreground text-xs mb-2">
                  You can use markdown formatting: # Heading, ## Subheading, **bold**, *italic*, - list items. Plain text will be auto-formatted.
                </p>
                <textarea
                  className="w-full p-4 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary min-h-[300px] resize-y font-mono leading-relaxed"
                  placeholder={"Week 1: Introduction to Software Engineering\n\nSoftware engineering is the systematic approach to...\n\nKey Topics:\n- Requirements gathering\n- System design\n- Implementation & testing"}
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1">{textContent.length} characters</div>
              </div>
            )}

            {uploading && (
              <div className="mb-6">
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-sm text-muted-foreground text-center">Uploading...</p>
              </div>
            )}

            <div className="flex gap-4 flex-wrap">
              <button type="submit" disabled={uploading} className="flex-1 min-w-[150px] py-3.5 rounded-[10px] bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">Submit for Review</button>
              <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 min-w-[100px] py-3.5 rounded-[10px] border border-border-hover text-muted-foreground hover:text-foreground text-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
