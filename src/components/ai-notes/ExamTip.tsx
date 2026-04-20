import React from 'react';

interface ExamTipProps {
  content: string;
}

const ExamTip: React.FC<ExamTipProps> = ({ content }) => {
  return (
    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-lg">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <span className="text-amber-700 dark:text-amber-400 font-bold">!</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Exam Tip</h3>
          <p className="text-amber-700 dark:text-amber-400/90">{content}</p>
        </div>
      </div>
    </div>
  );
};

export default ExamTip;