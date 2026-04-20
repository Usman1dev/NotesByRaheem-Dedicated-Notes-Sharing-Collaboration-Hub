import React from 'react';

interface DefinitionBoxProps {
  term: string;
  definition: string;
}

const DefinitionBox: React.FC<DefinitionBoxProps> = ({ term, definition }) => {
  return (
    <div className="mb-4 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold">D</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">Definition: {term}</h3>
          <p className="text-foreground/80">{definition}</p>
        </div>
      </div>
    </div>
  );
};

export default DefinitionBox;