const socket = io();

const formEl = document.getElementById('form-item');
const formTituloEl = document.getElementById('form-titulo');
const idEl = document.getElementById('item-id');
const nomeEl = document.getElementById('item-nome');
const descEl = document.getElementById('item-desc');
const precoEl = document.getElementById('item-preco');
const imagemEl = document.getElementById('item-imagem');
const btnSalvar = document.getElementById('btn-salvar');
const btnCancelar = document.getElementById('btn-cancelar');
const listaEl = document.getElementById('lista-itens');

let itens = [];

async function carregarItens() {
  const resposta = await fetch('/api/itens');
  itens = await resposta.json();
  renderLista();
}

// Atualiza a lista automaticamente se o cardápio mudar em outra aba/dispositivo
socket.on('cardapio-atualizado', (itensAtualizados) => {
  itens = itensAtualizados;
  renderLista();
});

function renderLista() {
  if (itens.length === 0) {
    listaEl.innerHTML = '<p class="lista-vazia">Nenhum item cadastrado ainda</p>';
    return;
  }

  listaEl.innerHTML = itens.map(item => `
    <div class="item-linha ${item.disponivel === false ? 'indisponivel' : ''}">
      <img src="${item.imagem || 'images/placeholder.jpg'}" alt="${item.nome}" class="item-thumb">
      <div class="item-info">
        <h3>${item.nome}</h3>
        <span class="item-preco">R$ ${Number(item.preco).toFixed(2).replace('.', ',')}</span>
        ${item.disponivel === false ? '<span class="badge-indisponivel">Indisponível</span>' : ''}
      </div>
      <div class="item-acoes">
        <button class="btn-mini" data-acao="disponivel" data-id="${item.id}">
          ${item.disponivel === false ? 'Reativar' : 'Pausar'}
        </button>
        <button class="btn-mini" data-acao="editar" data-id="${item.id}">Editar</button>
        <button class="btn-mini btn-remover" data-acao="remover" data-id="${item.id}">Remover</button>
      </div>
    </div>
  `).join('');
}

// Envia o formulário (adicionar OU editar, dependendo se tem id preenchido)
formEl.addEventListener('submit', async (e) => {
  e.preventDefault();

  const dados = {
    nome: nomeEl.value.trim(),
    desc: descEl.value.trim(),
    preco: Number(precoEl.value),
    imagem: imagemEl.value.trim(),
  };

  const id = idEl.value;
  btnSalvar.disabled = true;

  try {
    const resposta = await fetch(id ? `/api/itens/${id}` : '/api/itens', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (!resposta.ok) throw new Error('Falha ao salvar item');

    limparFormulario();
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível salvar o item. Confira os dados e tente de novo.');
  } finally {
    btnSalvar.disabled = false;
  }
});

btnCancelar.addEventListener('click', limparFormulario);

function limparFormulario() {
  formEl.reset();
  idEl.value = '';
  formTituloEl.textContent = 'Adicionar item';
  btnSalvar.textContent = 'Adicionar';
  btnCancelar.hidden = true;
}

function preencherFormularioParaEdicao(item) {
  idEl.value = item.id;
  nomeEl.value = item.nome;
  descEl.value = item.desc || '';
  precoEl.value = item.preco;
  imagemEl.value = item.imagem || '';
  formTituloEl.textContent = `Editando: ${item.nome}`;
  btnSalvar.textContent = 'Salvar alterações';
  btnCancelar.hidden = false;
  nomeEl.focus();
}

// Clique nos botões de cada item da lista (editar / pausar / remover)
listaEl.addEventListener('click', async (e) => {
  const botao = e.target.closest('.btn-mini');
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.acao;
  const item = itens.find(i => i.id === id);

  if (acao === 'editar') {
    preencherFormularioParaEdicao(item);
    return;
  }

  if (acao === 'disponivel') {
    await fetch(`/api/itens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disponivel: item.disponivel === false }),
    });
    return;
  }

  if (acao === 'remover') {
    if (!confirm(`Remover "${item.nome}" do cardápio?`)) return;
    await fetch(`/api/itens/${id}`, { method: 'DELETE' });
  }
});

carregarItens();