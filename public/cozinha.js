const socket = io(); // conecta automaticamente no mesmo servidor que serviu a página

const pedidosEl = document.getElementById('pedidos');
const statusEl = document.getElementById('status-conexao');

// Cardápio precisa existir aqui também, só pra traduzir itemId em nome do prato
const itens = [
  { id: 1, nome: 'Bruschetta' },
  { id: 2, nome: 'Risoto de Funghi' },
  { id: 3, nome: 'Filé ao Molho Madeira' },
  { id: 4, nome: 'Petit Gâteau' },
];

function nomeDoItem(id) {
  return itens.find(i => i.id === id)?.nome || 'Item desconhecido';
}

function criarTicket(pedido) {
  const div = document.createElement('div');
  div.className = `ticket ${pedido.status === 'pronto' ? 'pronto' : ''}`;
  div.id = `pedido-${pedido.id}`;

  div.innerHTML = `
    <div class="ticket-mesa">PEDIDO #${pedido.id} — MESA <span>${pedido.mesa}</span></div>
    <ul>
      ${pedido.itens.map(i => `
        <li>${nomeDoItem(i.itemId)}${i.obs ? `<span class="obs">"${i.obs}"</span>` : ''}</li>
      `).join('')}
    </ul>
    <button class="ticket-btn" ${pedido.status === 'pronto' ? 'disabled' : ''}>
      ${pedido.status === 'pronto' ? 'Pronto' : 'Marcar como pronto'}
    </button>
  `;

  div.querySelector('.ticket-btn').addEventListener('click', () => marcarPronto(pedido.id));

  return div;
}

async function marcarPronto(id) {
  await fetch(`/api/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'pronto' }),
  });
  // não precisa atualizar a tela aqui — o servidor vai avisar via socket, e todo mundo atualiza junto
}

// Ao abrir a página, busca os pedidos que já existem
fetch('/api/pedidos')
  .then(res => res.json())
  .then(pedidos => {
    pedidos.forEach(pedido => pedidosEl.appendChild(criarTicket(pedido)));
  });

// Escuta quando um pedido NOVO chega
socket.on('novo-pedido', (pedido) => {
  pedidosEl.prepend(criarTicket(pedido));
});

// Escuta quando um pedido é ATUALIZADO (pronto ou entregue)
socket.on('pedido-atualizado', (pedido) => {
  const ticketAntigo = document.getElementById(`pedido-${pedido.id}`);

  if (pedido.status === 'entregue') {
    // já foi entregue, some da tela da cozinha
    if (ticketAntigo) ticketAntigo.remove();
  } else if (ticketAntigo) {
    ticketAntigo.replaceWith(criarTicket(pedido));
  }
});

// Feedback visual de conexão
socket.on('connect', () => {
  statusEl.textContent = 'conectado';
  statusEl.classList.add('online');
});