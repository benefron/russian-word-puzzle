import csv
import json
import os

# Paths
csv_path = os.path.join(os.path.dirname(__file__), '../temp_dict_repo/nouns.csv')
json_output_path = os.path.join(os.path.dirname(__file__), '../data/common_words.json')

def process_words():
    words_list = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            # It's a TSV file
            reader = csv.reader(f, delimiter='\t')
            header = next(reader) # Skip header
            
            count = 0
            for row in reader:
                if count >= 1000:
                    break
                
                if len(row) < 3:
                    continue
                    
                word = row[0].strip()
                # The translation column is index 2
                translation = row[2].strip()
                
                # Basic cleaning of the translation to make it a good clue
                # If there are multiple meanings separated by semicolon, maybe just take the first few?
                # For now, let's keep it as is, it usually provides good context.
                
                words_list.append({
                    "word": word,
                    "definition": translation
                })
                count += 1
                
        # Write to JSON
        with open(json_output_path, 'w', encoding='utf-8') as f:
            json.dump(words_list, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {len(words_list)} words and saved to {json_output_path}")

    except Exception as e:
        print(f"Error processing words: {e}")

if __name__ == "__main__":
    process_words()
