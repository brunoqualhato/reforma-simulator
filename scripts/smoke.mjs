import assert from 'node:assert/strict';
const base = process.env.APP_URL || 'http://localhost:3000';
const status = await fetch(base + '/api/status').then(r => r.json());
assert.deepEqual(status,{regular:true,simples:true,danfse:true},'Os três serviços precisam estar saudáveis');
const cases = [
 {regime:'regular',operacao:{id:'smoke-regular',versao:'1.0.0',dhFatoGerador:'2027-03-10T10:00:00-03:00',municipio:4314902,uf:'RS',itens:[{numero:1,nbs:'122011200',cst:'200',cClassTrib:'200028',baseCalculo:1200,aliquotasNominais:{cbs:8.8,ibsEstadual:0.05,ibsMunicipal:0.05}}]}},
 {regime:'simples',operacao:{id:'smoke-simples',versao:'2.0.0',data:'2027-03-15',tpDoc:'55',CRT:'1',itens:[{numero:1,cAtivSN:'01',cClassTrib:'000001',baseCalculo:'950.00',valorImpostoSeletivo:'50.00',pIBSSN:'1.25',pCBSSN:'2.75'}]}}
];
for (const input of cases) {
 const response = await fetch(base + '/api/calcular',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 const result = await response.json();assert.equal(response.status,200,JSON.stringify(result));
 assert.ok(['CALCULADO','CALCULO_SIMULADO'].includes(result.objetos[0].estadoItem),JSON.stringify(result));
 if (input.regime === 'regular') assert.equal(result.total.tribCalc.IBSCBSTot.gCBS.vCBS,'42.24');
 else assert.equal(result.total.totalTributos,'88.00');
 console.log(`${input.regime}: cálculo e total verificados`);
}
const {readFile} = await import('node:fs/promises');
const fixture = process.env.NFSE_XML;
if (fixture) { const pdf = await fetch(base+'/api/danfse',{method:'POST',headers:{'Content-Type':'application/xml'},body:await readFile(fixture)});assert.equal(pdf.status,200,await pdf.clone().text());assert.ok((await pdf.text()).startsWith('%PDF-'));console.log('DANFSe: PDF verificado'); }
else console.log('DANFSe: health verificado; geração não testada. Defina NFSE_XML com o caminho de uma NFS-e completa.');
