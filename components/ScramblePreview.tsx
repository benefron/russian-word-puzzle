import React from 'react';
import { ScrambleItem } from '@/lib/generator';

interface ScramblePreviewProps {
  scrambles: ScrambleItem[];
  showSolution: boolean;
}

export const ScramblePreview: React.FC<ScramblePreviewProps> = ({ scrambles, showSolution }) => {
  if (!scrambles || scrambles.length === 0) return <div className="text-gray-500">No scrambles generated yet.</div>;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <ul className="space-y-6">
        {scrambles.map((item, index) => (
          <li key={index} className="border-b pb-4">
            <div className="flex items-baseline gap-2 mb-2">
                <span className="font-bold text-lg">{index + 1}.</span>
                <span className="text-xl font-mono tracking-widest bg-gray-100 px-2 py-1 rounded">
                    {item.scrambled}
                </span>
                {showSolution && (
                    <span className="text-green-600 font-bold ml-2">
                        ({item.original})
                    </span>
                )}
            </div>
            <p className="text-gray-700 italic ml-6">{item.definition}</p>
            <div className="mt-2 ml-6 border-b border-gray-300 w-48 h-6"></div>
          </li>
        ))}
      </ul>
    </div>
  );
};
