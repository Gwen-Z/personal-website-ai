export interface NoteLike {
  title?: string;
  content?: string;
  content_text?: string;
  component_instances?: Array<{ id: string; type: string; title?: string; content?: string }>;
  component_data?: Record<string, any>;
}

function extractFirstSentence(text: string): string {
  if (!text) return '';
  const separators = /[。！？.!?\n]/;
  const first = text.split(separators)[0] || '';
  return first.trim();
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen);
}

export function getDisplayTitle(note: NoteLike, maxLen: number = 10): string {
  if (!note) return '';
  // Prefer the first text-short instance's value from component_data; fall back to its content
  const shortInstance = (note.component_instances || []).find(ci => ci.type === 'text-short');
  if (shortInstance) {
    const dataEntry = note.component_data ? note.component_data[shortInstance.id] : undefined;
    const value = typeof dataEntry?.value === 'string' ? dataEntry.value : (shortInstance.content || '');
    const sentence = extractFirstSentence(value);
    if (sentence) return truncate(sentence, maxLen);
  }

  // If component_instances are not present (e.g., notes list), try to find a text-short entry directly in component_data
  if (!shortInstance && note.component_data) {
    for (const key of Object.keys(note.component_data)) {
      const entry = note.component_data[key];
      const entryType = typeof entry?.type === 'string' ? entry.type : '';
      const entryValue = typeof entry?.value === 'string' ? entry.value : '';
      if (entryType === 'text-short' && entryValue) {
        const sentence = extractFirstSentence(entryValue);
        if (sentence) return truncate(sentence, maxLen);
      }
    }
  }

  const fromContentText = extractFirstSentence(note.content_text || '');
  if (fromContentText) return truncate(fromContentText, maxLen);

  const fromContent = extractFirstSentence(note.content || '');
  if (fromContent) return truncate(fromContent, maxLen);

  return truncate(note.title || '', maxLen);
}


