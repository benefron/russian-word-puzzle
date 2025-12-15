'use client';

import React, { useState } from 'react';
import { CrosswordGenerator, WordSearchGenerator, PlacedWord, WordItem } from '@/lib/generator';
import { exportCrosswordPDF, exportWordSearchPDF } from '@/lib/exporter';
import { CrosswordPreview } from '@/components/CrosswordPreview';
import { WordSearchPreview } from '@/components/WordSearchPreview';

export default function Home() {
  const [mode, setMode] = useState<'crossword' | 'wordsearch'>('crossword');
  const [difficulty, setDifficulty] = useState<number>(1);
  const [count, setCount] = useState(10);
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(15);
    const [wordFontSize, setWordFontSize] = useState<number>(16);
    const [definitionFontSize, setDefinitionFontSize] = useState<number>(12);
  const [showSolution, setShowSolution] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready');

  const [puzzleData, setPuzzleData] = useState<{ grid: string[][], placedWords: PlacedWord[] } | null>(null);

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
        await exportCrosswordPDF(puzzleData.grid, puzzleData.placedWords);
    } else {
        await exportWordSearchPDF(puzzleData.grid, puzzleData.placedWords);
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
                    <input type="radio" checked={mode === 'crossword'} onChange={() => setMode('crossword')} />
                    Crossword
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={mode === 'wordsearch'} onChange={() => setMode('wordsearch')} />
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
                <label className="block text-sm font-medium mb-1">Word Count</label>
                <input 
                    type="number" 
                    value={count} 
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full border rounded px-2 py-1"
                    min={1} max={50}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Grid Width</label>
                <input 
                    type="number" 
                    value={width} 
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full border rounded px-2 py-1"
                    min={5} max={30}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Grid Height</label>
                <input 
                    type="number" 
                    value={height} 
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full border rounded px-2 py-1"
                    min={5} max={30}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Word Font Size: {wordFontSize}px</label>
                <input
                    type="range"
                    min="10"
                    max="28"
                    value={wordFontSize}
                    onChange={(e) => setWordFontSize(Number(e.target.value))}
                    className="w-full"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Definition Font Size: {definitionFontSize}px</label>
                <input
                    type="range"
                    min="10"
                    max="20"
                    value={definitionFontSize}
                    onChange={(e) => setDefinitionFontSize(Number(e.target.value))}
                    className="w-full"
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
