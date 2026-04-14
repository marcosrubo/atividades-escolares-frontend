const { createClient } = supabase;

const supabaseClient = createClient(
  "https://wwaohtcebmijxgugbihu.supabase.co",
  "sb_publishable_BU6qFD5MDhuUvybtf-ehkw_--JRKqTY"
);

function definirStatus(classe, html) {
  const div = document.getElementById("infoUsuario");
  if (!div) return;

  div.className = `status-acesso ${classe}`;
  div.innerHTML = html;
}

async function verificarAcesso() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Erro ao verificar sessão:", error);
    }

    const session = data?.session;

    if (session?.user) {
      const user = session.user;
      const nome =
        user.user_metadata?.nome ||
        (user.email ? user.email.split("@")[0] : "Usuário");

      definirStatus(
        "status-logado",
        `👤 <strong>Logado como:</strong> ${nome}`
      );
      return;
    }

    const referrer = document.referrer || "";
    const veioDoPortal = referrer.includes("rubo.com.br");

    if (veioDoPortal) {
      definirStatus(
        "status-portal",
        "⚠️ <strong>Acesso via Portal RUBO</strong>, mas sem login ativo."
      );
    } else {
      definirStatus(
        "status-direto",
        "🌐 <strong>Acesso direto pelo link</strong>, sem passar pelo Portal RUBO."
      );
    }
  } catch (error) {
    console.error("Erro inesperado ao verificar acesso:", error);
    definirStatus(
      "status-neutro",
      "ℹ️ Não foi possível identificar a forma de acesso."
    );
  }
}

verificarAcesso();

