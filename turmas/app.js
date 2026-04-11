const API_URL =
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3000/turmas'
    : 'https://pessoas-api.onrender.com/turmas';

const API_SERIES_ANOS_URL =
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:3000/series_anos'
    : 'https://pessoas-api.onrender.com/series_anos';

let turmas = [];
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
  el('erroNome').textContent = '';
  el('erroSerieAnoId').textContent = '';
  el('nome').classList.remove('erro-campo');
  el('serieAnoId').classList.remove('erro-campo');
}

function mostrarErroCampo(campoId, erroId, mensagem) {
  el(erroId).textContent = mensagem;
  el(campoId).classList.add('erro-campo');
}

function validarFormulario() {
  limparErros();

  const nome = el('nome').value.trim();
  const serieAnoId = el('serieAnoId').value;
  let valido = true;

  if (!nome) {
    mostrarErroCampo('nome', 'erroNome', 'Informe o nome da turma.');
    el('nome').focus();
    valido = false;
  } else if (nome.length < 1) {
    mostrarErroCampo('nome', 'erroNome', 'O nome da turma é obrigatório.');
    el('nome').focus();
    valido = false;
  }

  if (!serieAnoId) {
    mostrarErroCampo('serieAnoId', 'erroSerieAnoId', 'Selecione a série/ano.');
    if (valido) {
      el('serieAnoId').focus();
    }
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
  return el('buscaNome').value.trim().toLowerCase();
}

function atualizarIconesOrdenacao() {
  el('icone-nome').textContent = '';
  el('icone-serie_ano_nome').textContent = '';

  if (!campoOrdenacao) return;

  const icone = direcaoOrdenacao === 'asc' ? '↑' : '↓';

  if (campoOrdenacao === 'nome') {
    el('icone-nome').textContent = icone;
  }

  if (campoOrdenacao === 'serie_ano_nome') {
    el('icone-serie_ano_nome').textContent = icone;
  }
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

function obterSerieAnoNome(turma) {
  return turma?.serie_ano?.nome || '';
}

function obterListaFiltradaOrdenada() {
  const textoBusca = obterTextoBusca();

  let lista = turmas.filter((turma) => {
    const nome = String(turma.nome ?? '').toLowerCase();
    const serieAnoNome = String(obterSerieAnoNome(turma)).toLowerCase();

    return nome.includes(textoBusca) || serieAnoNome.includes(textoBusca);
  });

  if (campoOrdenacao) {
    lista.sort((a, b) => {
      let valorA = '';
      let valorB = '';

      if (campoOrdenacao === 'serie_ano_nome') {
        valorA = String(obterSerieAnoNome(a)).toLowerCase();
        valorB = String(obterSerieAnoNome(b)).toLowerCase();
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
        <td colspan="4" class="sem-registros">Nenhum registro encontrado.</td>
      </tr>
    `;
    atualizarIconesOrdenacao();
    return;
  }

  listaPaginada.forEach((turma) => {
    const linha = document.createElement('tr');

    if (String(turma.id) === String(idSelecionado)) {
      linha.classList.add('linha-selecionada');
    }

    linha.innerHTML = `
      <td>${formatarValor(turma.id)}</td>
      <td>${formatarValor(turma.nome)}</td>
      <td>${formatarValor(obterSerieAnoNome(turma))}</td>
      <td>${formatarData(turma.updated_at)}</td>
    `;

    linha.addEventListener('click', () => {
      selecionarTurma(turma);
    });

    linha.addEventListener('dblclick', () => {
      selecionarTurma(turma);
      el('nome').focus();
      el('nome').select();
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

  const textoBuscaOriginal = el('buscaNome').value.trim();

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
    mostrarMensagem('Erro', 'Erro ao carregar séries/anos para o formulário.', 'erro');
    setStatus('Erro ao carregar séries/anos.');
  }
}

async function carregarTurmas() {
  try {
    setStatus('Carregando lista...');
    const resposta = await fetch(API_URL);

    if (!resposta.ok) {
      throw new Error('Erro ao carregar a lista');
    }

    turmas = await resposta.json();
    filtrarTabela();

    if (!idSelecionado) {
      setStatus('Lista carregada com sucesso.');
    }
  } catch (erro) {
    console.error('Erro ao carregar turmas:', erro);
    mostrarMensagem('Erro', 'Erro ao carregar dados.', 'erro');
    setStatus('Erro ao carregar a lista.');
  }
}

async function incluir() {
  try {
    if (!validarFormulario()) {
      setStatus('Corrija os campos destacados.');
      return;
    }

    const nome = el('nome').value.trim();
    const serie_ano_id = Number(el('serieAnoId').value);

    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, serie_ano_id })
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.erro || erro.detalhe || 'Erro ao cadastrar');
    }

    limpar(false);
    await carregarTurmas();

    mostrarToast('Turma cadastrada com sucesso!', 'sucesso');
    setStatus('Turma cadastrada com sucesso.');
  } catch (erro) {
    console.error('Erro ao cadastrar:', erro);
    mostrarMensagem('Erro', erro.message || 'Erro ao cadastrar.', 'erro');
    setStatus('Erro ao cadastrar turma.');
  }
}

async function salvar() {
  try {
    const id = el('id').value;

    if (!id) {
      mostrarMensagem('Atenção', 'Selecione um registro para editar.', 'info');
      return;
    }

    if (!validarFormulario()) {
      setStatus('Corrija os campos destacados.');
      return;
    }

    const nome = el('nome').value.trim();
    const serie_ano_id = Number(el('serieAnoId').value);

    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, serie_ano_id })
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.erro || erro.detalhe || 'Erro ao salvar');
    }

    limpar(false);
    await carregarTurmas();

    mostrarToast('Turma atualizada com sucesso!', 'sucesso');
    setStatus('Turma atualizada com sucesso.');
  } catch (erro) {
    console.error('Erro ao salvar:', erro);
    mostrarMensagem('Erro', erro.message || 'Erro ao salvar.', 'erro');
    setStatus('Erro ao salvar turma.');
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
      'Deseja realmente excluir esta turma?'
    );

    if (!confirmado) {
      setStatus('Exclusão cancelada.');
      return;
    }

    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.erro || erro.detalhe || 'Erro ao excluir');
    }

    limpar(false);
    await carregarTurmas();

    mostrarToast('Turma excluída com sucesso!', 'sucesso');
    setStatus('Turma excluída com sucesso.');
  } catch (erro) {
    console.error('Erro ao excluir:', erro);
    mostrarMensagem('Erro', erro.message || 'Erro ao excluir.', 'erro');
    setStatus('Erro ao excluir turma.');
  }
}

function selecionarTurma(turma) {
  idSelecionado = turma.id ?? null;

  el('id').value = turma.id ?? '';
  el('nome').value = turma.nome ?? '';
  el('serieAnoId').value = turma.serie_ano_id ?? '';
  el('atualizacao').value = formatarData(turma.updated_at);

  limparErros();
  atualizarModoInterface();
  filtrarTabela();
  setStatus(`Registro ID ${turma.id} selecionado para edição.`);
}

function limpar(mensagem = true) {
  idSelecionado = null;

  el('id').value = '';
  el('nome').value = '';
  el('serieAnoId').value = '';
  el('atualizacao').value = '';

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
  el('nome').focus();
}

function exportarCSV() {
  if (!listaAtualFiltrada.length) {
    mostrarMensagem('Atenção', 'Não há registros para exportar.', 'info');
    return;
  }

  const linhas = [['ID', 'Nome', 'Série / Ano', 'Atualização']];

  listaAtualFiltrada.forEach((turma) => {
    linhas.push([
      turma.id ?? '',
      `"${String(turma.nome ?? '').replace(/"/g, '""')}"`,
      `"${String(obterSerieAnoNome(turma)).replace(/"/g, '""')}"`,
      `"${formatarData(turma.updated_at).replace(/"/g, '""')}"`
    ]);
  });

  const conteudo = linhas.map((linha) => linha.join(';')).join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'turmas.csv';
  link.click();

  URL.revokeObjectURL(url);

  setStatus('Arquivo CSV exportado com sucesso.');
  mostrarToast('CSV exportado com sucesso!', 'sucesso');
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const modalAberto = el('modalOverlay').classList.contains('ativo');

    if (modalAberto) return;

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
  await carregarSeriesAnosParaCombo();
  await carregarTurmas();
});


