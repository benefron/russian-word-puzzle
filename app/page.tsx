'use client';

import React, { useMemo, useState } from 'react';
import { CrosswordGenerator, WordSearchGenerator, PlacedWord, WordItem } from '@/lib/generator';
import { exportCrosswordPDF, exportWordSearchPDF } from '@/lib/exporter';
import { CrosswordPreview } from '@/components/CrosswordPreview';
import { WordSearchPreview } from '@/components/WordSearchPreview';

const FONT_PRESETS = [16, 24, 36, 40, 60] as const;
type FontPreset = (typeof FONT_PRESETS)[number];

function clampInt(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, Math.trunc(value)));
}

function recommendedCrosswordCount(width: number, height: number) {
    // Heuristic: crossword fill tends to be sparse; this gives a reasonable default.
    // 15x15 -> ~13 words, 20x20 -> ~22 words.
    const area = width * height;
    return clampInt(area / 18, 5, 40);
}

function recommendedSquareGridForCount(count: number) {
    // Inverse heuristic: pick a roughly square grid that can hold the desired word count.
    const targetArea = count * 18;
    const size = Math.sqrt(targetArea);
    const clamped = clampInt(size, 5, 30);
    return { width: clamped, height: clamped };
}

function pxToPt(px: number) {
    return px * 0.75;
}

function ptToMm(pt: number) {
    return pt * 0.3527777778;
}

function computeA4PdfLimits(
    mode: 'crossword' | 'wordsearch',
    wordFontSizePx: number,
    clueFontSizePx: number,
) {
    // A4 portrait in mm
    const pageW = 210;
    const pageH = 297;
    const margin = 10;
    const topY = 18;
    const gap = 6;

    // New PDF layout: grid spans full width at top; list(s) are underneath.
    const gridW = pageW - margin * 2;

    if (mode === 'wordsearch') {
        // Reserve minimum space for the words list.
        const minListH = 45;
        const maxGridH = pageH - topY - margin - gap - minListH;
        const requiredCellMm = ptToMm(pxToPt(wordFontSizePx)) * 1.15;
        const maxGrid = clampInt(
            Math.floor(Math.min(gridW / requiredCellMm, maxGridH / requiredCellMm)),
            5,
            30
        );

        const gridH = maxGrid * requiredCellMm;
        const listH = Math.max(10, pageH - topY - gridH - gap - margin);

        // Words list under grid (up to 3 columns).
        const listFontPt = pxToPt(wordFontSizePx) * 0.85;
        const lineH = ptToMm(listFontPt) * 1.25;
        const rowsPerCol = Math.max(1, Math.floor(listH / lineH));
        const cols = 3;
        const maxWords = clampInt(rowsPerCol * cols, 5, 60);
        return { maxGrid, maxWords };
    }

    // crossword
    const minCluesH = 90;
    const maxGridH = pageH - topY - margin - gap - minCluesH;
    const requiredCellMm = ptToMm(pxToPt(wordFontSizePx)) * 1.1;
    const maxGrid = clampInt(
        Math.floor(Math.min(gridW / requiredCellMm, maxGridH / requiredCellMm)),
        5,
        30
    );

    const gridH = maxGrid * requiredCellMm;
    const cluesH = Math.max(10, pageH - topY - gridH - gap - margin);

    // Clues under grid: two columns (Horizontal/Vertical).
    const clueFontPt = pxToPt(clueFontSizePx);
    const clueLineH = ptToMm(clueFontPt) * 1.25;
    const clueRowsPerCol = Math.max(1, Math.floor(cluesH / clueLineH));
    const clueCols = 2;
    const maxWords = clampInt(clueRowsPerCol * clueCols, 5, 60);
    return { maxGrid, maxWords };
}

export default function Home() {
  const [mode, setMode] = useState<'crossword' | 'wordsearch'>('crossword');
  const [difficulty, setDifficulty] = useState<number>(1);
  const [count, setCount] = useState(10);
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(15);
    const [fontPreset, setFontPreset] = useState<FontPreset>(24);
    const [wordFontSize, setWordFontSize] = useState<number>(24);
    const [definitionFontSize, setDefinitionFontSize] = useState<number>(14);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready');

  const [puzzleData, setPuzzleData] = useState<{ grid: string[][], placedWords: PlacedWord[] } | null>(null);

    const crosswordAutoCount = useMemo(() => {
        return mode === 'crossword' ? recommendedCrosswordCount(width, height) : null;
    }, [mode, width, height]);

    const pdfLimits = useMemo(() => {
        return computeA4PdfLimits(mode, wordFontSize, definitionFontSize);
    }, [mode, wordFontSize, definitionFontSize]);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus('Fetching words...');
    setPuzzleData(null);

    try {
      let words: WordItem[] = [];

      const res = await fetch(`/api/words?count=${count}&difficulty=${difficulty}`);
      if (!res.ok) throw new Error('Failed to fetch words');
      words = await res.json();

      if (words.length === 0) {
        setStatus('No words found.');
        setLoading(false);
        return;
      }

      setStatus('Generating puzzle...');
      
      if (mode === 'crossword') {
        const generator = new CrosswordGenerator(width, height);
        const result = generator.generate(words);
        setPuzzleData(result);
        if (result.placedWords.length === 0) {
            setStatus('Could not place any words. Try increasing grid size.');
        } else {
            setStatus(`Generated with ${result.placedWords.length} words.`);
        }
      } else {
        const generator = new WordSearchGenerator(width, height);
        const result = generator.generate(words);
        setPuzzleData(result);
        setStatus(`Generated with ${result.placedWords.length} words.`);
      }

    } catch (error) {
      console.error(error);
      setStatus('Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!puzzleData) return;
    
    if (mode === 'crossword') {
                await exportCrosswordPDF(puzzleData.grid, puzzleData.placedWords, {
                    wordFontSizePx: wordFontSize,
                    definitionFontSizePx: definitionFontSize,
                });
    } else {
                await exportWordSearchPDF(puzzleData.grid, puzzleData.placedWords, {
                    wordFontSizePx: wordFontSize,
                    definitionFontSizePx: definitionFontSize,
                });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white shadow-md p-6 flex flex-col gap-6 z-10">
        <h1 className="text-2xl font-bold text-blue-800">Russian Word Puzzle</h1>
        
        {/* Mode */}
        <div>
            <h2 className="font-bold mb-2">Mode</h2>
            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={mode === 'crossword'}
                                            onChange={() => {
                                                setMode('crossword');
                                                // Set sensible defaults for PDF fit
                                                const limits = computeA4PdfLimits('crossword', wordFontSize, definitionFontSize);
                                                setWidth(limits.maxGrid);
                                                setHeight(limits.maxGrid);
                                                setCount(limits.maxWords);
                                            }}
                                        />
                    Crossword
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={mode === 'wordsearch'}
                                            onChange={() => {
                                                setMode('wordsearch');
                                                const limits = computeA4PdfLimits('wordsearch', wordFontSize, definitionFontSize);
                                                setWidth(limits.maxGrid);
                                                setHeight(limits.maxGrid);
                                                setCount(limits.maxWords);
                                            }}
                                        />
                    Word Search
                </label>
            </div>
        </div>

        <hr />

        {/* Difficulty */}
        <div>
            <h2 className="font-bold mb-2">Difficulty Level: {difficulty}</h2>
            <input 
                type="range" 
                min="1" 
                max="5" 
                value={difficulty} 
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Easy (Common)</span>
                <span>Hard (Random)</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
                Level 1: 100% Common Words<br/>
                Level 3: 50% Common / 50% Random<br/>
                Level 5: 100% Random Complex Words
            </p>
        </div>

        <hr />

        {/* Settings */}
        <div className="space-y-4">
            <h2 className="font-bold">Settings</h2>
            
            <div>
                <label className="block text-sm font-medium mb-1">Font Size (PDF fit): {fontPreset}px</label>
                <select
                    className="w-full border rounded px-2 py-1"
                    value={fontPreset}
                    onChange={(e) => {
                        const next = Number(e.target.value) as FontPreset;
                        setFontPreset(next);
                        setWordFontSize(next);
                        // Crossword clue font follows the chosen font size.
                        // (If you want a separate clue-size control later, we can add it.
                        // For now, the preset drives both.)
                        setDefinitionFontSize(next);

                        const limits = computeA4PdfLimits(mode, next, next);
                        setWidth(limits.maxGrid);
                        setHeight(limits.maxGrid);
                        setCount(limits.maxWords);
                    }}
                >
                    {FONT_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}px</option>
                    ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                    Max for single-page A4: grid {pdfLimits.maxGrid}×{pdfLimits.maxGrid}, words ≤ {pdfLimits.maxWords}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Word Count</label>
                <input 
                    type="number" 
                    value={count} 
                    onChange={(e) => {
                        if (e.target.value === '') return;
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        setCount(clampInt(raw, 1, pdfLimits.maxWords));
                    }}
                    onBlur={() => {
                        // Clamp to PDF limits and then apply crossword coupling.
                        setCount((prev) => clampInt(prev, 1, pdfLimits.maxWords));
                        if (mode === 'crossword') {
                            const nextGrid = recommendedSquareGridForCount(clampInt(count, 1, pdfLimits.maxWords));
                            const nextW = clampInt(nextGrid.width, 5, pdfLimits.maxGrid);
                            const nextH = clampInt(nextGrid.height, 5, pdfLimits.maxGrid);
                            setWidth(nextW);
                            setHeight(nextH);
                        }
                    }}
                    className="w-full border rounded px-2 py-1"
                    min={1} max={pdfLimits.maxWords}
                />
                                {mode === 'crossword' && crosswordAutoCount !== null && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Suggested for this grid: {crosswordAutoCount}
                                    </div>
                                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Grid Width</label>
                <input 
                    type="number" 
                    value={width} 
                    onChange={(e) => {
                        if (e.target.value === '') return;
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        setWidth(clampInt(raw, 5, pdfLimits.maxGrid));
                    }}
                    onBlur={() => {
                        setWidth((prev) => clampInt(prev, 5, pdfLimits.maxGrid));
                        if (mode !== 'crossword') return;
                        setCount((prev) => clampInt(recommendedCrosswordCount(width, height), 1, pdfLimits.maxWords));
                    }}
                    className="w-full border rounded px-2 py-1"
                    min={5} max={pdfLimits.maxGrid}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Grid Height</label>
                <input 
                    type="number" 
                    value={height} 
                    onChange={(e) => {
                        if (e.target.value === '') return;
                        const raw = Number(e.target.value);
                        if (Number.isNaN(raw)) return;
                        setHeight(clampInt(raw, 5, pdfLimits.maxGrid));
                    }}
                    onBlur={() => {
                        setHeight((prev) => clampInt(prev, 5, pdfLimits.maxGrid));
                        if (mode !== 'crossword') return;
                        setCount((prev) => clampInt(recommendedCrosswordCount(width, height), 1, pdfLimits.maxWords));
                    }}
                    className="w-full border rounded px-2 py-1"
                    min={5} max={pdfLimits.maxGrid}
                />
            </div>
        </div>

        <hr />

        {/* Actions */}
        <div className="flex flex-col gap-3">
            <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 font-bold"
            >
                {loading ? 'Generating...' : 'Generate'}
            </button>

            <label className="flex items-center gap-2 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={showSolution} 
                    onChange={(e) => setShowSolution(e.target.checked)} 
                />
                Show Solution
            </label>

            <button 
                onClick={handleExport}
                disabled={!puzzleData}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
            >
                Export to PDF
            </button>
        </div>

        <div className="mt-auto text-sm text-gray-500">
            Status: {status}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {mode === 'crossword' && puzzleData && (
            <CrosswordPreview 
                grid={puzzleData.grid} 
                placedWords={puzzleData.placedWords} 
                showSolution={showSolution} 
                wordFontSizePx={wordFontSize}
                definitionFontSizePx={definitionFontSize}
            />
        )}
        {mode === 'wordsearch' && puzzleData && (
            <WordSearchPreview 
                grid={puzzleData.grid} 
                placedWords={puzzleData.placedWords} 
                showSolution={showSolution} 
                wordFontSizePx={wordFontSize}
                definitionFontSizePx={definitionFontSize}
            />
        )}
        
        {!puzzleData && !loading && (
            <div className="h-full flex items-center justify-center text-gray-400 text-xl">
                Click "Generate" to start
            </div>
        )}

        {loading && (
            <div className="h-full flex items-center justify-center text-blue-500 text-xl animate-pulse">
                Working...
            </div>
        )}
      </main>
    </div>
  );
}
