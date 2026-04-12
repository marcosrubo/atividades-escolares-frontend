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

const formBusca = document.getElementById("formBusca");
const serieAnoEl = document.getElementById("serieAno");
const disciplinaEl = document.getElementById("disciplina");
const palavraChaveEl = document.getElementById("palavraChave");
const btnLimpar = document.getElementById("btnLimpar");
const btnAtualizarBase = document.getElementById("btnAtualizarBase");
const botoesSeriesContainer = document.getElementById("botoesSeries");

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
let serieRapidaSelecionada = "";

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

function montarBotoesSeries() {
  botoesSeriesContainer.innerHTML = "";

  const botaoTodos = document.createElement("button");
  botaoTodos.type = "button";
  botaoTodos.className = "btn-serie";
  botaoTodos.dataset.id = "";
  botaoTodos.textContent = "Todas as séries";
  if (!serieRapidaSelecionada) {
    botaoTodos.classList.add("ativo");
  }
  botaoTodos.addEventListener("click", () => {
    serieRapidaSelecionada = "";
    serieAnoEl.value = "";
    atualizarBotoesSerieAtivos();
    executarBuscaAtual();
  });
  botoesSeriesContainer.appendChild(botaoTodos);

  seriesAnosCache.forEach((serie) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-serie";
    btn.dataset.id = String(serie.id);
    btn.textContent = serie.nome;

    if (String(serie.id) === String(serieRapidaSelecionada)) {
      btn.classList.add("ativo");
    }

    btn.addEventListener("click", () => {
      serieRapidaSelecionada = String(serie.id);
      serieAnoEl.value = String(serie.id);
      atualizarBotoesSerieAtivos();
      executarBuscaAtual();
    });

    botoesSeriesContainer.appendChild(btn);
  });
}

function atualizarBotoesSerieAtivos() {
  const botoes = botoesSeriesContainer.querySelectorAll(".btn-serie");

  botoes.forEach((btn) => {
    const id = btn.dataset.id || "";
    btn.classList.toggle("ativo", String(id) === String(serieRapidaSelecionada));
  });
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
    montarBotoesSeries();

    esconderCarregando();
    areaErro.classList.add("hidden");

    textoResumo.textContent =
      atividadesCache.length > 0
        ? `Base carregada com ${atividadesCache.length} atividades. Escolha a série/ano para agilizar a busca.`
        : "A base foi carregada, mas ainda não há atividades cadastradas.";

    if (atividadesCache.length > 0) {
      renderizarResultados(
        atividadesCache,
        {
          disciplinaId: "",
          serieAnoId: "",
          palavraChave: ""
        },
        false
      );
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
    const idTexto = normalizarTexto(atividade.id);

    const matchPalavra =
      titulo.includes(palavra) ||
      descricao.includes(palavra) ||
      disciplinaNome.includes(palavra) ||
      serieAnoNome.includes(palavra) ||
      idTexto.includes(palavra);

    return matchDisciplina && matchSerieAno && matchPalavra;
  });
}

function montarResumoBusca(filtros, total) {
  const partes = [];

  if (filtros.serieAnoId) {
    const serieAno = seriesAnosCache.find(
      (item) => String(item.id) === String(filtros.serieAnoId)
    );
    if (serieAno) partes.push(`série/ano: ${serieAno.nome}`);
  }

  if (filtros.disciplinaId) {
    const disciplina = disciplinasCache.find(
      (item) => String(item.id) === String(filtros.disciplinaId)
    );
    if (disciplina) partes.push(`disciplina: ${disciplina.nome}`);
  }

  if (filtros.palavraChave.trim()) {
    partes.push(`palavra-chave: "${filtros.palavraChave.trim()}"`);
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

function renderizarResultados(resultados, filtros, atualizarResumo = true) {
  listaResultados.innerHTML = "";
  areaErro.classList.add("hidden");
  areaVazia.classList.add("hidden");

  atualizarQuantidade(resultados.length);

  if (atualizarResumo) {
    textoResumo.textContent = montarResumoBusca(filtros, resultados.length);
  }

  if (!resultados.length) {
    mostrarVazio("Nenhuma atividade corresponde aos filtros informados.");
    return;
  }

  resultados.forEach((atividade) => {
    listaResultados.appendChild(criarCardResultado(atividade));
  });

  listaResultados.classList.remove("hidden");
}

function obterFiltrosAtuais() {
  return {
    disciplinaId: disciplinaEl.value,
    serieAnoId: serieAnoEl.value,
    palavraChave: palavraChaveEl.value
  };
}

function executarBuscaAtual() {
  const filtros = obterFiltrosAtuais();
  const resultados = filtrarAtividades(filtros);
  renderizarResultados(resultados, filtros, true);
}

formBusca.addEventListener("submit", (event) => {
  event.preventDefault();
  serieRapidaSelecionada = serieAnoEl.value || "";
  atualizarBotoesSerieAtivos();
  executarBuscaAtual();
});

serieAnoEl.addEventListener("change", () => {
  serieRapidaSelecionada = serieAnoEl.value || "";
  atualizarBotoesSerieAtivos();
});

btnLimpar.addEventListener("click", () => {
  formBusca.reset();
  serieRapidaSelecionada = "";
  atualizarBotoesSerieAtivos();

  renderizarResultados(
    atividadesCache,
    {
      disciplinaId: "",
      serieAnoId: "",
      palavraChave: ""
    },
    true
  );
});

btnAtualizarBase.addEventListener("click", async () => {
  await carregarBase();
});

carregarBase();

