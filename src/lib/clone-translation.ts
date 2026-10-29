// Same DOM and event handlers: translate text nodes only, never replace forms,
// input values, HTML, authentication state, user posts, chat, or media metadata.
export type CloneLang = 'ar-MA'|'ary'|'tzm'|'fr'|'en'|'es';
const languages:CloneLang[]=['ar-MA','ary','tzm','fr','en','es'];
const words:Record<CloneLang,string[]>={
 'en':['Login','Register','Email or player name','Password','Date of Birth','Remember me','Forgot password','Send','Search','Clips','Publish a clip','No public clips returned. Refresh or check filters.','Retry','Home','Social','Business','Education','Competitions','Stop','Save correction'],
 'fr':['Connexion','Inscription','E-mail ou nom du joueur','Mot de passe','Date de naissance','Se souvenir de moi','Mot de passe oublié','Envoyer','Rechercher','Clips','Publier un clip','Aucun clip public retourné. Actualisez ou vérifiez les filtres.','Réessayer','Accueil','Social','Commerce','Éducation','Compétitions','Arrêter','Enregistrer la correction'],
 'ar-MA':['تسجيل الدخول','التسجيل','البريد الإلكتروني أو اسم اللاعب','كلمة المرور','تاريخ الميلاد','تذكرني','نسيت كلمة السر','إرسال','بحث','كليبسز','نشر كليب','لم يرجع الدليل كليبسز عامة. حدّث أو تحقق من الفلاتر.','إعادة المحاولة','الرئيسية','تعارف','تجارة','تعليم','مسابقات','إيقاف','حفظ التصحيح'],
 'ary':['دخل لحسابك','سجّل','الإيميل ولا اسم اللاعب','كلمة السر','تاريخ الازدياد','بقى فاكرني','نسيت كلمة السر','صيفط','قلب','كليبسز','نشر كليب','الدليل ما رجّع حتى كليب عام. عاود حدّث وتأكد من الفلتر.','عاود','الرئيسية','تعارف','تجارة','تعليم','مسابقات','وقف','حفظ التصحيح'],
 'tzm':['ⴽⵛⵎ / Kcem','التسجيل','البريد الإلكتروني أو اسم اللاعب','كلمة المرور','تاريخ الميلاد','تذكرني','نسيت كلمة السر','إرسال','بحث','كليبسز','نشر كليب','لم يرجع الدليل كليبسز عامة. حدّث أو تحقق من الفلاتر.','إعادة المحاولة','الرئيسية','تعارف','تجارة','تعليم','مسابقات','إيقاف','حفظ التصحيح'],
 'es':['Iniciar sesión','Registro','Correo o nombre de jugador','Contraseña','Fecha de nacimiento','Recordarme','Olvidé mi contraseña','Enviar','Buscar','Clips','Publicar un clip','No se devolvieron clips públicos. Actualiza o comprueba los filtros.','Reintentar','Inicio','Social','Comercio','Educación','Competiciones','Detener','Guardar corrección'],
};
for(const [locale,label] of Object.entries({'en':'Player Name','fr':'Nom du joueur','ar-MA':'اسم اللاعب','ary':'اسم اللاعب','tzm':'اسم اللاعب','es':'Nombre de jugador'}))words[locale as CloneLang].push(label);
const aliases:Record<string,number>={'Player Name':20,'PLAYER NAME':20,'Nom du joueur':20,'اسم اللاعب':20,'DATE OF BIRTH':4,'Date of Birth — all ages welcome':4,'Aucun Clip pour l\'instant. Soyez le premier à publier.':11,'Rechercher':8,'Recherche':8,'Retour':13,'Publier un clip':10};
const records=new Map<Text,{source:string;last:string}>();
let dictionaries:Record<string,Record<string,string>>={};
const reverseDictionary=new Map<string,string>();
export function registerCloneDictionaries(value:typeof dictionaries){dictionaries=value;reverseDictionary.clear();for(const row of Object.values(value))for(const [key,text] of Object.entries(row))reverseDictionary.set(text,key);}
function stored(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function save(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Private mode may block persistence. */}}
function normalize(text:string){return text.trim().toLocaleLowerCase();}
export function cloneText(text:string,lang:CloneLang):string {
 const correction=stored(`ameeq_correction:${lang}:${text}`);if(correction!==null)return correction;
 const key=reverseDictionary.get(text);if(key){const target=lang==='ar-MA'||lang==='ary'||lang==='tzm'?'ar':lang;return dictionaries[target]?.[key]??text;}
 let index=aliases[text];
 if(index===undefined)for(const list of Object.values(words)){const found=list.findIndex(v=>normalize(v)===normalize(text));if(found>=0){index=found;break;}}
 return index===undefined?text:words[lang][index];
}
export function mountCloneTranslation(){
 if(document.getElementById('ameeq-translator'))return;
 let lang=(stored('ameeq_lang')||(stored('gdna_lang')==='ar'?'ar-MA':stored('gdna_lang'))||'ar-MA') as CloneLang;if(!languages.includes(lang))lang='ar-MA';
 const widget=document.createElement('aside');widget.id='ameeq-translator';widget.setAttribute('aria-label','Translation and local corrections');
 widget.innerHTML='<button type="button" id="clone-toggle" aria-expanded="false">🌐 ترجمة + ✎</button><div id="clone-controls" hidden><label>لغة الصفحة / Page language<select id="clone-lang"></select></label><p id="clone-coverage"></p><label>✎ النص / Text<select id="clone-text"></select></label><label>التصحيح المحلي / Correction<input id="clone-correction" maxlength="1000"></label><button type="button" id="clone-save">حفظ التصحيح / Save correction</button><p role="status" id="clone-status"></p></div>';
 const style=document.createElement('style');style.textContent='#ameeq-translator{position:fixed;top:64px;inset-inline-end:12px;z-index:10000;font:13px system-ui;color:#fff;max-width:calc(100vw - 24px)}#ameeq-translator button,#ameeq-translator input,#ameeq-translator select{font:inherit;color:#fff;background:#16130c;border:1px solid #c9a84c;padding:8px;border-radius:8px;min-height:36px;max-width:100%}#clone-controls{background:#100e08;border:1px solid #c9a84c;padding:12px;border-radius:10px;width:320px;max-width:calc(100vw - 24px);max-height:65dvh;overflow:auto}#clone-controls[hidden]{display:none}#clone-controls label{display:grid;margin:8px 0}#clone-controls p{margin:6px 0}';
 document.head.append(style);document.body.append(widget);
 const controls=widget.querySelector<HTMLElement>('#clone-controls')!;
 const select=widget.querySelector<HTMLSelectElement>('#clone-lang')!;
 for(const code of languages){const option=document.createElement('option');option.value=code;option.textContent=({ 'ar-MA':'العربية','ary':'الدارجة','tzm':'ⵜⴰⵎⴰⵣⵉⵖⵜ / Tamazight','fr':'Français','en':'English','es':'Español'})[code];select.append(option);}select.value=lang;
 const textSelect=widget.querySelector<HTMLSelectElement>('#clone-text')!;
 const input=widget.querySelector<HTMLInputElement>('#clone-correction')!;
 const status=widget.querySelector<HTMLElement>('#clone-status')!;
 const root=document.getElementById('root')!;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const blocked='script,style,textarea,input,[contenteditable],video,audio,[role="log"],.reels-author,.reels-caption,.ameeq-map,[data-user-content],.message-content';
 function apply(){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Text|null;
  while((node=walker.nextNode() as Text|null)){
   if(!node.parentElement||node.parentElement.closest(blocked))continue;
   const text=node.data.trim();if(!text||text.length>1000)continue;
   let record=records.get(node);if(!record||node.data!==record.last){record={source:text,last:node.data};records.set(node,record);}
   const translated=cloneText(record.source,lang);const next=node.data.replace(text,translated);
   if(next!==node.data)node.data=next;record.last=node.data;
  }
  for(const [node] of records)if(!node.isConnected)records.delete(node);
  widget.querySelector('#clone-coverage')!.textContent=lang==='tzm'?'ⴰⵣⵓⵍ / Azul — تغطية أمازيغية محدودة؛ النص غير المترجم يبقى أصلياً ويمكن تصحيحه.':'الترجمات الموجودة تُستعمل؛ أي نص غير مغطى يبقى أصلياً. التصحيح على هذا الجهاز فقط، وليس ترجمة آلية شاملة.';
 }
 const observer=new MutationObserver(()=>{if(timer)clearTimeout(timer);timer=setTimeout(apply,60);});observer.observe(root,{childList:true,subtree:true,characterData:true});
 const updateEditor=()=>{textSelect.replaceChildren();const values=[...new Set([...records.values()].map(r=>r.source))].slice(0,400);for(const source of values){const option=document.createElement('option');option.value=source;option.textContent=source.slice(0,90);textSelect.append(option);}input.value=cloneText(textSelect.value,lang);};
 textSelect.onchange=()=>{input.value=cloneText(textSelect.value,lang);};
 widget.querySelector<HTMLButtonElement>('#clone-toggle')!.onclick=()=>{controls.hidden=!controls.hidden;widget.querySelector('#clone-toggle')!.setAttribute('aria-expanded',String(!controls.hidden));if(!controls.hidden){apply();updateEditor();}};
 select.onchange=()=>{lang=select.value as CloneLang;save('ameeq_lang',lang);window.dispatchEvent(new CustomEvent('ameeq-language',{detail:lang}));setTimeout(()=>{apply();updateEditor();},100);};
 widget.querySelector<HTMLButtonElement>('#clone-save')!.onclick=()=>{if(!textSelect.value)return;save(`ameeq_correction:${lang}:${textSelect.value}`,input.value);apply();status.textContent='تم حفظ التصحيح على هذا الجهاز / Saved on this device.';};
 apply();
}
