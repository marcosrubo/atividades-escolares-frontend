const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://atividades-escolares-backend.onrender.com";

const endpoints = {
  disciplinas: `${API_BASE}/disciplinas`,
  seriesAnos: `${API_BASE}/series_anos`,
  atividades: `${API_BASE}/atividades`
};

const formBusca = document.getElementById("formBusca");
const serieAnoEl = document.getElementById("serieAno");
const disciplinaEl = document.getElementById("disciplina");
const palavraChaveEl = document.getElementById("palavraChave");
const btnLimpar = document.getElementById("btnLimpar");
const btnAtualizarBase = document.getElementById("btnAtualizarBase");

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

function preencherSelect(selectEl, lista, textoPadrao) {
  const valorAtual = selectEl.value;

  selectEl.innerHTML = `<option value="">${textoPadrao}</option>`;

  lista.forEach((item) => {
    const option = document.createElement("option");
    option.value = String(item.id);
    option.textContent = item.nome;
    selectEl.appendChild(option);
  });

  const aindaExiste = lista.some((item) => String(item.id) === valorAtual);
  selectEl.value = aindaExiste ? valorAtual : "";
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
    atividadesCache = Array.isArray(atividades) ? atividades : [];

    preencherSelect(disciplinaEl, disciplinasCache, "Todas");
    preencherSelect(serieAnoEl, seriesAnosCache, "Todos");

    esconderCarregando();
    areaErro.classList.add("hidden");

    textoResumo.textContent =
      atividadesCache.length > 0
        ? `Base carregada com ${atividadesCache.length} atividades. Use os filtros para refinar a busca.`
        : "A base foi carregada, mas ainda não há atividades cadastradas.";

    if (atividadesCache.length > 0) {
      renderizarResultados(atividadesCache, {
        disciplinaId: "",
        serieAnoId: "",
        palavraChave: ""
      }, false);
    } else {
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

function filtrarAtividades(filtros) {
  const palavra = normalizarTexto(filtros.palavraChave);

  return atividadesCache.filter((atividade) => {
    const matchDisciplina =
      !filtros.disciplinaId || String(atividade.disciplina_id) === String(filtros.disciplinaId);

    const matchSerieAno =
      !filtros.serieAnoId || String(atividade.serie_ano_id) === String(filtros.serieAnoId);

    if (!palavra) {
      return matchDisciplina && matchSerieAno;
    }

    const titulo = normalizarTexto(atividade.titulo);
    const descricao = normalizarTexto(atividade.descricao);
    const disciplinaNome = normalizarTexto(atividade.disciplina?.nome);
    const serieAnoNome = normalizarTexto(atividade.serie_ano?.nome);

    const matchPalavra =
      titulo.includes(palavra) ||
      descricao.includes(palavra) ||
      disciplinaNome.includes(palavra) ||
      serieAnoNome.includes(palavra);

    return matchDisciplina && matchSerieAno && matchPalavra;
  });
}

function criarCardResultado(atividade) {
  const article = document.createElement("article");
  article.className = "resultado-card";

  const pdfDisponivel = Boolean(atividade.arquivo_pdf_url);

  article.innerHTML = `
    <h3>${atividade.titulo || "Sem título"}</h3>
    <p>${atividade.descricao || ""}</p>
    <p><b>${atividade.disciplina?.nome}</b> • ${atividade.serie_ano?.nome}</p>

    <div class="resultado-acoes">
      <button class="btn-acao btn-visualizar" ${pdfDisponivel ? "" : "disabled"}>
        📄 Visualizar
      </button>
      <button class="btn-acao btn-imprimir" ${pdfDisponivel ? "" : "disabled"}>
        🖨️ Imprimir
      </button>
    </div>
  `;

  const btnVisualizar = article.querySelector(".btn-visualizar");
  const btnImprimir = article.querySelector(".btn-imprimir");

  btnVisualizar.onclick = () => {
    if (atividade.arquivo_pdf_url) {
      window.open(atividade.arquivo_pdf_url, "_blank");
    }
  };

  btnImprimir.onclick = () => {
    if (!atividade.arquivo_pdf_url) return;

    const janela = window.open(atividade.arquivo_pdf_url, "_blank");
    janela.onload = () => janela.print();
  };

  return article;
}

function renderizarResultados(resultados, filtros = {}, atualizarResumo = true) {
  listaResultados.innerHTML = "";
  atualizarQuantidade(resultados.length);

  if (!resultados.length) {
    mostrarVazio("Nenhuma atividade encontrada.");
    return;
  }

  areaVazia.classList.add("hidden");

  resultados.forEach((atividade) => {
    listaResultados.appendChild(criarCardResultado(atividade));
  });

  listaResultados.classList.remove("hidden");
}

formBusca.addEventListener("submit", (event) => {
  event.preventDefault();

  const filtros = {
    disciplinaId: disciplinaEl.value,
    serieAnoId: serieAnoEl.value,
    palavraChave: palavraChaveEl.value
  };

  const resultados = filtrarAtividades(filtros);
  renderizarResultados(resultados, filtros);
});

btnLimpar.addEventListener("click", () => {
  formBusca.reset();
  renderizarResultados(atividadesCache);
});

btnAtualizarBase.addEventListener("click", carregarBase);

carregarBase();

