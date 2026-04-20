import { Card, CardContent } from "@/components/ui/card";
import { StepsBlock } from "@/types/ai-notes";

interface StepsProps {
  steps: StepsBlock['steps'] | string[];
}

export default function Steps({ steps }: StepsProps) {
  // Check if steps is an array of strings (items) or objects (steps)
  const isItemsArray = steps.length > 0 && typeof steps[0] === 'string';
  
  return (
    <Card className="border-border bg-surface overflow-hidden">
      <CardContent className="p-0">
        <div className="space-y-4 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h3 className="font-semibold text-foreground">Steps</h3>
          </div>
          
          <div className="space-y-6">
            {isItemsArray ? (
              // Render string items
              (steps as string[]).map((item, index) => (
                <div key={index} className="flex gap-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <span className="font-semibold text-primary text-sm">{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 space-y-2">
                    <p className="text-muted-foreground text-sm leading-relaxed">{item}</p>
                  </div>
                </div>
              ))
            ) : (
              // Render step objects with title and content
              (steps as StepsBlock['steps']).map((step, index) => (
                <div key={index} className="flex gap-4">
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <span className="font-semibold text-primary text-sm">{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-foreground text-base">{step.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}