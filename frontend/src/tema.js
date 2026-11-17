// Tema claro/escuro: persistido em localStorage; na primeira visita segue o sistema.
import { useCallback, useEffect, useState } from "react";

const CHAVE = "tokeninvest.tema";

// Arquivos em public/: "logo-claro.png" tem letras brancas (para fundo escuro) e
// "logo-escuro.png" tem letras em azul-marinho (para fundo claro). Os favicons são o
// cubo recortado de cada logo. Se quiser inverter, basta trocar aqui.
export const ARQUIVOS_TEMA = {
  claro: { logo: "/logo-escuro.png", favicon: "/favicon-escuro.png" },
  escuro: { logo: "/logo-claro.png", favicon: "/favicon-claro.png" },
};

export function temaAtual() {
  const noDocumento = document.documentElement.getAttribute("data-tema");
  if (noDocumento === "claro" || noDocumento === "escuro") return noDocumento;
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function aplicarTema(tema) {
  document.documentElement.setAttribute("data-tema", tema);
  const icone = document.getElementById("favicon");
  if (icone) icone.href = ARQUIVOS_TEMA[tema].favicon;
}

export function useTema() {
  const [tema, setTema] = useState(temaAtual);

  useEffect(() => { aplicarTema(tema); }, [tema]);

  // Sem escolha salva, acompanha mudanças do sistema.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const ouvir = (e) => {
      try { if (localStorage.getItem(CHAVE)) return; } catch {}
      setTema(e.matches ? "escuro" : "claro");
    };
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);

  const alternar = useCallback(() => {
    setTema((t) => {
      const novo = t === "claro" ? "escuro" : "claro";
      try { localStorage.setItem(CHAVE, novo); } catch {}
      return novo;
    });
  }, []);

  return { tema, alternar, logo: ARQUIVOS_TEMA[tema].logo };
}
