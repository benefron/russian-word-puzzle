import React from 'react';
import { PlacedWord } from '@/lib/generator';

interface CrosswordPreviewProps {
  grid: string[][];
  placedWords: PlacedWord[];
  showSolution: boolean;
  wordFontSizePx: number;
  definitionFontSizePx: number;
}

export const CrosswordPreview: React.FC<CrosswordPreviewProps> = ({
  grid,
  placedWords,
  showSolution,
  wordFontSizePx,
  definitionFontSizePx,
}) => {
  if (!grid || grid.length === 0) return <div className="text-gray-500">No crossword generated yet.</div>;

  // Keep cells comfortably larger than letters; make changes visible across the slider.
  const cellSize = Math.max(24, Math.round(wordFontSizePx * 2));
  const numberFontSize = Math.max(12, Math.round(wordFontSizePx * 0.75));

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
                className={`relative flex items-center justify-center font-bold ${isLetter ? 'bg-white' : 'bg-black'}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  ...(isLetter ? { fontSize: `${wordFontSizePx}px` } : undefined),
                }}
              >
                {isLetter && (
                  <>
                    {wordStart && (
                      <span
                        className="absolute top-0 left-0 leading-none"
                        style={{
                          fontSize: `${numberFontSize}px`,
                          padding: '2px',
                        }}
                      >
                        {wordStart.number}
                      </span>
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
                    <li key={w.number} style={{ fontSize: `${definitionFontSizePx}px` }}>
                            <span className="font-bold">{w.number}.</span> {w.definition}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="font-bold border-b mb-2">Vertical</h4>
                <ul className="list-none space-y-2">
                    {placedWords.filter(w => w.direction === 'vertical').sort((a,b) => a.number - b.number).map(w => (
                    <li key={w.number} style={{ fontSize: `${definitionFontSizePx}px` }}>
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
