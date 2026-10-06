import json
import re

# Comprehensive Uzbek Latin to Uzbek Cyrillic mapping function
def to_cyrillic(text):
    if not text:
        return text
    
    # Exact phrase overrides for perfect grammar and vocabulary
    exact_phrases = {
        "Ilmhub Kahoot": "Ilmhub Kahoot",
        "Live interactive quizzes for teachers and learners": "Ўқитувчи ва ўқувчилар учун жонли интерактив викториналар",
        "Engage classrooms, conferences, and study groups in real-time": "Синфлар, аудиториялар ва гуруҳларни реал вақтда фаоллаштиринг",
        "Home": "Бош саҳифа",
        "Join Game": "Ўйинга кириш",
        "Host Dashboard": "Бошқарув панели",
        "Host Login": "Бошловчи кириши",
        "Sign Out": "Чиқиш",
        "Theme": "Мавзу",
        "Sound": "Овоз",
        "Sound is on": "Овоз ёқилган",
        "Sound is muted": "Овоз ўчирилган",
        "Language": "Тил",
        "Back": "Орқага",
        "Cancel": "Бекор қилиш",
        "Save": "Сақлаш",
        "Saving...": "Сақланмоқда...",
        "Saved ✓": "Сақланди ✓",
        "Delete": "Ўчириш",
        "Edit": "Таҳрирлаш",
        "Copy": "Нусха олиш",
        "Copied to clipboard!": "Нусха олинди!",
        "Loading...": "Юкланмоқда...",
        "Error occurred": "Хатолик юз берди",
        "Retry": "Қайта уриниш",
        "Confirm": "Тасдиқлаш",
        "Close": "Ёпиш",
        "or": "ёки",
        "Demo / Local Mode": "Демо / Локал режим",
        "Connected": "Уланди",
        "Reconnecting...": "Қайта уланмоқда...",
        "Game PIN": "Ўйин PIN-коди",
        "Enter 6-digit PIN": "6 хонали PIN-кодни киритинг",
        "Enter Game": "Ўйинга кириш",
        "Want to host your own quiz?": "Шахсий викторингизни ўтказмоқчимисиз?",
        "Create & Host a Live Game": "Яратиш ва жонли ўйинни бошлаш",
        "Why educators and students choose Ilmhub Kahoot": "Нега устозлар ва талабалар Ilmhub Kahoot'ни танлайди?",
        "Live Real-Time Action": "Жонли реал вақт ҳаракати",
        "Synced countdowns, instant response calculation, and live animated leaderboards.": "Синхрон вақт ҳисоби, зудлик билан балл ҳисоблаш ва анимацион пешқадамлар жадвали.",
        "AI-Powered Question Import": "AI ёрдамида саволларни импорт қилиш",
        "Generate or paste questions directly from ChatGPT, Claude, or Gemini in seconds.": "ChatGPT, Claude ёки Gemini'дан саволларни тўғридан-тўғри сониялар ичида юкланг.",
        "Multi-Language & Accessible": "Кўп тилли ва қулай интерфейс",
        "Native Uzbek, Russian, and English interfaces with high-contrast shapes and colors.": "Ўзбекча, русча ва инглизча интерфейс ҳамда юқори контрастли шакл ва ранглар.",
        "Zero-Install for Players": "Иштирокчилар учун дастур ўрнатиш шарт эмас",
        "Students join anonymously from any phone browser with just a PIN and their name.": "Ўқувчилар ҳар қандай телефон браузеридан PIN-код ва исм билан осонгина киради.",
        "Join Game": "Ўйинга кириш",
        "Enter the game PIN shown on the host screen": "Бошловчи экранида кўрсатилган PIN-кодни киритинг",
        "Enter Your Details": "Маълумотларингизни киритинг",
        "Both your first and last name are required for the scoreboard": "Пешқадамлар жадвали учун исм ва фамилиянгизни киритинг",
        "First Name": "Исм",
        "e.g. Jasur": "Масалан: Жасур",
        "Last Name": "Фамилия",
        "e.g. Alimov": "Масалан: Алимов",
        "Must be at least 2 characters": "Камида 2 та белгидан иборат бўлиши керак",
        "Must be at most 30 characters": "Кўпи билан 30 та белги бўлиши мумкин",
        "Please enter a valid 6-digit game PIN": "Илтимос, 6 хонали тўғри PIN-кодни киритинг",
        "Game not found. Please check the PIN and ensure the host is online.": "Ўйин топилмади. PIN-кодни текширинг ва бошловчи онлайн эканлигига ишонч ҳосил қилинг.",
        "This game has already started or finished.": "Ушбу ўйин бошланиб бўлган ёки якунланган.",
        "A player with this name already joined this game. Please modify slightly.": "Бу исмдаги иштирокчи аллақачон мавжуд. Илтимос, исмни бироз ўзгартиринг.",
        "You're in!": "Сиз ўйиндасиз!",
        "Look at the main screen. The host will start shortly...": "Асосий экранга қаранг. Бошловчи тез орада бошлайди...",
        "Ready to Play": "Ўйинга тайёр",
        "Get Ready!": "Тайёрланинг!",
        "Answer submitted!": "Жавоб қабул қилинди!",
        "Waiting for everyone else to answer...": "Бошқа иштирокчиларнинг жавоблари кутилмоқда...",
        "Genius! Correct Answer!": "Баракалла! Тўғри жавоб!",
        "Not quite right!": "Афсуски, нотўғри жавоб!",
        "Time's up!": "Вақт тугади!",
        "Points Earned": "Тўпланган балл",
        "Streak": "Кетма-кет ғалаба",
        "Current Position": "Ўрнингиз",
        "out of": "дан",
        "players": "иштирокчи",
        "Game Finished!": "Ўйин якунланди!",
        "Your Final Rank": "Якуний ўрнингиз",
        "Your Final Score": "Якуний баллингиз",
        "Join Another Game": "Бошқа ўйинга кириш",
        "My Quizzes": "Менинг викториналарим",
        "Create New Quiz": "Янги викторина яратиш",
        "Import with AI / Text": "AI / Матндан импорт қилиш",
        "No quizzes created yet": "Ҳозирча викториналар йўқ",
        "Start by creating your first quiz or import questions with AI.": "Биринчи викторингизни яратинг ёки сунъий интеллект орқали саволлар юкланг.",
        "Play Live": "Ўйинни бошлаш",
        "Duplicate": "Нусха олиш",
        "Export JSON": "JSON юклаб олиш",
        "Are you sure you want to delete this quiz?": "Ҳақиқатан ҳам ушбу викторинани ўчирмоқчимисиз?",
        "Sample Quizzes (Ready to Host)": "Тайёр намунавий викториналар",
        "Copy & Play": "Нусха олиб ўйнаш",
        "questions": "та савол",
        "Created": "Яратилди",
        "Join at": "Уланиш манзили:",
        "Scan QR to join": "Кириш учун QR-кодни сканерланг",
        "Players in lobby": "Кутилаётган иштирокчилар",
        "Waiting for players to join...": "Иштирокчилар уланиши кутилмоқда...",
        "Start Game": "Ўйинни бошлаш",
        "Kick player": "Четлатиш",
        "Skip Question": "Саволни ўтказиб юбориш",
        "End Round Now": "Раундни дарҳол якунлаш",
        "Next Question": "Кейинги савол",
        "Leaderboard": "Пешқадамлар",
        "Questions": "Саволларга қайтиш",
        "Fullscreen": "Тўлиқ экран",
        "Exit Fullscreen": "Оддий экран",
        "Answered": "Жавоб берди",
        "Round Results": "Раунд натижалари",
        "Correct Answer": "Тўғри жавоб:",
        "Champion Podium": "Ғолиблар шоҳсупаси",
        "1st Place": "1-ўрин",
        "2nd Place": "2-ўрин",
        "3rd Place": "3-ўрин",
        "Final Standings": "Якуний рейтинг жадвали",
        "Export CSV Report": "CSV ҳисоботни юклаб олиш",
        "Play Again": "Қайтадан ўйнаш",
        "Show question on player devices": "Саволни иштирокчилар экранида кўрсатиш",
    }
    
    if text in exact_phrases:
        return exact_phrases[text]
    
    # Character substitutions
    # Convert special Latin pairs
    res = text
    subs = [
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
    
    # Preserve key English brand/system names
    words = res.split(' ')
    out_words = []
    for w in words:
        if w in ['Ilmhub', 'Kahoot', 'PIN', 'QR', 'AI', 'CSV', 'JSON', 'URL', 'Google', 'Vercel', 'Firebase', 'pts', '1', '2', '3', '4', 'A', 'B', 'C', 'D', '✓', '✕']:
            out_words.append(w)
            continue
        cur = w
        for lat, cyr in subs:
            cur = cur.replace(lat, cyr)
        out_words.append(cur)
    return ' '.join(out_words)

# Read current translations.ts
with open('src/i18n/translations.ts', 'r', encoding='utf-8') as f:
    orig = f.read()

# Extract en, ru, uz dictionaries using regex
def extract_dict(lang, text):
    m = re.search(r'\b' + lang + r':\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\s*\},', text, re.DOTALL)
    if not m:
        # try without trailing comma
        m = re.search(r'\b' + lang + r':\s*\{(.*)\n\s*\}\s*as const', text, re.DOTALL)
    if not m:
        raise Exception(f"Could not find {lang}")
    block = m.group(1)
    
    result = {}
    lines = block.split('\n')
    for line in lines:
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        # match key: 'val', or key: "val",
        km = re.match(r'(\w+):\s*(["\'])(.*?)\2,?', line)
        if km:
            result[km.group(1)] = km.group(3)
    return result

en_dict = extract_dict('en', orig)
ru_dict = extract_dict('ru', orig)
uz_dict = extract_dict('uz', orig)

print(f"Loaded: EN={len(en_dict)}, RU={len(ru_dict)}, UZ={len(uz_dict)}")

# Additional keys requested in UI design system
new_keys = {
    'brandSlogan': {
        'en': 'Ilmlilar yetishib chiqadigan maskan !',
        'ru': 'Обитель, где воспитываются ученые и знающие люди!',
        'uz': 'Ilmlilar yetishib chiqadigan maskan !',
        'uz-cyr': 'Илмлилар етишиб чиқадиган маскан !',
    },
    'heroHeading': {
        'en': 'Turn Every Question Into a Game.',
        'ru': 'Превратите каждый вопрос в игру.',
        'uz': 'Har bir savolni o‘yinga aylantiring.',
        'uz-cyr': 'Ҳар бир саволни ўйинга айлантиринг.',
    },
    'heroSubtitle': {
        'en': 'Create engaging quizzes, challenge students, compete with friends and see results in real time.',
        'ru': 'Создавайте викторины, вдохновляйте учеников, соревнуйтесь с друзьями и следите за результатами в реальном времени.',
        'uz': 'Qiziqarli viktorinalar yarating, o‘quvchilarni jalb qiling va natijalarni jonli kuzating.',
        'uz-cyr': 'Қизиқарли викториналар яратинг, ўқувчиларни жалб қилинг ва натижаларни жонли кузатинг.',
    },
    'createQuizCTA': {
        'en': 'Create Quiz',
        'ru': 'Создать викторину',
        'uz': 'Viktorina yaratish',
        'uz-cyr': 'Викторина яратиш',
    },
    'joinGameCTA': {
        'en': 'Join Game',
        'ru': 'Войти в игру',
        'uz': 'O‘yinga kirish',
        'uz-cyr': 'Ўйинга кириш',
    },
    'navHome': {
        'en': 'Home',
        'ru': 'Главная',
        'uz': 'Bosh sahifa',
        'uz-cyr': 'Бош саҳифа',
    },
    'navQuizzes': {
        'en': 'Quizzes',
        'ru': 'Викторины',
        'uz': 'Viktorinalar',
        'uz-cyr': 'Викториналар',
    },
    'navGames': {
        'en': 'Games',
        'ru': 'Игры',
        'uz': 'O‘yinlar',
        'uz-cyr': 'Ўйинлар',
    },
    'navLeaderboard': {
        'en': 'Leaderboard',
        'ru': 'Таблица лидеров',
        'uz': 'Peshqadamlar',
        'uz-cyr': 'Пешқадамлар',
    },
    'navHowItWorks': {
        'en': 'How it works',
        'ru': 'Как это работает',
        'uz': 'Qanday ishlaydi',
        'uz-cyr': 'Қандай ишлайди',
    },
    'navDashboard': {
        'en': 'Dashboard',
        'ru': 'Панель',
        'uz': 'Boshqaruv',
        'uz-cyr': 'Бошқарув',
    },
    'navProfile': {
        'en': 'Profile',
        'ru': 'Профиль',
        'uz': 'Profil',
        'uz-cyr': 'Профиль',
    },
    'navLogin': {
        'en': 'Login',
        'ru': 'Войти',
        'uz': 'Kirish',
        'uz-cyr': 'Кириш',
    },
    'navGetStarted': {
        'en': 'Get Started',
        'ru': 'Начать',
        'uz': 'Boshlash',
        'uz-cyr': 'Бошлаш',
    },
    'navLogout': {
        'en': 'Logout',
        'ru': 'Выйти',
        'uz': 'Chiqish',
        'uz-cyr': 'Чиқиш',
    },
    'scanToJoin': {
        'en': 'SCAN TO JOIN',
        'ru': 'ОТСКАНИРУЙТЕ ДЛЯ ВХОДА',
        'uz': 'KIRISH UCHUN SKANERLANG',
        'uz-cyr': 'КИРИШ УЧУН СКАНЕРЛАНГ',
    },
    'scanQrCodeButton': {
        'en': 'SCAN QR CODE',
        'ru': 'СКАНИРОВАТЬ QR-КОД',
        'uz': 'QR-KODNI SKANERLASH',
        'uz-cyr': 'QR-КОДНИ СКАНЕРЛАШ',
    },
    'scanQrCodePrompt': {
        'en': 'Scan the QR code from the host screen',
        'ru': 'Отсканируйте QR-код с экрана ведущего',
        'uz': 'Boshlovchi ekranidagi QR-kodni skanerlang',
        'uz-cyr': 'Бошловчи экранидаги QR-кодни сканерланг',
    },
    'playersJoining': {
        'en': 'Players are joining...',
        'ru': 'Игроки подключаются...',
        'uz': 'Ishtirokchilar ulanmoqda...',
        'uz-cyr': 'Иштирокчилар уланмоқда...',
    },
    'copyPin': {
        'en': 'Copy PIN',
        'ru': 'Копировать PIN',
        'uz': 'PIN-kodni nusxalash',
        'uz-cyr': 'PIN-кодни нусхалаш',
    },
    'sharePin': {
        'en': 'Share',
        'ru': 'Поделиться',
        'uz': 'Ulashish',
        'uz-cyr': 'Улашиш',
    },
    'copyLink': {
        'en': 'Copy link',
        'ru': 'Копировать ссылку',
        'uz': 'Havolani nusxalash',
        'uz-cyr': 'Ҳаволани нусхалаш',
    },
    'downloadQr': {
        'en': 'Download QR',
        'ru': 'Скачать QR',
        'uz': 'QR-kodni yuklash',
        'uz-cyr': 'QR-кодни юклаш',
    },
    'goodMorningTeacher': {
        'en': 'Good morning, Teacher!',
        'ru': 'Доброе утро, Учитель!',
        'uz': 'Xush kelibsiz, Ustoz!',
        'uz-cyr': 'Хуш келибсиз, Устоз!',
    },
    'totalQuizzes': {
        'en': 'Total Quizzes',
        'ru': 'Всего викторин',
        'uz': 'Jami viktorinalar',
        'uz-cyr': 'Жами викториналар',
    },
    'activeGames': {
        'en': 'Active Games',
        'ru': 'Активные игры',
        'uz': 'Faol o‘yinlar',
        'uz-cyr': 'Фаол ўйинлар',
    },
    'students': {
        'en': 'Students',
        'ru': 'Ученики',
        'uz': 'O‘quvchilar',
        'uz-cyr': 'Ўқувчилар',
    },
    'avgScore': {
        'en': 'Average Score',
        'ru': 'Средний балл',
        'uz': 'O‘rtacha ball',
        'uz-cyr': 'Ўртача балл',
    },
    'recentGames': {
        'en': 'Recent Games',
        'ru': 'Недавние игры',
        'uz': 'So‘nggi o‘yinlar',
        'uz-cyr': 'Сўнгги ўйинлар',
    },
    'firstQuizStartsHere': {
        'en': 'Your first quiz starts here.',
        'ru': 'Ваша первая викторина начинается здесь.',
        'uz': 'Birinchi viktorinangiz shu yerdan boshlanadi.',
        'uz-cyr': 'Биринчи викторинангиз шу ердан бошланади.',
    },
    'noActiveGames': {
        'en': 'No active games',
        'ru': 'Нет активных игр',
        'uz': 'Faol o‘yinlar yo‘q',
        'uz-cyr': 'Фаол ўйинлар йўқ',
    },
    'createGame': {
        'en': 'Create Game',
        'ru': 'Создать игру',
        'uz': 'O‘yin yaratish',
        'uz-cyr': 'Ўйин яратиш',
    },
    'winner': {
        'en': 'Winner',
        'ru': 'Победитель',
        'uz': 'G‘olib',
        'uz-cyr': 'Ғолиб',
    },
    'accuracy': {
        'en': 'Accuracy',
        'ru': 'Точность',
        'uz': 'Aniqlik darajasi',
        'uz-cyr': 'Аниқлик даражаси',
    },
    'shareResults': {
        'en': 'Share Results',
        'ru': 'Поделиться результатами',
        'uz': 'Natijalarni ulashish',
        'uz-cyr': 'Натижаларни улашиш',
    },
    'toastQuizCreated': {
        'en': 'Quiz created successfully',
        'ru': 'Викторина успешно создана',
        'uz': 'Viktorina muvaffaqiyatli yaratildi',
        'uz-cyr': 'Викторина муваффақиятли яратилди',
    },
    'toastGameJoined': {
        'en': 'Game joined!',
        'ru': 'Вы вошли в игру!',
        'uz': 'O‘yinga ulandingiz!',
        'uz-cyr': 'Ўйинга уландингиз!',
    },
    'toastPinCopied': {
        'en': 'PIN copied to clipboard!',
        'ru': 'PIN скопирован в буфер обмена!',
        'uz': 'PIN-kod nusxalandi!',
        'uz-cyr': 'PIN-код нусхаланди!',
    },
    'toastAnswerSubmitted': {
        'en': 'Answer submitted!',
        'ru': 'Ответ отправлен!',
        'uz': 'Javob qabul qilindi!',
        'uz-cyr': 'Жавоб қабул қилинди!',
    },
    'toastSettingsSaved': {
        'en': 'Settings saved!',
        'ru': 'Настройки сохранены!',
        'uz': 'Sozlamalar saqlandi!',
        'uz-cyr': 'Созламалар сақланди!',
    },
    'errPinNotFound': {
        'en': 'Please check the PIN and try again.',
        'ru': 'Проверьте PIN и попробуйте снова.',
        'uz': 'Iltimos, PIN-kodni tekshirib qayta urinib ko‘ring.',
        'uz-cyr': 'Илтимос, PIN-кодни текшириб қайта уриниб кўринг.',
    },
    'errConnectionLost': {
        'en': 'Connection lost. Trying to reconnect...',
        'ru': 'Связь потеряна. Переподключение...',
        'uz': 'Aloqa uzildi. Qayta ulanishga urinilmoqda...',
        'uz-cyr': 'Алоқа узилди. Қайта уланишга уринилмоқда...',
    },
    'errGameEnded': {
        'en': 'This game session has ended.',
        'ru': 'Эта игровая сессия завершена.',
        'uz': 'Ushbu o‘yin sessiyasi yakunlangan.',
        'uz-cyr': 'Ушбу ўйин сессияси якунланган.',
    },
    'howItWorksStep1Title': {
        'en': '1. Create or Choose Quiz',
        'ru': '1. Создайте или выберите викторину',
        'uz': '1. Viktorina tanlang yoki yarating',
        'uz-cyr': '1. Викторина танланг ёки яратинг',
    },
    'howItWorksStep1Desc': {
        'en': 'Pick from curated educational quizzes or create your own in seconds using AI.',
        'ru': 'Выберите готовую тему или создайте авторскую викторину с помощью ИИ за секунды.',
        'uz': 'Tayyor taʼlimiy mavzulardan tanlang yoki sunʼiy intellekt orqali sanoqli soniyalarda yarating.',
        'uz-cyr': 'Тайёр таълимий мавзулардан танланг ёки сунъий интеллект орқали саноқли сонияларда яратинг.',
    },
    'howItWorksStep2Title': {
        'en': '2. Share PIN or QR Code',
        'ru': '2. Покажите PIN или QR-код',
        'uz': '2. PIN-kod yoki QR-kodni ko‘rsating',
        'uz-cyr': '2. PIN-код ёки QR-кодни кўрсатинг',
    },
    'howItWorksStep2Desc': {
        'en': 'Display the big game PIN on the classroom projector or screen. Students join instantly.',
        'ru': 'Выведите крупный PIN на экран или проектор в классе. Ученики подключаются с телефонов.',
        'uz': 'Sinf proyektori yoki katta ekranda PIN-kodni ko‘rsating. O‘quvchilar telefon orqali bir zumda ulanadi.',
        'uz-cyr': 'Синф проектори ёки катта экранда PIN-кодни кўрсатинг. Ўқувчилар телефон орқали бир зумда уланади.',
    },
    'howItWorksStep3Title': {
        'en': '3. Compete in Real Time',
        'ru': '3. Соревнуйтесь в реальном времени',
        'uz': '3. Jonli bahsda raqobatlashing',
        'uz-cyr': '3. Жонли баҳсда рақобатлашинг',
    },
    'howItWorksStep3Desc': {
        'en': 'Students answer fast to earn bonus points, track the live leaderboard, and celebrate on the podium!',
        'ru': 'Ученики быстро отвечают, зарабатывают баллы, следят за рейтингом и поднимаются на пьедестал!',
        'uz': 'Ishtirokchilar tez javob berib qo‘shimcha ball to‘playdi, jonli reytingda ko‘tariladi va shohsupaga chiqadi!',
        'uz-cyr': 'Иштирокчилар тез жавоб бериб қўшимча балл тўплайди, жонли рейтингда кўтарилади ва шоҳсупага чиқади!',
    },
    'enterPinHeading': {
        'en': 'Join a Game',
        'ru': 'Войти в игру',
        'uz': 'O‘yinga kirish',
        'uz-cyr': 'Ўйинга кириш',
    },
    'enterPinSubtitle': {
        'en': 'Enter the Game PIN to continue',
        'ru': 'Введите PIN-код игры для продолжения',
        'uz': 'Davom etish uchun o‘yin PIN-kodini kiriting',
        'uz-cyr': 'Давом этиш учун ўйин PIN-кодини киритинг',
    },
    'loginWelcome': {
        'en': 'Welcome back!',
        'ru': 'С возвращением!',
        'uz': 'Qaytganingizdan xursandmiz!',
        'uz-cyr': 'Қайтганингиздан хурсандмиз!',
    },
    'loginSubtitle': {
        'en': 'Sign in to host live games and manage quizzes',
        'ru': 'Войдите, чтобы проводить игры и управлять викторинами',
        'uz': 'Jonli o‘yinlar o‘tkazish va viktorinalarni boshqarish uchun kiring',
        'uz-cyr': 'Жонли ўйинлар ўтказиш ва викториналарни бошқариш учун киринг',
    },
    'signInWithGoogle': {
        'en': 'Continue with Google',
        'ru': 'Войти через Google',
        'uz': 'Google orqali kirish',
        'uz-cyr': 'Google орқали кириш',
    },
    'signInDemoHost': {
        'en': 'Continue as Demo Host',
        'ru': 'Войти как демо-ведущий',
        'uz': 'Demo-boshlovchi sifatida kirish',
        'uz-cyr': 'Demo-бошловчи сифатида кириш',
    },
    'gamePinLabel': {
        'en': 'GAME PIN',
        'ru': 'ПИН-КОД ИГРЫ',
        'uz': 'O‘YIN PIN-KODI',
        'uz-cyr': 'ЎЙИН PIN-КОДИ',
    },
    'playersCount': {
        'en': 'Players',
        'ru': 'Игроки',
        'uz': 'Ishtirokchilar',
        'uz-cyr': 'Иштирокчилар',
    },
    'questionLabel': {
        'en': 'Question',
        'ru': 'Вопрос',
        'uz': 'Savol',
        'uz-cyr': 'Савол',
    },
    'timerLabel': {
        'en': 'Timer',
        'ru': 'Таймер',
        'uz': 'Vaqt',
        'uz-cyr': 'Вақт',
    },
    'scoreLabel': {
        'en': 'Score',
        'ru': 'Счет',
        'uz': 'Ball',
        'uz-cyr': 'Балл',
    },
    'secShort': {
        'en': 'sec',
        'ru': 'сек',
        'uz': 'son',
        'uz-cyr': 'сон',
    },
    'rank': {
        'en': 'Rank',
        'ru': 'Место',
        'uz': 'O‘rin',
        'uz-cyr': 'Ўрин',
    },
    'gameComplete': {
        'en': 'Game Complete!',
        'ru': 'Игра завершена!',
        'uz': 'O‘yin muvaffaqiyatli yakunlandi!',
        'uz-cyr': 'Ўйин муваффақиятли якунланди!',
    },
    'totalQuestions': {
        'en': 'Total Questions',
        'ru': 'Всего вопросов',
        'uz': 'Jami savollar',
        'uz-cyr': 'Жами саволлар',
    },
}

for k, v in new_keys.items():
    en_dict[k] = v['en']
    ru_dict[k] = v['ru']
    uz_dict[k] = v['uz']

# Now build uz-cyr dict by transliterating uz_dict or using new_keys
uz_cyr_dict = {}
for k in en_dict.keys():
    if k in new_keys and 'uz-cyr' in new_keys[k]:
        uz_cyr_dict[k] = new_keys[k]['uz-cyr']
    elif k in uz_dict:
        uz_cyr_dict[k] = to_cyrillic(uz_dict[k])
    else:
        uz_cyr_dict[k] = to_cyrillic(en_dict[k])

all_keys = list(en_dict.keys())

def escape_str(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

def format_dict(d):
    lines = []
    for k in all_keys:
        val = d.get(k, '')
        lines.append(f"    {k}: '{escape_str(val)}',")
    return '\n'.join(lines)

output_ts = f"""export type SupportedLocale = 'en' | 'ru' | 'uz' | 'uz-cyr';

export const translations = {{
  en: {{
{format_dict(en_dict)}
  }},

  ru: {{
{format_dict(ru_dict)}
  }},

  uz: {{
{format_dict(uz_dict)}
  }},

  'uz-cyr': {{
{format_dict(uz_cyr_dict)}
  }},
}} as const;

export type TranslationKey = keyof typeof translations.en;
"""

with open('src/i18n/translations.ts', 'w', encoding='utf-8') as f:
    f.write(output_ts)

print(f"Successfully wrote {len(all_keys)} keys to all 4 languages in src/i18n/translations.ts")
