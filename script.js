const API = '/api';

const isLoginPage = document.getElementById('formLogin') !== null;
const isCatalogPage = document.getElementById('tabelaLivros') !== null;

function mostrarErro(msg) {
    const div = document.getElementById('msgLogin');
    if (div) {
        div.textContent = msg;
        div.classList.remove('escondido');
    }
}

async function req(url, opts = {}) {
    const r = await fetch(url, opts);
    return r.json();
}

async function entrar() {
    const login = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();
    
    console.log("Enviando para o servidor:", { login, senha });

    if (!login || !senha) return mostrarErro('Preencha email e senha!');

    const json = await req(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha })
    });

    if (json.erro) return mostrarErro(json.erro);
    window.location.href = '03-acervo.html';
}

async function cadastrar() {
    const login = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value.trim();

    console.log("Enviando cadastro:", { login, senha });

    if (!login || !senha) return mostrarErro('Preencha email e senha!');

    const json = await req(`${API}/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha })
    });

    if (json.erro) return mostrarErro(json.erro);
    window.location.href = '03-acervo.html';
}

async function sair() {
    await req(`${API}/logout`, { method: 'POST' });
    window.location.href = 'login.html';
}

async function carregarCatalogo(usuario) {
    document.getElementById('usuarioInfo').textContent = `👤 ${usuario}`;
    
    // Carrega estatísticas
    const stats = await req(`${API}/estatisticas`);
    if (stats.total) {
        document.getElementById('heroStats').textContent =
            `${stats.total.toLocaleString('pt-BR')} livros em ${stats.categorias} seções — ${stats.disponiveis.toLocaleString('pt-BR')} disponíveis`;
    }

    // Carrega livros
    const json = await req(`${API}/livros`);
    if (json.erro) {
        window.location.href = 'login.html';
        return;
    }

    const tbody = document.getElementById('tabelaLivros');
    tbody.innerHTML = json.livros.map(l => `
        <tr>
            <td style="font-family:monospace;">${l.isbn}</td>
            <td class="titulo-cell">${l.titulo}</td>
            <td class="autor-cell">${l.autor}</td>
            <td>${l.numero_de_edicao}</td>
            <td>${l.copyright}</td>
            <td class="${l.disponivel ? 'sim' : 'nao'}">${l.disponivel ? 'Sim' : 'Não'}</td>
            <td class="acoes-cell">
                <button class="btn-ler" onclick="alert('Lendo: ${l.titulo}')">📖 Ler</button>
            </td>
        </tr>
    `).join('');
}

window.addEventListener('DOMContentLoaded', async () => {
    if (isLoginPage) return;

    if (isCatalogPage) {
        const json = await req(`${API}/livros`);
        if (json.erro) {
            window.location.href = 'login.html';
        } else {
            carregarCatalogo(json.usuario);
        }
    }
});