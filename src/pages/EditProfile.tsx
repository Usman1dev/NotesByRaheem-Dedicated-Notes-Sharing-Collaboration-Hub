import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { href: '/contact', icon: '✉️', label: 'Contact Owner' },
];

export default function EditProfile() {
  const { profile, user } = useAuth();
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const extraItems = profile?.role === 'admin' || profile?.role === 'owner'
    ? [{ href: '/admin', icon: '⚙', label: 'Admin Panel' }]
    : undefined;

  useEffect(() => {
    if (profile) {
      setBio((profile as any).bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setIsProfilePublic((profile as any).is_profile_public !== false);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const url = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(url);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bio } as any)
      .eq('id', user.id);
    setSavingBio(false);
    if (error) {
      toast.error('Failed to save bio');
    } else {
      toast.success('Bio updated!');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      // Verify current password by re-signing in
      const email = `${profile?.username}@notesbyraheem.xyz`;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        toast.error('Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = (profile?.full_name || profile?.username || '?')[0].toUpperCase();

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <h1 className="font-display text-3xl font-bold mb-8 mt-2 lg:mt-0">Edit Profile</h1>

        <div className="grid gap-8 max-w-2xl">
          {/* Avatar */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Profile Picture</h2>
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
                  {uploading ? 'Uploading…' : 'Upload Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-muted-foreground mt-2">Max 2MB • JPG, PNG, WebP</p>
              </div>
            </div>
          </section>

          {/* Bio */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Bio</h2>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Tell us about yourself…"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">{bio.length}/300</span>
              <button
                onClick={handleSaveBio}
                disabled={savingBio}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingBio ? 'Saving…' : 'Save Bio'}
              </button>
            </div>
          </section>

          {/* Privacy */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Profile Privacy</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Public Profile</p>
                <p className="text-xs text-muted-foreground">When off, only your username, photo and bio are visible to others</p>
              </div>
              <button
                onClick={async () => {
                  const newVal = !isProfilePublic;
                  setIsProfilePublic(newVal);
                  const { error } = await supabase.from('profiles').update({ is_profile_public: newVal } as any).eq('id', user!.id);
                  if (error) toast.error('Failed to update privacy');
                  else toast.success(newVal ? 'Profile is now public' : 'Profile is now private');
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${isProfilePublic ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`block w-5 h-5 rounded-full bg-white absolute top-1 transition-transform ${isProfilePublic ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          {/* Change Password */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {changingPassword ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
