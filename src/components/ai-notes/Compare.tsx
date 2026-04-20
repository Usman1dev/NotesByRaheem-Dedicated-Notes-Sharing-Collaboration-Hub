import { Card, CardContent } from "@/components/ui/card";
import { CompareBlock } from "@/types/ai-notes";

interface CompareProps {
  block: CompareBlock;
}

export default function Compare({ block }: CompareProps) {
  const renderContent = (content: string | string[]) => {
    if (Array.isArray(content)) {
      return (
        <ul className="space-y-1.5">
          {content.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              <span className="text-muted-foreground text-sm">{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-muted-foreground text-sm">{content}</p>;
  };

  // Handle both formats: items array or left/right objects
  const renderItemsArray = () => {
    if (!Array.isArray(block.items)) return null;
    
    return (
      <Card className="border-border bg-surface overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x-0 md:divide-x divide-border">
            {block.items.map((item: any, index: number) => (
              <div key={index} className="p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-secondary'}`} />
                  <h3 className="font-semibold text-foreground">{item.title || `Item ${index + 1}`}</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${index === 0 ? 'bg-primary/60' : 'bg-secondary/60'} flex-shrink-0`} />
                      <div className="flex-1">
                        <p className="text-muted-foreground text-sm">{item.description || item.content || ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLeftRightFormat = () => {
    if (!block.left || !block.right) return null;
    
    return (
      <Card className="border-border bg-surface overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-x-0 md:divide-x divide-border">
            {/* Left Column */}
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="font-semibold text-foreground">Left</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm mb-1">{block.left.title}</h4>
                      {renderContent(block.left.content)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <h3 className="font-semibold text-foreground">Right</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary/60 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm mb-1">{block.right.title}</h4>
                      {renderContent(block.right.content)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Determine which format to render
  if (Array.isArray(block.items)) {
    return renderItemsArray();
  } else if (block.left && block.right) {
    return renderLeftRightFormat();
  }

  // Fallback for invalid data
  return (
    <Card className="border-border bg-surface overflow-hidden">
      <CardContent className="p-4">
        <p className="text-muted-foreground">Invalid compare block format</p>
      </CardContent>
    </Card>
  );
}