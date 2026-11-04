import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape.ts';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert("hi")</script>`)).toBe('&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Anna')).toBe('Anna');
  });
});
