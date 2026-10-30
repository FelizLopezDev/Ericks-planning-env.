export function cleanAssistantText(input: string | undefined | null): string {
  if (!input) return '';
  let t = input.replace(/\r\n/g, '\n');
  t = t.replace(/```[a-zA-Z0-9]*\n?/g, '');
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, '');
  t = t.replace(/^\s*(?:[-*_]\s*){3,}$/gm, '');
  t = t.replace(/^(\s*)[*+-]\s+/gm, '$1• ');
  t = t.replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1$2');
  t = t.replace(/(^|[\s(])_{1,2}([^_\n]+)_{1,2}(?=[\s).,;:!?]|$)/g, '$1$2');
  t = t.replace(/`([^`\n]+)`/g, '$1');
  t = t.replace(/^>\s?/gm, '');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)');
  t = t.replace(/^[ \t]*\|?[ \t:-]*(?:\|[ \t:-]+)+\|?[ \t]*$/gm, (m: string) => (/[A-Za-z0-9]/.test(m) ? m : ''));
  t = t.replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_: string, row: string) => row.split('|').map((c) => c.trim()).filter(Boolean).join(' · '));
  t = t.replace(/(\d)\s*\*\s*(\d)/g, '$1 × $2');
  t = t.replace(/[*#]+/g, '');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}
