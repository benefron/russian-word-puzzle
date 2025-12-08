import csv
import json
import os
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random
import re

# Paths
csv_path = os.path.join(os.path.dirname(__file__), '../temp_dict_repo/nouns.csv')
json_output_path = os.path.join(os.path.dirname(__file__), '../data/common_words.json')

def fetch_definition(word):
    url = f"https://ru.wiktionary.org/wiki/{word}"
    try:
        # Add a small random delay to be polite
        time.sleep(random.uniform(0.1, 0.5))
        
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; CrosswordBot/1.0)'}, timeout=10)
        if response.status_code != 200:
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the "Значение" (Meaning) header
        # It could be a span with id="Значение" inside an h3/h4, or the header itself
        meaning_node = soup.find(id='Значение')
        if not meaning_node:
            # Try finding by text if id is missing
            for header in soup.find_all(['h3', 'h4', 'h2']):
                if 'Значение' in header.get_text():
                    meaning_node = header
                    break
        
        if not meaning_node:
            # print(f"Debug: 'Значение' header not found for {word}")
            return None
            
        # If we found the span, the header is the parent
        if meaning_node.name == 'span':
            header = meaning_node.parent
        else:
            header = meaning_node
            
        # Helper to find ol in siblings
        def find_ol_in_siblings(start_node):
            current = start_node.next_sibling
            siblings_count = 0
            while current:
                if isinstance(current, str) and not current.strip():
                    current = current.next_sibling
                    continue
                
                if current.name == 'ol':
                    return current
                
                if current.name in ['h3', 'h4', 'h2']:
                    # Reached next section
                    return None
                
                current = current.next_sibling
                siblings_count += 1
                if siblings_count > 50: 
                    break
            return None

        ol_node = find_ol_in_siblings(header)
        
        # If not found and header is in a div, try siblings of the div
        if not ol_node and header.parent.name == 'div':
             ol_node = find_ol_in_siblings(header.parent)

        definition = None
        if ol_node:
            first_li = ol_node.find('li')
            if first_li:
                definition = first_li.get_text(" ", strip=True)
                # Clean up: remove [1], (citation), etc if possible.
                # Remove square brackets and their content
                definition = re.sub(r'\[.*?\]', '', definition)
                # Remove "◆" and everything after it (examples)
                if '◆' in definition:
                    definition = definition.split('◆')[0]
                # Remove extra spaces
                definition = re.sub(r'\s+', ' ', definition).strip()
        
        return definition

    except Exception as e:
        print(f"Error fetching {word}: {e}")
        return None

def process_words():
    words_to_fetch = []
    
    # Read CSV
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            header = next(reader)
            
            count = 0
            for row in reader:
                if count >= 1000: # Limit to 1000
                    break
                if len(row) < 1:
                    continue
                
                word = row[0].strip()
                words_to_fetch.append(word)
                count += 1
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    print(f"Found {len(words_to_fetch)} words. Starting fetch...")
    
    results = []
    
    # Use ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_word = {executor.submit(fetch_definition, word): word for word in words_to_fetch}
        
        completed = 0
        for future in as_completed(future_to_word):
            word = future_to_word[future]
            try:
                definition = future.result()
                if definition:
                    results.append({
                        "word": word,
                        "definition": definition
                    })
                else:
                    # print(f"No definition found for {word}")
                    pass
            except Exception as exc:
                print(f"{word} generated an exception: {exc}")
            
            completed += 1
            if completed % 50 == 0:
                print(f"Progress: {completed}/{len(words_to_fetch)}")

    # Save to JSON
    try:
        with open(json_output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"Successfully saved {len(results)} words to {json_output_path}")
    except Exception as e:
        print(f"Error saving JSON: {e}")

if __name__ == "__main__":
    process_words()
