import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TopNav from '@/components/TopNav';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [approvedNotes, setApprovedNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(p);

      if (p && (p.is_profile_public || isOwnProfile)) {
        const { data: notes } = await supabase
          .from('notes')
          .select('id, title, upload_date, course_id, courses(code, name), category')
          .eq('uploaded_by', userId)
          .eq('status', 'approved')
          .order('upload_date', { ascending: false });
        setApprovedNotes(notes || []);
      }
      setLoading(false);
    };
    load();
  }, [userId, isOwnProfile]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">User not found</div>;

  const initials = (profile.full_name || profile.username || '?')[0].toUpperCase();
  const isPublic = profile.is_profile_public || isOwnProfile;

  const categoryLabel = (cat: string) => {
    if (cat === 'student_notes') return '✍️ Student Notes';
    if (cat === 'other_resources') return '📎 Resource';
    return '📑 Lecture';
  };

  return (
    <div className="min-h-screen bg-background relative z-[1]">
      <TopNav backTo="/leaderboard" />
      <div className="max-w-[700px] mx-auto pt-24 px-4 sm:px-8 pb-12">
        <div className="bg-surface border border-border rounded-xl p-8 text-center mb-8">
          <Avatar className="h-24 w-24 mx-auto mb-4">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.username} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <h1 className="font-display text-2xl font-bold">{isPublic ? profile.full_name : profile.username}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {isPublic && profile.bio && <p className="text-muted-foreground mt-3 max-w-md mx-auto">{profile.bio}</p>}

          {!isPublic && !isOwnProfile && (
            <p className="text-muted-foreground/50 mt-4 text-sm italic">This profile is private</p>
          )}

          {isPublic && (
            <div className="flex justify-center gap-8 mt-6 text-sm">
              <div>
                <div className="font-display text-xl font-bold">{approvedNotes.length}</div>
                <div className="text-muted-foreground">Approved Notes</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold">{profile.semester || '—'}</div>
                <div className="text-muted-foreground">Semester</div>
              </div>
              <div>
                <div className="font-display text-xl font-bold">{profile.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '—'}</div>
                <div className="text-muted-foreground">Joined</div>
              </div>
            </div>
          )}

          {isPublic && profile.last_login && (
            <p className="text-xs text-muted-foreground/50 mt-4">Last active: {format(new Date(profile.last_login), 'dd MMM yyyy, HH:mm')}</p>
          )}

          {isOwnProfile && (
            <Link to="/profile" className="inline-block mt-4 px-5 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">Edit Profile</Link>
          )}
        </div>

        {isPublic && approvedNotes.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">Uploaded Notes</h2>
            <div className="space-y-3">
              {approvedNotes.map(n => (
                <div key={n.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{(n.courses as any)?.code} • {categoryLabel(n.category)} • {n.upload_date ? format(new Date(n.upload_date), 'dd MMM yyyy') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
