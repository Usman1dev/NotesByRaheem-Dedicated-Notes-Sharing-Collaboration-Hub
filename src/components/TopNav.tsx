import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from './NotificationBell';

interface TopNavProps {
  backTo?: string;
  rightContent?: React.ReactNode;
}

export default function TopNav({ backTo, rightContent }: TopNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-8 h-16 flex items-center justify-between bg-background/80 backdrop-blur-2xl border-b border-border">
      <div className="flex items-center gap-4">
        {backTo && (
          <Link to={backTo} className="text-muted-foreground hover:text-foreground text-xl">←</Link>
        )}
        <Link to="/" className="font-display font-extrabold text-foreground text-lg tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot inline-block" />
          NotesByRaheem
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {rightContent}
        <NotificationBell />
        <ThemeToggle />
      </div>
    </nav>
  );
}
