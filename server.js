const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // servidor HTTP "cru", que o Express e o Socket.io compartilham
const io = new Server(server); // Socket.io acoplado no mesmo servidor

const PORT = 3000;

// Login do painel admin — troque essas credenciais antes de usar em produção!
// O ideal é colocar isso em variáveis de ambiente (.env), mas pra começar já funciona.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

app.use(express.json());

// Middleware que exige usuário/senha (autenticação HTTP Basic — o navegador
// já mostra uma caixinha de login nativa, sem precisar programar tela de login)
function authAdmin(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Painel Admin"');
    return res.status(401).send('Autenticação necessária');
  }

  const credenciais = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [usuario, senha] = credenciais.split(':');

  if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Painel Admin"');
  return res.status(401).send('Credenciais inválidas');
}

// Protege o HTML do admin ANTES do express.static liberar tudo da pasta public
app.get('/admin.html', authAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

let pedidos = [];
let proximoId = 1;

// Cardápio — por enquanto em memória (sem banco de dados ainda).
// Quando você adicionar um banco, é só trocar esse array por consultas ao banco
// e manter as mesmas rotas funcionando igual.
let itens = [
  { id: 1, nome: 'Bruschetta', desc: 'Pão italiano tostado, tomate fresco, manjericão e azeite extra virgem.', preco: 18.90, imagem: 'images/bruschetta.jpg', disponivel: true },
  { id: 2, nome: 'Risoto de Funghi', desc: 'Arbóreo cremoso, mix de cogumelos frescos e finalizado com parmesão.', preco: 42.00, imagem: 'images/risoto.jpg', disponivel: true },
  { id: 3, nome: 'Filé ao Molho Madeira', desc: 'Filé mignon grelhado, purê de batatas e molho madeira.', preco: 58.50, imagem: 'images/file.jpg', disponivel: true },
  { id: 4, nome: 'Petit Gâteau', desc: 'Bolo de chocolate com recheio cremoso, sorvete de creme e calda quente.', preco: 22.00, imagem: 'images/petit-gateau.jpg', disponivel: true },
];
let proximoItemId = 5;

// Cliente carrega o cardápio atual
app.get('/api/itens', (req, res) => {
  res.json(itens);
});

// Admin adiciona um item novo
app.post('/api/itens', authAdmin, (req, res) => {
  const { nome, desc, preco, imagem } = req.body;

  if (!nome || preco === undefined) {
    return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
  }

  const novoItem = {
    id: proximoItemId++,
    nome,
    desc: desc || '',
    preco: Number(preco),
    imagem: imagem || '',
    disponivel: true,
  };

  itens.push(novoItem);
  io.emit('cardapio-atualizado', itens); // avisa todas as telas abertas na hora

  res.status(201).json(novoItem);
});

// Admin edita um item (nome, preço, descrição, imagem ou disponibilidade)
app.put('/api/itens/:id', authAdmin, (req, res) => {
  const id = Number(req.params.id);
  const item = itens.find(i => i.id === id);

  if (!item) return res.status(404).json({ erro: 'Item não encontrado' });

  const { nome, desc, preco, imagem, disponivel } = req.body;
  if (nome !== undefined) item.nome = nome;
  if (desc !== undefined) item.desc = desc;
  if (preco !== undefined) item.preco = Number(preco);
  if (imagem !== undefined) item.imagem = imagem;
  if (disponivel !== undefined) item.disponivel = disponivel;

  io.emit('cardapio-atualizado', itens);

  res.json(item);
});

// Admin remove um item
app.delete('/api/itens/:id', authAdmin, (req, res) => {
  const id = Number(req.params.id);
  const tamanhoAntes = itens.length;
  itens = itens.filter(i => i.id !== id);

  if (itens.length === tamanhoAntes) {
    return res.status(404).json({ erro: 'Item não encontrado' });
  }

  io.emit('cardapio-atualizado', itens);

  res.json({ ok: true });
});

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