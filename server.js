require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./db');
const multer = require('multer');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

// ========== MIDDLEWARES ESSENCIAIS ==========
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

app.get('/', (req, res) => {
    res.redirect('/03-acervo.html');
});

app.get('/index', (req, res) => {
    res.redirect('/03-acervo.html');
});

app.get('/index.html', (req, res) => {
    res.redirect('/03-acervo.html');
});

app.get('/login', (req, res) => {
    res.redirect('/01-login.html');
});

app.get('/login.html', (req, res) => {
    res.redirect('/01-login.html');
});

app.get('/inicio', (req, res) => {
    res.redirect('/02-inicio.html');
});

app.get('/acervo', (req, res) => {
    res.redirect('/03-acervo.html');
});

app.get('/minha-lista', (req, res) => {
    res.redirect('/04-minha-lista.html');
});

app.get('/04-minhalista', (req, res) => {
    res.redirect('/04-minha-lista.html');
});

app.get('/04-minhalista.html', (req, res) => {
    res.redirect('/04-minha-lista.html');
});

app.get('/continuar-lendo', (req, res) => {
    res.redirect('/05-continuar-lendo.html');
});

app.get('/detalhes-livro', (req, res) => {
    res.redirect('/06-detalhes-livro.html');
});

app.get('/meu-perfil', (req, res) => {
    res.redirect('/07-meu-perfil.html');
});

app.get('/configuracoes', (req, res) => {
    res.redirect('/08-configuracoes.html');
});

app.get('/leitor', (req, res) => {
    res.redirect('/09-leitor.html');
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/partials', express.static(path.join(__dirname, 'public', 'partials')));

// ========== ROTAS ==========
app.post('/api/login', async (req, res) => {
    console.log("O Node recebeu no login:", req.body);
    const { login, senha } = req.body;
    if (!login || !senha) return res.status(400).json({ erro: 'Preencha email e senha!' });

    try {
        const [linhas] = await pool.query('SELECT id FROM cadastrousuario WHERE login = ? AND senha = ?', [login, senha]);
        if (linhas.length > 0) {
            req.session.usuario = login;
            res.json({ ok: true, usuario: login });
        } else {
            res.status(401).json({ erro: 'Login ou senha inválidos!' });
        }
    } catch (erro) {
        res.status(500).json({ erro: 'Erro no banco: ' + erro.message });
    }
});

app.post('/api/cadastro', async (req, res) => {
    console.log("O Node recebeu no cadastro:", req.body);
    const { login, senha } = req.body;
    if (!login || !senha) return res.status(400).json({ erro: 'Preencha email e senha!' });

    try {
        await pool.query('INSERT INTO cadastrousuario (login, senha) VALUES (?, ?)', [login, senha]);
        req.session.usuario = login;
        res.status(201).json({ ok: true, usuario: login });
    } catch (erro) {
        if (erro.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ erro: 'Este email já está cadastrado!' });
        } else {
            res.status(500).json({ erro: 'Erro: ' + erro.message });
        }
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favoritos (
                usuario VARCHAR(120) NOT NULL,
                isbn VARCHAR(20) NOT NULL,
                PRIMARY KEY (usuario, isbn)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS progresso_leitura (
                usuario VARCHAR(120) NOT NULL,
                isbn VARCHAR(20) NOT NULL,
                titulo VARCHAR(255) DEFAULT NULL,
                autor VARCHAR(255) DEFAULT NULL,
                progresso INT DEFAULT 0,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (usuario, isbn)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    } catch (erro) {
        console.error('Erro ao criar tabelas de favoritos/progresso:', erro.message);
    }
})();

app.get('/api/livros', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Faça login primeiro.' });
    try {
        const categoriaAlias = {
            direito: 'Direito',
            'direito': 'Direito',
            educacao: 'Educação',
            'educação': 'Educação',
            saude: 'Medicina',
            saúde: 'Medicina',
            administracao: 'Administração',
            'administração': 'Administração',
            tecnologia: 'Informática',
            literatura: 'Romance',
            ciencias: 'Física',
            'ciências': 'Física',
            historia: 'História',
            'história': 'História',
            romance: 'Romance',
            drama: 'Drama',
            fantasia: 'Fantasia',
            distopia: 'Distopia',
            suspense: 'Suspense',
            terror: 'Terror',
            policial: 'Policial',
            biografia: 'Biografia',
            filosofia: 'Filosofia',
            matematica: 'Matemática',
            fisica: 'Física',
            medicina: 'Medicina',
            informatica: 'Informática',
            historia: 'História'
        };

        const categoria = req.query.categoria;
        const busca = (req.query.q || '').trim();
        const filtros = [];
        const params = [];

        if (categoria) {
            const categoriaMapeada = categoriaAlias[String(categoria).trim().toLowerCase()] || String(categoria).trim();
            filtros.push('LOWER(categoria) = LOWER(?)');
            params.push(categoriaMapeada);
        }

        if (busca) {
            const termo = `%${busca}%`;
            filtros.push('(LOWER(titulo) LIKE LOWER(?) OR LOWER(autor) LIKE LOWER(?))');
            params.push(termo, termo);
        }

        let sql = 'SELECT * FROM titulos';
        if (filtros.length > 0) {
            sql += ' WHERE ' + filtros.join(' AND ');
        }

        const [livros] = await pool.query(sql, params);
        const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const extrairPartes = (valor) => (normalizar(valor).match(/\d+|[^\d]+/g) || [normalizar(valor)]);

        const compararNaturais = (a, b, termo = '') => {
            const termoNormalizado = normalizar(termo).trim();

            const scoreLivro = (livro) => {
                if (!termoNormalizado) return 99;
                const titulo = normalizar(livro.titulo || '');
                const autor = normalizar(livro.autor || '');

                if (autor.startsWith(termoNormalizado)) return 0;
                if (titulo.startsWith(termoNormalizado)) return 1;
                if (autor.includes(termoNormalizado)) return 2;
                if (titulo.includes(termoNormalizado)) return 3;
                return 4;
            };

            const scoreA = scoreLivro(a);
            const scoreB = scoreLivro(b);

            if (scoreA !== scoreB) return scoreA - scoreB;

            const destaqueA = Number(a.destaque) === 1 ? 1 : 0;
            const destaqueB = Number(b.destaque) === 1 ? 1 : 0;

            if (destaqueA !== destaqueB) {
                return destaqueB - destaqueA;
            }

            const partesA = extrairPartes(a.titulo || '');
            const partesB = extrairPartes(b.titulo || '');
            const limite = Math.max(partesA.length, partesB.length);

            for (let i = 0; i < limite; i++) {
                const parteA = partesA[i] || '';
                const parteB = partesB[i] || '';
                const numeroA = /^\d+$/.test(parteA);
                const numeroB = /^\d+$/.test(parteB);

                if (numeroA && numeroB) {
                    const diferenca = Number(parteA) - Number(parteB);
                    if (diferenca !== 0) return diferenca;
                    continue;
                }

                if (numeroA !== numeroB) {
                    return numeroA ? -1 : 1;
                }

                const resultado = parteA.localeCompare(parteB, 'pt-BR', { sensitivity: 'base' });
                if (resultado !== 0) return resultado;
            }

            return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { sensitivity: 'base' });
        };

        const resultadosOrdenados = [...livros].sort((a, b) => compararNaturais(a, b, busca));
        res.json({ usuario: req.session.usuario, livros: resultadosOrdenados });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// NOVAS ROTAS PARA O CATÁLOGO FUNCIONAR
app.get('/api/estatisticas', async (req, res) => {
    try {
        const [total] = await pool.query('SELECT COUNT(*) as t FROM titulos');
        const [disp] = await pool.query('SELECT COUNT(*) as d FROM titulos WHERE disponivel = 1');
        const [cats] = await pool.query('SELECT COUNT(DISTINCT categoria) as c FROM titulos');
        res.json({ 
            total: total[0].t, 
            disponiveis: disp[0].d, 
            categorias: cats[0].c 
        });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

app.get('/api/categorias', async (req, res) => {
    try {
        const [categorias] = await pool.query('SELECT categoria, COUNT(*) AS total FROM titulos GROUP BY categoria ORDER BY categoria');
        res.json({ categorias });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});
// ==========================================
// ROTAS ADICIONAIS PARA AS PÁGINAS 02 A 08
// ==========================================

// Obter detalhes de um livro específico por ISBN
app.get('/api/livros/:isbn', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    try {
        const [livro] = await pool.query('SELECT * FROM titulos WHERE isbn = ?', [req.params.isbn]);
        if (livro.length === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
        res.json(livro[0]);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// Obter Minha Lista / Favoritos do utilizador
app.get('/api/favoritos', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    try {
        // Certifique-se de que possui uma tabela 'favoritos' no MySQL (usuario, isbn)
        const [favs] = await pool.query(`
            SELECT t.* FROM titulos t 
            JOIN favoritos f ON t.isbn = f.isbn 
            WHERE f.usuario = ?
        `, [req.session.usuario]);
        res.json(favs);
    } catch (erro) {
        res.json([]); // Retorna vazio se a tabela ainda não existir
    }
});

// Adicionar aos Favoritos
app.post('/api/favoritos', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    const { isbn } = req.body;
    if (!isbn) return res.status(400).json({ erro: 'ISBN obrigatório.' });
    try {
        await pool.query('INSERT IGNORE INTO favoritos (usuario, isbn) VALUES (?, ?)', [req.session.usuario, isbn]);
        res.json({ ok: true, mensagem: 'Adicionado à sua lista com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

app.delete('/api/favoritos/:isbn', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    try {
        await pool.query('DELETE FROM favoritos WHERE usuario = ? AND isbn = ?', [req.session.usuario, req.params.isbn]);
        res.json({ ok: true, mensagem: 'Removido da sua lista com sucesso!' });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// Obter progresso de leitura ("Continuar Lendo")
app.get('/api/progresso', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    try {
        const [prog] = await pool.query(`
            SELECT p.*, t.titulo, t.autor, t.categoria FROM progresso_leitura p
            LEFT JOIN titulos t ON p.isbn = t.isbn
            WHERE p.usuario = ?
            ORDER BY p.atualizado_em DESC, p.titulo ASC
        `, [req.session.usuario]);
        res.json(prog);
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

app.post('/api/progresso', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });

    const { isbn, titulo, autor, progresso } = req.body || {};
    if (!isbn) return res.status(400).json({ erro: 'ISBN obrigatório.' });

    const percentual = Math.max(0, Math.min(100, Number(progresso) || 0));

    try {
        await pool.query(`
            INSERT INTO progresso_leitura (usuario, isbn, titulo, autor, progresso, atualizado_em)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                titulo = VALUES(titulo),
                autor = VALUES(autor),
                progresso = VALUES(progresso),
                atualizado_em = CURRENT_TIMESTAMP
        `, [req.session.usuario, isbn, titulo || null, autor || null, percentual]);

        res.json({ ok: true, usuario: req.session.usuario, isbn, progresso: percentual });
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

// Obter dados do Perfil
app.get('/api/perfil', async (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ erro: 'Não autorizado' });
    try {
        const [user] = await pool.query('SELECT id, login FROM cadastrousuario WHERE login = ?', [req.session.usuario]);
        res.json(user[0] || {});
    } catch (erro) {
        res.status(500).json({ erro: erro.message });
    }
});

app.listen(PORTA, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
    console.log(`🌐 Acesso pelo domínio: http://www.librarvore.com.br${PORTA === 80 ? '' : ':' + PORTA}`);
});
