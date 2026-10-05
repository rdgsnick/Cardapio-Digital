const socket = io(); // conecta automaticamente no mesmo servidor que serviu a página

const pedidosEl = document.getElementById('pedidos');
const historicoEl = document.getElementById('historico');
const statusEl = document.getElementById('status-conexao');
const tabBtns = document.querySelectorAll('.tab-btn');

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

const statusLabels = {
  novo: { texto: 'Novo', classe: 'status-novo' },
  pronto: { texto: 'Pronto', classe: 'status-pronto' },
  entregue: { texto: 'Entregue', classe: 'status-entregue' },
};

function formatarHora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Igual o ticket normal, mas sem botão de ação — só mostra o status atual
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

// Troca de aba — só mostra/esconde, os dados já estão carregados nos dois
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const aba = btn.dataset.tab;
    pedidosEl.hidden = aba !== 'ativos';
    historicoEl.hidden = aba !== 'historico';
  });
});

async function marcarPronto(id) {
  await fetch(`/api/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'pronto' }),
  });
  // não precisa atualizar a tela aqui — o servidor vai avisar via socket, e todo mundo atualiza junto
}

// Ao abrir a página, busca os pedidos que já existem e preenche as duas abas
fetch('/api/pedidos')
  .then(res => res.json())
  .then(pedidos => {
    // Só pedidos que ainda não foram entregues entram na aba "ativos"
    pedidos
      .filter(pedido => pedido.status !== 'entregue')
      .forEach(pedido => pedidosEl.appendChild(criarTicket(pedido)));

    // O histórico continua mostrando todos, entregues inclusive
    pedidos.slice().reverse().forEach(pedido => historicoEl.appendChild(criarTicketHistorico(pedido)));
  });

// Escuta quando um pedido NOVO chega
socket.on('novo-pedido', (pedido) => {
  pedidosEl.prepend(criarTicket(pedido));
  historicoEl.prepend(criarTicketHistorico(pedido));
});

// Escuta quando um pedido é ATUALIZADO (pronto ou entregue)
socket.on('pedido-atualizado', (pedido) => {
  const ticketAntigo = document.getElementById(`pedido-${pedido.id}`);

  if (pedido.status === 'entregue') {
    // já foi entregue, some da tela de pedidos ativos (mas continua no histórico)
    if (ticketAntigo) ticketAntigo.remove();
  } else if (ticketAntigo) {
    ticketAntigo.replaceWith(criarTicket(pedido));
  }

  const historicoAntigo = document.getElementById(`historico-${pedido.id}`);
  if (historicoAntigo) historicoAntigo.replaceWith(criarTicketHistorico(pedido));
});

// Feedback visual de conexão
socket.on('connect', () => {
  statusEl.textContent = 'conectado';
  statusEl.classList.add('online');
});