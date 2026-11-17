// DOMÍNIO: regras de cadastro e de privacidade (LGPD) do usuário.
const { ErroDominio } = require("./consentimento");

function somenteDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

/** Validação oficial dos dígitos verificadores do CPF. */
function cpfValido(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

function validarCadastro({ nome, email, cpf, senha, aceiteTermos }) {
  if (!nome || String(nome).trim().length < 3) throw new ErroDominio("Informe seu nome completo.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ""))) throw new ErroDominio("E-mail inválido.");
  if (!cpfValido(cpf)) throw new ErroDominio("CPF inválido.");
  if (!senha || String(senha).length < 8) throw new ErroDominio("A senha deve ter pelo menos 8 caracteres.");
  // LGPD: base legal = consentimento do titular para o tratamento dos dados
  if (aceiteTermos !== true) throw new ErroDominio("É preciso aceitar a Política de Privacidade.");
  return {
    nome: String(nome).trim(),
    email: String(email).trim().toLowerCase(),
    cpf: somenteDigitos(cpf),
  };
}

// LGPD - minimização: telas e logs só mostram dados mascarados
function mascararCpf(cpf) {
  const d = somenteDigitos(cpf);
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

function mascararEmail(email) {
  const [u, dom] = String(email).split("@");
  return `${u.slice(0, 2)}***@${dom}`;
}

module.exports = { cpfValido, validarCadastro, mascararCpf, mascararEmail, somenteDigitos };
