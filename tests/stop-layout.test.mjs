import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('right-top emergency control reserves a viewport band only in manual mode',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const template=main.slice(main.indexOf('  app.innerHTML = `'));
 assert.ok(template.indexOf('id="stop-ai"')<template.indexOf('<main class="app-shell'),'stop must not expand or scroll away with the header');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(css,/body\.ai-workspace-ready:not\(\.furu-mcp-active\)\s*\{[^}]*padding-top:\s*var\(--ai-stop-space\)/);
 assert.match(css,/body\.ai-workspace-ready:not\(\.furu-mcp-active\)::before\s*\{/);
 assert.doesNotMatch(css,/body\.ai-workspace-ready(?:::before)?\s*\{/);
 assert.match(css,/\.ai-emergency-stop\s*\{[^}]*position:\s*fixed/);
 assert.match(css,/\.openai-model-details[^}]*overflow-wrap:\s*anywhere/);
});
