const socket = io();

const pedidosEl = document.getElementById('pedidos');
const historicoEl = document.getElementById('historico');
const statusEl = document.getElementById('status-conexao');
const tabBtns = document.querySelectorAll('.tab-btn');

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

const statusLabels = {
  novo: { texto: 'Novo', classe: 'status-novo' },
  pronto: { texto: 'Pronto', classe: 'status-pronto' },
  entregue: { texto: 'Entregue', classe: 'status-entregue' },
};

function formatarHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function criarTicketHistorico(pedido) {
  const div = document.createElement('div');
  div.className = 'ticket historico-item';
  div.id = `historico-${pedido.id}`;

  const status = statusLabels[pedido.status] || statusLabels.novo;

  div.innerHTML = `
    <div class="ticket-mesa">
      PEDIDO #${pedido.id} — MESA <span>${pedido.mesa}</span>
      <span class="historico-hora">${formatarHora(pedido.criadoEm)}</span>
    </div>
    <ul>
      ${pedido.itens.map(i => `
        <li>${nomeDoItem(i.itemId)}${i.obs ? `<span class="obs">"${i.obs}"</span>` : ''}</li>
      `).join('')}
    </ul>
    <span class="status-badge ${status.classe}">${status.texto}</span>
  `;

  return div;
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const aba = btn.dataset.tab;
    pedidosEl.hidden = aba !== 'ativos';
    historicoEl.hidden = aba !== 'historico';
  });
});

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

    pedidos.slice().reverse().forEach(pedido => historicoEl.appendChild(criarTicketHistorico(pedido)));
  });

// Pedido novo não aparece nos "ativos" do garçom ainda (só quando ficar pronto),
// mas já entra no histórico pra ficar registrado desde o início
socket.on('novo-pedido', (pedido) => {
  historicoEl.prepend(criarTicketHistorico(pedido));
});

socket.on('pedido-atualizado', (pedido) => {
  const ticketExistente = document.getElementById(`pedido-${pedido.id}`);

  if (pedido.status === 'pronto') {
    if (!ticketExistente) pedidosEl.prepend(criarTicket(pedido));
  } else {
    if (ticketExistente) ticketExistente.remove();
  }

  const historicoAntigo = document.getElementById(`historico-${pedido.id}`);
  if (historicoAntigo) historicoAntigo.replaceWith(criarTicketHistorico(pedido));
});

socket.on('connect', () => {
  statusEl.textContent = 'conectado';
  statusEl.classList.add('online');
});