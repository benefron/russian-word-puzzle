import json
import os
import re

# Paths
json_path = os.path.join(os.path.dirname(__file__), '../data/common_words.json')

def shorten_definition(definition):
    if not definition:
        return definition
        
    # 1. Remove content in parentheses
    # Handle nested parentheses? Simple regex handles non-nested.
    cleaned = re.sub(r'\([^)]*\)', '', definition)
    
    # 2. Remove content in square brackets (just in case)
    cleaned = re.sub(r'\[[^\]]*\]', '', cleaned)
    
    # 3. Split by semicolon and take the first part
    if ';' in cleaned:
        cleaned = cleaned.split(';')[0]
        
    # 4. Split by period (end of sentence) if it looks like a sentence end
    # Be careful with abbreviations like "см." or "анат."
    # We can split by ". " (dot space)
    if '. ' in cleaned:
        # Check if it's likely an abbreviation (short word before dot)
        # Simple heuristic: split, check length of previous token?
        # For now, let's just take the first part if it's long enough?
        # Actually, many definitions start with "анат. орган...", we don't want to cut at "анат."
        # So maybe only split if the part before is > 3 chars?
        parts = cleaned.split('. ')
        if len(parts) > 1:
             # If the first part is very short (likely abbreviation), keep going
             if len(parts[0]) > 4: 
                 cleaned = parts[0]
    
    cleaned = cleaned.strip()
    
    # 5. Check word count
    words = cleaned.split()
    if len(words) <= 10:
        return cleaned
        
    # 6. If still too long, try splitting by comma
    if ',' in cleaned:
        parts = cleaned.split(',')
        # Take parts until we have enough, or just the first one
        # Usually the first part before a comma is the main definition
        candidate = parts[0].strip()
        if len(candidate.split()) <= 10:
            return candidate
            
    # 7. Try splitting by " или " (or)
    if ' или ' in cleaned:
        parts = cleaned.split(' или ')
        candidate = parts[0].strip()
        if len(candidate.split()) <= 10:
            return candidate

    # 8. If still too long, just truncate to 10 words and add "..."
    # But try to respect sentence structure?
    # Let's just truncate for now if all else fails.
    truncated = ' '.join(words[:10])
    return truncated # + "..." # Optional ellipsis

def process_file():
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        processed_count = 0
        for entry in data:
            original = entry.get('definition', '')
            shortened = shorten_definition(original)
            
            # Ensure we don't end up with empty definitions
            if shortened and len(shortened.strip()) > 0:
                entry['definition'] = shortened
            
            processed_count += 1
            
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {processed_count} definitions.")
        
    except Exception as e:
        print(f"Error processing file: {e}")

if __name__ == "__main__":
    process_file()
