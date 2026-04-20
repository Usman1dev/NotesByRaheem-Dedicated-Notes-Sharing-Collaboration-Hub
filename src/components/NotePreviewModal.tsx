import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotePreviewModalProps {
  note: any;
  onClose: () => void;
  onApprove?: (noteId: string) => void;
  onReject?: (noteId: string) => void;
  onDelete?: (noteId: string) => void;
  showActions?: boolean;
}

export default function NotePreviewModal({ note, onClose, onApprove, onReject, onDelete, showActions }: NotePreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (note.file_path && !note.content) {
      loadFileUrl();
    } else {
      setLoading(false);
    }
  }, [note]);

  const loadFileUrl = async () => {
    const { data } = await supabase.storage.from('notes-files').createSignedUrl(note.file_path, 300);
    if (data?.signedUrl) setFileUrl(data.signedUrl);
    setLoading(false);
  };

  const isImage = ['PNG', 'JPG', 'JPEG'].includes((note.file_type || '').toUpperCase());
  const isPdf = (note.file_type || '').toUpperCase() === 'PDF';
  const isPptx = ['PPTX', 'PPT'].includes((note.file_type || '').toUpperCase());
  const isDocx = ['DOCX', 'DOC'].includes((note.file_type || '').toUpperCase());
  const isText = note.content;

  const getOfficeViewerUrl = (url: string) => {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  };

  const formatContent = (text: string) => {
    return text
      .split('\n')
      .map(line => {
        if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold mt-4 mb-2 text-foreground">${line.slice(4)}</h3>`;
        if (line.startsWith('## ')) return `<h2 class="text-xl font-bold mt-5 mb-2 text-foreground">${line.slice(3)}</h2>`;
        if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold mt-6 mb-3 text-foreground">${line.slice(2)}</h1>`;
        if (line.startsWith('- ') || line.startsWith('* ')) return `<li class="ml-4 list-disc text-foreground/90">${line.slice(2)}</li>`;
        if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-primary pl-4 my-2 text-muted-foreground italic">${line.slice(2)}</blockquote>`;
        if (line.match(/^\d+\. /)) return `<li class="ml-4 list-decimal text-foreground/90">${line.replace(/^\d+\. /, '')}</li>`;
        if (line.trim() === '') return '<br/>';
        let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return `<p class="text-foreground/90 leading-relaxed">${processed}</p>`;
      })
      .join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl max-w-[900px] w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-display text-xl font-bold">{note.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {note.content ? 'TEXT' : note.file_type}
              </span>
              {(note.profiles as any)?.username && <span>by {(note.profiles as any)?.username}</span>}
              {(note.courses as any)?.code && <span>• {(note.courses as any)?.code}</span>}
            </div>
            {note.description && <p className="text-muted-foreground text-sm mt-2">{note.description}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-all text-lg">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">Loading preview...</div>
          ) : isText ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: formatContent(note.content) }}
            />
          ) : isPdf && fileUrl ? (
            <iframe src={fileUrl} className="w-full h-[65vh] rounded-lg border border-border" />
          ) : (isPptx || isDocx) && fileUrl ? (
            <iframe src={getOfficeViewerUrl(fileUrl)} className="w-full h-[65vh] rounded-lg border border-border" />
          ) : isImage && fileUrl ? (
            <div className="flex items-center justify-center">
              <img src={fileUrl} alt={note.title} className="max-w-full max-h-[65vh] rounded-lg" />
            </div>
          ) : fileUrl ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-primary text-primary-foreground font-medium text-sm">
                Download to View
              </a>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">No content available</div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-3 p-6 border-t border-border justify-end">
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noreferrer" className="py-2.5 px-5 rounded-lg border border-border-hover text-muted-foreground hover:text-foreground text-sm">
                Download
              </a>
            )}
            {(isPptx || isDocx) && fileUrl && (
              <a href={getOfficeViewerUrl(fileUrl)} target="_blank" rel="noreferrer" className="py-2.5 px-5 rounded-lg border border-border-hover text-muted-foreground hover:text-foreground text-sm">
                Open in Office Viewer
              </a>
            )}
            {onDelete && (
              <button onClick={() => onDelete(note.id)} className="py-2.5 px-5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
                Delete
              </button>
            )}
            {onReject && note.status === 'pending' && (
              <button onClick={() => onReject(note.id)} className="py-2.5 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium">
                Reject
              </button>
            )}
            {onApprove && note.status === 'pending' && (
              <button onClick={() => onApprove(note.id)} className="py-2.5 px-5 rounded-lg bg-success text-success-foreground text-sm font-medium">
                Approve
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
