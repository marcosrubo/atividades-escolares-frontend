function definirStatus(classe, html) {
  const div = document.getElementById("infoUsuario");
  if (!div) return;

  div.className = `status-acesso ${classe}`;
  div.innerHTML = html;
}

function lerParametros() {
  const params = new URLSearchParams(window.location.search);

  return {
    origem: params.get("origem") || "",
    modo: params.get("modo") || "",
    nome: params.get("nome") || ""
  };
}

function normalizarNome(nome) {
  if (!nome) return "";

  try {
    return decodeURIComponent(nome).trim();
  } catch {
    return nome.trim();
  }
}

function verificarAcesso() {
  const { origem, modo, nome } = lerParametros();
  const nomeLimpo = normalizarNome(nome);

  if (!origem) {
    definirStatus(
      "status-direto",
      "🌐 <strong>Acesso direto pelo link</strong>, sem passar pelo Portal RUBO."
    );
    return;
  }

  if (origem === "portal" && modo === "anonimo") {
    definirStatus(
      "status-portal",
      "⚠️ <strong>Veio do Portal RUBO</strong>, mas sem login."
    );
    return;
  }

  if (origem === "portal" && modo === "logado") {
    definirStatus(
      "status-logado",
      `👤 <strong>Logado via Portal RUBO como:</strong> ${nomeLimpo || "Usuário"}`
    );
    return;
  }

  definirStatus(
    "status-neutro",
    "ℹ️ Não foi possível identificar corretamente a forma de acesso."
  );
}

document.addEventListener("DOMContentLoaded", verificarAcesso);

