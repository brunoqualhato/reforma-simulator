import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = path.resolve(rootDir, specifier.slice(2)) + '.ts';
      return { shortCircuit: true, url: pathToFileURL(target).href };
    }
    return nextResolve(specifier, context);
  },
});

const statusRoute = await import('../app/api/status/route.ts');
const calcularRoute = await import('../app/api/calcular/route.ts');
const catalogoRoute = await import('../app/api/catalogo/route.ts');
const danfseRoute = await import('../app/api/danfse/route.ts');

hooks.deregister();

test('GET /api/status reports health per service and disables caching', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('8082')) throw new Error('offline');
      if (url.includes('8083')) return new Response(null, { status: 503 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    const res = await statusRoute.GET();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), { regular: true, simples: false, danfse: false });
  } finally {
    globalThis.fetch = original;
  }
});

test('POST /api/calcular validates payloads and limits', async () => {
  const badJson = await calcularRoute.POST(new Request('http://localhost/api/calcular', { method: 'POST', body: '{' }));
  assert.equal(badJson.status, 400);

  const tooBig = await calcularRoute.POST(
    new Request('http://localhost/api/calcular', {
      method: 'POST',
      headers: { 'content-length': String(1_048_577) },
      body: '{}',
    })
  );
  assert.equal(tooBig.status, 413);

  const badRegime = await calcularRoute.POST(
    new Request('http://localhost/api/calcular', {
      method: 'POST',
      body: JSON.stringify({ regime: 'outro', operacao: { itens: [{}] } }),
    })
  );
  assert.equal(badRegime.status, 400);

  const emptyItems = await calcularRoute.POST(
    new Request('http://localhost/api/calcular', {
      method: 'POST',
      body: JSON.stringify({ regime: 'regular', operacao: { itens: [] } }),
    })
  );
  assert.equal(emptyItems.status, 400);

  const tooManyItems = await calcularRoute.POST(
    new Request('http://localhost/api/calcular', {
      method: 'POST',
      body: JSON.stringify({ regime: 'regular', operacao: { itens: Array.from({ length: 101 }, () => ({})) } }),
    })
  );
  assert.equal(tooManyItems.status, 400);
});

test('POST /api/calcular routes regular and simples to official endpoints', async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; body: string | undefined }> = [];
  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), body: typeof init?.body === 'string' ? init.body : undefined });
      return new Response(JSON.stringify({ objetos: [{ nObj: 1, estadoItem: 'CALCULO_SIMULADO' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-warning-dados-simulados': '6' },
      });
    };

    const regularRes = await calcularRoute.POST(
      new Request('http://localhost/api/calcular', {
        method: 'POST',
        body: JSON.stringify({ regime: 'regular', operacao: { id: '1', itens: [{ numero: 1 }] } }),
      })
    );
    assert.equal(regularRes.status, 200);
    assert.equal(regularRes.headers.get('x-warning-dados-simulados'), '6');
    assert.ok(calls[0].url.endsWith('/api/calculadora/observabilidade/regime-geral'));

    const simplesRes = await calcularRoute.POST(
      new Request('http://localhost/api/calcular', {
        method: 'POST',
        body: JSON.stringify({ regime: 'simples', operacao: { id: '2', itens: [{ numero: 1 }] } }),
      })
    );
    assert.equal(simplesRes.status, 200);
    assert.ok(calls[1].url.endsWith('/api/calculadora/observabilidade/simples-nacional'));
  } finally {
    globalThis.fetch = original;
  }
});

test('GET /api/catalogo validates params and forwards query parameters', async () => {
  const badTipo = await catalogoRoute.GET(new Request('http://localhost/api/catalogo?tipo=desconhecido&data=2026-11-24'));
  assert.equal(badTipo.status, 400);

  const badDate = await catalogoRoute.GET(new Request('http://localhost/api/catalogo?tipo=ncm&data=24-11-2026'));
  assert.equal(badDate.status, 400);

  const original = globalThis.fetch;
  const urls: string[] = [];
  try {
    globalThis.fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    };

    const r1 = await catalogoRoute.GET(new Request('http://localhost/api/catalogo?tipo=ncm&data=2027-01-01&ncm=22030000'));
    assert.equal(r1.status, 200);
    assert.ok(urls[0].endsWith('/api/calculadora/dados-abertos/ncm?data=2027-01-01&ncm=22030000'));

    const r2 = await catalogoRoute.GET(new Request('http://localhost/api/catalogo?tipo=municipios&data=2027-01-01&siglaUf=SP'));
    assert.equal(r2.status, 200);
    assert.ok(urls[1].endsWith('/api/calculadora/dados-abertos/ufs/municipios?data=2027-01-01&siglaUf=SP'));

    const r3 = await catalogoRoute.GET(new Request('http://localhost/api/catalogo?tipo=atividades&data=2027-01-01'));
    assert.equal(r3.status, 200);
    assert.ok(urls[2].endsWith('/api/calculadora/simples-nacional/atividades?data=2027-01-01'));
  } finally {
    globalThis.fetch = original;
  }
});

test('POST /api/danfse validates XML, stc, size and sets PDF disposition header', async () => {
  const badXml = await danfseRoute.POST(new Request('http://localhost/api/danfse', { method: 'POST', body: 'texto' }));
  assert.equal(badXml.status, 400);

  const badStc = await danfseRoute.POST(new Request('http://localhost/api/danfse?stc=9', { method: 'POST', body: '<NFSe/>' }));
  assert.equal(badStc.status, 400);

  const tooBig = await danfseRoute.POST(
    new Request('http://localhost/api/danfse', {
      method: 'POST',
      headers: { 'content-length': String(5 * 1024 * 1024 + 1) },
      body: '<NFSe/>',
    })
  );
  assert.equal(tooBig.status, 413);

  const original = globalThis.fetch;
  let calledUrl = '';
  try {
    globalThis.fetch = async (input) => {
      calledUrl = String(input);
      return new Response('%PDF-1.4\n', { status: 200, headers: { 'content-type': 'application/pdf' } });
    };

    const okRes = await danfseRoute.POST(
      new Request('http://localhost/api/danfse?stc=1&canhoto=false', {
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        body: '<NFSe/>',
      })
    );
    assert.equal(okRes.status, 200);
    assert.ok(calledUrl.endsWith('/api/danfse?stc=1&canhoto=false'));
    assert.equal(okRes.headers.get('content-disposition'), 'attachment; filename="danfse.pdf"');
    assert.ok((await okRes.text()).startsWith('%PDF-'));
  } finally {
    globalThis.fetch = original;
  }
});
