// Pega o número da mesa pela URL: index.html?mesa=12
const params = new URLSearchParams(window.location.search);
const numeroMesa = params.get('mesa') || '--';
document.getElementById('numero-mesa').textContent = numeroMesa;

// Cardápio de exemplo — depois isso pode vir de um back-end
const itens = [
  { id: 1, nome: 'Bruschetta', desc: 'Pão italiano tostado, tomate fresco, manjericão e azeite extra virgem.', preco: 18.90, imagem: 'images/bruschetta.jpg' },
  { id: 2, nome: 'Risoto de Funghi', desc: 'Arbóreo cremoso, mix de cogumelos frescos e finalizado com parmesão.', preco: 42.00, imagem: 'images/risoto.jpg' },
  { id: 3, nome: 'Filé ao Molho Madeira', desc: 'Filé mignon grelhado, purê de batatas e molho madeira.', preco: 58.50, imagem: 'images/file.jpg' },
  { id: 4, nome: 'Petit Gâteau', desc: 'Bolo de chocolate com recheio cremoso, sorvete de creme e calda quente.', preco: 22.00, imagem: 'images/petit-gateau.jpg' },
];

// Cada linha do carrinho é um pedido individual (permite observações diferentes pro mesmo prato)
let carrinho = []; // [{ itemId, obs }]

const cardapioEl = document.getElementById('cardapio');
const carrinhoListaEl = document.getElementById('carrinho-lista');
const totalEl = document.getElementById('carrinho-total');
const btnEnviar = document.getElementById('btn-enviar');

function renderCardapio() {
  cardapioEl.innerHTML = itens.map(item => `
    <article class="card">
      <img class="card-img" src="${item.imagem}" alt="${item.nome}">
      <div class="card-body">
        <h3>${item.nome}</h3>
        <p>${item.desc}</p>
        <span class="card-preco">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
        <textarea class="card-obs" data-id="${item.id}" placeholder="Alguma observação? Ex: sem cebola, ponto da carne..."></textarea>
        <button class="card-add" data-id="${item.id}">Adicionar ao pedido</button>
      </div>
    </article>
  `).join('');
}

function renderCarrinho() {
  if (carrinho.length === 0) {
    carrinhoListaEl.innerHTML = '<p class="carrinho-vazio">Nenhum item ainda</p>';
    totalEl.textContent = 'R$ 0,00';
    btnEnviar.disabled = true;
    return;
  }

  carrinhoListaEl.innerHTML = carrinho.map((linha, index) => {
    const item = itens.find(i => i.id === linha.itemId);
    return `
      <div class="carrinho-item">
        <div class="carrinho-item-info">
          <h4>${item.nome}</h4>
          ${linha.obs ? `<span class="obs">"${linha.obs}"</span>` : ''}
        </div>
        <div style="display:flex; align-items:flex-start; gap:4px;">
          <span class="carrinho-item-preco">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
          <button class="carrinho-item-remover" data-index="${index}" title="Remover">✕</button>
        </div>
      </div>
    `;
  }).join('');

  const total = carrinho.reduce((soma, linha) => {
    const item = itens.find(i => i.id === linha.itemId);
    return soma + item.preco;
  }, 0);

  totalEl.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  btnEnviar.disabled = false;
}

cardapioEl.addEventListener('click', (e) => {
  if (!e.target.matches('.card-add')) return;
  const id = Number(e.target.dataset.id);
  const textarea = cardapioEl.querySelector(`.card-obs[data-id="${id}"]`);
  const obs = textarea.value.trim();

  carrinho.push({ itemId: id, obs });
  textarea.value = '';
  renderCarrinho();
});

carrinhoListaEl.addEventListener('click', (e) => {
  if (!e.target.matches('.carrinho-item-remover')) return;
  const index = Number(e.target.dataset.index);
  carrinho.splice(index, 1);
  renderCarrinho();
});

btnEnviar.addEventListener('click', async () => {
  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  try {
    const resposta = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesa: numeroMesa, itens: carrinho }),
    });

    if (!resposta.ok) throw new Error('Falha ao enviar pedido');

    const pedidoConfirmado = await resposta.json();
    console.log('Pedido confirmado pelo servidor:', pedidoConfirmado);

    alert(`Pedido #${pedidoConfirmado.id} enviado com sucesso para a cozinha!`);
    carrinho = [];
    renderCarrinho();
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível enviar o pedido. Tenta de novo.');
  } finally {
    btnEnviar.textContent = 'Confirmar pedido';
  }
});
renderCardapio();
renderCarrinho();