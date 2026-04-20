import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface DashboardSidebarProps {
  items: NavItem[];
  extraItems?: NavItem[];
}

export default function DashboardSidebar({ items, extraItems }: DashboardSidebarProps) {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const initials = (profile?.full_name || profile?.username || '?')[0].toUpperCase();

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-[60] lg:hidden w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground"
        aria-label="Toggle menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-[55] lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`w-60 bg-surface border-r border-border p-6 flex flex-col fixed h-screen overflow-y-auto z-[58] transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Link to="/" className="font-display font-extrabold text-foreground text-lg tracking-tight flex items-center gap-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot inline-block" />
          NotesByRaheem
        </Link>

        {/* Profile section */}
        <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 mb-6 px-2 rounded-lg hover:bg-surface2 py-2 transition-colors">
          <Avatar className="h-9 w-9">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{profile?.full_name || profile?.username}</div>
            <div className="text-xs text-muted-foreground capitalize">{profile?.role}</div>
          </div>
        </Link>

        <ul className="flex flex-col gap-2 flex-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  location.pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-surface2 hover:text-foreground'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
          {extraItems?.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  location.pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-surface2 hover:text-foreground'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 mt-4">
          <ThemeToggle />
        </div>

        <button
          onClick={signOut}
          className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm text-muted-foreground bg-surface2 border border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all"
        >
          ↩ Logout
        </button>
      </aside>
    </>
  );
}
