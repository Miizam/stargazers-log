require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const { promisify } = require('util');
const pool = require('./db');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;
const scrypt = promisify(crypto.scrypt);

// ---------- Hash de senha ----------
async function hashSenha(senha) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(senha, salt, 64);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}
async function verificarSenha(senha, senhaArmazenada) {
    if (!senhaArmazenada.startsWith('scrypt$')) return senha === senhaArmazenada;
    const partes = senhaArmazenada.split('$');
    if (partes.length !== 3) return false;
    const hash = await scrypt(senha, partes[1], 64);
    return crypto.timingSafeEqual(hash, Buffer.from(partes[2], 'hex'));
}

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer().any());
app.use(session({
    secret: process.env.SESSION_SECRET || 'librarvore-segredo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ---------- Redirects amigáveis ----------
const redirects = {
    '/':                 '/01-login.html',
    '/index':            '/01-login.html',
    '/index.html':       '/01-login.html',
    '/login':            '/01-login.html',
    '/login.html':       '/01-login.html',
    '/inicio':           '/02-inicio.html',
    '/acervo':           '/03-acervo.html',
    '/minha-lista':      '/04-minha-lista.html',
    '/04-minhalista':    '/04-minha-lista.html',
    '/04-minhalista.html':'/04-minha-lista.html',
    '/continuar-lendo':  '/05-continuar-lendo.html',
    '/detalhes-livro':   '/06-detalhes-livro.html',
    '/meu-perfil':       '/07-meu-perfil.html',
    '/configuracoes':    '/08-configuracoes.html',
    '/leitor':           '/09-leitor.html'
};
for (const [from, to] of Object.entries(redirects)) app.get(from, (_, res) => res.redirect(to));

// ---------- Init do banco (inline) ----------
async function inicializarTabelas() {
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
        titulo VARCHAR(255) DEFAULT NULL,
        autor VARCHAR(255) DEFAULT NULL,
        progresso INT DEFAULT 0,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, isbn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS preferencias_usuario (
        usuario VARCHAR(120) NOT NULL PRIMARY KEY,
        nome VARCHAR(120) DEFAULT NULL,
        tamanho_texto ENUM('pequeno','medio','grande') NOT NULL DEFAULT 'medio',
        tema ENUM('claro','escuro') NOT NULL DEFAULT 'claro',
        notif_prazo TINYINT(1) NOT NULL DEFAULT 1,
        notif_novidades TINYINT(1) NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await pool.query(`CREATE TABLE IF NOT EXISTS senha_recuperacao (
        usuario VARCHAR(120) NOT NULL PRIMARY KEY,
        token_hash CHAR(64) NOT NULL,
        expira_em DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// ---------- Middleware de autenticação ----------
function requireLogin(req, res, next) {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    next();
}

// ---------- Autenticação ----------
app.post('/api/login', async (req, res) => {
    const login = String(req.body?.login || '').trim();
    const senha = String(req.body?.senha || '');
    if (!login || !senha) return res.status(400).json({ erro: 'Preencha email e senha!' });
    try {
        const [linhas] = await pool.query('SELECT id, login, senha FROM cadastrousuario WHERE login = ?', [login]);
        if (!linhas.length || !(await verificarSenha(senha, linhas[0].senha)))
            return res.status(401).json({ erro: 'Login ou senha inválidos!' });
        if (!linhas[0].senha.startsWith('scrypt$'))
            await pool.query('UPDATE cadastrousuario SET senha = ? WHERE id = ?', [await hashSenha(senha), linhas[0].id]);
        req.session.usuario = linhas[0].login;
        req.session.usuarioId = linhas[0].id;
        res.json({ ok: true, usuario: linhas[0].login });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/cadastro', async (req, res) => {
    const login = String(req.body?.login || '').trim();
    const senha = String(req.body?.senha || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login) || senha.length < 8 || senha.length > 128)
        return res.status(400).json({ erro: 'Informe um e-mail válido e uma senha de 8 a 128 caracteres.' });
    try {
        const [r] = await pool.query('INSERT INTO cadastrousuario (login, senha) VALUES (?, ?)',
            [login, await hashSenha(senha)]);
        req.session.usuario = login;
        req.session.usuarioId = r.insertId;
        res.status(201).json({ ok: true, usuario: login });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') res.status(409).json({ erro: 'Este email já está cadastrado!' });
        else res.status(500).json({ erro: e.message });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ erro: 'Não foi possível encerrar a sessão.' });
        res.clearCookie('connect.sid');
        res.json({ ok: true });
    });
});

// ---------- Livros ----------
const categoriaAlias = {
    direito: 'Direito', educacao: 'Educação', 'educação': 'Educação',
    saude: 'Medicina', 'saúde': 'Medicina',
    administracao: 'Administração', 'administração': 'Administração',
    tecnologia: 'Informática', literatura: 'Romance',
    ciencias: 'Física', 'ciências': 'Física',
    historia: 'História', 'história': 'História',
    romance: 'Romance', drama: 'Drama', fantasia: 'Fantasia',
    distopia: 'Distopia', suspense: 'Suspense', terror: 'Terror',
    policial: 'Policial', biografia: 'Biografia', filosofia: 'Filosofia',
    matematica: 'Matemática', fisica: 'Física', medicina: 'Medicina',
    informatica: 'Informática'
};

app.get('/api/livros', requireLogin, async (req, res) => {
    try {
        const categoria = req.query.categoria;
        const busca = (req.query.q || '').trim();
        const filtros = [], params = [];
        if (categoria) {
            const cat = categoriaAlias[String(categoria).toLowerCase()] || categoria;
            filtros.push('LOWER(categoria) = LOWER(?)');
            params.push(cat);
        }
        if (busca) {
            const termo = `%${busca}%`;
            filtros.push('(LOWER(titulo) LIKE LOWER(?) OR LOWER(autor) LIKE LOWER(?))');
            params.push(termo, termo);
        }
        let sql = 'SELECT * FROM titulos';
        if (filtros.length) sql += ' WHERE ' + filtros.join(' AND ');
        const [livros] = await pool.query(sql, params);
        res.json({ usuario: req.session.usuario, livros });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/livros/:isbn', requireLogin, async (req, res) => {
    try {
        const [l] = await pool.query('SELECT * FROM titulos WHERE isbn = ?', [req.params.isbn]);
        if (!l.length) return res.status(404).json({ erro: 'Livro não encontrado' });
        res.json(l[0]);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/estatisticas', async (_, res) => {
    try {
        const [total] = await pool.query('SELECT COUNT(*) AS t FROM titulos');
        const [disp]  = await pool.query('SELECT COUNT(*) AS d FROM titulos WHERE disponivel = 1');
        const [cats]  = await pool.query('SELECT COUNT(DISTINCT categoria) AS c FROM titulos');
        res.json({ total: total[0].t, disponiveis: disp[0].d, categorias: cats[0].c });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/categorias', async (_, res) => {
    try {
        const [rows] = await pool.query('SELECT categoria, COUNT(*) AS total FROM titulos GROUP BY categoria ORDER BY categoria');
        res.json({ categorias: rows });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ---------- Favoritos ----------
app.get('/api/favoritos', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT t.* FROM titulos t JOIN favoritos f ON t.isbn = f.isbn WHERE f.usuario_id = ?',
            [req.session.usuarioId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/favoritos', requireLogin, async (req, res) => {
    if (!req.body?.isbn) return res.status(400).json({ erro: 'ISBN obrigatório.' });
    try {
        await pool.query('INSERT IGNORE INTO favoritos (usuario_id, isbn) VALUES (?, ?)',
            [req.session.usuarioId, req.body.isbn]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.delete('/api/favoritos/:isbn', requireLogin, async (req, res) => {
    try {
        await pool.query('DELETE FROM favoritos WHERE usuario_id = ? AND isbn = ?',
            [req.session.usuarioId, req.params.isbn]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ---------- Progresso ----------
app.get('/api/progresso', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM progresso_leitura WHERE usuario_id = ? ORDER BY atualizado_em DESC',
            [req.session.usuarioId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/progresso', requireLogin, async (req, res) => {
    const { isbn, titulo, autor, progresso } = req.body || {};
    if (!isbn) return res.status(400).json({ erro: 'ISBN obrigatório.' });
    const p = Math.max(0, Math.min(100, Number(progresso) || 0));
    try {
        await pool.query(`INSERT INTO progresso_leitura (usuario_id, isbn, titulo, autor, progresso, atualizado_em)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE titulo=VALUES(titulo), autor=VALUES(autor),
                progresso=VALUES(progresso), atualizado_em=CURRENT_TIMESTAMP`,
            [req.session.usuarioId, isbn, titulo || null, autor || null, p]);
        res.json({ ok: true, isbn, progresso: p });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ---------- Perfil / Preferências ----------
app.get('/api/perfil', requireLogin, async (req, res) => {
    try {
        const [u] = await pool.query(`SELECT u.id, u.login, COALESCE(p.nome,'') AS nome
            FROM cadastrousuario u LEFT JOIN preferencias_usuario p ON p.usuario = u.login
            WHERE u.login = ?`, [req.session.usuario]);
        if (!u.length) return res.status(401).json({ erro: 'Sessão inválida.' });
        res.json(u[0]);
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/perfil', requireLogin, async (req, res) => {
    const nome = String(req.body?.nome || '').trim();
    if (!nome || nome.length > 120) return res.status(400).json({ erro: 'Nome inválido.' });
    try {
        await pool.query(`INSERT INTO preferencias_usuario (usuario, nome) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE nome = VALUES(nome)`, [req.session.usuario, nome]);
        res.json({ ok: true, nome });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/preferencias', requireLogin, async (req, res) => {
    try {
        const [r] = await pool.query(
            'SELECT tamanho_texto AS tamanho, tema, notif_prazo, notif_novidades FROM preferencias_usuario WHERE usuario = ?',
            [req.session.usuario]);
        res.json(r[0] || { tamanho: 'medio', tema: 'claro', notif_prazo: 1, notif_novidades: 0 });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/preferencias', requireLogin, async (req, res) => {
    const { tamanho, tema } = req.body || {};
    if (!['pequeno','medio','grande'].includes(tamanho) || !['claro','escuro'].includes(tema))
        return res.status(400).json({ erro: 'Preferências inválidas.' });
    try {
        const [atual] = await pool.query('SELECT notif_prazo, notif_novidades FROM preferencias_usuario WHERE usuario = ?',
            [req.session.usuario]);
        const np = req.body.notif_prazo ?? atual[0]?.notif_prazo ?? 1;
        const nn = req.body.notif_novidades ?? atual[0]?.notif_novidades ?? 0;
        await pool.query(`INSERT INTO preferencias_usuario (usuario, tamanho_texto, tema, notif_prazo, notif_novidades)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE tamanho_texto=VALUES(tamanho_texto), tema=VALUES(tema),
                notif_prazo=VALUES(notif_prazo), notif_novidades=VALUES(notif_novidades)`,
            [req.session.usuario, tamanho, tema, Number(np), Number(nn)]);
        res.json({ ok: true, tamanho, tema, notif_prazo: Number(np), notif_novidades: Number(nn) });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ---------- Estáticos + catch-all ----------
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/partials', express.static(path.join(__dirname, 'views', 'partials')));

// ---------- Handler de erros ----------
app.use((err, req, res, next) => {
    console.error('[error]', err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ erro: err.message || 'Erro interno.' });
});

// ---------- Start ----------
inicializarTabelas()
    .then(() => app.listen(PORTA, '0.0.0.0', () => console.log(`Servidor na porta ${PORTA}`)))
    .catch((erro) => {
        console.error('Falha ao inicializar banco:', erro.message);
        process.exitCode = 1;
    });
