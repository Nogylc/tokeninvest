import React, { useMemo, useState } from 'react';
import { apiBanco } from '../api/cliente';
import { parametrosAutorizacao, parametrosRetorno } from '../dominio/openFinance';
import { data } from '../dominio/formatar';
import { TemaBanco } from '../Contexto';
import { useDados } from '../useDados';
import { Aviso, Botao, Campo, Carregando, Cartao, Etapas, Secundario, Tela, Texto } from '../componentes/UI';

function Banco({ route, navigation }) {
  const pedido = useMemo(() => {
    try { return { params: parametrosAutorizacao(route.params.urlAutorizacao) }; }
    catch (e) { return { erro: e.message }; }
  }, [route.params.urlAutorizacao]);
  const q = useDados(() => pedido.erro ? Promise.reject(new Error(pedido.erro)) : apiBanco.consentimento(pedido.params.consent_id));
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function decidir(aprovar) {
    setErro(''); setOcupado(true);
    try {
      const p = pedido.params;
      const { redirectUrl } = await apiBanco.autorizar({ consentId: p.consent_id, cpf, senha, aprovar, redirect_uri: p.redirect_uri, state: p.state, code_challenge: p.code_challenge });
      const retorno = parametrosRetorno(redirectUrl, p.state);
      setSenha('');
      navigation.replace('Confirmacao', { retorno });
    } catch (e) { setErro(e.message); } finally { setOcupado(false); }
  }
  return <Tela banco titulo="Banco Rio" subtitulo="Internet Banking">
    <Etapas atual={2} /><Aviso mensagem={erro || q.erro} />{q.carregando && <Carregando />}
    {q.dados && <Cartao><Texto tipo="titulo">Autorizar compartilhamento de dados</Texto><Secundario>{q.dados.instituicaoReceptora} solicita acesso às informações abaixo, conforme as regras do Open Finance.</Secundario>
      <Texto tipo="subtitulo">Dados solicitados</Texto>{q.dados.permissoes.map(p => <Texto key={p}>{p}</Texto>)}<Secundario>Válido até {data(q.dados.expiraEm)}. Você pode cancelar a qualquer momento.</Secundario>
      <Secundario>Para continuar, identifique-se com os dados da sua conta Banco Rio.</Secundario><Campo rotulo="CPF" placeholder="000.000.000-00" keyboardType="number-pad" value={cpf} onChangeText={setCpf} /><Campo rotulo="Senha do banco" secureTextEntry autoCapitalize="none" value={senha} onChangeText={setSenha} />
      <Botao titulo="Autorizar" disabled={ocupado || !cpf || !senha} onPress={() => decidir(true)} /><Botao secundario titulo="Não autorizar" disabled={ocupado} onPress={() => decidir(false)} />
      <Secundario tipo="pequeno">O Banco Rio nunca compartilha sua senha com terceiros.</Secundario>
    </Cartao>}
  </Tela>;
}
export default function BancoRio(props) { return <TemaBanco><Banco {...props} /></TemaBanco>; }
