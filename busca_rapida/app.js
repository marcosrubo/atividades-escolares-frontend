const hostname = window.location.hostname;

const API_BASE =
  hostname === "127.0.0.1" || hostname === "localhost"
    ? "http://127.0.0.1:3000"
    : "https://atividades-escolares-backend.onrender.com";

const endpoints = {
  disciplinas: `${API_BASE}/disciplinas`,
  seriesAnos: `${API_BASE}/series_anos`,
  atividades: `${API_BASE}/atividades`
};

const btnLimpar = document.getElementById("btnLimpar");
const btnAtualizarBase = document.getElementById("btnAtualizarBase");
const botoesSeriesContainer = document.getElementById("botoesSeries");
const botoesDisciplinasContainer = document.getElementById("botoesDisciplinas");

const areaCarregando = document.getElementById("areaCarregando");
const areaErro = document.getElementById("areaErro");
const areaVazia = document.getElementById("areaVazia");
const listaResultados = document.getElementById("listaResultados");
const textoResumo = document.getElementById("textoResumo");
const badgeQuantidade = document.getElementById("badgeQuantidade");
const textoErro = document.getElementById("textoErro");
const textoCarregando = document.getElementById("textoCarregando");

let atividadesCache = [];
let disciplinasCache = [];
let seriesAnosCache = [];

let filtrosAtuais = {
  serieAnoId: "",
  disciplinaId: ""
};

function mostrarCarregando(mensagem = "Carregando atividades...") {
  textoCarregando.textContent = mensagem;
  areaCarregando.classList.remove("hidden");
  areaErro.classList.add("hidden");
  areaVazia.classList.add("hidden");
  listaResultados.classList.add("hidden");
}

function esconderCarregando() {
  areaCarregando.classList.add("hidden");
}

function mostrarErro(mensagem) {
  textoErro.textContent = mensagem;
  areaErro.classList.remove("hidden");
  areaVazia.classList.add("hidden");
  listaResultados.classList.add("hidden");
  atualizarQuantidade(0);
}

function mostrarVazio(mensagem = "Tente alterar os filtros para ampliar a busca.") {
  areaVazia.classList.remove("hidden");
  areaErro.classList.add("hidden");
  listaResultados.classList.add("hidden");

  areaVazia.innerHTML = `
    <div class="estado-vazio-icone">📄</div>
    <h3>Nenhuma atividade encontrada</h3>
    <p>${mensagem}</p>
  `;

  atualizarQuantidade(0);
}

function atualizarQuantidade(total) {
  badgeQuantidade.textContent = `${total} atividade${total === 1 ? "" : "s"}`;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compararPorNome(a, b, campo = "nome") {
  const textoA = normalizarTexto(a?.[campo]);
  const textoB = normalizarTexto(b?.[campo]);
  return textoA.localeCompare(textoB, "pt-BR");
}

function compararAtividadePorTitulo(a, b) {
  const tituloA = normalizarTexto(a?.titulo);
  const tituloB = normalizarTexto(b?.titulo);
  return tituloA.localeCompare(tituloB, "pt-BR");
}

async function buscarJson(url, nomeRecurso) {
  const response = await fetch(url);

  if (!response.ok) {
    let detalhe = "";

    try {
      const erro = await response.json();
      detalhe = erro?.detalhe || erro?.erro || "";
    } catch {
      detalhe = "";
    }

    throw new Error(
      detalhe
        ? `Erro ao carregar ${nomeRecurso}: ${detalhe}`
        : `Erro ao carregar ${nomeRecurso}.`
    );
  }

  return response.json();
}

function obterSerieIdsDisponiveis() {
  const ids = new Set();

  atividadesCache.forEach((atividade) => {
    if (atividade.serie_ano_id !== null && atividade.serie_ano_id !== undefined) {
      ids.add(String(atividade.serie_ano_id));
    }
  });

  return ids;
}

function obterDisciplinaIdsDisponiveis(serieAnoId = "") {
  const ids = new Set();

  atividadesCache.forEach((atividade) => {
    const pertenceSerie =
      !serieAnoId || String(atividade.serie_ano_id) === String(serieAnoId);

    if (!pertenceSerie) return;

    if (atividade.disciplina_id !== null && atividade.disciplina_id !== undefined) {
      ids.add(String(atividade.disciplina_id));
    }
  });

  return ids;
}

function garantirDisciplinaValida() {
  const disciplinasDisponiveis = obterDisciplinaIdsDisponiveis(filtrosAtuais.serieAnoId);

  if (!filtrosAtuais.disciplinaId) return;

  if (!disciplinasDisponiveis.has(String(filtrosAtuais.disciplinaId))) {
    filtrosAtuais.disciplinaId = "";
  }
}

function montarBotoesSeries() {
  botoesSeriesContainer.innerHTML = "";

  const serieIdsDisponiveis = obterSerieIdsDisponiveis();

  const btnTodos = document.createElement("button");
  btnTodos.type = "button";
  btnTodos.className = `btn-filtro ${!filtrosAtuais.serieAnoId ? "ativo" : ""}`;
  btnTodos.dataset.tipo = "serie";
  btnTodos.dataset.id = "";
  btnTodos.textContent = "Todas as séries";
  btnTodos.addEventListener("click", () => {
    filtrosAtuais.serieAnoId = "";
    garantirDisciplinaValida();
    montarBotoesDisciplinas();
    atualizarBotoesAtivos();
    executarBuscaAtual();
  });
  botoesSeriesContainer.appendChild(btnTodos);

  const seriesDisponiveis = seriesAnosCache
    .filter((serie) => serieIdsDisponiveis.has(String(serie.id)))
    .sort((a, b) => compararPorNome(a, b, "nome"));

  seriesDisponiveis.forEach((serie) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn-filtro ${String(filtrosAtuais.serieAnoId) === String(serie.id) ? "ativo" : ""}`;
    btn.dataset.tipo = "serie";
    btn.dataset.id = String(serie.id);
    btn.textContent = serie.nome;

    btn.addEventListener("click", () => {
      filtrosAtuais.serieAnoId = String(serie.id);
      garantirDisciplinaValida();
      montarBotoesDisciplinas();
      atualizarBotoesAtivos();
      executarBuscaAtual();
    });

    botoesSeriesContainer.appendChild(btn);
  });
}

function montarBotoesDisciplinas() {
  botoesDisciplinasContainer.innerHTML = "";

  const disciplinaIdsDisponiveis = obterDisciplinaIdsDisponiveis(filtrosAtuais.serieAnoId);

  const btnTodas = document.createElement("button");
  btnTodas.type = "button";
  btnTodas.className = `btn-filtro ${!filtrosAtuais.disciplinaId ? "ativo" : ""}`;
  btnTodas.dataset.tipo = "disciplina";
  btnTodas.dataset.id = "";
  btnTodas.textContent = "Todas as disciplinas";
  btnTodas.addEventListener("click", () => {
    filtrosAtuais.disciplinaId = "";
    atualizarBotoesAtivos();
    executarBuscaAtual();
  });
  botoesDisciplinasContainer.appendChild(btnTodas);

  const disciplinasDisponiveis = disciplinasCache
    .filter((disciplina) => disciplinaIdsDisponiveis.has(String(disciplina.id)))
    .sort((a, b) => compararPorNome(a, b, "nome"));

  disciplinasDisponiveis.forEach((disciplina) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn-filtro ${String(filtrosAtuais.disciplinaId) === String(disciplina.id) ? "ativo" : ""}`;
    btn.dataset.tipo = "disciplina";
    btn.dataset.id = String(disciplina.id);
    btn.textContent = disciplina.nome;

    btn.addEventListener("click", () => {
      filtrosAtuais.disciplinaId = String(disciplina.id);
      atualizarBotoesAtivos();
      executarBuscaAtual();
    });

    botoesDisciplinasContainer.appendChild(btn);
  });
}

function atualizarBotoesAtivos() {
  botoesSeriesContainer.querySelectorAll(".btn-filtro").forEach((btn) => {
    btn.classList.toggle(
      "ativo",
      String(btn.dataset.id || "") === String(filtrosAtuais.serieAnoId || "")
    );
  });

  botoesDisciplinasContainer.querySelectorAll(".btn-filtro").forEach((btn) => {
    btn.classList.toggle(
      "ativo",
      String(btn.dataset.id || "") === String(filtrosAtuais.disciplinaId || "")
    );
  });
}

function filtrarAtividades() {
  const filtradas = atividadesCache.filter((atividade) => {
    const matchSerie =
      !filtrosAtuais.serieAnoId ||
      String(atividade.serie_ano_id) === String(filtrosAtuais.serieAnoId);

    const matchDisciplina =
      !filtrosAtuais.disciplinaId ||
      String(atividade.disciplina_id) === String(filtrosAtuais.disciplinaId);

    return matchSerie && matchDisciplina;
  });

  return [...filtradas].sort(compararAtividadePorTitulo);
}

function montarResumoBusca(total) {
  const partes = [];

  if (filtrosAtuais.serieAnoId) {
    const serie = seriesAnosCache.find(
      (item) => String(item.id) === String(filtrosAtuais.serieAnoId)
    );
    if (serie) partes.push(`série/ano: ${serie.nome}`);
  }

  if (filtrosAtuais.disciplinaId) {
    const disciplina = disciplinasCache.find(
      (item) => String(item.id) === String(filtrosAtuais.disciplinaId)
    );
    if (disciplina) partes.push(`disciplina: ${disciplina.nome}`);
  }

  if (partes.length === 0) {
    return total === 1
      ? "1 atividade exibida sem filtros específicos."
      : `${total} atividades exibidas sem filtros específicos.`;
  }

  return total === 1
    ? `1 atividade encontrada para ${partes.join(" • ")}.`
    : `${total} atividades encontradas para ${partes.join(" • ")}.`;
}

function criarCardResultado(atividade) {
  const article = document.createElement("article");
  article.className = "resultado-card";

  const descricao = atividade.descricao?.trim()
    ? atividade.descricao.trim()
    : "Sem descrição cadastrada.";

  const pdfDisponivel = Boolean(atividade.arquivo_pdf_url);

  article.innerHTML = `
    <div class="resultado-topo">
      <div>
        <h3 class="resultado-titulo">${atividade.titulo || "Atividade sem título"}</h3>
        <span class="resultado-id">ID ${atividade.id}</span>
      </div>
    </div>

    <div class="resultado-tags">
      <span class="tag">📚 ${atividade.disciplina?.nome || "Sem disciplina"}</span>
      <span class="tag">🏫 ${atividade.serie_ano?.nome || "Sem série/ano"}</span>
    </div>

    <p class="resultado-descricao">${descricao}</p>

    <div class="resultado-acoes">
      <button class="btn-acao btn-visualizar" type="button" ${pdfDisponivel ? "" : "disabled"}>
        📄 Visualizar PDF
      </button>
      <button class="btn-acao btn-imprimir" type="button" ${pdfDisponivel ? "" : "disabled"}>
        🖨️ Imprimir
      </button>
    </div>
  `;

  const btnVisualizar = article.querySelector(".btn-visualizar");
  const btnImprimir = article.querySelector(".btn-imprimir");

  btnVisualizar.addEventListener("click", () => {
    if (!atividade.arquivo_pdf_url) return;
    window.open(atividade.arquivo_pdf_url, "_blank");
  });

  btnImprimir.addEventListener("click", () => {
    if (!atividade.arquivo_pdf_url) return;

    const janela = window.open(atividade.arquivo_pdf_url, "_blank");
    if (!janela) return;

    janela.addEventListener("load", () => {
      try {
        janela.print();
      } catch (error) {
        console.error("Erro ao abrir impressão:", error);
      }
    });
  });

  return article;
}

function renderizarResultados(resultados) {
  listaResultados.innerHTML = "";
  areaErro.classList.add("hidden");
  areaVazia.classList.add("hidden");

  atualizarQuantidade(resultados.length);
  textoResumo.textContent = montarResumoBusca(resultados.length);

  if (!resultados.length) {
    mostrarVazio("Nenhuma atividade corresponde aos filtros informados.");
    return;
  }

  resultados.forEach((atividade) => {
    listaResultados.appendChild(criarCardResultado(atividade));
  });

  listaResultados.classList.remove("hidden");
}

function executarBuscaAtual() {
  atualizarBotoesAtivos();
  const resultados = filtrarAtividades();
  renderizarResultados(resultados);
}

function limparFiltros() {
  filtrosAtuais = {
    serieAnoId: "",
    disciplinaId: ""
  };

  montarBotoesSeries();
  montarBotoesDisciplinas();
  atualizarBotoesAtivos();
  renderizarResultados([...atividadesCache].sort(compararAtividadePorTitulo));
}

async function carregarBase() {
  mostrarCarregando("Carregando disciplinas, séries/anos e atividades...");

  try {
    const [disciplinas, seriesAnos, atividades] = await Promise.all([
      buscarJson(endpoints.disciplinas, "disciplinas"),
      buscarJson(endpoints.seriesAnos, "séries/anos"),
      buscarJson(endpoints.atividades, "atividades")
    ]);

    disciplinasCache = Array.isArray(disciplinas) ? disciplinas : [];
    seriesAnosCache = Array.isArray(seriesAnos) ? seriesAnos : [];
    atividadesCache = (Array.isArray(atividades) ? atividades : []).sort(compararAtividadePorTitulo);

    montarBotoesSeries();
    montarBotoesDisciplinas();
    atualizarBotoesAtivos();

    esconderCarregando();
    areaErro.classList.add("hidden");

    if (atividadesCache.length > 0) {
      renderizarResultados(atividadesCache);
    } else {
      textoResumo.textContent = "A base foi carregada, mas ainda não há atividades cadastradas.";
      mostrarVazio("Ainda não há atividades cadastradas no sistema.");
    }
  } catch (error) {
    esconderCarregando();
    mostrarErro(
      `${error.message} Verifique se o backend está rodando e se a URL está correta.`
    );
    textoResumo.textContent = "Falha ao carregar os dados do sistema.";
  }
}

btnLimpar.addEventListener("click", limparFiltros);

btnAtualizarBase.addEventListener("click", async () => {
  await carregarBase();
});

carregarBase();

