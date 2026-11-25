import { forward, readLimited } from '@/lib/upstream';
export async function POST(request: Request) {
  let xml;
  try { xml = await readLimited(request, 5 * 1024 * 1024); } catch { return Response.json({ error: 'O XML deve ter até 5 MiB.' }, { status: 413 }); }
  if (!xml.trim().startsWith('<')) return Response.json({ error: 'Envie um XML de NFS-e válido.' }, { status: 400 });
  const params = new URL(request.url).searchParams;
  const stc = params.get('stc') || '0';
  if (!['0','1','2'].includes(stc)) return Response.json({ error: 'Situação inválida.' }, { status: 400 });
  const response = await forward('danfse', `/api/danfse?stc=${stc}&canhoto=${params.get('canhoto') !== 'false'}`, { method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: xml });
  if (response.ok) response.headers.set('Content-Disposition', 'attachment; filename="danfse.pdf"');
  return response;
}
