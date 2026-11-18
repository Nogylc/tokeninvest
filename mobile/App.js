import React from 'react';
import { Pressable, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { Provedor, useApp } from './src/Contexto';
import { Carregando, Marca, Texto } from './src/componentes/UI';
import Login from './src/telas/Login';
import Inicio from './src/telas/Inicio';
import OpenFinance from './src/telas/OpenFinance';
import Investir from './src/telas/Investir';
import Extrato from './src/telas/Extrato';
import Privacidade, { MeusDados } from './src/telas/Privacidade';
import BancoRio from './src/telas/BancoRio';
import Confirmacao from './src/telas/Confirmacao';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const telas = { 'Início': [Inicio, 'home'], 'Open Finance': [OpenFinance, 'link'], Investir: [Investir, 'trending-up'], Extrato: [Extrato, 'list'], Privacidade: [Privacidade, 'shield'] };
function Cabecalho() {
  const { cores, tema, alternarTema, seguirSistema } = useApp();
  return <SafeAreaView edges={['top']} style={{ backgroundColor: cores.superficie, borderBottomWidth: 1, borderColor: cores.borda }}><View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Marca /><Pressable accessibilityRole="button" accessibilityLabel="Alternar tema (pressione e segure para seguir o sistema)" onPress={alternarTema} onLongPress={seguirSistema} hitSlop={12} style={{ padding: 8 }}><Feather name={tema === 'dark' ? 'sun' : 'moon'} size={21} color={cores.texto} /></Pressable></View></SafeAreaView>;
}
function Principal() {
  const { cores } = useApp();
  return <Tabs.Navigator screenOptions={({ route }) => ({ header: () => <Cabecalho />, tabBarActiveTintColor: cores.destaqueTexto, tabBarInactiveTintColor: cores.secundario, tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.borda }, tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 10 }, tabBarIcon: ({ color, size }) => <Feather name={telas[route.name][1]} color={color} size={size} /> })}>{Object.entries(telas).map(([name, [component]]) => <Tabs.Screen key={name} name={name} component={component} />)}</Tabs.Navigator>;
}
function Navegacao() {
  const { cores, tema, iniciando, autenticado } = useApp();
  const [fontes, erroFonte] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  if (erroFonte) return <SafeAreaView style={{ flex: 1, padding: 24, backgroundColor: cores.fundo }}><Texto>Não foi possível carregar a fonte. Feche e abra o app novamente.</Texto></SafeAreaView>;
  if (!fontes || iniciando) return <SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: cores.fundo }}><Carregando /></SafeAreaView>;
  const navigationTheme = { ...(tema === 'dark' ? DarkTheme : DefaultTheme), colors: { ...(tema === 'dark' ? DarkTheme.colors : DefaultTheme.colors), primary: cores.destaqueTexto, background: cores.fundo, card: cores.superficie, text: cores.texto, border: cores.borda } };
  return <><StatusBar style={tema === 'dark' ? 'light' : 'dark'} /><NavigationContainer theme={navigationTheme}><Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: cores.superficie }, headerTintColor: cores.texto, headerTitleStyle: { fontFamily: 'Inter_600SemiBold' }, contentStyle: { backgroundColor: cores.fundo } }}>
    {autenticado ? <><Stack.Screen name="Principal" component={Principal} options={{ headerShown: false }} /><Stack.Screen name="BancoRio" component={BancoRio} options={{ title: 'Banco Rio', headerStyle: { backgroundColor: '#a54b2a' }, headerTintColor: '#fff' }} /><Stack.Screen name="Confirmacao" component={Confirmacao} options={{ title: 'Confirmar conexão', headerBackVisible: false, gestureEnabled: false }} /><Stack.Screen name="MeusDados" component={MeusDados} options={{ title: 'Meus dados' }} /></> : <><Stack.Screen name="Login" component={Login} options={{ header: () => <Cabecalho /> }} /><Stack.Screen name="Cadastro" component={Login} options={{ title: 'Criar conta' }} /></>}
  </Stack.Navigator></NavigationContainer></>;
}
export default function App() { return <SafeAreaProvider><Provedor><Navegacao /></Provedor></SafeAreaProvider>; }
