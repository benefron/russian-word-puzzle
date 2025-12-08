import React from 'react';
import { PlacedWord } from '@/lib/generator';

interface WordSearchPreviewProps {
  grid: string[][];
  placedWords: PlacedWord[];
  showSolution: boolean;
}

export const WordSearchPreview: React.FC<WordSearchPreviewProps> = ({ grid, placedWords, showSolution }) => {
  if (!grid || grid.length === 0) return <div className="text-gray-500">No puzzle generated yet.</div>;

  const cellSize = 30;

  return (
    <div className="flex flex-col items-center">
      <div 
        className="border border-black bg-white inline-block"
        style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
            gap: '0px'
        }}
      >
        {grid.map((row, r) => (
          row.map((cell, c) => {
            // Check if this cell is part of a placed word for highlighting in solution
            let isSolutionCell = false;
            if (showSolution) {
                for (const w of placedWords) {
                    let wr = w.row;
                    let wc = w.col;
                    for (let i = 0; i < w.word.length; i++) {
                        if (wr === r && wc === c) {
                            isSolutionCell = true;
                            break;
                        }
                        if (w.direction === 'horizontal') wc++;
                        else if (w.direction === 'vertical') wr++;
                        else if (w.direction === 'diagonal-down') { wr++; wc++; }
                        else if (w.direction === 'diagonal-up') { wr--; wc++; }
                    }
                    if (isSolutionCell) break;
                }
            }

            return (
              <div 
                key={`${r}-${c}`} 
                className={`w-[30px] h-[30px] border border-gray-300 flex items-center justify-center text-sm font-bold ${isSolutionCell ? 'bg-yellow-200' : 'bg-white'}`}
              >
                {cell}
              </div>
            );
          })
        ))}
      </div>

      <div className="mt-8 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">Words to Find</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {placedWords.map((w) => (
                <div key={w.number} className="flex flex-col">
                    <span className="font-bold">{w.word}</span>
                    <span className="text-xs text-gray-600">{w.definition}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
