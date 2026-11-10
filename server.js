// server.js — autossuficiente: HTML embutido, sem depender de views/ ou public/
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { promisify } = require('util');
const pool = require('./db');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;
const scrypt = promisify(crypto.scrypt);

// ============ Hash de senha ============
async function hashSenha(s) {
    const salt = crypto.randomBytes(16).toString('hex');
    const h = await scrypt(s, salt, 64);
    return `scrypt$${salt}$${h.toString('hex')}`;
}
async function verificarSenha(s, arm) {
    if (!arm || !arm.startsWith('scrypt$')) return s === arm;
    const p = arm.split('$');
    if (p.length !== 3) return false;
    const h = await scrypt(s, p[1], 64);
    return crypto.timingSafeEqual(h, Buffer.from(p[2], 'hex'));
}

// ============ Middlewares ============
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer().any());
app.use(session({
    secret: process.env.SESSION_SECRET || 'librarvore-segredo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
}));

// ============ Init DB ============
async function initDb() {
    await pool.query(`CREATE TABLE IF NOT EXISTS cadastrousuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(120) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS titulos (
        isbn VARCHAR(20) PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        autor VARCHAR(150) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        numero_de_edicao VARCHAR(20),
        copyright VARCHAR(10),
        editora VARCHAR(100),
        paginas INT,
        sinopse TEXT,
        disponivel TINYINT(1) DEFAULT 1,
        destaque TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS favoritos (
        usuario_id INT NOT NULL,
        isbn VARCHAR(20) NOT NULL,
        PRIMARY KEY (usuario_id, isbn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS progresso_leitura (
        usuario_id INT NOT NULL,
        isbn VARCHAR(20) NOT NULL,
        titulo VARCHAR(255),
        autor VARCHAR(255),
        progresso INT DEFAULT 0,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, isbn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS preferencias_usuario (
        usuario VARCHAR(120) PRIMARY KEY,
        nome VARCHAR(120),
        tamanho_texto ENUM('pequeno','medio','grande') DEFAULT 'medio',
        tema ENUM('claro','escuro') DEFAULT 'claro',
        notif_prazo TINYINT(1) DEFAULT 1,
        notif_novidades TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('✅ Tabelas verificadas/criadas');
}

// ============ API Auth ============
app.post('/api/login', async (req, res) => {
    const login = String(req.body?.login || '').trim();
    const senha = String(req.body?.senha || '');
    if (!login || !senha) return res.status(400).json({ erro: 'Preencha e-mail e senha.' });
    try {
        const [rows] = await pool.query('SELECT id, login, senha FROM cadastrousuario WHERE login = ?', [login]);
        if (!rows.length || !(await verificarSenha(senha, rows[0].senha)))
            return res.status(401).json({ erro: 'Login ou senha inválidos.' });
        if (!rows[0].senha.startsWith('scrypt$'))
            await pool.query('UPDATE cadastrousuario SET senha = ? WHERE id = ?',
                [await hashSenha(senha), rows[0].id]);
        req.session.usuario = rows[0].login;
        req.session.usuarioId = rows[0].id;
        res.json({ ok: true, usuario: rows[0].login });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/cadastro', async (req, res) => {
    const login = String(req.body?.login || '').trim();
    const senha = String(req.body?.senha || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) || senha.length < 8 || senha.length > 128)
        return res.status(400).json({ erro: 'E-mail inválido ou senha fora de 8–128 caracteres.' });
    try {
        const [r] = await pool.query('INSERT INTO cadastrousuario (login, senha) VALUES (?, ?)',
            [login, await hashSenha(senha)]);
        req.session.usuario = login;
        req.session.usuarioId = r.insertId;
        res.status(201).json({ ok: true, usuario: login });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'E-mail já cadastrado.' });
        res.status(500).json({ erro: e.message });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
});

// ============ API Livros ============
app.get('/api/livros', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Faça login primeiro.' });
    try {
        const busca = (req.query.q || '').trim();
        let sql = 'SELECT * FROM titulos';
        const params = [];
        if (busca) {
            sql += ' WHERE LOWER(titulo) LIKE LOWER(?) OR LOWER(autor) LIKE LOWER(?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }
        sql += ' ORDER BY titulo ASC LIMIT 500';
        const [livros] = await pool.query(sql, params);
        res.json({ usuario: req.session.usuario, livros });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/estatisticas', async (_, res) => {
    try {
        const [t] = await pool.query('SELECT COUNT(*) AS n FROM titulos');
        const [d] = await pool.query('SELECT COUNT(*) AS n FROM titulos WHERE disponivel=1');
        const [c] = await pool.query('SELECT COUNT(DISTINCT categoria) AS n FROM titulos');
        res.json({ total: t[0].n, disponiveis: d[0].n, categorias: c[0].n });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/categorias', async (_, res) => {
    try {
        const [r] = await pool.query('SELECT categoria, COUNT(*) AS total FROM titulos GROUP BY categoria ORDER BY categoria');
        res.json({ categorias: r });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ============ Debug ============
app.get('/debug', async (_, res) => {
    const out = { env: {}, db: 'unknown' };
    out.env = {
        NODE_ENV: process.env.NODE_ENV,
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PASS_set: !!process.env.DB_PASS
    };
    try {
        const [r] = await pool.query('SELECT COUNT(*) AS n FROM titulos');
        out.db = 'ok: ' + r[0].n + ' titulos';
    } catch (e) { out.db = 'ERRO: ' + e.message; }
    res.json(out);
});

// ============ HTML embutido ============
const loginPage = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Librárvore</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a4d2e,#2d6a4f);padding:20px}
.c{background:#fff;padding:36px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:100%;max-width:380px}
h1{color:#1a4d2e;margin:0 0 6px;font-size:26px}.s{color:#666;margin:0 0 24px;font-size:14px}
label{display:block;margin-bottom:6px;font-size:14px;font-weight:500;color:#333}
input{width:100%;padding:11px;border:1px solid #ccc;border-radius:6px;margin-bottom:14px;font-size:15px;box-sizing:border-box}
input:focus{outline:none;border-color:#1a4d2e}
button{width:100%;padding:12px;background:#1a4d2e;color:#fff;border:0;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:8px}
button.sec{background:#eee;color:#333}.err{color:#c00;background:#fee;padding:10px;border-radius:6px;font-size:14px;margin-top:10px;display:none}
</style></head><body>
<div class="c"><h1>📚 Librárvore</h1><p class="s">Acesse sua conta</p>
<label>E-mail</label><input id="email" type="email" placeholder="seu@email.com">
<label>Senha</label><input id="senha" type="password" placeholder="Mínimo 8 caracteres">
<button onclick="entrar()">Entrar</button>
<button class="sec" onclick="cadastrar()">Criar conta</button>
<div id="msg" class="err"></div></div>
<script>
function err(m){var e=document.getElementById('msg');e.textContent=m;e.style.display='block';}
async function post(url,body){
  var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return r.json();
}
async function entrar(){
  var l=document.getElementById('email').value.trim(),s=document.getElementById('senha').value;
  if(!l||!s)return err('Preencha tudo.');
  try{var j=await post('/api/login',{login:l,senha:s});if(j.erro)return err(j.erro);location.href='/03-acervo.html';}
  catch(e){err(e.message);}
}
async function cadastrar(){
  var l=document.getElementById('email').value.trim(),s=document.getElementById('senha').value;
  if(!l||!s)return err('Preencha tudo.');
  try{var j=await post('/api/cadastro',{login:l,senha:s});if(j.erro)return err(j.erro);location.href='/03-acervo.html';}
  catch(e){err(e.message);}
}
</script></body></html>`;

const acervoPage = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Librárvore — Acervo</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f5f5f5}
header{background:#1a4d2e;color:#fff;padding:14px 22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
header h1{font-size:18px;margin:0}
header .user{display:flex;gap:12px;align-items:center;font-size:14px}
header button{background:#fff;color:#1a4d2e;border:0;padding:7px 14px;border-radius:6px;cursor:pointer;font-weight:600}
main{max-width:1200px;margin:0 auto;padding:20px}
.hero{background:linear-gradient(135deg,#1a4d2e,#2d6a4f);color:#fff;padding:28px;border-radius:10px;margin-bottom:20px}
.hero h2{margin:0 0 6px;font-size:22px}.hero p{margin:0;opacity:.9}
.controls{margin-bottom:14px}
.controls input{width:100%;max-width:400px;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:14px;box-sizing:border-box}
table{width:100%;background:#fff;border-radius:8px;overflow:hidden;border-collapse:collapse;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
th{background:#eee;padding:11px;text-align:left;font-weight:600;font-size:13px}
td{padding:11px;border-top:1px solid #eee}
.sim{color:#0a0;font-weight:600}.nao{color:#c00;font-weight:600}
.btn{background:#1a4d2e;color:#fff;border:0;padding:5px 11px;border-radius:4px;cursor:pointer;font-size:13px}
#vazio{text-align:center;padding:30px;color:#666}
</style></head><body>
<header><h1>📚 Librárvore</h1><div class="user"><span id="user">—</span><button onclick="sair()">Sair</button></div></header>
<main>
<div class="hero"><h2>Bem-vindo ao acervo</h2><p id="stats">Carregando…</p></div>
<div class="controls"><input id="busca" placeholder="Buscar por título ou autor…" oninput="filtrar()"></div>
<table><thead><tr><th>ISBN</th><th>Título</th><th>Autor</th><th>Edição</th><th>Ano</th><th>Disp.</th><th>Ação</th></tr></thead><tbody id="rows"></tbody></table>
<div id="vazio"></div>
</main>
<script>
var todos=[];
async function get(u){var r=await fetch(u);return r.json();}
async function sair(){await fetch('/api/logout',{method:'POST'});location.href='/01-login.html';}
function filtrar(){
  var q=document.getElementById('busca').value.toLowerCase();
  if(!q)return render(todos);
  render(todos.filter(function(l){return (l.titulo||'').toLowerCase().indexOf(q)>=0||(l.autor||'').toLowerCase().indexOf(q)>=0;}));
}
function render(list){
  var tb=document.getElementById('rows'),v=document.getElementById('vazio');
  if(!list.length){tb.innerHTML='';v.textContent='Nenhum livro.';return;}
  v.textContent='';
  var h='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    h+='<tr><td style="font-family:monospace;font-size:12px">'+l.isbn+'</td>';
    h+='<td><b>'+l.titulo+'</b></td>';
    h+='<td>'+l.autor+'</td>';
    h+='<td>'+(l.numero_de_edicao||'—')+'</td>';
    h+='<td>'+(l.copyright||'—')+'</td>';
    h+='<td class="'+(l.disponivel?'sim':'nao')+'">'+(l.disponivel?'Sim':'Não')+'</td>';
    h+='<td><button class="btn" onclick="alert(\\'Lendo: '+l.titulo.replace(/[\\'\\"]/g,'')+'\\')">Ler</button></td></tr>';
  }
  tb.innerHTML=h;
}
(async function init(){
  try{
    var s=await get('/api/estatisticas');
    document.getElementById('stats').textContent=(s.total||0).toLocaleString('pt-BR')+' livros em '+(s.categorias||0)+' seções — '+(s.disponiveis||0).toLocaleString('pt-BR')+' disponíveis';
    var j=await get('/api/livros');
    if(j.erro){location.href='/01-login.html';return;}
    document.getElementById('user').textContent='👤 '+j.usuario;
    todos=j.livros||[];
    render(todos);
  }catch(e){document.getElementById('vazio').textContent='Erro: '+e.message;}
})();
</script></body></html>`;

// ============ Rotas das páginas ============
app.get('/', (_, res) => res.redirect('/01-login.html'));
app.get('/login', (_, res) => res.redirect('/01-login.html'));
app.get('/acervo', (_, res) => res.redirect('/03-acervo.html'));

app.get('/01-login.html', (_, res) => res.type('html').send(loginPage));
app.get('/login.html', (_, res) => res.type('html').send(loginPage));
app.get('/03-acervo.html', (_, res) => res.type('html').send(acervoPage));

// Qualquer outra página HTML redireciona pra home (evita "Cannot GET")
app.get(/^\/.*\.html$/, (_, res) => res.redirect('/01-login.html'));

// ============ Start ============
initDb()
    .then(() => app.listen(PORTA, '0.0.0.0', () => {
        console.log('✅ Servidor na porta ' + PORTA);
        console.log('🔗 Acesse /01-login.html e /03-acervo.html');
    }))
    .catch(e => console.error('❌ Erro fatal no banco:', e.message));
