const API_URL =
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3000/atividades'
    : 'https://pessoas-api.onrender.com/atividades';

const API_DISCIPLINAS_URL =
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3000/disciplinas'
    : 'https://pessoas-api.onrender.com/disciplinas';

const API_SERIES_ANOS_URL =
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3000/series_anos'
    : 'https://pessoas-api.onrender.com/series_anos';

let atividades = [];
let disciplinas = [];
let seriesAnos = [];
let idSelecionado = null;
let campoOrdenacao = null;
let direcaoOrdenacao = 'asc';

let paginaAtual = 1;
let itensPorPagina = 10;
let listaAtualFiltrada = [];
let toastTimeout = null;

function el(id) {
  return document.getElementById(id);
}

function setStatus(mensagem) {
  el('status').textContent = mensagem;
}

function atualizarModoInterface() {
  const modo = el('modo');
  const btnCadastrar = el('btnCadastrar');
  const btnSalvar = el('btnSalvar');
  const btnExcluir = el('btnExcluir');
  const btnCancelar = el('btnCancelar');

  if (idSelecionado) {
    modo.className = 'modo modo-edicao';
    modo.textContent = '🟡 Modo Edição';
    btnCadastrar.disabled = true;
    btnSalvar.disabled = false;
    btnExcluir.disabled = false;
    btnCancelar.disabled = false;
  } else {
    modo.className = 'modo modo-cadastro';
    modo.textContent = '🟢 Modo Cadastro';
    btnCadastrar.disabled = false;
    btnSalvar.disabled = true;
    btnExcluir.disabled = true;
    btnCancelar.disabled = true;
  }
}

function mostrarToast(mensagem, tipo = 'info') {
  const toast = el('toast');

  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;

  requestAnimationFrame(() => {
    toast.classList.add('ativo');
  });

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('ativo');
  }, 2500);
}

function abrirModal({ titulo, mensagem, tipo = 'info', botoes = [] }) {
  const overlay = el('modalOverlay');
  const topo = el('modalTopo');
  const texto = el('modalMensagem');
  const acoes = el('modalAcoes');

  topo.className = `modal-topo ${tipo}`;
  topo.textContent = titulo;
  texto.textContent = mensagem;
  acoes.innerHTML = '';

  botoes.forEach((botao) => {
    const btn = document.createElement('button');
    btn.className = `btn-modal ${botao.classe}`;
    btn.textContent = botao.texto;
    btn.addEventListener('click', () => {
      fecharModal();
      if (typeof botao.acao === 'function') {
        botao.acao();
      }
    });
    acoes.appendChild(btn);
  });

  overlay.classList.add('ativo');
}

function fecharModal() {
  el('modalOverlay').classList.remove('ativo');
}

function mostrarMensagem(titulo, mensagem, tipo = 'info') {
  abrirModal({
    titulo,
    mensagem,
    tipo,
    botoes: [
      {
        texto: 'OK',
        classe: 'btn-modal-principal'
      }
    ]
  });
}

function pedirConfirmacao(titulo, mensagem) {
  return new Promise((resolve) => {
    abrirModal({
      titulo,
      mensagem,
      tipo: 'confirmacao',
      botoes: [
        {
          texto: 'Cancelar',
          classe: 'btn-modal-secundario',
          acao: () => resolve(false)
        },
        {
          texto: 'Confirmar',
          classe: 'btn-modal-perigo',
          acao: () => resolve(true)
        }
      ]
    });
  });
}

function limparErros() {
  el('erroTitulo').textContent = '';
  el('erroDisciplinaId').textContent = '';
  el('erroSerieAnoId').textContent = '';
  el('erroArquivoPdf').textContent = '';

  el('titulo').classList.remove('erro-campo');
  el('disciplinaId').classList.remove('erro-campo');
  el('serieAnoId').classList.remove('erro-campo');
  el('arquivoPdf').classList.remove('erro-campo');
}

function mostrarErroCampo(campoId, erroId, mensagem) {
  el(erroId).textContent = mensagem;
  el(campoId).classList.add('erro-campo');
}

function validarFormulario(isEdicao = false) {
  limparErros();

  const titulo = el('titulo').value.trim();
  const disciplinaId = el('disciplinaId').value;
  const serieAnoId = el('serieAnoId').value;
  const arquivoPdf = el('arquivoPdf').files[0];

  let valido = true;

  if (!titulo) {
    mostrarErroCampo('titulo', 'erroTitulo', 'Informe o título da atividade.');
    el('titulo').focus();
    valido = false;
  }

  if (!disciplinaId) {
    mostrarErroCampo('disciplinaId', 'erroDisciplinaId', 'Selecione a disciplina.');
    if (valido) el('disciplinaId').focus();
    valido = false;
  }

  if (!serieAnoId) {
    mostrarErroCampo('serieAnoId', 'erroSerieAnoId', 'Selecione a série/ano.');
    if (valido) el('serieAnoId').focus();
    valido = false;
  }

  if (!isEdicao && !arquivoPdf) {
    mostrarErroCampo('arquivoPdf', 'erroArquivoPdf', 'Selecione um arquivo PDF.');
    if (valido) el('arquivoPdf').focus();
    valido = false;
  }

  if (arquivoPdf && arquivoPdf.type !== 'application/pdf') {
    mostrarErroCampo('arquivoPdf', 'erroArquivoPdf', 'Envie apenas arquivo PDF.');
    if (valido) el('arquivoPdf').focus();
    valido = false;
  }

  return valido;
}

function formatarValor(valor) {
  return valor ?? '';
}

function formatarData(data) {
  if (!data) return '';

  const d = new Date(data);
  if (Number.isNaN(d.getTime())) {
    return String(data);
  }

  return d.toLocaleString('pt-BR');
}

function atualizarContador(quantidade) {
  el('contadorRegistros').textContent = `${quantidade} registro(s) encontrado(s)`;
}

function obterTextoBusca() {
  return el('buscaTitulo').value.trim().toLowerCase();
}

function atualizarIconesOrdenacao() {
  el('icone-titulo').textContent = '';
  el('icone-disciplina_nome').textContent = '';
  el('icone-serie_ano_nome').textContent = '';

  if (!campoOrdenacao) return;

  const icone = direcaoOrdenacao === 'asc' ? '↑' : '↓';

  if (campoOrdenacao === 'titulo') el('icone-titulo').textContent = icone;
  if (campoOrdenacao === 'disciplina_nome') el('icone-disciplina_nome').textContent = icone;
  if (campoOrdenacao === 'serie_ano_nome') el('icone-serie_ano_nome').textContent = icone;
}

function ordenarPor(campo) {
  if (campoOrdenacao === campo) {
    direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
  } else {
    campoOrdenacao = campo;
    direcaoOrdenacao = 'asc';
  }

  paginaAtual = 1;
  filtrarTabela();
}

function obterDisciplinaNome(atividade) {
  return atividade?.disciplina?.nome || '';
}

function obterSerieAnoNome(atividade) {
  return atividade?.serie_ano?.nome || '';
}

function obterListaFiltradaOrdenada() {
  const textoBusca = obterTextoBusca();

  let lista = atividades.filter((atividade) => {
    const titulo = String(atividade.titulo ?? '').toLowerCase();
    const disciplina = String(obterDisciplinaNome(atividade)).toLowerCase();
    const serieAno = String(obterSerieAnoNome(atividade)).toLowerCase();
    const descricao = String(atividade.descricao ?? '').toLowerCase();

    return (
      titulo.includes(textoBusca) ||
      disciplina.includes(textoBusca) ||
      serieAno.includes(textoBusca) ||
      descricao.includes(textoBusca)
    );
  });

  if (campoOrdenacao) {
    lista.sort((a, b) => {
      let valorA = '';
      let valorB = '';

      if (campoOrdenacao === 'disciplina_nome') {
        valorA = obterDisciplinaNome(a).toLowerCase();
        valorB = obterDisciplinaNome(b).toLowerCase();
      } else if (campoOrdenacao === 'serie_ano_nome') {
        valorA = obterSerieAnoNome(a).toLowerCase();
        valorB = obterSerieAnoNome(b).toLowerCase();
      } else {
        valorA = String(a[campoOrdenacao] ?? '').toLowerCase();
        valorB = String(b[campoOrdenacao] ?? '').toLowerCase();
      }

      if (valorA < valorB) return direcaoOrdenacao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcaoOrdenacao === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return lista;
}

function renderizarTabela(listaPaginada) {
  const tbody = el('tabela');
  tbody.innerHTML = '';

  if (listaPaginada.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="sem-registros">Nenhum registro encontrado.</td>
      </tr>
    `;
    atualizarIconesOrdenacao();
    return;
  }

  listaPaginada.forEach((atividade) => {
    const linha = document.createElement('tr');

    if (String(atividade.id) === String(idSelecionado)) {
      linha.classList.add('linha-selecionada');
    }

    const linkPdf = atividade.arquivo_pdf_url
      ? `<a href="${atividade.arquivo_pdf_url}" target="_blank" class="link-arquivo" onclick="event.stopPropagation()">📄 Ver PDF</a>`
      : '-';

    linha.innerHTML = `
      <td>${formatarValor(atividade.id)}</td>
      <td>${formatarValor(atividade.titulo)}</td>
      <td>${formatarValor(atividade.descricao)}</td>
      <td>${formatarValor(obterDisciplinaNome(atividade))}</td>
      <td>${formatarValor(obterSerieAnoNome(atividade))}</td>
      <td>${linkPdf}</td>
      <td>${formatarData(atividade.updated_at)}</td>
    `;

    linha.addEventListener('click', () => {
      selecionarAtividade(atividade);
    });

    linha.addEventListener('dblclick', () => {
      selecionarAtividade(atividade);
      el('titulo').focus();
      el('titulo').select();
    });

    tbody.appendChild(linha);
  });

  atualizarIconesOrdenacao();
}

function atualizarPaginacao() {
  const totalItens = listaAtualFiltrada.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina));

  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas;
  }

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const listaPaginada = listaAtualFiltrada.slice(inicio, fim);

  renderizarTabela(listaPaginada);

  el('infoPaginacao').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
}

function filtrarTabela() {
  listaAtualFiltrada = obterListaFiltradaOrdenada();
  atualizarContador(listaAtualFiltrada.length);

  const totalPaginas = Math.max(1, Math.ceil(listaAtualFiltrada.length / itensPorPagina));
  if (paginaAtual > totalPaginas) {
    paginaAtual = totalPaginas;
  }

  atualizarPaginacao();

  const textoBuscaOriginal = el('buscaTitulo').value.trim();

  if (textoBuscaOriginal) {
    setStatus(`Filtro aplicado para: "${textoBuscaOriginal}"`);
  } else if (!idSelecionado) {
    setStatus('Lista exibida completa.');
  }
}

function alterarItensPorPagina() {
  itensPorPagina = Number(el('itensPorPagina').value);
  paginaAtual = 1;
  filtrarTabela();
}

function irParaPrimeiraPagina() {
  paginaAtual = 1;
  atualizarPaginacao();
}

function irParaPaginaAnterior() {
  if (paginaAtual > 1) {
    paginaAtual--;
    atualizarPaginacao();
  }
}

function irParaProximaPagina() {
  const totalPaginas = Math.max(1, Math.ceil(listaAtualFiltrada.length / itensPorPagina));
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    atualizarPaginacao();
  }
}

function irParaUltimaPagina() {
  paginaAtual = Math.max(1, Math.ceil(listaAtualFiltrada.length / itensPorPagina));
  atualizarPaginacao();
}

async function carregarDisciplinasParaCombo() {
  try {
    const resposta = await fetch(API_DISCIPLINAS_URL);

    if (!resposta.ok) {
      throw new Error('Erro ao carregar disciplinas');
    }

    disciplinas = await resposta.json();

    const select = el('disciplinaId');
    select.innerHTML = '<option value="">Selecione...</option>';

    disciplinas.forEach((disciplina) => {
      const option = document.createElement('option');
      option.value = disciplina.id;
      option.textContent = disciplina.nome;
      select.appendChild(option);
    });
  } catch (erro) {
    console.error('Erro ao carregar disciplinas:', erro);
    mostrarMensagem('Erro', 'Erro ao carregar disciplinas.', 'erro');
    setStatus('Erro ao carregar disciplinas.');
  }
}

async function carregarSeriesAnosParaCombo() {
  try {
    const resposta = await fetch(API_SERIES_ANOS_URL);

    if (!resposta.ok) {
      throw new Error('Erro ao carregar séries/anos');
    }

    seriesAnos = await resposta.json();

    const select = el('serieAnoId');
    select.innerHTML = '<option value="">Selecione...</option>';

    seriesAnos.forEach((serieAno) => {
      const option = document.createElement('option');
      option.value = serieAno.id;
      option.textContent = serieAno.nome;
      select.appendChild(option);
    });
  } catch (erro) {
    console.error('Erro ao carregar séries/anos:', erro);
    mostrarMensagem('Erro', 'Erro ao carregar séries/anos.', 'erro');
    setStatus('Erro ao carregar séries/anos.');
  }
}

async function carregarAtividades() {
  try {
    setStatus('Carregando lista...');
    const resposta = await fetch(API_URL);

    if (!resposta.ok) {
      throw new Error('Erro ao carregar a lista');
    }

    atividades = await resposta.json();
    filtrarTabela();

    if (!idSelecionado) {
      setStatus('Lista carregada com sucesso.');
    }
  } catch (erro) {
    console.error('Erro ao carregar atividades:', erro);
    mostrarMensagem('Erro', 'Erro ao carregar dados.', 'erro');
    setStatus('Erro ao carregar a lista.');
  }
}

function montarFormData() {
  const formData = new FormData();

  formData.append('titulo', el('titulo').value.trim());
  formData.append('disciplina_id', el('disciplinaId').value);
  formData.append('serie_ano_id', el('serieAnoId').value);
  formData.append('descricao', el('descricao').value.trim());

  const arquivo = el('arquivoPdf').files[0];
  if (arquivo) {
    formData.append('arquivo_pdf', arquivo);
  }

  return formData;
}

async function incluir() {
  try {
    if (!validarFormulario(false)) {
      setStatus('Corrija os campos destacados.');
      return;
    }

    const resposta = await fetch(API_URL, {
      method: 'POST',
      body: montarFormData()
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(resultado.erro || resultado.detalhe || 'Erro ao cadastrar');
    }

    limpar(false);
    await carregarAtividades();

    mostrarToast('Atividade cadastrada com sucesso!', 'sucesso');
    setStatus('Atividade cadastrada com sucesso.');
  } catch (erro) {
    console.error('Erro ao cadastrar:', erro);
    mostrarMensagem('Erro', erro.message || 'Erro ao cadastrar.', 'erro');
    setStatus('Erro ao cadastrar atividade.');
  }
}

async function salvar() {
  try {
    const id = el('id').value;

    if (!id) {
      mostrarMensagem('Atenção', 'Selecione um registro para editar.', 'info');
      return;
    }

    if (!validarFormulario(true)) {
      setStatus('Corrija os campos destacados.');
      return;
    }

    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      body: montarFormData()
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(resultado.erro || resultado.detalhe || 'Erro ao salvar');
    }

    limpar(false);
    await carregarAtividades();

    mostrarToast('Atividade atualizada com sucesso!', 'sucesso');
    setStatus('Atividade atualizada com sucesso.');
  } catch (erro) {
    console.error('Erro ao salvar:', erro);
    mostrarMensagem('Erro', erro.message || 'Erro ao salvar.', 'erro');
    setStatus('Erro ao salvar atividade.');
  }
}

async function excluir() {
  try {
    const id = el('id').value;

    if (!id) {
      mostrarMensagem('Atenção', 'Selecione um registro para excluir.', 'info');
      return;
    }

    const confirmado = await pedirConfirmacao(
      'Confirmar exclusão',
      'Deseja realmente excluir esta atividade e seu PDF?'
    );

    if (!confirmado) {
      setStatus('Exclusão cancelada.');
      return;
    }

    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(resultado.erro || resultado.detalhe || 'Erro ao excluir');
    }

    limpar(false);
    await carregarAtividades();

    mostrarToast('Atividade excluída com sucesso!', 'sucesso');
    setStatus('Atividade excluída com sucesso.');
  } catch (erro) {
    console.error('Erro ao excluir:', erro);
    mostrarMensagem('Erro', erro.message || 'Erro ao excluir.', 'erro');
    setStatus('Erro ao excluir atividade.');
  }
}

function selecionarAtividade(atividade) {
  idSelecionado = atividade.id ?? null;

  el('id').value = atividade.id ?? '';
  el('titulo').value = atividade.titulo ?? '';
  el('disciplinaId').value = atividade.disciplina_id ?? '';
  el('serieAnoId').value = atividade.serie_ano_id ?? '';
  el('descricao').value = atividade.descricao ?? '';
  el('atualizacao').value = formatarData(atividade.updated_at);
  el('arquivoPdf').value = '';

  if (atividade.arquivo_pdf_url) {
    el('infoArquivoAtual').innerHTML = `Arquivo atual: <a href="${atividade.arquivo_pdf_url}" target="_blank">abrir PDF</a>`;
  } else {
    el('infoArquivoAtual').textContent = 'Nenhum PDF vinculado.';
  }

  limparErros();
  atualizarModoInterface();
  filtrarTabela();
  setStatus(`Registro ID ${atividade.id} selecionado para edição.`);
}

function limpar(mensagem = true) {
  idSelecionado = null;

  el('id').value = '';
  el('titulo').value = '';
  el('disciplinaId').value = '';
  el('serieAnoId').value = '';
  el('descricao').value = '';
  el('arquivoPdf').value = '';
  el('atualizacao').value = '';
  el('infoArquivoAtual').textContent = '';

  limparErros();
  atualizarModoInterface();
  filtrarTabela();

  if (mensagem) {
    setStatus('Campos limpos. Nenhum registro selecionado.');
  }
}

function cancelarEdicao() {
  limpar(false);
  setStatus('Edição cancelada.');
  mostrarToast('Edição cancelada.', 'info');
  el('titulo').focus();
}

function exportarCSV() {
  if (!listaAtualFiltrada.length) {
    mostrarMensagem('Atenção', 'Não há registros para exportar.', 'info');
    return;
  }

  const linhas = [['ID', 'Título', 'Descrição', 'Disciplina', 'Série / Ano', 'Atualização']];

  listaAtualFiltrada.forEach((atividade) => {
    linhas.push([
      atividade.id ?? '',
      `"${String(atividade.titulo ?? '').replace(/"/g, '""')}"`,
      `"${String(atividade.descricao ?? '').replace(/"/g, '""')}"`,
      `"${String(obterDisciplinaNome(atividade)).replace(/"/g, '""')}"`,
      `"${String(obterSerieAnoNome(atividade)).replace(/"/g, '""')}"`,
      `"${formatarData(atividade.updated_at).replace(/"/g, '""')}"`
    ]);
  });

  const conteudo = linhas.map((linha) => linha.join(';')).join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'atividades.csv';
  link.click();

  URL.revokeObjectURL(url);

  setStatus('Arquivo CSV exportado com sucesso.');
  mostrarToast('CSV exportado com sucesso!', 'sucesso');
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const modalAberto = el('modalOverlay').classList.contains('ativo');

    if (modalAberto) return;

    if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
      return;
    }

    event.preventDefault();

    if (idSelecionado) {
      salvar();
    } else {
      incluir();
    }
  }

  if (event.key === 'Escape') {
    const modalAberto = el('modalOverlay').classList.contains('ativo');

    if (modalAberto) {
      fecharModal();
    } else {
      cancelarEdicao();
    }
  }
});

el('modalOverlay').addEventListener('click', (event) => {
  if (event.target.id === 'modalOverlay') {
    fecharModal();
  }
});

window.addEventListener('load', async () => {
  atualizarModoInterface();
  await carregarDisciplinasParaCombo();
  await carregarSeriesAnosParaCombo();
  await carregarAtividades();
});


