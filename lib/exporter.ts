import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PlacedWord, ScrambleItem } from './generator';

export type PdfExportOptions = {
    wordFontSizePx?: number;
    definitionFontSizePx?: number;
};

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

export async function exportCrosswordPDF(
    grid: string[][],
    placedWords: PlacedWord[],
    options: PdfExportOptions = {}
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadFont(doc);

    const wordFontSizePx = options.wordFontSizePx ?? 16;
    const definitionFontSizePx = options.definitionFontSizePx ?? 14;

    // --- Single Page Puzzle (grid on top, clues underneath) ---
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const titleY = 12;
    const gridTopY = 18;
    const gap = 6;

    doc.setFontSize(16);
    doc.text('Russian Crossword', margin, titleY);

    const cols = grid[0]?.length ?? 0;
    const rows = grid.length;
    if (rows === 0 || cols === 0) {
        doc.save('crossword.pdf');
        return;
    }

    // Reserve some minimum space for clues; if there is more space, the grid will grow.
    const minCluesH = 90;
    const maxGridW = pageWidth - margin * 2;
    const maxGridH = Math.max(10, pageHeight - margin - gridTopY - gap - minCluesH);

    const cellW = Math.floor(Math.min(maxGridW / cols, maxGridH / rows));
    // Allow cells to be a bit taller than wide to use vertical space better.
    const cellH = Math.min(cellW * 1.15, maxGridH / rows);

    const gridW = cellW * cols;
    const gridH = cellH * rows;
    const gridX = margin + (maxGridW - gridW) / 2;
    const gridY = gridTopY;

    const targetCellLabelPt = pxToPt(wordFontSizePx) * 0.8;
    const maxPtForCell = mmToPt(Math.max(1, Math.min(cellW, cellH) - 1));
    const gridNumberFontPt = Math.min(targetCellLabelPt, maxPtForCell * 0.75);
    
    // Precompute word starts for numbering
    const startsMap = new Map<string, number>();
    for (const w of placedWords) {
        startsMap.set(`${w.row}-${w.col}`, w.number);
    }

    drawCrosswordGrid(doc, {
        grid,
        startsMap,
        x: gridX,
        y: gridY,
        cellW,
        cellH,
        numberFontPt: gridNumberFontPt,
    });

    // Clues underneath (split into Horizontal/Vertical like the app).
    const cluesTopY = gridY + gridH + gap;
    const cluesH = pageHeight - margin - cluesTopY;
    const targetCluePt = pxToPt(definitionFontSizePx);

    const horizontal = placedWords
        .filter((w) => w.direction === 'horizontal')
        .slice()
        .sort((a, b) => a.number - b.number)
        .map((w) => `${w.number}. ${w.definition}`);

    const vertical = placedWords
        .filter((w) => w.direction === 'vertical')
        .slice()
        .sort((a, b) => a.number - b.number)
        .map((w) => `${w.number}. ${w.definition}`);

    drawTwoColumnWrappedListsAutoFit(doc, {
        leftTitle: 'Horizontal',
        leftItems: horizontal,
        rightTitle: 'Vertical',
        rightItems: vertical,
        x: margin,
        y: cluesTopY,
        width: pageWidth - margin * 2,
        height: cluesH,
        targetFontPt: targetCluePt,
        minFontPt: 7,
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

export async function exportWordSearchPDF(
    grid: string[][],
    placedWords: PlacedWord[],
    options: PdfExportOptions = {}
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await loadFont(doc);

    const wordFontSizePx = options.wordFontSizePx ?? 24;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const titleY = 12;
    const gridTopY = 18;
    const gap = 6;

    doc.setFontSize(16);
    doc.text('Russian Word Search', margin, titleY);

    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (rows === 0 || cols === 0) {
        doc.save('russian-wordsearch.pdf');
        return;
    }

    // Grid on top, words list underneath.
    const minWordsH = 45;
    const maxGridW = pageWidth - margin * 2;
    const maxGridH = Math.max(10, pageHeight - margin - gridTopY - gap - minWordsH);

    const cellSize = Math.floor(Math.min(maxGridW / cols, maxGridH / rows));
    const gridW = cellSize * cols;
    const gridH = cellSize * rows;
    const gridX = margin + (maxGridW - gridW) / 2;
    const gridY = gridTopY;

    const targetLetterPt = pxToPt(wordFontSizePx);
    const maxPtForCell = mmToPt(Math.max(1, cellSize - 1));
    const gridLetterFontPt = Math.min(targetLetterPt, maxPtForCell * 0.85);

    drawWordSearchGrid(doc, {
        grid,
        x: gridX,
        y: gridY,
        cellSize,
        letterFontPt: gridLetterFontPt,
    });

    const wordsOnly = placedWords.map((w) => w.word);
    const listTopY = gridY + gridH + gap;
    const listH = pageHeight - margin - listTopY;
    drawMultiColumnWrappedListAutoFit(doc, {
        items: wordsOnly,
        x: margin,
        y: listTopY,
        width: pageWidth - margin * 2,
        height: listH,
        targetFontPt: gridLetterFontPt,
        minFontPt: 7,
        maxColumns: 3,
    });

    doc.save('russian-wordsearch.pdf');
}

function pxToPt(px: number) {
    // 96dpi CSS px -> points
    return px * 0.75;
}

function mmToPt(mm: number) {
    return mm / 0.3527777778;
}

function ptToMm(pt: number) {
    return pt * 0.3527777778;
}

function drawTextListAutoFit(
    doc: jsPDF,
    opts: {
        items: string[];
        x: number;
        y: number;
        width: number;
        height: number;
        targetFontPt: number;
        minFontPt: number;
        maxColumns: number;
    }
) {
    const { items, x, y, width, height, targetFontPt, minFontPt, maxColumns } = opts;
    if (items.length === 0) return;

    // Find the largest font that can fit all items in up to maxColumns.
    let fontPt = Math.max(minFontPt, Math.floor(targetFontPt));
    for (; fontPt >= minFontPt; fontPt--) {
        const lineH = ptToMm(fontPt) * 1.25;
        const rowsPerCol = Math.max(1, Math.floor(height / lineH));
        const colsNeeded = Math.ceil(items.length / rowsPerCol);
        if (colsNeeded <= maxColumns) {
            const colW = width / colsNeeded;
            // Basic sanity check: at least a few chars per column.
            if (colW >= ptToMm(fontPt) * 6) break;
        }
    }

    const lineH = ptToMm(fontPt) * 1.25;
    const rowsPerCol = Math.max(1, Math.floor(height / lineH));
    const colsNeeded = clampInt(Math.ceil(items.length / rowsPerCol), 1, maxColumns);
    const colW = width / colsNeeded;
    const capacity = rowsPerCol * colsNeeded;
    const renderItems = items.slice(0, capacity);

    doc.setFontSize(fontPt);
    for (let i = 0; i < renderItems.length; i++) {
        const col = Math.floor(i / rowsPerCol);
        const row = i % rowsPerCol;
        const tx = x + col * colW;
        const ty = y + row * lineH + ptToMm(fontPt) * 0.9;
        doc.text(renderItems[i], tx, ty);
    }
}

function drawCrosswordGrid(
    doc: jsPDF,
    opts: {
        grid: string[][];
        startsMap: Map<string, number>;
        x: number;
        y: number;
        cellW: number;
        cellH: number;
        numberFontPt: number;
    }
) {
    const { grid, startsMap, x, y, cellW, cellH, numberFontPt } = opts;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    doc.setLineWidth(0.2);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = grid[r]?.[c] ?? '';
            const cx = x + c * cellW;
            const cy = y + r * cellH;

            if (cell === '') {
                doc.setFillColor(0, 0, 0);
                doc.rect(cx, cy, cellW, cellH, 'F');
                doc.setDrawColor(0, 0, 0);
                doc.rect(cx, cy, cellW, cellH, 'S');
                continue;
            }

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(0, 0, 0);
            doc.rect(cx, cy, cellW, cellH, 'FD');

            const n = startsMap.get(`${r}-${c}`);
            if (n) {
                doc.setFontSize(numberFontPt);
                doc.setTextColor(0, 0, 0);
                doc.text(String(n), cx + 0.8, cy + 0.8 + ptToMm(numberFontPt) * 0.85);
            }
        }
    }
}

function drawWordSearchGrid(
    doc: jsPDF,
    opts: {
        grid: string[][];
        x: number;
        y: number;
        cellSize: number;
        letterFontPt: number;
    }
) {
    const { grid, x, y, cellSize, letterFontPt } = opts;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    doc.setLineWidth(0.15);
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(letterFontPt);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const letter = grid[r]?.[c] ?? '';
            const cx = x + c * cellSize;
            const cy = y + r * cellSize;
            doc.rect(cx, cy, cellSize, cellSize, 'S');
            // Centered letter
            doc.text(letter, cx + cellSize / 2, cy + cellSize / 2, { align: 'center', baseline: 'middle' } as any);
        }
    }
}

function drawTwoColumnWrappedListsAutoFit(
    doc: jsPDF,
    opts: {
        leftTitle: string;
        leftItems: string[];
        rightTitle: string;
        rightItems: string[];
        x: number;
        y: number;
        width: number;
        height: number;
        targetFontPt: number;
        minFontPt: number;
    }
) {
    const { leftTitle, leftItems, rightTitle, rightItems, x, y, width, height, targetFontPt, minFontPt } = opts;
    const colGap = 8;
    const colW = (width - colGap) / 2;
    const headerFontPt = Math.max(minFontPt, Math.floor(targetFontPt * 1.05));

    // Find a font size that allows both columns to fit.
    let fontPt = Math.max(minFontPt, Math.floor(targetFontPt));
    for (; fontPt >= minFontPt; fontPt--) {
        const okLeft = wrappedListFits(doc, { title: leftTitle, items: leftItems, width: colW, height, fontPt, headerFontPt });
        const okRight = wrappedListFits(doc, { title: rightTitle, items: rightItems, width: colW, height, fontPt, headerFontPt });
        if (okLeft && okRight) break;
    }

    drawWrappedList(doc, { title: leftTitle, items: leftItems, x, y, width: colW, height, fontPt, headerFontPt });
    drawWrappedList(doc, { title: rightTitle, items: rightItems, x: x + colW + colGap, y, width: colW, height, fontPt, headerFontPt });
}

function drawMultiColumnWrappedListAutoFit(
    doc: jsPDF,
    opts: {
        items: string[];
        x: number;
        y: number;
        width: number;
        height: number;
        targetFontPt: number;
        minFontPt: number;
        maxColumns: number;
    }
) {
    const { items, x, y, width, height, targetFontPt, minFontPt, maxColumns } = opts;
    if (items.length === 0) return;

    let fontPt = Math.max(minFontPt, Math.floor(targetFontPt));
    let chosenCols = 1;
    for (; fontPt >= minFontPt; fontPt--) {
        const lineH = ptToMm(fontPt) * 1.25;
        const rowsPerCol = Math.max(1, Math.floor(height / lineH));

        // Choose the smallest column count that can fit.
        let cols = Math.ceil(items.length / rowsPerCol);
        cols = clampInt(cols, 1, maxColumns);
        const colW = width / cols;

        // Ensure each column has enough width to avoid excessive wrapping.
        const minColW = ptToMm(fontPt) * 10;
        if (colW < minColW) continue;

        // Ensure wrapped text height fits within each column capacity.
        if (wrappedMultiColumnFits(doc, { items, width, height, cols, fontPt })) {
            chosenCols = cols;
            break;
        }
    }

    drawWrappedMultiColumn(doc, { items, x, y, width, height, cols: chosenCols, fontPt });
}

function wrappedListFits(
    doc: jsPDF,
    opts: {
        title: string;
        items: string[];
        width: number;
        height: number;
        fontPt: number;
        headerFontPt: number;
    }
) {
    const { title, items, width, height, fontPt, headerFontPt } = opts;
    const headerH = ptToMm(headerFontPt) * 1.35;
    const lineH = ptToMm(fontPt) * 1.25;
    const availableH = height - headerH;
    if (availableH <= 0) return false;

    doc.setFontSize(fontPt);
    let lines = 0;
    for (const item of items) {
        const wrapped = doc.splitTextToSize(item, width);
        lines += wrapped.length;
    }

    const neededH = lines * lineH;
    return neededH <= availableH;
}

function drawWrappedList(
    doc: jsPDF,
    opts: {
        title: string;
        items: string[];
        x: number;
        y: number;
        width: number;
        height: number;
        fontPt: number;
        headerFontPt: number;
    }
) {
    const { title, items, x, y, width, height, fontPt, headerFontPt } = opts;
    const headerH = ptToMm(headerFontPt) * 1.35;
    const lineH = ptToMm(fontPt) * 1.25;
    const availableH = height - headerH;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(headerFontPt);
    doc.text(title, x, y + ptToMm(headerFontPt));

    doc.setFontSize(fontPt);
    let cursorY = y + headerH;

    for (const item of items) {
        const wrapped = doc.splitTextToSize(item, width);
        for (const line of wrapped) {
            if (cursorY + lineH > y + headerH + availableH + 0.1) return;
            doc.text(line, x, cursorY + ptToMm(fontPt) * 0.9);
            cursorY += lineH;
        }
    }
}

function wrappedMultiColumnFits(
    doc: jsPDF,
    opts: {
        items: string[];
        width: number;
        height: number;
        cols: number;
        fontPt: number;
    }
) {
    const { items, width, height, cols, fontPt } = opts;
    const colW = width / cols;
    const lineH = ptToMm(fontPt) * 1.25;
    const rowsPerCol = Math.max(1, Math.floor(height / lineH));

    doc.setFontSize(fontPt);
    let col = 0;
    let row = 0;
    for (const item of items) {
        const wrapped = doc.splitTextToSize(item, colW);
        for (const _line of wrapped) {
            row += 1;
            if (row > rowsPerCol) {
                col += 1;
                row = 1;
                if (col >= cols) return false;
            }
        }
    }
    return true;
}

function drawWrappedMultiColumn(
    doc: jsPDF,
    opts: {
        items: string[];
        x: number;
        y: number;
        width: number;
        height: number;
        cols: number;
        fontPt: number;
    }
) {
    const { items, x, y, width, height, cols, fontPt } = opts;
    const colW = width / cols;
    const lineH = ptToMm(fontPt) * 1.25;
    const rowsPerCol = Math.max(1, Math.floor(height / lineH));

    doc.setFontSize(fontPt);
    doc.setTextColor(0, 0, 0);

    let col = 0;
    let row = 0;
    for (const item of items) {
        const wrapped = doc.splitTextToSize(item, colW);
        for (const line of wrapped) {
            row += 1;
            if (row > rowsPerCol) {
                col += 1;
                row = 1;
                if (col >= cols) return;
            }
            const tx = x + col * colW;
            const ty = y + (row - 1) * lineH + ptToMm(fontPt) * 0.9;
            doc.text(line, tx, ty);
        }
    }
}

function clampInt(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Math.trunc(value)));
}
