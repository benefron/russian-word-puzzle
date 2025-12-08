import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlacedWord, ScrambleItem } from './generator';

// Helper to load font
async function loadFont(doc: jsPDF) {
    // We need a font that supports Cyrillic. Roboto is a good choice.
    // We can fetch it from a CDN.
    const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
    const fontName = 'Roboto-Regular';

    try {
        const response = await fetch(fontUrl);
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        
        doc.addFileToVFS('Roboto-Regular.ttf', base64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto');
    } catch (e) {
        console.error("Failed to load font", e);
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export async function exportCrosswordPDF(grid: string[][], placedWords: PlacedWord[]) {
    const doc = new jsPDF();
    await loadFont(doc);

    // --- Puzzle Page ---
    doc.setFontSize(18);
    doc.text("Russian Crossword Puzzle", 14, 20);

    // Draw Grid
    // We can use autoTable to draw the grid
    const cellSize = 10;
    const startY = 30;
    
    // Prepare body
    const body = grid.map((row, r) => 
        row.map((cell, c) => {
            const wordStart = placedWords.find(w => w.row === r && w.col === c);
            return {
                content: wordStart ? `${wordStart.number}` : '',
                styles: { 
                    fillColor: (cell === '' ? [0, 0, 0] : [255, 255, 255]) as [number, number, number],
                    textColor: [0, 0, 0] as [number, number, number],
                    halign: 'left' as const,
                    valign: 'top' as const,
                    fontSize: 6
                }
            };
        })
    );

    autoTable(doc, {
        startY: startY,
        body: body,
        theme: 'grid',
        styles: {
            lineColor: [0, 0, 0] as [number, number, number],
            lineWidth: 0.1,
            cellPadding: 0.5,
            minCellHeight: cellSize,
            minCellWidth: cellSize
        },
        head: [],
        columnStyles: {
            // Apply width to all columns? autoTable does this automatically if we don't specify
        },
        // Force square cells roughly
        didParseCell: (data) => {
            data.cell.styles.minCellHeight = cellSize;
            data.cell.styles.minCellWidth = cellSize;
        }
    });

    // Definitions
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Definitions:", 14, finalY);
    finalY += 10;

    doc.setFontSize(10);
    const definitions = placedWords.sort((a, b) => a.number - b.number).map(w => {
        return [`${w.number}. (${w.direction}) ${w.definition}`];
    });

    autoTable(doc, {
        startY: finalY,
        body: definitions,
        theme: 'plain',
        styles: { font: 'Roboto' }
    });

    // --- Solution Page ---
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Solution Key", 14, 20);

    const bodySol = grid.map((row, r) => 
        row.map((cell, c) => {
            const wordStart = placedWords.find(w => w.row === r && w.col === c);
            let content = cell;
            if (wordStart) {
                content = `${wordStart.number}. ${cell}`;
            }
            return {
                content: content,
                styles: { 
                    fillColor: (cell === '' ? [0, 0, 0] : [255, 255, 255]) as [number, number, number],
                    textColor: [0, 0, 0] as [number, number, number],
                    halign: 'center' as const,
                    valign: 'middle' as const,
                    fontSize: 8
                }
            };
        })
    );

    autoTable(doc, {
        startY: 30,
        body: bodySol,
        theme: 'grid',
        styles: {
            lineColor: [0, 0, 0] as [number, number, number],
            lineWidth: 0.1,
            font: 'Roboto'
        }
    });

    doc.save('crossword.pdf');
}

export async function exportScramblePDF(scrambles: ScrambleItem[]) {
    const doc = new jsPDF();
    await loadFont(doc);

    // --- Puzzle Page ---
    doc.setFontSize(18);
    doc.text("Russian Word Scramble", 14, 20);

    const body = scrambles.map((item, i) => [
        `${i + 1}.`,
        item.scrambled,
        item.definition,
        "____________________"
    ]);

    autoTable(doc, {
        startY: 30,
        head: [['#', 'Scramble', 'Definition', 'Answer']],
        body: body,
        styles: { font: 'Roboto' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 40, fontStyle: 'bold' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 50 }
        }
    });

    // --- Solution Page ---
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Solution Key", 14, 20);

    const bodySol = scrambles.map((item, i) => [
        `${i + 1}.`,
        item.original
    ]);

    autoTable(doc, {
        startY: 30,
        head: [['#', 'Original Word']],
        body: bodySol,
        styles: { font: 'Roboto' }
    });

    doc.save('scramble.pdf');
}

export async function exportWordSearchPDF(grid: string[][], placedWords: PlacedWord[]) {
    const doc = new jsPDF();
    await loadFont(doc);

    // --- Puzzle Page ---
    doc.setFontSize(18);
    doc.text("Russian Word Search", 14, 20);

    // Draw Grid
    const cellSize = 10;
    const startY = 30;
    
    const body = grid.map(row => 
        row.map(cell => ({
            content: cell,
            styles: { 
                fillColor: [255, 255, 255] as [number, number, number],
                textColor: [0, 0, 0] as [number, number, number],
                halign: 'center' as const,
                valign: 'middle' as const,
                fontSize: 10
            }
        }))
    );

    autoTable(doc, {
        startY: startY,
        body: body,
        theme: 'grid',
        styles: {
            lineColor: [200, 200, 200] as [number, number, number],
            lineWidth: 0.1,
            cellPadding: 1,
            minCellHeight: cellSize,
            minCellWidth: cellSize,
            font: 'Roboto'
        },
        head: [],
    });

    // Word List
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Check if we need a new page
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(14);
    doc.text("Find these words:", 14, finalY);
    finalY += 10;

    doc.setFontSize(10);
    const wordsList = placedWords.map(w => [w.word, w.definition]);

    autoTable(doc, {
        startY: finalY,
        head: [['Word', 'Definition']],
        body: wordsList,
        theme: 'striped',
        styles: { font: 'Roboto' }
    });

    // --- Solution Page ---
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Solution", 14, 20);

    const solutionBody = grid.map((row, r) => 
        row.map((cell, c) => {
            // Check if part of solution
            let isSolution = false;
            for (const w of placedWords) {
                let wr = w.row;
                let wc = w.col;
                for (let i = 0; i < w.word.length; i++) {
                    if (wr === r && wc === c) {
                        isSolution = true;
                        break;
                    }
                    if (w.direction === 'horizontal') wc++;
                    else if (w.direction === 'vertical') wr++;
                    else if (w.direction === 'diagonal-down') { wr++; wc++; }
                    else if (w.direction === 'diagonal-up') { wr--; wc++; }
                }
                if (isSolution) break;
            }

            return {
                content: cell,
                styles: { 
                    fillColor: (isSolution ? [255, 255, 0] : [255, 255, 255]) as [number, number, number],
                    textColor: [0, 0, 0] as [number, number, number],
                    halign: 'center' as const,
                    valign: 'middle' as const,
                    fontSize: 10
                }
            };
        })
    );

    autoTable(doc, {
        startY: 30,
        body: solutionBody,
        theme: 'grid',
        styles: {
            lineColor: [200, 200, 200] as [number, number, number],
            lineWidth: 0.1,
            cellPadding: 1,
            minCellHeight: cellSize,
            minCellWidth: cellSize,
            font: 'Roboto'
        },
        head: [],
    });

    doc.save('russian-wordsearch.pdf');
}
