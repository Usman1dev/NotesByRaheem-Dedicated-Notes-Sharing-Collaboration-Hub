import React from 'react';
import { AiNoteContent, Block } from '@/types/ai-notes';
import DefinitionBox from './DefinitionBox';
import ExamTip from './ExamTip';
import Callout from './Callout';
import Compare from './Compare';
import TableBlock from './TableBlock';
import Steps from './Steps';

interface AiNoteRendererProps {
  content: AiNoteContent;
  className?: string;
}

const AiNoteRenderer: React.FC<AiNoteRendererProps> = ({ content, className = '' }) => {
  const renderBlock = (block: Block, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={index} className="mb-4">
            <p className="text-foreground leading-relaxed">{block.content}</p>
          </div>
        );
      
      case 'definition':
        return <DefinitionBox key={index} term={block.term} definition={block.definition} />;
      
      case 'examTip':
        return <ExamTip key={index} content={block.content} />;
      
      case 'callout':
        return <Callout key={index} content={block.content} variant={block.variant} />;
      
      case 'compare':
        return <Compare key={index} block={block} />;
      
      case 'list':
        return (
          <div key={index} className="mb-4">
            {block.ordered ? (
              <ol className="list-decimal pl-5 space-y-1">
                {block.items.map((item, i) => (
                  <li key={i} className="text-foreground">{item}</li>
                ))}
              </ol>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {block.items.map((item, i) => (
                  <li key={i} className="text-foreground">{item}</li>
                ))}
              </ul>
            )}
          </div>
        );
      
      case 'table':
        return <TableBlock key={index} headers={block.headers} rows={block.rows} />;
      
      case 'steps':
        // Handle both steps array of objects and items array of strings
        const stepsData = block.steps || block.items;
        return <Steps key={index} steps={stepsData} />;
      
      default:
        return (
          <div key={index} className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-muted-foreground">Unsupported block type: {(block as any).type}</p>
          </div>
        );
    }
  };

  return (
    <div className={`ai-note-renderer ${className}`}>
      {content.description && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-foreground/80 italic">{content.description}</p>
        </div>
      )}
      
      {content.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} id={`section-${sectionIndex}`} className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.blocks.map((block, blockIndex) => renderBlock(block, blockIndex))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default AiNoteRenderer;