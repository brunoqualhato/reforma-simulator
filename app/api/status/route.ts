import { services } from '@/lib/upstream';
export async function GET() {
  const entries = await Promise.all(Object.entries(services).map(async ([name, service]) => {
    try { const res = await fetch(service.url + service.health, { cache: 'no-store', signal: AbortSignal.timeout(3000) }); return [name, res.ok]; } catch { return [name, false]; }
  }));
  return Response.json(Object.fromEntries(entries), { headers: { 'Cache-Control': 'no-store' } });
}
