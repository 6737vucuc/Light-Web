// قائمة الكلمات النابية والمحظورة (يمكن توسيعها)
const PROFANITY_WORDS = [
  // كلمات عربية نابية
  'كلمة1', 'كلمة2', 'كلمة3',
  // كلمات إنجليزية نابية
  'badword1', 'badword2', 'badword3',
];

const SPAM_PATTERNS = [
  /http[s]?:\/\/[^\s]+/gi, // روابط
  /\b\d{10,}\b/g, // أرقام هواتف
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // بريد إلكتروني
];

export function filterProfanity(text: string): { cleaned: string; isFlagged: boolean } {
  let cleaned = text;
  let isFlagged = false;

  // فحص الكلمات النابية
  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(cleaned)) {
      isFlagged = true;
      cleaned = cleaned.replace(regex, '*'.repeat(word.length));
    }
  }

  // فحص أنماط البريد الإلكتروني والهواتف
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(cleaned)) {
      isFlagged = true;
      cleaned = cleaned.replace(pattern, '[محتوى محظور]');
    }
  }

  return { cleaned, isFlagged };
}

export function isContentSafe(text: string): boolean {
  const { isFlagged } = filterProfanity(text);
  return !isFlagged;
}
