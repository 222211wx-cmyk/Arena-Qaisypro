import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cloneText, mountCloneTranslation } from './clone-translation';
beforeEach(()=>{localStorage.clear();document.body.innerHTML='<div id="root"><button id="test-button">Password</button><label>Player Name</label><input id="password" value="sensitive"><div role="log">Password</div></div>';});
afterEach(()=>{document.getElementById('ameeq-translator')?.remove();vi.restoreAllMocks();});
it('translates matching labels but never fabricates missing Amazigh translations',()=>{
 expect(cloneText('Password','fr')).toBe('Mot de passe');expect(cloneText('unknown sentence','tzm')).toBe('unknown sentence');
 expect(cloneText('Player Name','ar-MA')).toBe('اسم اللاعب');
});
it('preserves DOM nodes, handlers and input values while applying and saving corrections',async()=>{
 const button=document.getElementById('test-button')!;const clicked=vi.fn();button.onclick=clicked;
 mountCloneTranslation();const select=document.getElementById('clone-lang') as HTMLSelectElement;
 select.value='fr';select.dispatchEvent(new Event('change'));await new Promise(r=>setTimeout(r,160));
 expect(button.textContent).toBe('Mot de passe');button.click();expect(clicked).toHaveBeenCalledOnce();
 expect((document.getElementById('password') as HTMLInputElement).value).toBe('sensitive');expect(document.querySelector('[role="log"]')?.textContent).toBe('Password');
 document.getElementById('clone-toggle')!.click();const text=document.getElementById('clone-text') as HTMLSelectElement;text.value='Password';text.dispatchEvent(new Event('change'));
 (document.getElementById('clone-correction') as HTMLInputElement).value='<b>Mon mot</b>';document.getElementById('clone-save')!.click();
 expect(button.textContent).toBe('<b>Mon mot</b>');expect(button.querySelector('b')).toBeNull();expect(cloneText('Password','fr')).toBe('<b>Mon mot</b>');
});
it('closes translation suggestions and clears a correction with one click',()=>{
 mountCloneTranslation();document.getElementById('clone-toggle')!.click();
 const input=document.getElementById('clone-correction') as HTMLInputElement;input.value='remove';document.getElementById('clone-clear')!.click();expect(input.value).toBe('');
 document.getElementById('clone-close')!.click();expect((document.getElementById('clone-controls') as HTMLElement).hidden).toBe(true);
});
