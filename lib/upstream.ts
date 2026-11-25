export const services = {
  regular: { url: process.env.REGULAR_API_URL || 'http://localhost:8080', health: '/api/calculadora/dados-abertos/versao' },
  simples: { url: process.env.SIMPLES_API_URL || 'http://localhost:8082', health: '/api/versao' },
  danfse: { url: process.env.DANFSE_API_URL || 'http://localhost:8083', health: '/health/ready' },
};
export async function forward(service: keyof typeof services, path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${services[service].url}${path}`, { ...init, cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    const headers = new Headers({ 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' });
    const warning = response.headers.get('x-warning-dados-simulados');
    if (warning) headers.set('x-warning-dados-simulados', warning);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json({ error: 'Serviço indisponível. Inicie os containers com docker compose up --build -d e tente novamente.' }, { status: 503 });
  }
}
export async function readLimited(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new Error('LIMIT');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error('LIMIT'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
