import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationBell from '@/components/NotificationBell';
import { toast } from 'sonner';
import { format } from 'date-fns';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/admin', icon: '⚙', label: 'Admin Panel' },
  { href: '/admin/pending', icon: '⏳', label: 'Pending Notes' },
  { href: '/admin/courses', icon: '🎓', label: 'Manage Courses' },
  { href: '/owner', icon: '👑', label: 'Owner Panel' },
  { href: '/owner/users', icon: '👥', label: 'Manage Users' },
  { href: '/owner/notes', icon: '📄', label: 'All Notes' },
];

export default function OwnerUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'student', semester: 4, roll_number: '' });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const createUser = async () => {
    if (!form.username.trim() || !form.full_name.trim() || !form.password) {
      toast.error('Username, full name, and password are required');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            username: form.username.trim(),
            full_name: form.full_name.trim(),
            password: form.password,
            role: form.role,
            semester: form.semester,
            roll_number: form.roll_number || null,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to create user');
        return;
      }
      toast.success('User created successfully!');
      setShowModal(false);
      setForm({ username: '', full_name: '', password: '', role: 'student', semester: 4, roll_number: '' });
      loadUsers();
    } catch (err: any) {
      toast.error('Failed to create user: ' + err.message);
    }
  };

  const deleteUser = async (userId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to delete "${fullName}"? This action cannot be undone.`)) return;
    setDeleting(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to delete user');
        return;
      }
      toast.success('User deleted successfully');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      toast.error('Failed to delete user: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditRole = async () => {
    if (!editingUser || !editRole) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: editRole } as any)
      .eq('id', editingUser.id);
    if (error) {
      toast.error('Failed to update role: ' + error.message);
      return;
    }
    toast.success(`Role updated to ${editRole}`);
    setEditingUser(null);
    loadUsers();
  };

  const toggleBan = async (userId: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentlyBanned } as any)
      .eq('id', userId);

    if (error) {
      toast.error(`Failed to ${action} user: ` + error.message);
      return;
    }
    toast.success(`User ${currentlyBanned ? 'unbanned' : 'banned'} successfully`);
    loadUsers();
  };

  const filtered = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4 mt-2 lg:mt-0">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Manage Users</h1>
            <p className="text-muted-foreground">Create, edit, ban, or delete user accounts.</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 py-3 px-6 rounded-[10px] bg-primary text-primary-foreground font-medium text-sm">+ Create User</button>
          </div>
        </div>

        <div className="flex gap-4 mb-8 flex-wrap items-end">
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Role:</label>
            <select className="p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Search:</label>
            <input className="p-2.5 bg-surface2 border border-border rounded-lg text-foreground text-sm" placeholder="Name or username..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr>
                {['User', 'Role', 'Roll Number', 'Semester', 'Status', 'Notes', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left p-4 bg-background border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground/50">No users found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-background">
                  <td className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">{u.full_name[0]}</div>
                      <div>
                        <div className="font-semibold">{u.full_name}</div>
                        <div className="text-sm text-muted-foreground">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 border-b border-border">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      u.role === 'owner' ? 'bg-warning/10 text-warning' :
                      u.role === 'admin' ? 'bg-success/10 text-success' :
                      'bg-primary/10 text-primary'
                    }`}>{u.role}</span>
                  </td>
                  <td className="p-4 border-b border-border text-sm">{u.roll_number || '-'}</td>
                  <td className="p-4 border-b border-border text-sm">{u.semester || '-'}</td>
                  <td className="p-4 border-b border-border">
                    {u.is_banned ? (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-destructive/10 text-destructive">Banned</span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${u.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="p-4 border-b border-border text-sm">{u.notes_uploaded || 0}</td>
                  <td className="p-4 border-b border-border text-sm text-muted-foreground">{u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}</td>
                  <td className="p-4 border-b border-border">
                    {u.role !== 'owner' && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { setEditingUser(u); setEditRole(u.role); }}
                          className="py-1.5 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => toggleBan(u.id, u.is_banned)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                            u.is_banned
                              ? 'bg-success/10 text-success hover:bg-success/20'
                              : 'bg-warning/10 text-warning hover:bg-warning/20'
                          }`}
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.full_name)}
                          disabled={deleting === u.id}
                          className="py-1.5 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                        >
                          {deleting === u.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">Create User</h3>
              <button onClick={() => setShowModal(false)} className="py-1.5 px-4 rounded-lg border border-border text-muted-foreground text-sm">Close</button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Username *</label>
                <input className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Full Name *</label>
                <input className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Password *</label>
                <input type="password" className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
                  <select className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Semester</label>
                  <select className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.semester} onChange={e => setForm({...form, semester: Number(e.target.value)})}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Roll Number (optional)</label>
                <input className="w-full p-3 bg-background border border-border rounded-lg text-foreground text-sm" value={form.roll_number} onChange={e => setForm({...form, roll_number: e.target.value})} />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="py-2.5 px-5 rounded-lg border border-border text-muted-foreground text-sm">Cancel</button>
              <button onClick={createUser} className="py-2.5 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-[400px] w-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Edit Role</h3>
              <button onClick={() => setEditingUser(null)} className="py-1.5 px-4 rounded-lg border border-border text-muted-foreground text-sm">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Change role for <strong className="text-foreground">{editingUser.full_name}</strong> (@{editingUser.username})
              </p>
              <select
                className="w-full p-2.5 bg-background border border-border rounded-lg text-sm"
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditingUser(null)} className="py-2.5 px-5 rounded-lg border border-border text-muted-foreground text-sm">Cancel</button>
                <button onClick={handleEditRole} className="py-2.5 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
