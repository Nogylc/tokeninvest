import React, { useState } from 'react';
import { api } from '../api/cliente';
import { data, STATUS_CONSENTIMENTO } from '../dominio/formatar';
import { parametrosAutorizacao } from '../dominio/openFinance';
import { useDados } from '../useDados';
import { Aviso, Botao, Carregando, Cartao, Escolha, Etapas, Linha, Secundario, Tela, Texto } from '../componentes/UI';

export default function OpenFinance({ navigation }) {
  const q = useDados(async () => { const [permissoes, lista] = await Promise.all([api.permissoes(), api.consentimentos()]); return { permissoes, lista }; });
  const [escolhidas, setEscolhidas] = useState(['CONTAS_SALDO', 'PAGAMENTOS_PIX']);
  const [prazo, setPrazo] = useState(90);
  const [erro, setErro] = useState('');
  async function conectar() {
    setErro('');
    try {
      const { urlAutorizacao } = await api.criarConsentimento(escolhidas, prazo);
      parametrosAutorizacao(urlAutorizacao);
      navigation.getParent().navigate('BancoRio', { urlAutorizacao });
    } catch (e) { setErro(e.message); }
  }
  const ativo = q.dados?.lista.find(c => c.status === 'ATIVO');
  return <Tela titulo="Conectar conta bancária" subtitulo="Compartilhamento de dados via Open Finance, com consentimento específico e prazo definido." atualizar={q.atualizar} carregando={q.carregando}>
    <Etapas atual={1} /><Aviso mensagem={q.erro || erro} />{!q.dados && q.carregando && <Carregando />}
    {ativo && <Aviso tipo="ok" mensagem={`Você já tem um consentimento ativo com o ${ativo.banco}, válido até ${data(ativo.expiraEm)}.`} />}
    {q.dados && <Cartao><Texto tipo="subtitulo">O que o TokenInvest poderá acessar no Banco Rio</Texto><Secundario>Marque apenas o que você autoriza. Cada permissão é independente.</Secundario>
      {Object.entries(q.dados.permissoes).map(([codigo, descricao]) => <Escolha key={codigo} titulo={`${descricao}\nPermissão ${codigo}`} selecionada={escolhidas.includes(codigo)} onPress={() => setEscolhidas(v => v.includes(codigo) ? v.filter(p => p !== codigo) : [...v, codigo])} />)}
      <Texto>Validade do consentimento</Texto><Linha>{[30, 90, 180, 365].map(dias => <Botao key={dias} secundario={prazo !== dias} titulo={dias === 365 ? '12 meses' : `${dias} dias`} onPress={() => setPrazo(dias)} />)}</Linha>
      <Aviso tipo="info" mensagem="Você pode revogar este consentimento a qualquer momento em Privacidade. A senha do banco é digitada somente na etapa Banco Rio e não fica armazenada no app." />
      <Botao titulo="Continuar para o Banco Rio" disabled={!escolhidas.length} onPress={conectar} />
    </Cartao>}
    {!!q.dados?.lista.length && <Cartao><Texto tipo="subtitulo">Histórico de consentimentos</Texto>{q.dados.lista.map(c => <Secundario key={c.id}>{c.banco} · {STATUS_CONSENTIMENTO[c.status]}{'\n'}{c.permissoes.join(', ')}{'\n'}Expira: {data(c.expiraEm)}</Secundario>)}</Cartao>}
  </Tela>;
}
