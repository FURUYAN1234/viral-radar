import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('right-top emergency control is outside the header flow with a reserved viewport band',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const template=main.slice(main.indexOf('  app.innerHTML = `'));
 assert.ok(template.indexOf('id="stop-ai"')<template.indexOf('<main class="app-shell'),'stop must not expand or scroll away with the header');
 const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
 assert.match(css,/body\.ai-workspace-ready\s*\{[^}]*padding-top:\s*var\(--ai-stop-space\)/);
 assert.match(css,/\.ai-emergency-stop\s*\{[^}]*position:\s*fixed/);
 assert.match(css,/\.openai-model-details[^}]*overflow-wrap:\s*anywhere/);
});
