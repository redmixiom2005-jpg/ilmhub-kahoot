import re
import json

def latin_to_uz_cyrillic(text):
    # Mapping of Uzbek Latin specific words and characters to Cyrillic
    custom_map = {
        "Ilmhub Kahoot": "Ilmhub Kahoot",
        "ChatGPT": "ChatGPT",
        "Claude": "Claude",
        "Gemini": "Gemini",
        "JSON": "JSON",
        "CSV": "CSV",
        "PIN": "PIN",
        "QR": "QR",
        "AI": "AI",
        "URL": "URL",
        "O‘zbekiston": "Ўзбекистон",
        "O'zbekiston": "Ўзбекистон",
        "O‘zbekcha": "Ўзбекча",
        "O'zbekcha": "Ўзбекча",
    }
    
    res = text
    # Direct word replacements
    replacements = [
        ("G‘", "Ғ"), ("g‘", "ғ"), ("G'", "Ғ"), ("g'", "ғ"),
        ("O‘", "Ў"), ("o‘", "ў"), ("O'", "Ў"), ("o'", "ў"),
        ("Sh", "Ш"), ("sh", "ш"), ("SH", "Ш"),
        ("Ch", "Ч"), ("ch", "ч"), ("CH", "Ч"),
        ("Yo", "Ё"), ("yo", "ё"), ("YO", "Ё"),
        ("Yu", "Ю"), ("yu", "ю"), ("YU", "Ю"),
        ("Ya", "Я"), ("ya", "я"), ("YA", "Я"),
        ("Ye", "Е"), ("ye", "е"),
        ("Ts", "Ц"), ("ts", "ц"),
        ("A", "А"), ("a", "а"),
        ("B", "Б"), ("b", "б"),
        ("D", "Д"), ("d", "д"),
        ("E", "Э"), ("e", "е"),
        ("F", "Ф"), ("f", "ф"),
        ("G", "Г"), ("g", "г"),
        ("H", "Ҳ"), ("h", "ҳ"),
        ("I", "И"), ("i", "и"),
        ("J", "Ж"), ("j", "ж"),
        ("K", "К"), ("k", "к"),
        ("L", "Л"), ("l", "л"),
        ("M", "М"), ("m", "м"),
        ("N", "Н"), ("n", "н"),
        ("O", "О"), ("o", "о"),
        ("P", "П"), ("p", "п"),
        ("Q", "Қ"), ("q", "қ"),
        ("R", "Р"), ("r", "р"),
        ("S", "С"), ("s", "с"),
        ("T", "Т"), ("t", "т"),
        ("U", "У"), ("u", "у"),
        ("V", "В"), ("v", "в"),
        ("X", "Х"), ("x", "х"),
        ("Y", "Й"), ("y", "й"),
        ("Z", "З"), ("z", "з"),
        ("’", "ъ"), ("'", "ъ"),
    ]
    
    # Do token based or safe replacement preserving tags and technical terms
    # For now, handle words
    words = res.split(' ')
    trans_words = []
    for w in words:
        if w in ['Ilmhub', 'Kahoot', 'PIN', 'QR', 'AI', 'CSV', 'JSON', 'URL', 'Google', 'Vercel', 'Firebase', 'pts', '1', '2', '3', '4', 'A', 'B', 'C', 'D', '✓', '✕', '00:12', '728', '491']:
            trans_words.append(w)
            continue
        tw = w
        # Handle start of word Ye -> Е, E -> Э
        if tw.startswith('Ye') or tw.startswith('ye'):
            tw = ('Ё' if tw.startswith('Ye') else 'е') + tw[2:]
        for lat, cyr in replacements:
            tw = tw.replace(lat, cyr)
        trans_words.append(tw)
    return ' '.join(trans_words)

print("Helper ready")
