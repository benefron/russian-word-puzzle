import React from 'react';
import { PlacedWord } from '@/lib/generator';

interface WordSearchPreviewProps {
  grid: string[][];
  placedWords: PlacedWord[];
  showSolution: boolean;
  wordFontSizePx: number;
  definitionFontSizePx: number;
}

export const WordSearchPreview: React.FC<WordSearchPreviewProps> = ({
  grid,
  placedWords,
  showSolution,
  wordFontSizePx,
  definitionFontSizePx,
}) => {
  if (!grid || grid.length === 0) return <div className="text-gray-500">No puzzle generated yet.</div>;

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
  const definitionFontSizeUi = Math.max(10, Math.round(definitionFontSizePx * uiScale));

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
                className={`border border-gray-300 flex items-center justify-center font-bold ${isSolutionCell ? 'bg-yellow-200' : 'bg-white'}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  fontSize: `${letterFontSize}px`,
                }}
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
              <span className="font-bold" style={{ fontSize: `${letterFontSize}px` }}>{w.word}</span>
              <span className="text-gray-600" style={{ fontSize: `${definitionFontSizeUi}px` }}>{w.definition}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
