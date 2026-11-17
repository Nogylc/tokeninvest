import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, sessao } from "../api/cliente";
import { Aviso, BotaoTema } from "../componentes/Layout";
import { useTema, ARQUIVOS_TEMA } from "../tema";

const PONTOS = [
  { titulo: "A partir de R$ 10", texto: "Frações de CDB, recebíveis e imóveis, sem ticket mínimo alto." },
  { titulo: "Liquidez 24 horas", texto: "Compra e venda liquidadas em DREX a qualquer hora, inclusive fins de semana." },
  { titulo: "Segurança do Open Finance", texto: "Conexão bancária com consentimento específico, prazo definido e revogável." },
];

export default function Login() {
  const navegar = useNavigate();
  const { tema, alternar, logo } = useTema();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nome: "", email: "", cpf: "", senha: "", aceiteTermos: false });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const mudar = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = modo === "login" ? await api.login(form.email, form.senha) : await api.cadastrar(form);
      sessao.salvar(r.token);
      navegar("/");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const entrando = modo === "login";

  return (
    <div className="tela-login">
      <aside className="login-painel">
        <div>
          <img src={ARQUIVOS_TEMA.escuro.logo} alt="TokenInvest" className="logo" />
          <h1 style={{ marginTop: 56 }}>Invista em ativos reais a partir de R$ 10.</h1>
          <p className="lead">Liquidez 24 horas, com a segurança do Open Finance e registro em livro-razão distribuído.</p>
          <ul className="login-pontos">
            {PONTOS.map((p) => (
              <li key={p.titulo}>
                <strong>{p.titulo}</strong>
                <span>{p.texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="login-painel-rodape">© 2026 TokenInvest. Operação em ambiente de Sandbox Regulatório.</p>
      </aside>

      <section className="login-lado">
        <div className="login-tema"><BotaoTema tema={tema} alternar={alternar} /></div>
        <div className="login-caixa">
          <img src={logo} alt="TokenInvest" className="logo" />
          <h2>{entrando ? "Entrar na sua conta" : "Criar conta"}</h2>
          <p className="sub">
            {entrando
              ? "Acesse para acompanhar sua carteira e investir."
              : "Leva menos de um minuto. Você precisa só de nome, CPF e e-mail."}
          </p>

          <form onSubmit={enviar}>
            {modo === "cadastro" && (
              <>
                <label>Nome completo<input value={form.nome} onChange={mudar("nome")} autoComplete="name" required /></label>
                <label>CPF<input value={form.cpf} onChange={mudar("cpf")} placeholder="000.000.000-00" inputMode="numeric" required /></label>
              </>
            )}
            <label>E-mail<input type="email" value={form.email} onChange={mudar("email")} autoComplete="email" required /></label>
            <label>Senha<input type="password" value={form.senha} onChange={mudar("senha")} minLength={8} autoComplete={entrando ? "current-password" : "new-password"} required /></label>

            {modo === "cadastro" && (
              <label className="check">
                <input type="checkbox" checked={form.aceiteTermos} onChange={mudar("aceiteTermos")} />
                <span>
                  Li e aceito a Política de Privacidade. Meus dados são usados apenas para operar a conta,
                  o CPF é armazenado criptografado e posso solicitar a exclusão a qualquer momento.
                </span>
              </label>
            )}

            <Aviso>{erro}</Aviso>
            <button className="largo" disabled={carregando}>
              {carregando ? "Aguarde" : entrando ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="troca">
            {entrando ? "Ainda não tem conta? " : "Já tem conta? "}
            <button type="button" className="link" onClick={() => { setErro(""); setModo(entrando ? "cadastro" : "login"); }}>
              {entrando ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
          <p className="login-legal">Ambiente protegido. Sua senha bancária nunca é solicitada pelo TokenInvest.</p>
        </div>
      </section>
    </div>
  );
}
