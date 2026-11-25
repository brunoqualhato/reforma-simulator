import { forward, readLimited } from '@/lib/upstream';
export async function POST(request: Request) {
  let input;
  try { input = JSON.parse(await readLimited(request, 1_048_576)); } catch (e) { return Response.json({ error: e instanceof Error && e.message === 'LIMIT' ? 'Entrada excede 1 MiB.' : 'JSON inválido.' }, { status: e instanceof Error && e.message === 'LIMIT' ? 413 : 400 }); }
  if (!input || !['regular', 'simples'].includes(input.regime) || !input.operacao || !Array.isArray(input.operacao.itens) || input.operacao.itens.length < 1 || input.operacao.itens.length > 100) return Response.json({ error: 'Informe o regime e uma operação com 1 a 100 itens.' }, { status: 400 });
  return forward(input.regime, input.regime === 'regular' ? '/api/calculadora/observabilidade/regime-geral' : '/api/calculadora/observabilidade/simples-nacional', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input.operacao) });
}
