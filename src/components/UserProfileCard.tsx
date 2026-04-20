import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserProfileCardProps {
  userId: string;
  onClose: () => void;
}

export default function UserProfileCard({ userId, onClose }: UserProfileCardProps) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    };
    load();
  }, [userId]);

  if (!profile) return null;

  const initials = (profile.full_name || profile.username || '?')[0].toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 w-[320px] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center mb-4">
          <Avatar className="h-16 w-16 mb-3">
            {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt={profile.username} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <h3 className="font-display font-semibold text-lg">{profile.full_name}</h3>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{profile.bio}</p>}
        </div>
        <Link
          to={`/user/${userId}`}
          className="block w-full text-center py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          onClick={onClose}
        >
          View Profile
        </Link>
      </div>
    </div>
  );
}
