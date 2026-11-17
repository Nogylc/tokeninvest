import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { sessao } from "./api/cliente";
import Layout from "./componentes/Layout";
import Login from "./paginas/Login";
import Inicio from "./paginas/Inicio";
import OpenFinance from "./paginas/OpenFinance";
import RetornoOpenFinance from "./paginas/RetornoOpenFinance";
import BancoSimulado from "./paginas/BancoSimulado";
import Investir from "./paginas/Investir";
import Extrato from "./paginas/Extrato";
import Privacidade from "./paginas/Privacidade";
import "./estilo.css";

function Protegida({ children }) {
  return sessao.obter() ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Tela da OUTRA instituição (banco transmissor) */}
      <Route path="/banco-simulado" element={<BancoSimulado />} />
      <Route path="/" element={<Protegida><Inicio /></Protegida>} />
      <Route path="/open-finance" element={<Protegida><OpenFinance /></Protegida>} />
      <Route path="/open-finance/retorno" element={<Protegida><RetornoOpenFinance /></Protegida>} />
      <Route path="/investir" element={<Protegida><Investir /></Protegida>} />
      <Route path="/extrato" element={<Protegida><Extrato /></Protegida>} />
      <Route path="/privacidade" element={<Protegida><Privacidade /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
