import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOperation, newItem } from '../lib/simulation.ts';
import { forward, readLimited } from '../lib/upstream.ts';
test('2026 omits nominal rates; 2027 includes them with decimal values', () => {
 const a = buildOperation('regular','2026-11-24','SP','3550308',[newItem(1)],'id');
 assert.equal('aliquotasNominais' in a.itens[0],false);
 const b = buildOperation('regular','2027-01-01','SP','3550308',[newItem(1)],'id');
 assert.ok('aliquotasNominais' in b.itens[0]);
 assert.deepEqual(b.itens[0].aliquotasNominais,{cbs:8.8,ibsEstadual:0.05,ibsMunicipal:0.05});
 assert.equal(b.dhFatoGerador,'2027-01-01T12:00:00-03:00');
});
test('Simples uses official casing, version and decimal strings', () => {
 const a = buildOperation('simples','2027-03-15','SP','3550308',[{...newItem(1),baseCalculo:'950.00',cbs:'2.75'}],'id');
 assert.equal(a.CRT,'1'); assert.equal(a.versao,'2.0.0'); assert.equal(a.itens[0].pCBSSN,'2.75'); assert.equal(a.itens[0].baseCalculo,'950.00');
});
test('rejects invalid monetary inputs, classification, destination and rates', () => {
 for (const change of [{baseCalculo:'-1'},{baseCalculo:'NaN'},{baseCalculo:'1.001'},{baseCalculo:'1e3'},{cClassTrib:'123'},{codigo:'22'}]) assert.throws(() => buildOperation('regular','2026-11-24','SP','3550308',[{...newItem(1),...change}],'id'));
 assert.throws(() => buildOperation('regular','2026-11-24','SP','123',[newItem(1)],'id'));
 assert.throws(() => buildOperation('simples','2027-01-01','SP','3550308',[{...newItem(1),cbs:'101'}],'id'));
});
test('upstream preserves partial results, failures, and simulation warning', async () => {
 const original = globalThis.fetch;
 try { globalThis.fetch = async () => new Response(JSON.stringify({objetos:[{estadoItem:'INCONSISTENCIA_ENTRADA'}]}),{status:422,headers:{'content-type':'application/json','x-warning-dados-simulados':'1'}});
 const r = await forward('regular','/api/calculadora/observabilidade/regime-geral'); assert.equal(r.status,422);assert.equal(r.headers.get('x-warning-dados-simulados'),'1');assert.equal((await r.json()).objetos[0].estadoItem,'INCONSISTENCIA_ENTRADA');
 globalThis.fetch = async () => { throw new Error('connection refused'); }; assert.equal((await forward('regular','/')).status,503);
 } finally {globalThis.fetch = original;}
});
test('body limit handles actual bytes and absent content length', async () => {
 assert.equal(await readLimited(new Request('http://localhost',{method:'POST',body:'abc'}),3),'abc');
 await assert.rejects(readLimited(new Request('http://localhost',{method:'POST',body:'áá'}),3),/LIMIT/);
});
test('Simples rejects dates outside the catalog and initializes consistent example rates', () => {
 assert.throws(() => buildOperation('simples','2026-11-24','SP','3550308',[newItem(1,'simples')],'id'),/01\/01\/2027/);
 const a = buildOperation('simples','2027-01-01','SP','3550308',[newItem(1,'simples'),newItem(2,'simples')],'id');
 for (const item of a.itens) {
  assert.ok('pCBSSN' in item && 'pIBSSN' in item);
  assert.equal(item.pCBSSN,'2.75');
  assert.equal(item.pIBSSN,'1.25');
 }
});
