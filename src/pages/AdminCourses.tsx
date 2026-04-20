import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationBell from '@/components/NotificationBell';
import { toast } from 'sonner';

const COLORS = ['#6c63ff', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
const ICONS = ['📚', '💻', '🔬', '📐', '🎨', '📊', '🧮', '⚡', '🌐', '🔧'];

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/admin', icon: '⚙', label: 'Admin Panel' },
  { href: '/admin/pending', icon: '⏳', label: 'Pending Notes' },
  { href: '/admin/courses', icon: '🎓', label: 'Manage Courses' },
];

export default function AdminCourses() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', name: '', description: '', semester: 4, color_code: '#6c63ff', icon_symbol: '📚' });

  const extraItems = profile?.role === 'owner'
    ? [
        { href: '/owner', icon: '👑', label: 'Owner Panel' },
        { href: '/owner/users', icon: '👥', label: 'Manage Users' },
        { href: '/owner/notes', icon: '📄', label: 'All Notes' },
      ]
    : undefined;

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('semester').order('code');
    setCourses(data || []);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', description: '', semester: 4, color_code: '#6c63ff', icon_symbol: '📚' });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, description: c.description || '', semester: c.semester, color_code: c.color_code || '#6c63ff', icon_symbol: c.icon_symbol || '📚' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    if (editing) {
      await supabase.from('courses').update({ code: form.code, name: form.name, description: form.description, semester: form.semester, color_code: form.color_code, icon_symbol: form.icon_symbol }).eq('id', editing.id);
      toast.success('Course updated');
    } else {
      await supabase.from('courses').insert({ ...form, created_by: user!.id });
      toast.success('Course created');
    }
    setShowModal(false);
    loadCourses();
  };

  const toggleActive = async (c: any) => {
    await supabase.from('courses').update({ is_active: !c.is_active }).eq('id', c.id);
    loadCourses();
  };

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4 mt-2 lg:mt-0">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Manage Courses</h1>
            <p className="text-muted-foreground">Add, edit, or deactivate courses in the system.</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={openCreate} className="inline-flex items-center gap-2 py-3 px-6 rounded-[10px] bg-primary text-primary-foreground font-medium text-sm">+ Add Course</button>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr>
                {['Course Code', 'Course Name', 'Semester', 'Notes', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground/50">No courses</td></tr>
              ) : courses.map(c => (
                <tr key={c.id} className="hover:bg-background">
                  <td className="p-4 border-b border-border font-mono font-semibold text-primary">{c.code}</td>
                  <td className="p-4 border-b border-border">
                    <div className="font-semibold">{c.name}</div>
                    {c.description && <div className="text-sm text-muted-foreground line-clamp-1">{c.description}</div>}
                  </td>
                  <td className="p-4 border-b border-border"><span className="px-3 py-1 bg-background border border-border rounded-full text-sm">Sem {c.semester}</span></td>
                  <td className="p-4 border-b border-border font-semibold text-primary">{c.notes_count || 0}</td>
                  <td className="p-4 border-b border-border">
                    <button onClick={() => toggleActive(c)} className={`relative inline-block w-11 h-6 rounded-full transition-colors ${c.is_active ? 'bg-success' : 'bg-border'}`}>
                      <span className={`absolute w-[18px] h-[18px] bg-foreground rounded-full top-[3px] transition-transform ${c.is_active ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </td>
                  <td className="p-4 border-b border-border">
                    <button onClick={() => openEdit(c)} className="py-1.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">{editing ? 'Edit Course' : 'Add New Course'}</h3>
              <button onClick={() => setShowModal(false)} className="py-1.5 px-4 rounded-lg border border-border-hover text-muted-foreground text-sm">Close</button>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Course Code *</label>
                  <input className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CS101" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Semester *</label>
                  <select className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Course Name *</label>
                <input className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Data Structures" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color_code: c })} className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${form.color_code === c ? 'border-foreground shadow-lg' : 'border-transparent'}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setForm({ ...form, icon_symbol: ic })} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${form.icon_symbol === ic ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:bg-primary hover:text-primary-foreground'}`}>{ic}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="py-2.5 px-5 rounded-lg border border-border-hover text-muted-foreground text-sm">Cancel</button>
              <button onClick={handleSave} className="py-2.5 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">{editing ? 'Save Changes' : 'Create Course'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
