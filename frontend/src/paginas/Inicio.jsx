import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/cliente";
import { reais } from "../dominio/formatar";
import { Aviso, Esqueleto, BotaoCopiar } from "../componentes/Layout";

const VALORES_RAPIDOS = [5000, 10000, 50000, 100000]; // em centavos

function CartaoSaldo({ rotulo, children, principal = false }) {
  return (
    <div className={`cartao cartao-saldo ${principal ? "saldo-principal" : ""}`}>
      <div className="rotulo-linha">{rotulo}</div>
      {children}
    </div>
  );
}

function EsqueletoInicio() {
  return (
    <>
      <div className="pagina-cabecalho"><Esqueleto largura={180} altura={28} /></div>
      <div className="grade">
        {[0, 1, 2].map((i) => (
          <div className="cartao" key={i}>
            <Esqueleto largura={140} altura={14} />
            <Esqueleto className="bloco" largura="60%" altura={34} style={{ margin: "12px 0 8px" }} />
            <Esqueleto largura={100} altura={12} />
          </div>
        ))}
      </div>
      <div className="cartao">
        <Esqueleto largura={200} altura={18} />
        <Esqueleto className="bloco" altura={54} style={{ marginTop: 16 }} />
      </div>
    </>
  );
}

export default function Inicio() {
  const [usuario, setUsuario] = useState(null);
  const [carteira, setCarteira] = useState(null);
  const [saldoBanco, setSaldoBanco] = useState(null);
  const [valorCentavos, setValorCentavos] = useState(10000); // R$ 100,00
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    setUsuario(await api.eu());
    setCarteira(await api.carteira());
    try {
      setSaldoBanco((await api.saldoBancario()).saldoCentavos);
    } catch {
      setSaldoBanco(null); // sem consentimento ativo
    }
  }
  useEffect(() => { carregar().catch((e) => setMsg({ tipo: "erro", texto: e.message })); }, []);

  async function operar(tipo) {
    const valor = (valorCentavos / 100).toFixed(2);
    setOcupado(true);
    setMsg({});
    try {
      const r = tipo === "depositar" ? await api.depositar(valor) : await api.resgatar(valor);
      setMsg({ tipo: "ok", texto: `${tipo === "depositar" ? "Depósito" : "Resgate"} de ${reais(valorCentavos)} concluído. Registrado no bloco #${r.transacao.bloco}.` });
      await carregar();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    } finally {
      setOcupado(false);
    }
  }

  const aoDigitarValor = (e) => {
    const digitos = e.target.value.replace(/\D/g, "").slice(0, 12);
    setValorCentavos(Number(digitos || 0));
  };
  const valorFormatado = (valorCentavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!usuario || !carteira) {
    return (
      <>
        {msg.texto && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
        <EsqueletoInicio />
      </>
    );
  }

  const investido = carteira.ativos.reduce((s, a) => s + a.minhasCotas * a.precoCotaCentavos, 0);
  const contaConectada = saldoBanco !== null;
  const valorValido = valorCentavos > 0;

  return (
    <>
      <div className="pagina-cabecalho">
        <div>
          <h2>Olá, {usuario.nome.split(" ")[0]}</h2>
          <p className="sub">Resumo da sua posição e operações em DREX.</p>
        </div>
      </div>

      <div className="grade">
        <CartaoSaldo rotulo="Saldo em DREX (dBRL)" principal>
          <strong className="valor-grande">{reais(carteira.saldoDrexCentavos)}</strong>
          <p className="pequeno">Disponível para investir ou resgatar a qualquer hora.</p>
        </CartaoSaldo>

        <CartaoSaldo rotulo="Investido">
          <strong className="valor-medio">{reais(investido)}</strong>
          <p className="pequeno">
            {carteira.ativos.filter((a) => a.minhasCotas > 0).length > 0
              ? `${carteira.ativos.filter((a) => a.minhasCotas > 0).length} ativo(s) em carteira`
              : <Link to="/investir">Ver ativos disponíveis</Link>}
          </p>
        </CartaoSaldo>

        <CartaoSaldo rotulo="Conta conectada">
          {contaConectada ? (
            <>
              <strong className="valor-medio">{reais(saldoBanco)}</strong>
              <p className="pequeno">Banco Rio, via Open Finance</p>
            </>
          ) : (
            <>
              <strong className="valor-medio" style={{ color: "var(--texto-3)" }}>Nenhuma</strong>
              <p className="pequeno"><Link to="/open-finance">Conectar conta bancária</Link></p>
            </>
          )}
        </CartaoSaldo>
      </div>

      <div className="cartao">
        <div className="secao-titulo">
          <h3>Depositar ou resgatar</h3>
          <span className="pequeno">Pix via Open Finance</span>
        </div>

        <div className="operacao-grade">
          <div>
            <label htmlFor="valor-operacao">Valor</label>
            <div className="campo-valor">
              <span className="prefixo">R$</span>
              <input
                id="valor-operacao"
                type="text"
                inputMode="numeric"
                value={valorFormatado}
                onChange={aoDigitarValor}
                aria-label="Valor em reais"
              />
            </div>
            <div className="valores-rapidos">
              {VALORES_RAPIDOS.map((v) => (
                <button key={v} type="button" className="chip" onClick={() => setValorCentavos(v)}>{reais(v)}</button>
              ))}
            </div>
            <div className="botoes espaco-cima-g">
              <button disabled={ocupado || !valorValido} onClick={() => operar("depositar")}>
                Depositar
              </button>
              <button disabled={ocupado || !valorValido} className="secundario" onClick={() => operar("resgatar")}>
                Resgatar
              </button>
            </div>
          </div>

          <div className="operacao-resumo">
            <dl className="detalhes">
              <dt>Origem do depósito</dt><dd>{contaConectada ? "Banco Rio" : "Conecte uma conta"}</dd>
              <dt>Liquidação</dt><dd>Imediata</dd>
              <dt>Tarifa</dt><dd>{reais(0)}</dd>
              <dt>Você recebe</dt><dd>{valorFormatado} dBRL</dd>
            </dl>
            <p className="pequeno espaco-cima">
              O depósito inicia um Pix da sua conta e emite dBRL na sua carteira. O resgate queima o dBRL e devolve o valor por Pix.
            </p>
          </div>
        </div>

        <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>
      </div>

      <div className="info-rede">
        <span>Carteira</span>
        <span className="hash"><code>{carteira.endereco}</code><BotaoCopiar texto={carteira.endereco} rotulo="Copiar endereço" /></span>
        <span className="sep">·</span>
        <span>{carteira.rede.rede}</span>
        <span className="sep">·</span>
        <span className="tabular">bloco #{carteira.rede.blocoAtual}</span>
      </div>
    </>
  );
}
