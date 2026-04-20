import React, { useEffect, useState } from 'react';
import { AiNoteContent } from '@/types/ai-notes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface AiNotesSidebarProps {
  content: AiNoteContent;
  className?: string;
}

export default function AiNotesSidebar({ content, className = '' }: AiNotesSidebarProps) {
  const [activeSection, setActiveSection] = useState<string>('');

  // Generate section IDs (matching the IDs used in AiNoteRenderer)
  const sections = content.sections.map((section, index) => ({
    id: `section-${index}`,
    title: section.title,
    index,
  }));

  // Scroll spy to detect active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for header
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section) {
          const sectionTop = section.offsetTop;
          if (scrollPosition >= sectionTop) {
            setActiveSection(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth',
      });
      setActiveSection(sectionId);
    }
  };

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={`ai-notes-sidebar ${className}`}>
      <div className="sticky top-24">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-2">
            Contents
          </h3>
          <p className="text-muted-foreground text-xs">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <nav className="space-y-1 pr-4">
            {sections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                className={`w-full justify-start text-left font-normal h-auto py-2 px-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => scrollToSection(section.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs font-medium text-muted-foreground min-w-[20px]">
                    {section.index + 1}
                  </span>
                  <span className="flex-1 text-sm truncate">{section.title}</span>
                  <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-50" />
                </div>
              </Button>
            ))}
          </nav>
        </ScrollArea>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Click any section to jump directly to it.
          </p>
        </div>
      </div>
    </div>
  );
}