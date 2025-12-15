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

  // UI preview policy:
  // - Keep the grid size consistent (no scrolling)
  // - Scale fonts in the UI only (smaller than the PDF), to give the user the feel
  const maxPreviewW = 720;
  const maxPreviewH = 520;
  const cols = grid[0]?.length ?? 1;
  const rows = grid.length;
  const cellSize = Math.max(18, Math.floor(Math.min(maxPreviewW / cols, maxPreviewH / rows)));

  const uiScale = 0.55;
  const letterFontSize = Math.max(10, Math.min(Math.round(wordFontSizePx * uiScale), Math.floor(cellSize * 0.7)));
  const numberFontSize = Math.max(9, Math.min(16, Math.round(letterFontSize * 0.65)));
  const clueFontSize = Math.max(10, Math.round(definitionFontSizePx * uiScale));

  return (
    <div className="flex flex-col items-center">
      <div className="border border-black bg-black inline-block"
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
                  ...(isLetter ? { fontSize: `${letterFontSize}px` } : undefined),
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
                  <li key={`h-${w.number}-${w.word}`} style={{ fontSize: `${clueFontSize}px` }}>
                            <span className="font-bold">{w.number}.</span> {w.definition}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="font-bold border-b mb-2">Vertical</h4>
                <ul className="list-none space-y-2">
                    {placedWords.filter(w => w.direction === 'vertical').sort((a,b) => a.number - b.number).map(w => (
                  <li key={`v-${w.number}-${w.word}`} style={{ fontSize: `${clueFontSize}px` }}>
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
