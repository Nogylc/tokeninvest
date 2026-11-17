import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { api, sessao } from "../api/cliente";
import { useTema } from "../tema";
import { Icone } from "./Icones";

const MENU = [
  { para: "/", rotulo: "Início", icone: "casa", exato: true },
  { para: "/open-finance", rotulo: "Open Finance", icone: "conexao" },
  { para: "/investir", rotulo: "Investir", icone: "grafico" },
  { para: "/extrato", rotulo: "Extrato", icone: "lista" },
  { para: "/privacidade", rotulo: "Privacidade", icone: "escudo" },
];

// Nome do usuário fica em memória para não repetir a chamada a cada troca de tela.
let usuarioEmCache = null;

export function BotaoTema({ tema, alternar }) {
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      className="botao-icone"
      onClick={alternar}
      aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
    >
      <Icone nome={escuro ? "sol" : "lua"} />
    </button>
  );
}

export default function Layout({ children }) {
  const navegar = useNavigate();
  const { tema, alternar, logo } = useTema();
  const [usuario, setUsuario] = useState(usuarioEmCache);

  useEffect(() => {
    if (usuarioEmCache) return;
    api.eu().then((u) => { usuarioEmCache = u; setUsuario(u); }).catch(() => {});
  }, []);

  const sair = () => {
    usuarioEmCache = null;
    sessao.limpar();
    navegar("/login");
  };

  const primeiroNome = usuario?.nome?.split(" ")[0] || "";
  const iniciais = usuario?.nome
    ? usuario.nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("")
    : "";

  return (
    <div className="app">
      <header className="topo">
        <div className="topo-interno">
          <Link to="/" className="marca" aria-label="TokenInvest, página inicial">
            <img src={logo} alt="TokenInvest" className="logo" />
          </Link>

          <nav className="menu-principal" aria-label="Principal">
            {MENU.map((item) => (
              <NavLink key={item.para} to={item.para} end={item.exato}>{item.rotulo}</NavLink>
            ))}
          </nav>

          <div className="topo-acoes">
            <BotaoTema tema={tema} alternar={alternar} />
            <div className="usuario-chip" title={usuario?.email || ""}>
              <span className="avatar" aria-hidden="true">{iniciais}</span>
              <span className="usuario-nome">{primeiroNome}</span>
            </div>
            <button type="button" className="botao-sair" onClick={sair}>Sair</button>
          </div>
        </div>
      </header>

      <main className="conteudo">{children}</main>

      <footer className="rodape">
        <div className="rodape-interno">
          <div className="rodape-linha">
            <span className="rodape-marca">TokenInvest</span>
            <nav className="rodape-links" aria-label="Institucional">
              <a href="#">Termos de Uso</a>
              <a href="#">Política de Privacidade</a>
              <a href="#">Ouvidoria</a>
            </nav>
          </div>
          <div className="rodape-linha rodape-legal">
            <span>© 2026 TokenInvest. Todos os direitos reservados.</span>
            <span>Operação em ambiente de Sandbox Regulatório.</span>
          </div>
        </div>
      </footer>

      <nav className="menu-inferior" aria-label="Principal (celular)">
        {MENU.map((item) => (
          <NavLink key={item.para} to={item.para} end={item.exato}>
            <Icone nome={item.icone} tamanho={20} />
            <span>{item.rotulo}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// Alerta discreto com borda à esquerda. tipo: "erro" | "ok" | "info"
export function Aviso({ tipo = "erro", children }) {
  if (!children) return null;
  return (
    <div className={`aviso ${tipo}`} role={tipo === "erro" ? "alert" : "status"}>
      <div>{children}</div>
    </div>
  );
}

// Etapas do fluxo Open Finance (1 Consentimento, 2 Autenticação, 3 Confirmação)
const ETAPAS = ["Consentimento", "Autenticação no banco", "Confirmação"];
export function Etapas({ atual }) {
  return (
    <ol className="stepper" aria-label="Etapas">
      {ETAPAS.map((rotulo, i) => {
        const n = i + 1;
        const estado = n < atual ? "feita" : n === atual ? "atual" : "pendente";
        return (
          <li key={rotulo} className={estado} aria-current={n === atual ? "step" : undefined}>
            <span className="stepper-num">{n < atual ? <Icone nome="check" tamanho={14} /> : n}</span>
            <span className="stepper-rotulo">{rotulo}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Selo de status (ponto colorido + texto, sem fundo preenchido)
export function Selo({ status, children }) {
  return <span className={`selo ${status || ""}`}>{children}</span>;
}

// Placeholder de carregamento
export function Esqueleto({ largura = "100%", altura = 16, className = "", style = {} }) {
  return <span className={`esqueleto ${className}`} style={{ width: largura, height: altura, ...style }} aria-hidden="true" />;
}

// Botão que copia um texto (hash, endereço) para a área de transferência
export function BotaoCopiar({ texto, rotulo = "Copiar" }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {}
  }
  return (
    <button type="button" className={`botao-copiar ${copiado ? "copiado" : ""}`} onClick={copiar} aria-label={rotulo} title={rotulo}>
      <Icone nome={copiado ? "check" : "copiar"} tamanho={14} />
    </button>
  );
}
