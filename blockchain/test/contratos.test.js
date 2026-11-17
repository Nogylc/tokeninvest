// Testes dos contratos inteligentes (rodar com: npm test, dentro de /blockchain)
const { test, before } = require("node:test");
const assert = require("node:assert");
const { iniciarRede } = require("..");

let rede, emissor, investidor, ativo, drex, ethers;

before(async () => {
  rede = await iniciarRede({
    ativos: [{ nome: "CDB Teste", simbolo: "CDBT", totalCotas: 100, precoCotaCentavos: 1000, limitePorInvestidor: 30 }],
  });
  ({ emissor, drex, ethers } = rede);
  ativo = rede.ativos[0];
  investidor = await rede.provider.getSigner(1);
  await drex.emitir(investidor.address, 100000); // R$ 1.000,00
});

async function falhaCom(promessa, erro) {
  await assert.rejects(promessa, (e) => {
    const nome = e.revert?.name
      || drex.interface.parseError(e.data || "0x")?.name
      || ativo.interface.parseError(e.data || "0x")?.name;
    assert.equal(nome, erro);
    return true;
  });
}

test("só o emissor pode criar dBRL", async () => {
  await falhaCom(drex.connect(investidor).emitir(investidor.address, 1), "SomenteEmissor");
});

test("investidor sem KYC (não habilitado) não pode comprar", async () => {
  await falhaCom(ativo.connect(investidor).comprar(1), "NaoHabilitado");
});

test("compra de cotas debita dBRL e registra a titularidade", async () => {
  await ativo.habilitarInvestidor(investidor.address, true);
  await drex.connect(investidor).approve(await ativo.getAddress(), 5 * 1000);
  await ativo.connect(investidor).comprar(5);
  assert.equal(await ativo.cotasDe(investidor.address), 5n);
  assert.equal(await drex.balanceOf(investidor.address), 95000n);
  assert.equal(await ativo.cotasDisponiveis(), 95n);
});

test("limite do Sandbox por investidor é respeitado", async () => {
  await drex.connect(investidor).approve(await ativo.getAddress(), 26 * 1000);
  await falhaCom(ativo.connect(investidor).comprar(26), "LimiteSandboxExcedido");
});

test("venda devolve dBRL na hora (liquidez imediata)", async () => {
  await ativo.connect(investidor).vender(2);
  assert.equal(await ativo.cotasDe(investidor.address), 3n);
  assert.equal(await drex.balanceOf(investidor.address), 97000n);
});

test("não é possível vender mais cotas do que possui", async () => {
  await falhaCom(ativo.connect(investidor).vender(10), "CotasInsuficientes");
});

test("contrato pausado bloqueia operações", async () => {
  await ativo.definirPausa(true);
  await falhaCom(ativo.connect(investidor).vender(1), "ContratoPausado");
  await ativo.definirPausa(false);
});

test("compra sem approve de dBRL falha e nada é alterado (atomicidade)", async () => {
  await drex.connect(investidor).approve(await ativo.getAddress(), 0);
  await falhaCom(ativo.connect(investidor).comprar(1), "AutorizacaoInsuficiente");
  assert.equal(await ativo.cotasDe(investidor.address), 3n);
});
