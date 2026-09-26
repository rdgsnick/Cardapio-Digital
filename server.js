const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // servidor HTTP "cru", que o Express e o Socket.io compartilham
const io = new Server(server); // Socket.io acoplado no mesmo servidor

const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let pedidos = [];
let proximoId = 1;

// Cliente faz um novo pedido
app.post('/api/pedidos', (req, res) => {
  const { mesa, itens } = req.body;

  if (!mesa || !itens || itens.length === 0) {
    return res.status(400).json({ erro: 'Pedido inválido' });
  }

  const novoPedido = {
    id: proximoId++,
    mesa,
    itens,
    status: 'novo',
    criadoEm: new Date().toISOString(),
  };

  pedidos.push(novoPedido);
  console.log('Novo pedido recebido:', novoPedido);

  io.emit('novo-pedido', novoPedido); // avisa TODOS os painéis conectados, na hora

  res.status(201).json(novoPedido);
});

// Cozinha marca um pedido como pronto
app.patch('/api/pedidos/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const pedido = pedidos.find(p => p.id === id);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });

  pedido.status = status;
  io.emit('pedido-atualizado', pedido); // avisa todo mundo que o status mudou

  res.json(pedido);
});

// Lista todos os pedidos (usado quando o painel da cozinha abre, pra já mostrar o que existe)
app.get('/api/pedidos', (req, res) => {
  res.json(pedidos);
});

// Quando uma tela se conecta via Socket.io
io.on('connection', (socket) => {
  console.log('Painel conectado:', socket.id);
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});