export type Direction = 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';

export interface WordItem {
  word: string;
  definition: string;
}

export interface PlacedWord extends WordItem {
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

export interface ScrambleItem {
  original: string;
  scrambled: string;
  definition: string;
}

export class CrosswordGenerator {
  width: number;
  height: number;
  grid: string[][];
  placedWords: PlacedWord[];

  constructor(width: number = 20, height: number = 20) {
    this.width = width;
    this.height = height;
    this.grid = Array(height).fill(null).map(() => Array(width).fill(''));
    this.placedWords = [];
  }

  generate(wordsData: WordItem[]): { grid: string[][], placedWords: PlacedWord[] } {
    // The old algorithm picked a random intersection placement for each word,
    // which often clusters everything around the first word.
    // We now do multiple attempts with randomized choices and keep the best.

    const attempts = 120;
    const baseSorted = [...wordsData].sort((a, b) => b.word.length - a.word.length);

    let bestGrid: string[][] | null = null;
    let bestPlaced: PlacedWord[] = [];
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < attempts; attempt++) {
      this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(''));
      this.placedWords = [];

      // Randomize within equal-ish lengths to create variety across attempts.
      const sortedWords = [...baseSorted].sort((a, b) => {
        const d = b.word.length - a.word.length;
        if (d !== 0) return d;
        return Math.random() - 0.5;
      });

      for (const wordItem of sortedWords) {
        this._placeWord(wordItem);
      }

      const score = this._scoreCurrentLayout();
      if (score > bestScore) {
        bestScore = score;
        bestGrid = this.grid.map(row => [...row]);
        bestPlaced = this.placedWords.map(w => ({ ...w }));
      }
    }

    this.grid = bestGrid ?? this.grid;
    this.placedWords = bestPlaced;

    // Reduce large continuous empty areas by returning the tightest bounding box
    // around the crossword (plus a small margin). This also reduces the overall
    // percentage of black squares.
    this._cropToBoundingBox(1);

    // Assign crossword-style clue numbers based on start cells (top-to-bottom, left-to-right).
    // If a cell starts both a horizontal and vertical word, they MUST share the same number.
    this._assignClueNumbers();

    return { grid: this.grid, placedWords: this.placedWords };
  }

  private _assignClueNumbers() {
    const starts: Array<{ r: number; c: number; key: string }> = [];
    const seen = new Set<string>();

    for (const w of this.placedWords) {
      const key = `${w.row}-${w.col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      starts.push({ r: w.row, c: w.col, key });
    }

    starts.sort((a, b) => (a.r - b.r) || (a.c - b.c));
    const numberByKey = new Map<string, number>();
    for (let i = 0; i < starts.length; i++) {
      numberByKey.set(starts[i].key, i + 1);
    }

    this.placedWords = this.placedWords.map((w) => {
      const key = `${w.row}-${w.col}`;
      const number = numberByKey.get(key) ?? 0;
      return { ...w, number };
    });
  }

  private _placeWord(wordItem: WordItem) {
    const word = wordItem.word;

    // If it's the first word, place it in the middle
    if (this.placedWords.length === 0) {
      const startRow = Math.floor(this.height / 2);
      const startCol = Math.floor((this.width - word.length) / 2);
      const firstDir: Direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const firstRow = firstDir === 'horizontal' ? startRow : Math.floor((this.height - word.length) / 2);
      const firstCol = firstDir === 'horizontal' ? startCol : Math.floor(this.width / 2);

      if (this._canPlace(word, firstRow, firstCol, firstDir)) {
        this._addWordToGrid(word, wordItem.definition, firstRow, firstCol, firstDir);
      } else if (this._canPlace(word, startRow, startCol, 'horizontal')) {
        this._addWordToGrid(word, wordItem.definition, startRow, startCol, 'horizontal');
      }
      return;
    }

    // Try to intersect with existing words
    const possiblePlacements: { r: number, c: number, direction: Direction }[] = [];

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          if (this.grid[r][c] === char) {
            // Found an intersection point
            // Check horizontal placement
            if (this._canPlace(word, r, c - i, 'horizontal')) {
              possiblePlacements.push({ r, c: c - i, direction: 'horizontal' });
            }
            // Check vertical placement
            if (this._canPlace(word, r - i, c, 'vertical')) {
              possiblePlacements.push({ r: r - i, c, direction: 'vertical' });
            }
          }
        }
      }
    }

    // Prefer placements that create more intersections and spread the crossword.
    if (possiblePlacements.length > 0) {
      const scored = possiblePlacements
        .map(p => ({
          ...p,
          score: this._scorePlacement(word, p.r, p.c, p.direction)
        }))
        .sort((a, b) => b.score - a.score);

      // Take one of the top few to keep some variety.
      const pickFrom = Math.min(5, scored.length);
      const choice = scored[Math.floor(Math.random() * pickFrom)];
      this._addWordToGrid(word, wordItem.definition, choice.r, choice.c, choice.direction);
      return;
    }

    // If no intersection placement exists, do not place the word.
    // This guarantees the crossword remains a single connected component
    // (no isolated "islands" of words).
    return;
  }

  private _scorePlacement(word: string, row: number, col: number, direction: Direction): number {
    // Higher is better.
    // - reward intersections
    // - reward spreading the bounding box (coverage)
    // - slightly reward being nearer center (keeps crossword readable)
    const intersections = this._countIntersectionsForPlacement(word, row, col, direction);
    const bboxDelta = this._bboxAreaDeltaIfPlaced(word, row, col, direction);

    const centerR = (this.height - 1) / 2;
    const centerC = (this.width - 1) / 2;
    const placedCenter = this._placementCenter(word, row, col, direction);
    const distToCenter = Math.abs(placedCenter.r - centerR) + Math.abs(placedCenter.c - centerC);

    // Prefer intersections and compactness (smaller bbox expansion).
    // This tends to reduce black-square percentage once we crop to the bbox.
    return intersections * 120 - bboxDelta * 8 - distToCenter * 0.2;
  }

  private _placementCenter(word: string, row: number, col: number, direction: Direction): { r: number, c: number } {
    if (direction === 'horizontal') {
      return { r: row, c: col + (word.length - 1) / 2 };
    }
    return { r: row + (word.length - 1) / 2, c: col };
  }

  private _countIntersectionsForPlacement(word: string, row: number, col: number, direction: Direction): number {
    let count = 0;
    if (direction === 'horizontal') {
      for (let i = 0; i < word.length; i++) {
        if (row < 0 || row >= this.height) continue;
        const c = col + i;
        if (c < 0 || c >= this.width) continue;
        if (this.grid[row][c] === word[i]) count++;
      }
    } else {
      for (let i = 0; i < word.length; i++) {
        const r = row + i;
        if (r < 0 || r >= this.height) continue;
        if (col < 0 || col >= this.width) continue;
        if (this.grid[r][col] === word[i]) count++;
      }
    }
    return count;
  }

  private _bboxAreaDeltaIfPlaced(word: string, row: number, col: number, direction: Direction): number {
    const before = this._boundingBox();
    const after = this._boundingBoxWithPlacement(word, row, col, direction, before);

    const beforeArea = before ? (before.maxR - before.minR + 1) * (before.maxC - before.minC + 1) : 0;
    const afterArea = (after.maxR - after.minR + 1) * (after.maxC - after.minC + 1);

    return afterArea - beforeArea;
  }

  private _boundingBox(): { minR: number, maxR: number, minC: number, maxC: number } | null {
    let minR = Infinity;
    let minC = Infinity;
    let maxR = -Infinity;
    let maxC = -Infinity;

    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] !== '') {
          minR = Math.min(minR, r);
          minC = Math.min(minC, c);
          maxR = Math.max(maxR, r);
          maxC = Math.max(maxC, c);
        }
      }
    }

    if (!isFinite(minR)) return null;
    return { minR, maxR, minC, maxC };
  }

  private _boundingBoxWithPlacement(
    word: string,
    row: number,
    col: number,
    direction: Direction,
    current: { minR: number, maxR: number, minC: number, maxC: number } | null,
  ): { minR: number, maxR: number, minC: number, maxC: number } {
    let minR = current ? current.minR : Infinity;
    let minC = current ? current.minC : Infinity;
    let maxR = current ? current.maxR : -Infinity;
    let maxC = current ? current.maxC : -Infinity;

    if (direction === 'horizontal') {
      minR = Math.min(minR, row);
      maxR = Math.max(maxR, row);
      minC = Math.min(minC, col);
      maxC = Math.max(maxC, col + word.length - 1);
    } else {
      minR = Math.min(minR, row);
      maxR = Math.max(maxR, row + word.length - 1);
      minC = Math.min(minC, col);
      maxC = Math.max(maxC, col);
    }

    return { minR, maxR, minC, maxC };
  }

  private _scoreCurrentLayout(): number {
    const placed = this.placedWords.length;
    if (placed === 0) return -Infinity;

    let occupied = 0;
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.grid[r][c] !== '') occupied++;
      }
    }

    const bbox = this._boundingBox();
    const bboxArea = bbox ? (bbox.maxR - bbox.minR + 1) * (bbox.maxC - bbox.minC + 1) : 0;
    const coverage = bboxArea / (this.width * this.height);
    const density = bboxArea > 0 ? occupied / bboxArea : 0;

    // Heuristic: prioritize placing more words and using more cells,
    // but also encourage spreading across the grid instead of clustering.
    // We now prioritize density (fewer internal holes) and more occupied cells.
    return placed * 700 + occupied * 20 + density * 2000 + coverage * 300;
  }

  private _cropToBoundingBox(margin: number) {
    const bbox = this._boundingBox();
    if (!bbox) return;

    const minR = Math.max(0, bbox.minR - margin);
    const maxR = Math.min(this.height - 1, bbox.maxR + margin);
    const minC = Math.max(0, bbox.minC - margin);
    const maxC = Math.min(this.width - 1, bbox.maxC + margin);

    const nextGrid: string[][] = [];
    for (let r = minR; r <= maxR; r++) {
      nextGrid.push(this.grid[r].slice(minC, maxC + 1));
    }

    this.grid = nextGrid;
    this.height = nextGrid.length;
    this.width = nextGrid[0]?.length ?? 0;
    this.placedWords = this.placedWords.map(w => ({
      ...w,
      row: w.row - minR,
      col: w.col - minC,
    }));
  }

  private _canPlace(word: string, row: number, col: number, direction: Direction): boolean {
    if (direction === 'horizontal') {
      if (col < 0 || col + word.length > this.width) return false;
      if (row < 0 || row >= this.height) return false;

      for (let i = 0; i < word.length; i++) {
        const cell = this.grid[row][col + i];
        if (cell !== '' && cell !== word[i]) return false;

        // Check neighbors (simplified check)
        // Ideally we should check that we aren't placing a letter adjacent to another word 
        // in a way that forms an invalid 2-letter word, unless it's the intersection.
        // For this simple version, we rely on the fact that we only place on empty or matching cells.
        // A stricter check would look at [row-1][col+i] and [row+1][col+i] if we are placing horizontal,
        // ensuring they are empty UNLESS [row][col+i] was already occupied (intersection).
        
        if (cell === '') {
            // If we are placing a new letter, check perpendicular neighbors
            if (row > 0 && this.grid[row - 1][col + i] !== '') return false;
            if (row < this.height - 1 && this.grid[row + 1][col + i] !== '') return false;
        }
      }
      
      // Check ends
      if (col > 0 && this.grid[row][col - 1] !== '') return false;
      if (col + word.length < this.width && this.grid[row][col + word.length] !== '') return false;

      return true;
    } else { // vertical
      if (row < 0 || row + word.length > this.height) return false;
      if (col < 0 || col >= this.width) return false;

      for (let i = 0; i < word.length; i++) {
        const cell = this.grid[row + i][col];
        if (cell !== '' && cell !== word[i]) return false;
        
        if (cell === '') {
             // If we are placing a new letter, check perpendicular neighbors
             if (col > 0 && this.grid[row + i][col - 1] !== '') return false;
             if (col < this.width - 1 && this.grid[row + i][col + 1] !== '') return false;
        }
      }

      // Check ends
      if (row > 0 && this.grid[row - 1][col] !== '') return false;
      if (row + word.length < this.height && this.grid[row + word.length][col] !== '') return false;

      return true;
    }
  }

  private _addWordToGrid(word: string, definition: string, row: number, col: number, direction: Direction) {
    if (direction === 'horizontal') {
      for (let i = 0; i < word.length; i++) {
        this.grid[row][col + i] = word[i];
      }
    } else {
      for (let i = 0; i < word.length; i++) {
        this.grid[row + i][col] = word[i];
      }
    }

    this.placedWords.push({
      word,
      definition,
      row,
      col,
      direction,
      // Placeholder; real numbering is assigned after generation.
      number: 0
    });
  }
}

export class ScrambleGenerator {
  generate(wordsData: WordItem[]): ScrambleItem[] {
    const scrambles: ScrambleItem[] = [];
    for (const item of wordsData) {
      const word = item.word;
      const letters = word.split('');
      
      // Shuffle
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      
      let scrambledWord = letters.join('');

      // Ensure it's not the same as original (if possible)
      if (word.length > 1) {
        let attempts = 0;
        while (scrambledWord === word && attempts < 5) {
           // Reshuffle
           for (let i = letters.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [letters[i], letters[j]] = [letters[j], letters[i]];
            }
            scrambledWord = letters.join('');
            attempts++;
        }
      }

      scrambles.push({
        original: word,
        scrambled: scrambledWord,
        definition: item.definition
      });
    }
    return scrambles;
  }
}

export class WordSearchGenerator {
    width: number;
    height: number;
    grid: string[][];
    placedWords: PlacedWord[];
    
    constructor(width: number = 15, height: number = 15) {
        this.width = width;
        this.height = height;
        this.grid = Array(height).fill(null).map(() => Array(width).fill(''));
        this.placedWords = [];
    }

    generate(wordsData: WordItem[]): { grid: string[][], placedWords: PlacedWord[] } {
        // Reset
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(''));
        this.placedWords = [];
        
        // Sort by length descending to place large words first
        const sortedWords = [...wordsData].sort((a, b) => b.word.length - a.word.length);
        
        for (const wordItem of sortedWords) {
            this._placeWord(wordItem);
        }

        // Fill empty spaces
        this._fillEmptySpaces();

        return { grid: this.grid, placedWords: this.placedWords };
    }

    private _placeWord(wordItem: WordItem) {
        const word = wordItem.word;
        const directions: Direction[] = ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up'];
        
        // Try 50 times to place the word
        for (let attempt = 0; attempt < 50; attempt++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const row = Math.floor(Math.random() * this.height);
            const col = Math.floor(Math.random() * this.width);

            if (this._canPlace(word, row, col, direction)) {
                this._addWordToGrid(word, wordItem.definition, row, col, direction);
                return;
            }
        }
    }

    private _canPlace(word: string, row: number, col: number, direction: Direction): boolean {
        let r = row;
        let c = col;

        for (let i = 0; i < word.length; i++) {
            if (r < 0 || r >= this.height || c < 0 || c >= this.width) return false;
            
            // In word search, we can intersect if the letter is the same
            if (this.grid[r][c] !== '' && this.grid[r][c] !== word[i]) return false;

            if (direction === 'horizontal') c++;
            else if (direction === 'vertical') r++;
            else if (direction === 'diagonal-down') { r++; c++; }
            else if (direction === 'diagonal-up') { r--; c++; }
        }
        return true;
    }

    private _addWordToGrid(word: string, definition: string, row: number, col: number, direction: Direction) {
        let r = row;
        let c = col;

        for (let i = 0; i < word.length; i++) {
            this.grid[r][c] = word[i];
            if (direction === 'horizontal') c++;
            else if (direction === 'vertical') r++;
            else if (direction === 'diagonal-down') { r++; c++; }
            else if (direction === 'diagonal-up') { r--; c++; }
        }

        this.placedWords.push({
            word,
            definition,
            row,
            col,
            direction,
            number: this.placedWords.length + 1
        });
    }

    private _fillEmptySpaces() {
        const alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (this.grid[r][c] === '') {
                    this.grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }
    }
}
