import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardUrl } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ notes: 0, courses: 0, users: 0 });
  const [coursesBySemester, setCoursesBySemester] = useState<Record<number, any[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [notesRes, coursesRes, usersRes] = await Promise.all([
      supabase.from('notes').select('id').eq('status', 'approved'),
      supabase.from('courses').select('*').eq('is_active', true).order('semester').order('code'),
      supabase.from('profiles').select('id'),
    ]);
    setStats({
      notes: notesRes.data?.length || 0,
      courses: coursesRes.data?.length || 0,
      users: usersRes.data?.length || 0,
    });
    const grouped: Record<number, any[]> = {};
    (coursesRes.data || []).forEach(c => {
      if (!grouped[c.semester]) grouped[c.semester] = [];
      grouped[c.semester].push(c);
    });
    setCoursesBySemester(grouped);
  };

  return (
    <div className="relative z-[1]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-8 h-16 flex items-center justify-between bg-background/80 backdrop-blur-2xl border-b border-border">
        <Link to="/" className="font-display font-extrabold text-foreground text-lg tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot inline-block" />
          NotesByRaheem <span className="text-sm text-primary font-normal">- Dedicated to Taimoor Gillani</span>
        </Link>
        <div className="flex items-center gap-3">
          <a href="#semesters" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">Semesters</a>
          <a href="#about" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
          <ThemeToggle />
          <span>
            {user && profile ? (
              <Link to={getDashboardUrl(profile.role)} className="text-sm font-medium px-5 py-2 rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="text-sm font-medium px-5 py-2 rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5">
                Login →
              </Link>
            )}
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-8 pt-32 pb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border-hover bg-surface text-sm text-muted-foreground mb-8 animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
          Open for Semester 4
        </div>

        <h1 className="font-display font-extrabold text-[clamp(2.8rem,7vw,5.5rem)] leading-[1.05] tracking-[-0.04em] mb-6 animate-fade-up-delay-1">
          CS Notes,{' '}
          <span className="bg-gradient-to-r from-[#a78bfa] via-primary to-[#818cf8] bg-clip-text text-transparent">
            Every Semester
          </span>
        </h1>

        <p className="text-[clamp(1rem,2vw,1.2rem)] text-muted-foreground max-w-[520px] font-light leading-relaxed mb-10 animate-fade-up-delay-2">
          Access curated CS notes organized by semester and course. Upload, share, and collaborate with fellow Air University students.
        </p>

        <div className="flex gap-3 items-center flex-wrap justify-center animate-fade-up-delay-3">
          {user ? (
            <Link to={getDashboardUrl(profile?.role || 'student')} className="inline-flex items-center gap-2 py-3.5 px-7 rounded-[10px] bg-primary text-primary-foreground font-medium text-[0.95rem] hover:opacity-90 hover:-translate-y-0.5 transition-all">
              Go to Dashboard →
            </Link>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 py-3.5 px-7 rounded-[10px] bg-primary text-primary-foreground font-medium text-[0.95rem] hover:opacity-90 hover:-translate-y-0.5 transition-all">
              Login to Access →
            </Link>
          )}
          <a href="#semesters" className="inline-flex items-center gap-2 py-3.5 px-6 rounded-[10px] border border-border-hover bg-transparent text-muted-foreground hover:border-primary hover:text-foreground hover:bg-primary/10 transition-all">
            Browse Courses ↓
          </a>
        </div>
      </section>

      {/* Stats */}
      <div className="relative flex justify-center mb-24 animate-fade-up-delay-4">
        <div className="flex max-w-[700px] w-[90%] border border-border rounded-xl bg-surface overflow-hidden">
          {[
            { value: stats.notes + '+', label: 'Notes' },
            { value: stats.courses, label: 'Courses' },
            { value: stats.users, label: 'Students' },
          ].map((s, i) => (
            <div key={i} className="flex-1 py-6 px-4 text-center border-r border-border last:border-r-0">
              <div className="font-display text-3xl font-bold tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground/50 uppercase tracking-widest mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Semesters */}
      <section id="semesters" className="relative max-w-[1100px] mx-auto px-4 sm:px-8 pb-24">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary mb-3">Course Library</div>
        <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold tracking-tight mb-3 leading-tight">
          Browse by Semester
        </h2>
        <p className="text-muted-foreground font-light max-w-[480px] leading-relaxed mb-12">
          Find the notes you need, organized by semester and course.
        </p>

        {Object.entries(coursesBySemester).map(([sem, courses]) => (
          <div key={sem} className="bg-surface border border-border rounded-xl p-8 mb-6 hover:border-border-hover transition-colors">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-xs font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary/80 uppercase tracking-wider">Sem {sem}</span>
                <span className="font-display text-lg font-semibold">Semester {sem}</span>
              </div>
              <span className="text-sm text-muted-foreground/50">{courses.length} courses</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {courses.map(c => (
                <Link
                  key={c.id}
                  to={user ? `/courses?id=${c.id}` : '/login'}
                  className="bg-surface2 border border-border rounded-lg p-5 hover:border-border-hover hover:-translate-y-0.5 transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.color_code || 'hsl(var(--primary))' }} />
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{c.icon_symbol || '📚'}</span>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.code}</span>
                  </div>
                  <h3 className="font-display font-semibold text-sm">{c.name}</h3>
                  <p className="text-xs text-muted-foreground/50 mt-1">{c.notes_count || 0} notes</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* About / Footer */}
      <section id="about" className="relative border-t border-border py-16 px-8">
        <div className="max-w-[1100px] mx-auto text-center">
          <p className="text-muted-foreground text-sm">
            Built for CS students at Air University. NotesByRaheem &copy; {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </div>
  );
}
