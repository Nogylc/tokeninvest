// Ativos reais que serão tokenizados na inicialização do MVP.
// Os números (cotas, preço, limite) vão para o contrato; a descrição fica off-chain.
module.exports = [
  {
    id: "cdb-rio-2027",
    nome: "CDB Banco Rio 2027",
    simbolo: "CDBR27",
    descricao: "Certificado de Depósito Bancário fracionado. Vencimento em 2027.",
    rentabilidadeEstimada: "110% do CDI",
    totalCotas: 10000,
    precoCotaCentavos: 1000, // R$ 10,00
    limitePorInvestidor: 500,
  },
  {
    id: "agro-amazonas",
    nome: "Recebíveis Agro Amazonas",
    simbolo: "RAGRO",
    descricao: "Recebíveis de cooperativas de produtores do Amazonas.",
    rentabilidadeEstimada: "IPCA + 6% a.a.",
    totalCotas: 5000,
    precoCotaCentavos: 2500, // R$ 25,00
    limitePorInvestidor: 200,
  },
  {
    id: "imovel-manaus",
    nome: "Sala Comercial Manaus (fração)",
    simbolo: "IMOVM",
    descricao: "Fração de imóvel comercial no centro de Manaus com renda de aluguel.",
    rentabilidadeEstimada: "0,7% a.m. (aluguel)",
    totalCotas: 2000,
    precoCotaCentavos: 5000, // R$ 50,00
    limitePorInvestidor: 100,
  },
];
