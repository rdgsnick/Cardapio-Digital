const socket = io();

const pedidosEl = document.getElementById('pedidos');
const statusEl = document.getElementById('status-conexao');

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
  div.className = 'ticket pronto';
  div.id = `pedido-${pedido.id}`;

  div.innerHTML = `
    <div class="ticket-mesa">PEDIDO #${pedido.id} — MESA <span>${pedido.mesa}</span></div>
    <ul>
      ${pedido.itens.map(i => `
        <li>${nomeDoItem(i.itemId)}${i.obs ? `<span class="obs">"${i.obs}"</span>` : ''}</li>
      `).join('')}
    </ul>
    <button class="ticket-btn">Marcar como entregue</button>
  `;

  div.querySelector('.ticket-btn').addEventListener('click', () => marcarEntregue(pedido.id));

  return div;
}

async function marcarEntregue(id) {
  await fetch(`/api/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'entregue' }),
  });
}

fetch('/api/pedidos')
  .then(res => res.json())
  .then(pedidos => {
    pedidos
      .filter(p => p.status === 'pronto')
      .forEach(pedido => pedidosEl.appendChild(criarTicket(pedido)));
  });

socket.on('pedido-atualizado', (pedido) => {
  const ticketExistente = document.getElementById(`pedido-${pedido.id}`);

  if (pedido.status === 'pronto') {
    if (!ticketExistente) pedidosEl.prepend(criarTicket(pedido));
  } else {
    if (ticketExistente) ticketExistente.remove();
  }
});

socket.on('connect', () => {
  statusEl.textContent = 'conectado';
  statusEl.classList.add('online');
});