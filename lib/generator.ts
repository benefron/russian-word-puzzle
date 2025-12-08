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
    // Sort words by length (longest first)
    const sortedWords = [...wordsData].sort((a, b) => b.word.length - a.word.length);

    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(''));
    this.placedWords = [];

    for (const wordItem of sortedWords) {
      this._placeWord(wordItem);
    }

    return { grid: this.grid, placedWords: this.placedWords };
  }

  private _placeWord(wordItem: WordItem) {
    const word = wordItem.word;

    // If it's the first word, place it in the middle
    if (this.placedWords.length === 0) {
      const startRow = Math.floor(this.height / 2);
      const startCol = Math.floor((this.width - word.length) / 2);
      if (this._canPlace(word, startRow, startCol, 'horizontal')) {
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

    if (possiblePlacements.length > 0) {
      const choice = possiblePlacements[Math.floor(Math.random() * possiblePlacements.length)];
      this._addWordToGrid(word, wordItem.definition, choice.r, choice.c, choice.direction);
    }
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
      number: this.placedWords.length + 1
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
