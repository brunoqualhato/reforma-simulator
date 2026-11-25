export type Regime = 'regular' | 'simples';
export type Item = { numero: number; descricao: string; baseCalculo: string; nomenclatura: string; codigo: string; cst: string; cClassTrib: string; cAtivSN: string; cbs: string; ibsUf: string; ibsMun: string; ibsSn: string };
export const newItem = (numero: number, regime: Regime = 'regular'): Item => ({ numero, descricao: '', baseCalculo: '1000.00', nomenclatura: 'ncm', codigo: '22030000', cst: '000', cClassTrib: '000001', cAtivSN: '01', cbs: regime === 'simples' ? '2.75' : '8.80', ibsUf: '0.05', ibsMun: '0.05', ibsSn: '1.25' });
export function buildOperation(regime: Regime, data: string, uf: string, municipio: string, items: Item[], id: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) throw new Error('Informe uma data válida.');
  if (regime === 'simples' && data < '2027-01-01') throw new Error('A base do Simples Nacional possui vigência a partir de 01/01/2027.');
  if (!items.length || items.length > 100) throw new Error('Adicione de 1 a 100 itens.');
  if (regime === 'regular' && (!/^[A-Z]{2}$/.test(uf) || !/^\d{7}$/.test(municipio))) throw new Error('Informe UF e código IBGE de 7 dígitos.');
  for (const item of items) {
    if (!/^\d+(\.\d{1,2})?$/.test(item.baseCalculo) || Number(item.baseCalculo) > 9999999999999.99) throw new Error(`Item ${item.numero}: base de cálculo inválida.`);
    if (!/^\d{6}$/.test(item.cClassTrib)) throw new Error(`Item ${item.numero}: cClassTrib deve ter 6 dígitos.`);
    if (regime === 'regular' && (!/^\d{3}$/.test(item.cst) || !(item.nomenclatura === 'ncm' ? /^\d{8}$/ : /^\d{9}$/).test(item.codigo))) throw new Error(`Item ${item.numero}: confira CST e NCM/NBS.`);
    if (regime === 'simples' && !/^\d{2}$/.test(item.cAtivSN)) throw new Error(`Item ${item.numero}: atividade deve ter 2 dígitos.`);
    const rates = regime === 'simples' ? [item.cbs, item.ibsSn] : Number(data.slice(0,4)) >= 2027 ? [item.cbs,item.ibsUf,item.ibsMun] : [];
    if (rates.some(rate => !/^\d+(\.\d{1,4})?$/.test(rate) || Number(rate) > 100)) throw new Error(`Item ${item.numero}: alíquota deve estar entre 0 e 100%.`);
  }
  if (regime === 'simples') return { id, versao: '2.0.0', data, tpDoc: '55', CRT: '1', itens: items.map(item => ({ numero: item.numero, cAtivSN: item.cAtivSN, cClassTrib: item.cClassTrib, baseCalculo: item.baseCalculo, valorImpostoSeletivo: '0.00', pIBSSN: item.ibsSn, pCBSSN: item.cbs })) };
  return { id, versao: '1.0.0', dhFatoGerador: `${data}T12:00:00-03:00`, uf, municipio: Number(municipio), itens: items.map(item => ({ numero: item.numero, [item.nomenclatura]: item.codigo, cst: item.cst, cClassTrib: item.cClassTrib, baseCalculo: item.baseCalculo, ...(Number(data.slice(0,4)) >= 2027 ? { aliquotasNominais: { cbs: Number(item.cbs), ibsEstadual: Number(item.ibsUf), ibsMunicipal: Number(item.ibsMun) } } : {}) })) };
}
