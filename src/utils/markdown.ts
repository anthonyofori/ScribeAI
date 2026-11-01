import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(md: string): string {
  if (!md) return '';
  try {
    return marked.parse(md) as string;
  } catch (err) {
    console.error('Markdown parse error:', err);
    return `<p>${md.replace(/\n/g, '<br/>')}</p>`;
  }
}
