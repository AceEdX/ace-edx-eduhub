/**
 * Strips markdown decoration so AI output reads as clean, postable plain text:
 * no asterisks, no hash headings, no dash bullets, no em dashes.
 */
export function toPlainText(input: string) {
  return input
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S(?:.*?\S)?)\*(?=\s|$)/g, "$1$2")
    .replace(/(^|\s)_(\S(?:.*?\S)?)_(?=\s|$)/g, "$1$2")
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-—–_]{3,}\s*$/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2")
    .replace(/[—–]/g, "-")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
