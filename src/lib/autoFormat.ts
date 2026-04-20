/**
 * Auto-formats plain text into structured markdown-like content.
 * If the text already contains formatting (headings, lists, etc.), returns as-is.
 */
export function autoFormatText(text: string): string {
  if (!text.trim()) return text;

  // Check if already formatted (has markdown headings, lists, bold, etc.)
  const hasFormatting = /^#{1,3}\s|^\*\s|^-\s|^\d+\.\s|\*\*.*\*\*/m.test(text);
  if (hasFormatting) return text;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return text;

  const formatted: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // Detect potential headings: short lines (< 60 chars) followed by longer content or at start
    const isShortLine = line.length < 60 && !line.endsWith('.');
    const isFollowedByContent = nextLine && nextLine.length > line.length;
    const endsWithColon = line.endsWith(':');

    if (i === 0 && isShortLine) {
      // First short line is likely a title
      formatted.push(`# ${line}`);
      formatted.push('');
    } else if (endsWithColon) {
      // Lines ending with colon are sub-headings
      formatted.push('');
      formatted.push(`## ${line.slice(0, -1)}`);
      formatted.push('');
    } else if (isShortLine && isFollowedByContent && !inList && line.length > 3) {
      // Short lines followed by longer content are likely section headers
      formatted.push('');
      formatted.push(`## ${line}`);
      formatted.push('');
    } else if (line.match(/^[\-•·]\s*/)) {
      // Already a list item
      formatted.push(`- ${line.replace(/^[\-•·]\s*/, '')}`);
      inList = true;
    } else {
      if (inList) {
        formatted.push('');
        inList = false;
      }
      formatted.push(line);
    }
  }

  return formatted.join('\n');
}
