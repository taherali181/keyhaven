export const COMMON_WORDS_200 = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "I", "with",
  "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "his", "from", "they", "say",
  "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
  "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no",
  "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see",
  "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after",
  "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any",
  "these", "give", "day", "most", "us", "water", "long", "find", "very", "still", "world", "between",
  "life", "call", "before", "right", "down", "side", "been", "now", "find", "place", "little", "state",
  "where", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under",
  "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while",
  "number", "part", "turn", "real", "leave", "might", "point", "form", "child", "few", "small", "since",
  "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during",
  "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program",
  "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact",
  "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

export function generateRandomWords(count: number, withPunctuation = false, withNumbers = false): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    let word = COMMON_WORDS_200[Math.floor(Math.random() * COMMON_WORDS_200.length)];
    if (withNumbers && Math.random() < 0.15) {
      word = Math.floor(Math.random() * 1000).toString();
    }
    if (withPunctuation && Math.random() < 0.2) {
      const puncts = [',', '.', '!', '?', ';', '"'];
      const p = puncts[Math.floor(Math.random() * puncts.length)];
      if (p === '"') {
        word = `"${word}"`;
      } else {
        word = `${word}${p}`;
      }
    }
    words.push(word);
  }
  return words.join(' ');
}
