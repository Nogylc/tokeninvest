import assert from 'node:assert/strict';
import { randomInt, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { carregarCliente } from './carregar-cliente.mjs';

if (!process.argv.includes('--executar')) throw new Error('Use npm run test:api-publicada -- --executar. Cria e exclui somente uma conta temporária de teste na API publicada.');
const { api, apiBanco, sessao } = await carregarCliente();
const dominio = await readFile(new URL('../src/dominio/openFinance.js', import.meta.url), 'utf8');
const { parametrosAutorizacao, parametrosRetorno } = await import(`data:text/javascript;base64,${Buffer.from(dominio).toString('base64')}`);
function cpfValido() {
  const numeros = Array.from({ length: 9 }, () => randomInt(0, 10));
  for (let tamanho = 9; tamanho <= 10; tamanho++) { const resto = numeros.reduce((s, n, i) => s + n * (tamanho + 1 - i), 0) % 11; numeros.push(resto < 2 ? 0 : 11 - resto); }
  return numeros.join('');
}
const identidade = { nome: 'Demonstração Mobile', email: `mobile.${Date.now()}.${randomBytes(3).toString('hex')}@example.com`, cpf: cpfValido(), senha: randomBytes(16).toString('hex'), aceiteTermos: true };
const etapas = [];
const registrar = etapa => { etapas.push(etapa); console.log(`OK: ${etapa}`); };
let contaCriada = false;
try {
  await api.permissoes(); registrar('API publicada acessível');
  const cadastro = await api.cadastrar(identidade); contaCriada = true;
  await sessao.salvar(cadastro.token); registrar('Cadastro com CPF válido');
  await sessao.limpar();
  const login = await api.login(identidade.email, identidade.senha); await sessao.salvar(login.token);
  assert.equal((await api.eu()).email, identidade.email); registrar('Login e perfil');
  const p = parametrosAutorizacao((await api.criarConsentimento(['CONTAS_SALDO', 'PAGAMENTOS_PIX'], 30)).urlAutorizacao);
  await apiBanco.consentimento(p.consent_id); registrar('Consentimento e pedido do Banco Rio');
  const { redirectUrl } = await apiBanco.autorizar({ consentId: p.consent_id, state: p.state, redirect_uri: p.redirect_uri, code_challenge: p.code_challenge, cpf: identidade.cpf, senha: 'banco123', aprovar: true });
  const autorizado = await api.retornoBanco(parametrosRetorno(redirectUrl, p.state));
  assert.equal(autorizado.status, 'AUTORIZADO');
  assert.equal((await api.confirmarConsentimento(autorizado.id)).status, 'ATIVO'); registrar('Autenticação, retorno PKCE e confirmação');
  await api.saldoBancario();
  await api.depositar('100.00');
  assert.equal((await api.carteira()).saldoDrexCentavos, 10000); registrar('Depósito em DREX');
  const ativo = (await api.ativos()).find(a => !a.pausado && a.cotasDisponiveis > 0 && a.precoCotaCentavos <= 10000);
  assert.ok(ativo, 'Ativo disponível para a demonstração');
  await api.comprar(ativo.id, 1);
  let carteira = await api.carteira();
  assert.equal(carteira.ativos.find(a => a.id === ativo.id).minhasCotas, 1);
  assert.ok(carteira.extrato.some(t => t.tipo === 'COMPRA' && t.hash && t.bloco)); registrar('Compra e extrato on-chain');
  await api.vender(ativo.id, 1); await api.resgatar('100.00');
  carteira = await api.carteira(); assert.equal(carteira.saldoDrexCentavos, 0); registrar('Venda e resgate');
  const exportacao = await api.meusDados(); assert.ok(exportacao); registrar('Exportação LGPD');
  await api.revogarConsentimento(autorizado.id);
  assert.equal((await api.consentimentos()).find(c => c.id === autorizado.id).status, 'REVOGADO'); registrar('Revogação');
  await api.excluirConta(); await sessao.limpar(); contaCriada = false; registrar('Exclusão da conta temporária');
  await writeFile(new URL('../validacao-api.json', import.meta.url), JSON.stringify({ api: 'https://tokeninvest.onrender.com', executadoEm: new Date().toISOString(), etapas, resultado: 'aprovado', observacao: 'Cliente real do mobile executado em Node, armazenamento de teste em memória. Não substitui teste visual no dispositivo.' }, null, 2) + '\n');
} catch (e) {
  console.error(`FALHA após ${etapas.length} etapas: ${e.message}`);
  if (contaCriada) console.error('Uma conta temporária pode ter permanecido na API. Nenhuma conta existente foi alterada.');
  process.exitCode = 1;
}
