import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import UserProfileCard from '@/components/UserProfileCard';

export default function ChatroomPage() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get('room');
  const [rooms, setRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = profile?.role === 'owner';

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (activeRoomId) {
      loadMessages();
      const channel = supabase
        .channel(`room-${activeRoomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoomId}` }, (payload) => {
          loadMessageById(payload.new.id);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${activeRoomId}` }, () => {
          loadMessages();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('chat_rooms')
      .select('id, name, type, course_id, semester')
      .order('type')
      .order('name');
    const r = (data || []).map(room => ({
      id: room.id,
      name: room.type === 'global' ? 'Global Chat' : room.name,
      desc: room.type === 'global' ? 'Discuss anything' : 'Course chat',
      icon: room.type === 'global' ? '🌐' : '📚',
    }));
    setRooms(r);
    if (roomIdParam) {
      setActiveRoomId(roomIdParam);
    } else if (r.length > 0) {
      const globalRoom = (data || []).find(rm => rm.type === 'global');
      setActiveRoomId(globalRoom?.id || r[0].id);
    }
  };

  const loadMessages = async () => {
    if (!activeRoomId) return;
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username, avatar_url, role)')
      .eq('room_id', activeRoomId)
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages(data || []);
  };

  const loadMessageById = async (id: string) => {
    const { data } = await supabase.from('messages').select('*, profiles(username, avatar_url, role)').eq('id', id).single();
    if (data) setMessages(prev => {
      if (prev.some(m => m.id === data.id)) return prev;
      return [...prev, data];
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || sending || !activeRoomId) return;
    const content = input.trim();
    setSending(true);
    const { error } = await supabase.from('messages').insert({ content, room_id: activeRoomId, user_id: user.id });
    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }
    await loadMessages();
    setInput('');
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) {
      toast.error(error.message);
    } else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success('Message deleted');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <div className="min-h-screen bg-background flex">
      <button
        onClick={() => {
          const el = document.getElementById('chat-sidebar');
          if (el) el.classList.toggle('-translate-x-full');
        }}
        className="fixed top-4 left-4 z-20 lg:hidden w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground"
        aria-label="Toggle rooms"
      >
        ☰
      </button>

      <div id="chat-sidebar" className="w-72 bg-surface border-r border-border flex flex-col fixed top-0 bottom-0 left-0 z-10 transition-transform -translate-x-full lg:translate-x-0">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold mb-1">Chat Rooms</h2>
            <p className="text-muted-foreground text-sm">Discuss with fellow students</p>
          </div>
          <button
            onClick={() => document.getElementById('chat-sidebar')?.classList.add('-translate-x-full')}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {rooms.map(r => (
            <Link
              key={r.id}
              to={`/chatroom?room=${r.id}`}
              onClick={() => setActiveRoomId(r.id)}
              onClickCapture={() => document.getElementById('chat-sidebar')?.classList.add('-translate-x-full')}
              className={`flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
                r.id === activeRoomId ? 'bg-primary/10 border-l-[3px] border-primary' : 'hover:bg-background'
              }`}
            >
              <span className="text-xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground truncate">{r.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 lg:ml-72 flex flex-col h-screen">
        <div className="p-4 pl-16 lg:pl-4 bg-surface border-b border-border flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">{currentRoom?.name || 'Chat'}</h1>
            <p className="text-muted-foreground text-sm">{currentRoom?.desc}</p>
          </div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 py-2 px-5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-sm">Back to Dashboard</Link>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground/50">No messages yet. Start the conversation!</div>
          ) : (
            messages.map(msg => {
              const isOwn = msg.user_id === user?.id;
              const msgProfile = msg.profiles as any;
              const canDelete = isOwn || isOwner;
              return (
                <div key={msg.id} className={`max-w-[70%] flex flex-col group ${isOwn ? 'self-end' : 'self-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-7 w-7 cursor-pointer" onClick={() => !isOwn && setSelectedUserId(msg.user_id)}>
                      {msgProfile?.avatar_url ? (
                        <AvatarImage src={msgProfile.avatar_url} alt={msgProfile.username} />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {(msgProfile?.username || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => !isOwn && setSelectedUserId(msg.user_id)}>{msgProfile?.username}</span>
                    {msgProfile?.role !== 'student' && (
                      <span className="text-[0.7rem] px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground font-semibold">{msgProfile?.role}</span>
                    )}
                    <span className="text-xs text-muted-foreground/50 ml-auto">
                      {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-destructive hover:text-destructive/80 transition-opacity ml-1"
                        title="Delete message"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <div className={`px-4 py-3 rounded-xl leading-relaxed break-words ${
                    isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-surface2 text-foreground rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-border bg-surface flex gap-4">
          <textarea
            className="flex-1 p-3 bg-background border border-border rounded-lg text-foreground text-sm resize-none min-h-[44px] max-h-[120px] focus:outline-none focus:border-primary"
            placeholder="Type your message here..."
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="px-6 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {selectedUserId && <UserProfileCard userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}
