/** Human typing pace: 80–120ms per word/chunk */
const MIN_MS = 80;
const MAX_MS = 120;

let delayCallCount = 0;

/** Split a Claude delta into word-sized chunks for natural typing rhythm */
export function splitForTyping(text: string): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  const regex = /\S+\s*|\s+/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    chunks.push(match[0]);
  }

  return chunks.length > 0 ? chunks : [text];
}

export function typingDelayMs(token = ""): number {
  let ms = MIN_MS + Math.random() * (MAX_MS - MIN_MS);

  const lastChar = token.slice(-1);

  // Longer pause after sentences — like stopping to think
  if (/[.!?]/.test(lastChar)) {
    ms += 180 + Math.random() * 220;
  } else if (/[,;:]/.test(lastChar)) {
    ms += 60 + Math.random() * 80;
  } else if (lastChar === "\n") {
    ms += 120 + Math.random() * 150;
  }

  // Occasional hesitation mid-message (~7%)
  if (Math.random() < 0.07) {
    ms += 150 + Math.random() * 250;
  }

  return Math.round(ms);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function delayBeforeToken(token = ""): Promise<void> {
  const ms = typingDelayMs(token);
  delayCallCount += 1;
  await sleep(ms);
}

export function getTypingDelayRange(): { min: number; max: number } {
  return { min: MIN_MS, max: MAX_MS };
}
