const { createClient } = supabase;

const supabaseClient = createClient(
  "https://wwaohtcebmijxgugbihu.supabase.co",
  "sb_publishable_BU6qFD5MDhuUvybtf-ehkw_--JRKqTY"
);

async function verificarAcesso() {
  const div = document.getElementById("infoUsuario");

  const { data } = await supabaseClient.auth.getSession();

  const session = data?.session;

  if (session?.user) {
    const nome =
      session.user.user_metadata?.nome ||
      session.user.email.split("@")[0];

    div.innerHTML = `👤 Logado como <strong>${nome}</strong>`;
    return;
  }

  const veioDoPortal = document.referrer.includes("rubo.com.br");

  if (veioDoPortal) {
    div.innerHTML = `⚠️ Acesso via Portal (sem login)`;
  } else {
    div.innerHTML = `🌐 Acesso direto`;
  }
}

verificarAcesso();

