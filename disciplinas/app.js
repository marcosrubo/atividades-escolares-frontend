// app.js de /disciplinas

const hostname = window.location.hostname;

const API_BASE_URL =
  hostname === '127.0.0.1' || hostname === 'localhost'
    ? 'http://127.0.0.1:3000'
    : 'https://atividades-escolares-backend.onrender.com';

const API_URL = `${API_BASE_URL}/disciplinas`;

let disciplinas = [];
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
  el('nome').classList.remove('erro-campo');
}

function mostrarErroCampo(campoId, erroId, mensagem) {
  el(erroId).textContent = mensagem;
  el(campoId).classList.add('erro-campo');
}

function validarFormulario() {
  limparErros();

  const nome = el('nome').value.trim();
  let valido = true;

  if (!nome) {
    mostrarErroCampo('nome', 'erroNome', 'Informe o nome da disciplina.');
    el('nome').focus();
    valido = false;
  } else if (nome.length < 2) {
    mostrarErroCampo('nome', 'erroNome', 'O nome deve ter pelo menos 2 letras.');
    el('nome').focus();
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

  if (!campoOrdenacao) return;

  const icone = direcaoOrdenacao === 'asc' ? '↑' : '↓';

  if (campoOrdenacao === 'nome') {
    el('icone-nome').textContent = icone;
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

function obterListaFiltradaOrdenada() {
  const textoBusca = obterTextoBusca();

  let lista = disciplinas.filter((disciplina) => {
    const nome = String(disciplina.nome ?? '').toLowerCase();
    return nome.includes(textoBusca);
  });

  if (campoOrdenacao) {
    lista.sort((a, b) => {
      let valorA = String(a[campoOrdenacao] ?? '').toLowerCase();
      let valorB = String(b[campoOrdenacao] ?? '').toLowerCase();

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
        <td colspan="3" class="sem-registros">Nenhum registro encontrado.</td>
      </tr>
    `;
    atualizarIconesOrdenacao();
    return;
  }

  listaPaginada.forEach((disciplina) => {
    const linha = document.createElement('tr');

    if (String(disciplina.id) === String(idSelecionado)) {
      linha.classList.add('linha-selecionada');
    }

    linha.innerHTML = `
      <td>${formatarValor(disciplina.id)}</td>
      <td>${formatarValor(disciplina.nome)}</td>
      <td>${formatarData(disciplina.updated_at)}</td>
    `;

    linha.addEventListener('click', () => {
      selecionarDisciplina(disciplina);
    });

    linha.addEventListener('dblclick', () => {
      selecionarDisciplina(disciplina);
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

async function carregarDisciplinas() {
  try {
    setStatus('Carregando lista...');
    const resposta = await fetch(API_URL);

    if (!resposta.ok) {
      throw new Error('Erro ao carregar a lista');
    }

    disciplinas = await resposta.json();
    filtrarTabela();

    if (!idSelecionado) {
      setStatus('Lista carregada com sucesso.');
    }
  } catch (erro) {
    console.error('Erro ao carregar disciplinas:', erro);
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

    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    if (!resposta.ok) {
      throw new Error('Erro ao cadastrar');
    }

    limpar(false);
    await carregarDisciplinas();

    mostrarToast('Disciplina cadastrada com sucesso!', 'sucesso');
    setStatus('Disciplina cadastrada com sucesso.');
  } catch (erro) {
    console.error('Erro ao cadastrar:', erro);
    mostrarMensagem('Erro', 'Erro ao cadastrar.', 'erro');
    setStatus('Erro ao cadastrar disciplina.');
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

    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    if (!resposta.ok) {
      throw new Error('Erro ao salvar');
    }

    limpar(false);
    await carregarDisciplinas();

    mostrarToast('Disciplina atualizada com sucesso!', 'sucesso');
    setStatus('Disciplina atualizada com sucesso.');
  } catch (erro) {
    console.error('Erro ao salvar:', erro);
    mostrarMensagem('Erro', 'Erro ao salvar.', 'erro');
    setStatus('Erro ao salvar disciplina.');
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
      'Deseja realmente excluir esta disciplina?'
    );

    if (!confirmado) {
      setStatus('Exclusão cancelada.');
      return;
    }

    const resposta = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!resposta.ok) {
      throw new Error('Erro ao excluir');
    }

    limpar(false);
    await carregarDisciplinas();

    mostrarToast('Disciplina excluída com sucesso!', 'sucesso');
    setStatus('Disciplina excluída com sucesso.');
  } catch (erro) {
    console.error('Erro ao excluir:', erro);
    mostrarMensagem('Erro', 'Erro ao excluir.', 'erro');
    setStatus('Erro ao excluir disciplina.');
  }
}

function selecionarDisciplina(disciplina) {
  idSelecionado = disciplina.id ?? null;

  el('id').value = disciplina.id ?? '';
  el('nome').value = disciplina.nome ?? '';
  el('atualizacao').value = formatarData(disciplina.updated_at);

  limparErros();
  atualizarModoInterface();
  filtrarTabela();
  setStatus(`Registro ID ${disciplina.id} selecionado para edição.`);
}

function limpar(mensagem = true) {
  idSelecionado = null;

  el('id').value = '';
  el('nome').value = '';
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

  const linhas = [['ID', 'Nome', 'Atualização']];

  listaAtualFiltrada.forEach((disciplina) => {
    linhas.push([
      disciplina.id ?? '',
      `"${String(disciplina.nome ?? '').replace(/"/g, '""')}"`,
      `"${formatarData(disciplina.updated_at).replace(/"/g, '""')}"`
    ]);
  });

  const conteudo = '\uFEFF' + linhas.map((linha) => linha.join(';')).join('\n');
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'disciplinas.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  mostrarToast('CSV exportado com sucesso!', 'sucesso');
  setStatus('Arquivo CSV gerado com sucesso.');
}

el('modalOverlay').addEventListener('click', (event) => {
  if (event.target.id === 'modalOverlay') {
    fecharModal();
  }
});

document.addEventListener('keydown', (event) => {
  const modalAberto = el('modalOverlay').classList.contains('ativo');

  if (event.key === 'Escape') {
    if (modalAberto) {
      fecharModal();
      return;
    }

    if (idSelecionado) {
      cancelarEdicao();
    }
  }

  if (event.key === 'Enter') {
    const elementoAtivo = document.activeElement;
    const tag = elementoAtivo ? elementoAtivo.tagName.toLowerCase() : '';

    if (modalAberto) return;
    if (tag === 'button') return;

    event.preventDefault();

    if (idSelecionado) {
      salvar();
    } else {
      incluir();
    }
  }
});

el('nome').addEventListener('input', () => {
  if (el('erroNome').textContent) {
    validarFormulario();
  }
});

function inicializar() {
  atualizarModoInterface();
  carregarDisciplinas();
}

inicializar();