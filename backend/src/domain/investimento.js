// DOMÍNIO: regras de valores e operações de investimento.
// Trabalhamos sempre com centavos (inteiros) para evitar erro de arredondamento.
const { ErroDominio } = require("./consentimento");

const VALOR_MINIMO_DEPOSITO = 100; // R$ 1,00
const VALOR_MAXIMO_DEPOSITO = 1000000; // R$ 10.000,00 por operação (limite do Sandbox)

function reaisParaCentavos(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) throw new ErroDominio("Informe um valor maior que zero.");
  return Math.round(numero * 100);
}

// O saldo da conta bancária é conferido pelo próprio banco na hora do Pix.
function validarDeposito(centavos) {
  if (centavos < VALOR_MINIMO_DEPOSITO) throw new ErroDominio("O depósito mínimo é R$ 1,00.");
  if (centavos > VALOR_MAXIMO_DEPOSITO) {
    throw new ErroDominio("Limite do Sandbox: no máximo R$ 10.000,00 por operação.");
  }
}

function validarResgate(centavos, saldoDrexCentavos) {
  if (centavos > saldoDrexCentavos) throw new ErroDominio("Saldo em DREX insuficiente para o resgate.");
}

function validarQuantidade(quantidade) {
  const q = Number(quantidade);
  if (!Number.isInteger(q) || q <= 0) throw new ErroDominio("A quantidade de cotas deve ser um número inteiro positivo.");
  return q;
}

/** Valida a compra ANTES de enviar para a blockchain (o contrato valida de novo). */
function validarCompra({ quantidade, ativo, saldoDrexCentavos, cotasAtuais }) {
  const q = validarQuantidade(quantidade);
  const custo = q * ativo.precoCotaCentavos;
  if (q > ativo.cotasDisponiveis) throw new ErroDominio("Não há cotas suficientes disponíveis.");
  if (cotasAtuais + q > ativo.limitePorInvestidor) {
    throw new ErroDominio(`Limite do Sandbox: no máximo ${ativo.limitePorInvestidor} cotas por investidor.`);
  }
  if (custo > saldoDrexCentavos) throw new ErroDominio("Saldo em DREX insuficiente. Faça um depósito antes.");
  return { quantidade: q, custo };
}

function validarVenda({ quantidade, cotasAtuais }) {
  const q = validarQuantidade(quantidade);
  if (q > cotasAtuais) throw new ErroDominio("Você não possui essa quantidade de cotas.");
  return { quantidade: q };
}

module.exports = { reaisParaCentavos, validarDeposito, validarResgate, validarCompra, validarVenda };
