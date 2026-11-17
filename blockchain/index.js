// Camada de INFRAESTRUTURA da blockchain.
// Sobe a rede Hardhat dentro do próprio processo (ou conecta numa rede externa
// via RPC_URL) e publica os contratos. O backend só usa as funções exportadas.
const path = require("path");
const { ethers } = require("ethers");

function carregarArtefato(nome) {
  return require(path.join(__dirname, "artifacts", `${nome}.json`));
}

async function criarProvider() {
  if (process.env.RPC_URL) {
    return new ethers.JsonRpcProvider(process.env.RPC_URL, undefined, { cacheTimeout: -1 });
  }
  process.env.HARDHAT_CONFIG = path.join(__dirname, "hardhat.config.js");
  const hre = require("hardhat");
  return new ethers.BrowserProvider(hre.network.provider, undefined, { cacheTimeout: -1 });
}

async function publicar(signer, nome, args = []) {
  const { abi, bytecode } = carregarArtefato(nome);
  const fabrica = new ethers.ContractFactory(abi, bytecode, signer);
  const contrato = await fabrica.deploy(...args);
  await contrato.waitForDeployment();
  return contrato;
}

/**
 * Inicia a DLT e publica o DREX simulado + os ativos tokenizados de exemplo.
 */
async function iniciarRede({ ativos = [] } = {}) {
  const provider = await criarProvider();
  const emissor = await provider.getSigner(0); // conta da plataforma / emissor

  const drex = await publicar(emissor, "DrexSimulado");
  const drexAddr = await drex.getAddress();

  const contratosAtivos = [];
  for (const a of ativos) {
    const c = await publicar(emissor, "AtivoTokenizado", [
      a.nome, a.simbolo, drexAddr, a.totalCotas, a.precoCotaCentavos, a.limitePorInvestidor,
    ]);
    contratosAtivos.push(c);
  }

  return { provider, emissor, drex, ativos: contratosAtivos, ethers };
}

module.exports = { iniciarRede, publicar, carregarArtefato, criarProvider };
