import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { toast } from 'sonner';
import { format } from 'date-fns';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/contact', icon: '✉️', label: 'Contact Owner' },
];

export default function ContactOwner() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extraItems = profile?.role === 'admin' || profile?.role === 'owner'
    ? [{ href: '/admin', icon: '⚙', label: 'Admin Panel' }]
    : undefined;

  useEffect(() => {
    if (!user) return;
    loadOwnerAndMessages();
  }, [user]);

  const loadOwnerAndMessages = async () => {
    // Find owner
    const { data: ownerData } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .limit(1)
      .single();

    if (ownerData) {
      setOwnerId(ownerData.id);
      await loadMessages(ownerData.id);
    }
    setLoading(false);
  };

  const loadMessages = async (owId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${owId}),and(sender_id.eq.${owId},receiver_id.eq.${user!.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    // Mark received messages as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('receiver_id', user!.id)
      .eq('sender_id', owId)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !ownerId) return;
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user!.id,
      receiver_id: ownerId,
      content: newMsg.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNewMsg('');
    loadMessages(ownerId);
  };

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} extraItems={extraItems} />
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="mb-8 mt-2 lg:mt-0">
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Contact Owner</h1>
          <p className="text-muted-foreground">Send a direct message to the platform owner.</p>
        </div>

        <div className="bg-surface border border-border rounded-xl flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-12">Loading...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">No messages yet. Send your first message!</div>
            ) : (
              messages.map((m) => {
                const isMine = m.sender_id === user!.id;
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-3 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-surface2 border border-border text-foreground'}`}>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      <div className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {m.created_at ? format(new Date(m.created_at), 'MMM d, h:mm a') : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4 flex gap-3">
            <input
              className="flex-1 p-3 bg-background border border-border rounded-lg text-foreground text-sm"
              placeholder="Type your message..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="py-2.5 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
