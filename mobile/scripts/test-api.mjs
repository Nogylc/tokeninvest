import assert from 'node:assert/strict';
import { test } from 'node:test';
import { carregarCliente } from './carregar-cliente.mjs';
import { readFile } from 'node:fs/promises';

test('cliente usa Bearer, serializa corpo, limpa JWT e notifica em 401; aceita 204', async () => {
  const { criarCliente } = await carregarCliente();
  let token = null, expirou = 0;
  const storage = { getItemAsync: async () => token, setItemAsync: async (_k, v) => { token = v; }, deleteItemAsync: async () => { token = null; } };
  const original = globalThis.fetch;
  const chamadas = [];
  let status = 200;
  globalThis.fetch = async (url, opcoes) => { chamadas.push({ url, ...opcoes }); return { status, ok: status < 400, json: async () => status === 401 ? { erro: 'Sessão expirada' } : { ok: true } }; };
  try {
    const c = criarCliente({ storage, aoExpirar: () => expirou++, url: 'https://teste.example' });
    await c.sessao.salvar('jwt-de-teste');
    await c.api.depositar('100.00');
    assert.equal(chamadas[0].url, 'https://teste.example/api/carteira/depositar');
    assert.equal(chamadas[0].headers.Authorization, 'Bearer jwt-de-teste');
    assert.deepEqual(JSON.parse(chamadas[0].body), { valor: '100.00' });
    await c.apiBanco.consentimento('a/b');
    assert.match(chamadas[1].url, /a%2Fb$/);
    status = 401;
    await assert.rejects(c.api.eu(), /Sessão expirada/);
    assert.equal(token, null); assert.equal(expirou, 1);
    status = 204;
    assert.equal(await c.api.excluirConta(), null);
  } finally { globalThis.fetch = original; }
});

test('Open Finance preserva parâmetros e rejeita state incorreto sem abrir navegador', async () => {
  const fonte = await readFile(new URL('../src/dominio/openFinance.js', import.meta.url), 'utf8');
  const { parametrosAutorizacao, parametrosRetorno } = await import(`data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}`);
  const p = parametrosAutorizacao('https://banco.example/autorizar?consent_id=1&state=seguro&redirect_uri=https%3A%2F%2Fapp.example%2Fretorno&code_challenge=pkce');
  assert.equal(p.redirect_uri, 'https://app.example/retorno');
  assert.equal(p.code_challenge, 'pkce');
  assert.deepEqual(parametrosRetorno('https://app.example/retorno?code=abc&state=seguro', p.state), { code: 'abc', state: 'seguro', error: null });
  assert.throws(() => parametrosRetorno('https://app.example/?code=abc&state=outro', p.state), /inválido/);
  assert.throws(() => parametrosAutorizacao('https://banco.example'), /incompleto/);
});
