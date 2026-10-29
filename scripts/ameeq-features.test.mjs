import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDialect, positivity, mapForRequest } from '../server/ameeq-features.mjs';
import { createAmeeqLocal } from '../api/ameeq.js';
test('Amazigh greeting recognized in Tifinagh, Arabic and Latin, French and English differentiated',()=>{
 for(const text of ['أزول','Azul','ⴰⵣⵓⵍ','tanmmirt'])assert.equal(detectDialect(text),'tzm');
 assert.equal(detectDialect('bonjour merci'),'fr');assert.equal(detectDialect('hello'),'en');assert.equal(detectDialect('واخا ديال'),'ary');
 assert.match(positivity.tzm,/ⴰⵣⵓⵍ - ⵜⴰⵏⵎⵎⵉⵔⵜ/u);
});
test('azul returns the requested greeting without inventing counts or automatically sharing location',async()=>{
 let response;const handler=createAmeeqLocal({pool:{query:async()=>{throw Error('private');}},env:{}});
 await handler({method:'POST',headers:{},body:{message:'أزول',mode:'voice'}},{setHeader(){},status(){return this;},json(value){response=value;}});
 assert.match(response.reply,/ⴰⵣⵓⵍ - ⵜⴰⵏⵎⵎⵉⵔⵜ/u);assert.equal(response.dialect,'tzm');assert.equal(response.map,null);assert.equal(response.countsVerified,false);assert.doesNotMatch(response.reply,/44|غير متاح|private/u);
});
test('map image without key accepts coordinates, not fabricated geocoding',async()=>{
 const map=await mapForRequest('خريطة','31.9310,-4.4250',{},()=>{throw Error('network');});
 assert.match(map.imageUrl,/^https:\/\/staticmap.openstreetmap.de/);assert.equal(map.attribution,'© OpenStreetMap contributors');
 const named=await mapForRequest('map','Casablanca',{},()=>{});assert.equal(named.imageUrl,null);assert.ok(named.searchUrl.includes('Casablanca'));
 const fallback=await mapForRequest('خريطة','',{},()=>{});assert.match(fallback.notice,/ليست عنوان مقر/u);
});
test('Google key stays server-side and returned image contains no secret or upstream URL',async()=>{
 let called;const map=await mapForRequest('map','Casablanca',{GOOGLE_MAPS_API_KEY:'test-only-key'},async(url)=>{
 called=String(url);return {ok:true,headers:{get:()=> 'image/png'},arrayBuffer:async()=>new Uint8Array([137,80,78,71]).buffer};
 });assert.match(called,/maps.googleapis.com/);assert.match(map.imageUrl,/^data:image\/png;base64,/);assert.doesNotMatch(JSON.stringify(map),/test-only-key|key=/);
});
test('map provider errors do not expose credentials or prevent a useful search link',async()=>{
 const map=await mapForRequest('map','Casablanca',{GOOGLE_MAPS_API_KEY:'test-only-key'},async()=>{throw Error('secret');});
 assert.equal(map.imageUrl,null);assert.match(map.searchUrl,/google.com\/maps\/search/);assert.doesNotMatch(JSON.stringify(map),/test-only-key|secret/);
});
