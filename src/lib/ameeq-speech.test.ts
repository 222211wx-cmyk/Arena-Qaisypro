import { afterEach, expect, it, vi } from 'vitest';
import { speechLocale, speakAmeeq, startAmeeqSpeech } from './ameeq-speech';
afterEach(()=>vi.unstubAllGlobals());
it('chooses French and English separately and does not mislabel Tifinagh as Arabic',()=>{
 expect(speechLocale('Welcome to the empire')).toBe('en-US');expect(speechLocale('Bienvenue citoyen')).toBe('fr-FR');expect(speechLocale('ⴰⵣⵓⵍ')).toBe('zgh-MA');expect(speechLocale('مرحبا')).toBe('ar-MA');
});
it('honors recognition language selection',()=>{
 let instance:any;class Speech{lang='';start(){};constructor(){instance=this;}}
 vi.stubGlobal('SpeechRecognition',Speech);startAmeeqSpeech(vi.fn(),vi.fn(),vi.fn(),'fr-FR');expect(instance.lang).toBe('fr-FR');
});
it('speaks the reply with the matching device voice and exposes end state',()=>{
 const voice={lang:'en-US',name:'English'};let spoken:any;
 vi.stubGlobal('speechSynthesis',{getVoices:()=>[voice],cancel:vi.fn(),speak:(u:any)=>{spoken=u;u.onstart();}});
 vi.stubGlobal('SpeechSynthesisUtterance',class {text:string;constructor(text:string){this.text=text;}});
 const active=vi.fn();speakAmeeq('Welcome to Arena','ar-MA',vi.fn(),active);
 expect(spoken.voice).toBe(voice);expect(spoken.lang).toBe('en-US');expect(active).toHaveBeenCalledWith(true);spoken.onend();expect(active).toHaveBeenCalledWith(false);
});
it('does not promise an Amazigh voice when no such voice is installed',()=>{
 const speak=vi.fn();vi.stubGlobal('speechSynthesis',{getVoices:()=>[],cancel:vi.fn(),speak});vi.stubGlobal('SpeechSynthesisUtterance',class {});
 const notice=vi.fn();speakAmeeq('ⴰⵣⵓⵍ','zgh-MA',notice,vi.fn());expect(speak).not.toHaveBeenCalled();expect(notice).toHaveBeenCalledWith(expect.stringContaining('ما كاينش صوت أمازيغي'));
});
