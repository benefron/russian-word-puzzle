import React from 'react';
import { PlacedWord } from '@/lib/generator';

interface CrosswordPreviewProps {
  grid: string[][];
  placedWords: PlacedWord[];
  showSolution: boolean;
}

export const CrosswordPreview: React.FC<CrosswordPreviewProps> = ({ grid, placedWords, showSolution }) => {
  if (!grid || grid.length === 0) return <div className="text-gray-500">No crossword generated yet.</div>;

  const cellSize = 30;

  return (
    <div className="flex flex-col items-center">
      <div 
        className="border border-black bg-black inline-block"
        style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
            gap: '1px'
        }}
      >
        {grid.map((row, r) => (
          row.map((cell, c) => {
            const isLetter = cell !== '';
            // Find if this cell is the start of any word
            const wordStart = placedWords.find(w => w.row === r && w.col === c);

            return (
              <div 
                key={`${r}-${c}`} 
                className={`w-[30px] h-[30px] relative flex items-center justify-center text-sm font-bold ${isLetter ? 'bg-white' : 'bg-black'}`}
              >
                {isLetter && (
                  <>
                    {wordStart && (
                      <span className="absolute top-0 left-0 text-[8px] leading-none p-[1px]">{wordStart.number}</span>
                    )}
                    {showSolution ? cell : ''}
                  </>
                )}
              </div>
            );
          })
        ))}
      </div>

      <div className="mt-8 w-full max-w-2xl">
        <h3 className="text-xl font-bold mb-4">Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h4 className="font-bold border-b mb-2">Horizontal</h4>
                <ul className="list-none space-y-2">
                    {placedWords.filter(w => w.direction === 'horizontal').sort((a,b) => a.number - b.number).map(w => (
                        <li key={w.number} className="text-sm">
                            <span className="font-bold">{w.number}.</span> {w.definition}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="font-bold border-b mb-2">Vertical</h4>
                <ul className="list-none space-y-2">
                    {placedWords.filter(w => w.direction === 'vertical').sort((a,b) => a.number - b.number).map(w => (
                        <li key={w.number} className="text-sm">
                            <span className="font-bold">{w.number}.</span> {w.definition}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};
