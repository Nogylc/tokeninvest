import React, { useState } from 'react';
import { View } from 'react-native';
import { api } from '../api/cliente';
import { reais, encurtar } from '../dominio/formatar';
import { useDados } from '../useDados';
import { useApp } from '../Contexto';
import { Aviso, Botao, Campo, Carregando, Cartao, Copiar, Linha, Secundario, Tela, Texto } from '../componentes/UI';

export default function Investir() {
  const q = useDados(() => api.ativos());
  const { cores } = useApp();
  const [quantidades, setQuantidades] = useState({});
  const [msg, setMsg] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const definir = (id, valor) => setQuantidades(v => ({ ...v, [id]: Math.max(1, Math.floor(Number(valor) || 1)) }));
  async function operar(a, tipo, quantidade) {
    setOcupado(true); setMsg({});
    try { const r = await api[tipo](a.id, quantidade); setMsg({ tipo: 'ok', texto: `${tipo === 'comprar' ? 'Compra' : 'Venda'} de ${r.quantidade} ${a.simbolo} (${reais(r.valorCentavos)}) registrada no bloco #${r.transacao.bloco}.` }); q.atualizar(); }
    catch (e) { setMsg({ texto: e.message }); } finally { setOcupado(false); }
  }
  return <Tela titulo="Ativos tokenizados" subtitulo="Cada cota é um token registrado em contrato inteligente. Liquidação em DREX, 24 horas por dia." atualizar={q.atualizar} carregando={q.carregando}>
    <Aviso mensagem={q.erro} /><Aviso tipo={msg.tipo} mensagem={msg.texto} />{!q.dados && q.carregando && <Carregando />}
    {q.dados?.map(a => {
      const qtd = quantidades[a.id] ?? 1;
      const vendidas = a.totalCotas - a.cotasDisponiveis;
      const percentual = a.totalCotas ? Math.min(100, Math.round(vendidas / a.totalCotas * 100)) : 0;
      return <Cartao key={a.id}><Linha><Texto tipo="subtitulo" style={{ flex: 1 }}>{a.nome}</Texto><Texto style={{ color: cores.destaqueTexto }}>{a.simbolo}</Texto></Linha><Secundario>{a.descricao}</Secundario>
        <Linha><View style={{ flex: 1 }}><Secundario tipo="pequeno">Cota</Secundario><Texto tipo="subtitulo">{reais(a.precoCotaCentavos)}</Texto></View><View style={{ flex: 1 }}><Secundario tipo="pequeno">Rentabilidade</Secundario><Texto style={{ color: cores.destaqueTexto }}>{a.rentabilidadeEstimada}</Texto></View></Linha>
        <Secundario>Minhas cotas: {a.minhasCotas} · Limite por CPF: {a.limitePorInvestidor}</Secundario>
        <View accessibilityLabel={`${vendidas} de ${a.totalCotas} cotas vendidas`} style={{ height: 5, borderRadius: 3, backgroundColor: cores.borda, overflow: 'hidden' }}><View style={{ height: 5, width: `${percentual}%`, backgroundColor: cores.destaque }} /></View><Secundario tipo="pequeno">{vendidas} de {a.totalCotas} cotas vendidas · {percentual}%</Secundario>
        {a.pausado && <Aviso tipo="info" mensagem="Negociação temporariamente pausada pelo emissor." />}
        <Linha><Botao secundario titulo="−" disabled={qtd <= 1 || ocupado} onPress={() => definir(a.id, qtd - 1)} /><Campo rotulo="Quantidade" keyboardType="number-pad" value={String(qtd)} onChangeText={v => definir(a.id, v.replace(/\D/g, '').slice(0, 6))} style={{ width: 72, textAlign: 'center' }} /><Botao secundario titulo="+" disabled={ocupado} onPress={() => definir(a.id, qtd + 1)} /><View style={{ flex: 1, minWidth: 70 }}><Secundario tipo="pequeno">Total</Secundario><Texto tipo="subtitulo">{reais(qtd * a.precoCotaCentavos)}</Texto></View></Linha>
        <Linha><Botao titulo="Comprar" disabled={ocupado || a.pausado} onPress={() => operar(a, 'comprar', qtd)} /><Botao secundario titulo="Vender" disabled={ocupado || !a.minhasCotas} onPress={() => operar(a, 'vender', qtd)} /></Linha>
        <Secundario tipo="pequeno">Contrato {encurtar(a.enderecoContrato)}</Secundario><Copiar texto={a.enderecoContrato} rotulo="Copiar contrato" />
      </Cartao>;
    })}
  </Tela>;
}
