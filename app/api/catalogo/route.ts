import { forward } from '@/lib/upstream';
const paths: Record<string, string> = { classificacoes: '/classificacoes-tributarias/cbs-ibs', ncm: '/ncm', nbs: '/nbs', municipios: '/ufs/municipios', atividades: '' };
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams; const tipo = p.get('tipo') || 'classificacoes'; const data = p.get('data') || '2026-11-24';
  if (!Object.hasOwn(paths, tipo) || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return Response.json({ error: 'Consulta inválida.' }, { status: 400 });
  const query = new URLSearchParams({ data });
  for (const key of ['ncm', 'nbs', 'siglaUf']) if (p.get(key)) query.set(key, p.get(key)!);
  return tipo === 'atividades' ? forward('simples', `/api/calculadora/simples-nacional/atividades?${query}`) : forward('regular', `/api/calculadora/dados-abertos${paths[tipo]}?${query}`);
}
