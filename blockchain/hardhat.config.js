// Rede blockchain local (Hardhat Network) usada como DLT do MVP.
// A compilação é feita por scripts/compilar.js, então aqui só configuramos a rede.
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 31337,
      mining: { auto: true },
    },
  },
};
