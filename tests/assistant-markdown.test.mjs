import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import ts from 'typescript';

test('assistant Markdown displays links and formatting without loading images or interpreting raw HTML', async () => {
  const source = await readFile(new URL('../src/components/assistant/MessageBubble.jsx', import.meta.url), 'utf8');
  const component = vm.runInNewContext(
    ts.transpile(source.replace(/^import .*;\r?\n/gm, '').replace('export default ', ''), {
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    }) + '\nMessageBubble;',
    { React, ReactMarkdown, cn: (...classes) => classes.join(' ') },
  );
  const content = '**Resumo** [Referência](https://example.invalid/guide)\n\n'
    + '![Imagem](https://tracking.invalid/image.png)\n\n'
    + '<iframe src="https://tracking.invalid/frame"></iframe>';
  const html = renderToStaticMarkup(React.createElement(component, { message: { role: 'assistant', content } }));
  assert.match(html, /<strong>Resumo<\/strong>/);
  assert.match(html, /href="https:\/\/example\.invalid\/guide"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<(img|iframe)\b|tracking\.invalid/);
});
