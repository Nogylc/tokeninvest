// Compila os contratos com o solc (JavaScript) e salva ABI + bytecode em /artifacts.
// Não depende de download do compilador, funciona offline.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const pastaContratos = path.join(__dirname, "..", "contracts");
const pastaSaida = path.join(__dirname, "..", "artifacts");

const sources = {};
for (const arquivo of fs.readdirSync(pastaContratos)) {
  if (arquivo.endsWith(".sol")) {
    sources[arquivo] = { content: fs.readFileSync(path.join(pastaContratos, arquivo), "utf8") };
  }
}

const entrada = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const saida = JSON.parse(solc.compile(JSON.stringify(entrada)));
const erros = (saida.errors || []).filter((e) => e.severity === "error");
if (erros.length) {
  erros.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}

fs.mkdirSync(pastaSaida, { recursive: true });
for (const arquivo of Object.keys(saida.contracts)) {
  for (const [nome, c] of Object.entries(saida.contracts[arquivo])) {
    fs.writeFileSync(
      path.join(pastaSaida, `${nome}.json`),
      JSON.stringify({ contractName: nome, abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2)
    );
    console.log(`✔ ${nome} compilado`);
  }
}
