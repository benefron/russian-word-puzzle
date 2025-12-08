import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '10');
  const minLength = parseInt(searchParams.get('minLength') || '4');
  const maxLength = parseInt(searchParams.get('maxLength') || '10');
  const difficulty = parseInt(searchParams.get('difficulty') || '1'); // 1 to 5

  // Determine mix ratio based on difficulty
  // Level 1: 100% Common
  // Level 2: 75% Common
  // Level 3: 50% Common
  // Level 4: 25% Common
  // Level 5: 0% Common (100% Random)
  
  let commonRatio = 1.0;
  if (difficulty === 2) commonRatio = 0.75;
  if (difficulty === 3) commonRatio = 0.50;
  if (difficulty === 4) commonRatio = 0.25;
  if (difficulty === 5) commonRatio = 0.0;

  const commonCount = Math.round(count * commonRatio);
  const randomCount = count - commonCount;

  const finalWords: { word: string; definition: string }[] = [];

  // 1. Fetch Common Words
  if (commonCount > 0) {
    try {
        const filePath = path.join(process.cwd(), 'data', 'common_words.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let allWords: { word: string; definition: string }[] = JSON.parse(fileContent);
        
        // Filter by length
        allWords = allWords.filter(w => w.word.length >= minLength && w.word.length <= maxLength);

        // Shuffle
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }

        finalWords.push(...allWords.slice(0, commonCount));
    } catch (e) {
        console.error("Failed to load easy words", e);
    }
  }

  // 2. Fetch Random Words (if needed)
  if (randomCount > 0) {
      const randomWords: { word: string; definition: string }[] = [];
      const maxAttempts = randomCount * 10;
      let attempts = 0;

      // Adjust complexity based on difficulty for random words
      // Higher difficulty -> allow longer words
      const currentMinLength = difficulty >= 4 ? Math.max(minLength, 6) : minLength;

      // Function to fetch a single word
      const fetchWord = async (): Promise<{ word: string; definition: string } | null> => {
        try {
          const response = await fetch('https://ru.wiktionary.org/wiki/Special:Random', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CrosswordBot/1.0)'
            },
            cache: 'no-store'
          });
          
          if (!response.ok) return null;
          
          const html = await response.text();
          const $ = cheerio.load(html);

          const titleElem = $('#firstHeading');
          if (!titleElem.length) return null;
          const wordText = titleElem.text().trim();

          if (wordText.length < currentMinLength || wordText.length > maxLength) return null;
          if (!/^[\u0400-\u04FFёЁ-]+$/i.test(wordText)) return null;

          const russianHeader = $('#Русский');
          if (!russianHeader.length) return null;
          
          if (!$.text().includes('Существительное')) return null;

          const meaningHeader = $('#Значение');
          if (!meaningHeader.length) return null;

          let ol = meaningHeader.parent().nextAll('ol').first();
          if (!ol.length) {
              ol = meaningHeader.parent().nextUntil('h3, h4').filter('ol').first();
          }

          if (!ol.length) return null;

          const firstLi = ol.find('li').first();
          if (!firstLi.length) return null;

          let definition = firstLi.text().trim();
          if (definition.includes('◆')) {
            definition = definition.split('◆')[0].trim();
          }
          definition = definition.replace(/\[.*?\]/g, '').trim();

          if (definition) {
            return {
              word: wordText.toUpperCase(),
              definition: definition
            };
          }
        } catch (e) {
            // ignore
        }
        return null;
      };

      // Parallel fetching loop
      while (randomWords.length < randomCount && attempts < maxAttempts) {
        const batchSize = 5;
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
            promises.push(fetchWord());
            attempts++;
        }

        const results = await Promise.all(promises);
        
        for (const res of results) {
            if (res && !randomWords.find(w => w.word === res.word) && !finalWords.find(w => w.word === res.word)) {
                randomWords.push(res);
                if (randomWords.length >= randomCount) break;
            }
        }
        
        if (randomWords.length < randomCount) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      finalWords.push(...randomWords);
  }

  return NextResponse.json(finalWords);
}
