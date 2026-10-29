import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('workspace has definite viewport height, independent of flex content',()=>{
 const css=readFileSync('src/index.css','utf8');
 assert.match(css,/\.header-imperial\s*\{[^}]*height:56px/);
 assert.match(css,/\.ameeq-route\s*\{[^}]*flex:none;[^}]*height:calc\(100dvh - 56px\)/);
 assert.match(css,/grid-template-columns:240px minmax\(0,1fr\) 320px/);
 assert.match(css,/@media\(max-width:850px\)/);
});
