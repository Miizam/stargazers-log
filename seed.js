// seed.js — execute UMA VEZ: node seed.js
const pool = require('./db');

// ============================================================
// CATÁLOGO BASE — 160 títulos × 7 edições = 1120 livros
// ============================================================
const catalogo = {
    'Romance': [
        ['Dom Casmurro', 'Machado de Assis'],
        ['Orgulho e Preconceito', 'Jane Austen'],
        ['Anna Karenina', 'Leon Tolstói'],
        ['Iracema', 'José de Alencar'],
        ['Senhora', 'José de Alencar'],
        ['O Guarani', 'José de Alencar'],
        ['A Moreninha', 'Joaquim Manuel de Macedo'],
        ['O Primo Basílio', 'Eça de Queirós'],
    ],
    'Clássico': [
        ['Memórias Póstumas de Brás Cubas', 'Machado de Assis'],
        ['Quincas Borba', 'Machado de Assis'],
        ['O Cortiço', 'Aluísio Azevedo'],
        ['Grande Sertão: Veredas', 'João Guimarães Rosa'],
        ['Vidas Secas', 'Graciliano Ramos'],
        ['Macunaíma', 'Mário de Andrade'],
        ['Dom Quixote', 'Miguel de Cervantes'],
        ['Crime e Castigo', 'Fiódor Dostoiévski'],
    ],
    'Ficção Científica': [
        ['Duna', 'Frank Herbert'],
        ['Fundação', 'Isaac Asimov'],
        ['Eu, Robô', 'Isaac Asimov'],
        ['2001: Uma Odisseia no Espaço', 'Arthur C. Clarke'],
        ['Neuromancer', 'William Gibson'],
        ['Guia do Mochileiro das Galáxias', 'Douglas Adams'],
        ['A Máquina do Tempo', 'H. G. Wells'],
        ['Solaris', 'Stanislaw Lem'],
    ],
    'Fantasia': [
        ['O Hobbit', 'J. R. R. Tolkien'],
        ['O Senhor dos Anéis: A Sociedade do Anel', 'J. R. R. Tolkien'],
        ['O Senhor dos Anéis: As Duas Torres', 'J. R. R. Tolkien'],
        ['O Senhor dos Anéis: O Retorno do Rei', 'J. R. R. Tolkien'],
        ['O Nome do Vento', 'Patrick Rothfuss'],
        ['A Guerra dos Tronos', 'George R. R. Martin'],
        ['Harry Potter e a Pedra Filosofal', 'J. K. Rowling'],
        ['O Silmarillion', 'J. R. R. Tolkien'],
    ],
    'Distopia': [
        ['1984', 'George Orwell'],
        ['A Revolução dos Bichos', 'George Orwell'],
        ['Fahrenheit 451', 'Ray Bradbury'],
        ['Admirável Mundo Novo', 'Aldous Huxley'],
        ['Laranja Mecânica', 'Anthony Burgess'],
        ['O Conto da Aia', 'Margaret Atwood'],
        ['Ensaio sobre a Cegueira', 'José Saramago'],
        ['Jogos Vorazes', 'Suzanne Collins'],
    ],
    'Suspense': [
        ['O Iluminado', 'Stephen King'],
        ['It: A Coisa', 'Stephen King'],
        ['O Silêncio dos Inocentes', 'Thomas Harris'],
        ['O Código Da Vinci', 'Dan Brown'],
        ['Anjos e Demônios', 'Dan Brown'],
        ['Garota Exemplar', 'Gillian Flynn'],
        ['O Nome da Rosa', 'Umberto Eco'],
        ['A Menina que Roubava Livros', 'Markus Zusak'],
    ],
    'Terror': [
        ['Drácula', 'Bram Stoker'],
        ['Frankenstein', 'Mary Shelley'],
        ['O Médico e o Monstro', 'Robert Louis Stevenson'],
        ['O Retrato de Dorian Gray', 'Oscar Wilde'],
        ['Coraline', 'Neil Gaiman'],
        ['O Exorcista', 'William Peter Blatty'],
        ['A Assombração da Casa da Colina', 'Shirley Jackson'],
        ['Cemitério Maldito', 'Stephen King'],
    ],
    'Policial': [
        ['Assassinato no Expresso do Oriente', 'Agatha Christie'],
        ['E Não Sobrou Nenhum', 'Agatha Christie'],
        ['Morte no Nilo', 'Agatha Christie'],
        ['O Cão dos Baskervilles', 'Arthur Conan Doyle'],
        ['Um Estudo em Vermelho', 'Arthur Conan Doyle'],
        ['O Falcão Maltês', 'Dashiell Hammett'],
        ['O Longo Adeus', 'Raymond Chandler'],
        ['O Nome da Rosa', 'Umberto Eco'],
    ],
    'Drama': [
        ['A Culpa é das Estrelas', 'John Green'],
        ['O Menino do Pijama Listrado', 'John Boyne'],
        ['O Caçador de Pipas', 'Khaled Hosseini'],
        ['A Cidade do Sol', 'Khaled Hosseini'],
        ['A Menina que Roubava Livros', 'Markus Zusak'],
        ['O Diário de Anne Frank', 'Anne Frank'],
        ['O Sol é Para Todos', 'Harper Lee'],
        ['Ratos e Homens', 'John Steinbeck'],
    ],
    'Infantojuvenil': [
        ['O Pequeno Príncipe', 'Antoine de Saint-Exupéry'],
        ['Alice no País das Maravilhas', 'Lewis Carroll'],
        ['Alice Através do Espelho', 'Lewis Carroll'],
        ['Peter Pan', 'J. M. Barrie'],
        ['Pinóquio', 'Carlo Collodi'],
        ['Reinações de Narizinho', 'Monteiro Lobato'],
        ['O Sítio do Picapau Amarelo', 'Monteiro Lobato'],
        ['Matilda', 'Roald Dahl'],
    ],
    'Poesia': [
        ['Mensagem', 'Fernando Pessoa'],
        ['Os Lusíadas', 'Luís de Camões'],
        ['Libertinagem', 'Manuel Bandeira'],
        ['Alguma Poesia', 'Carlos Drummond de Andrade'],
        ['A Rosa do Povo', 'Carlos Drummond de Andrade'],
        ['O Guardador de Rebanhos', 'Alberto Caeiro'],
        ['Toda Poesia', 'Paulo Leminski'],
        ['Antologia Poética', 'Vinicius de Moraes'],
    ],
    'Filosofia': [
        ['A República', 'Platão'],
        ['Ética a Nicômaco', 'Aristóteles'],
        ['Meditações', 'Marco Aurélio'],
        ['O Príncipe', 'Nicolau Maquiavel'],
        ['Discurso do Método', 'René Descartes'],
        ['Crítica da Razão Pura', 'Immanuel Kant'],
        ['Assim Falou Zaratustra', 'Friedrich Nietzsche'],
        ['O Mundo como Vontade e Representação', 'Arthur Schopenhauer'],
    ],
    'História': [
        ['Sapiens: Uma Breve História da Humanidade', 'Yuval Noah Harari'],
        ['Homo Deus', 'Yuval Noah Harari'],
        ['21 Lições para o Século 21', 'Yuval Noah Harari'],
        ['Casa-Grande e Senzala', 'Gilberto Freyre'],
        ['Raízes do Brasil', 'Sérgio Buarque de Holanda'],
        ['A Formação das Almas', 'José Murilo de Carvalho'],
        ['Os Donos do Poder', 'Raymundo Faoro'],
        ['Formação do Brasil Contemporâneo', 'Caio Prado Júnior'],
    ],
    'Biografia': [
        ['Steve Jobs', 'Walter Isaacson'],
        ['Elon Musk', 'Walter Isaacson'],
        ['Diário de Anne Frank', 'Anne Frank'],
        ['Longa Caminhada até a Liberdade', 'Nelson Mandela'],
        ['Minha História', 'Michelle Obama'],
        ['Becoming', 'Michelle Obama'],
        ['Leonardo da Vinci', 'Walter Isaacson'],
        ['Einstein: Sua Vida, Seu Universo', 'Walter Isaacson'],
    ],
    'Autoajuda': [
        ['O Poder do Hábito', 'Charles Duhigg'],
        ['Mindset: A Nova Psicologia do Sucesso', 'Carol Dweck'],
        ['Como Fazer Amigos e Influenciar Pessoas', 'Dale Carnegie'],
        ['Os 7 Hábitos das Pessoas Altamente Eficazes', 'Stephen Covey'],
        ['A Arte da Imperfeição', 'Brené Brown'],
        ['Hábitos Atômicos', 'James Clear'],
        ['Essencialismo', 'Greg McKeown'],
        ['A Coragem de Ser Imperfeito', 'Brené Brown'],
    ],
    'Informática': [
        ['Código Limpo', 'Robert C. Martin'],
        ['O Programador Pragmático', 'Andrew Hunt'],
        ['Refatoração', 'Martin Fowler'],
        ['Padrões de Projeto', 'Erich Gamma'],
        ['Introdução a Algoritmos', 'Thomas H. Cormen'],
        ['Use a Cabeça: Java', 'Bert Bates'],
        ['Use a Cabeça: Python', 'Paul Barry'],
        ['Python para Análise de Dados', 'Wes McKinney'],
    ],
    'Matemática': [
        ['Cálculo Volume 1', 'James Stewart'],
        ['Cálculo Volume 2', 'James Stewart'],
        ['Álgebra Linear', 'Howard Anton'],
        ['Geometria Analítica', 'Alfredo Steinbruch'],
        ['Introdução à Estatística', 'Mario Triola'],
        ['Matemática Discreta e Suas Aplicações', 'Kenneth Rosen'],
        ['Cálculo Numérico', 'Márcia Ruggiero'],
        ['Equações Diferenciais', 'Dennis Zill'],
    ],
    'Física': [
        ['Física I: Mecânica', 'Hugh D. Young'],
        ['Física II: Termodinâmica e Ondas', 'Hugh D. Young'],
        ['Física III: Eletromagnetismo', 'Hugh D. Young'],
        ['Física IV: Óptica e Física Moderna', 'Hugh D. Young'],
        ['Fundamentos de Física Volume 1', 'David Halliday'],
        ['Fundamentos de Física Volume 2', 'David Halliday'],
        ['Fundamentos de Física Volume 3', 'David Halliday'],
        ['O Universo numa Casca de Noz', 'Stephen Hawking'],
    ],
    'Medicina': [
        ['Harrison Medicina Interna', 'Joseph Loscalzo'],
        ['Netter Atlas de Anatomia Humana', 'Frank H. Netter'],
        ['Robbins Patologia Básica', 'Vinay Kumar'],
        ['Tratado de Clínica Médica', 'Antonio Carlos Lopes'],
        ['Semiologia Médica', 'Celmo Celeno Porto'],
        ['Guyton & Hall Fisiologia', 'John E. Hall'],
        ['Farmacologia Básica e Clínica', 'Bertram Katzung'],
        ['Cecil Medicina Interna', 'Lee Goldman'],
    ],
    'Direito': [
        ['Curso de Direito Constitucional', 'Marcelo Novelino'],
        ['Instituições de Direito Civil', 'Caio Mário da Silva Pereira'],
        ['Curso de Direito Penal', 'Rogério Greco'],
        ['Manual de Direito Administrativo', 'José dos Santos Carvalho Filho'],
        ['Curso de Direito Tributário', 'Eduardo Sabbag'],
        ['Curso de Direito Civil', 'Flávio Tartuce'],
        ['Direito Constitucional Esquematizado', 'Pedro Lenza'],
        ['Vade Mecum Saraiva', 'Saraiva Jur'],
    ],
    'Administração': [
        ['Administração: Teoria e Prática', 'Idalberto Chiavenato'],
        ['Introdução à Teoria Geral da Administração', 'Idalberto Chiavenato'],
        ['Gestão de Pessoas', 'Idalberto Chiavenato'],
        ['Comportamento Organizacional', 'Stephen Robbins'],
        ['Estratégia Competitiva', 'Michael Porter'],
        ['Administração de Marketing', 'Philip Kotler'],
        ['O Capital', 'Karl Marx'],
        ['A Riqueza das Nações', 'Adam Smith'],
    ]
};

// Configurações por categoria
const config = {
    'Romance':           { editoras: ['Companhia das Letras','Rocco','Record','Martin Claret'], paginas: 320, sinopse: 'Uma história de amor intensa que atravessa gerações.' },
    'Clássico':          { editoras: ['Companhia das Letras','Penguin','Martin Claret','L&PM'], paginas: 420, sinopse: 'Uma obra-prima da literatura universal.' },
    'Ficção Científica': { editoras: ['Aleph','Intrínseca','Editora do Brasil'], paginas: 380, sinopse: 'Uma viagem ao futuro da humanidade e da tecnologia.' },
    'Fantasia':          { editoras: ['HarperCollins','Arqueiro','Suma'], paginas: 520, sinopse: 'Um mundo mágico cheio de aventuras épicas.' },
    'Distopia':          { editoras: ['Companhia das Letras','Globo','Intrínseca'], paginas: 340, sinopse: 'Uma sociedade que parece perfeita — mas não é.' },
    'Suspense':          { editoras: ['Record','Rocco','Intrínseca','Suma'], paginas: 400, sinopse: 'Um mistério que você não vai conseguir largar.' },
    'Terror':            { editoras: ['Darkside','Suma','Rocco'], paginas: 360, sinopse: 'Uma história de arrepiar do começo ao fim.' },
    'Policial':          { editoras: ['Nova Fronteira','L&PM','Record'], paginas: 320, sinopse: 'Um crime, um detetive e muitas pistas falsas.' },
    'Drama':             { editoras: ['Intrínseca','Rocco','Companhia das Letras'], paginas: 340, sinopse: 'Uma história emocionante sobre a vida real.' },
    'Infantojuvenil':    { editoras: ['Ática','Moderna','Companhia das Letrinhas'], paginas: 180, sinopse: 'Uma aventura encantadora para todas as idades.' },
    'Poesia':            { editoras: ['Companhia das Letras','Record','L&PM'], paginas: 160, sinopse: 'Versos que tocam a alma e ficam na memória.' },
    'Filosofia':         { editoras: ['Companhia das Letras','Martins Fontes','Vozes'], paginas: 400, sinopse: 'Uma reflexão profunda sobre a existência.' },
    'História':          { editoras: ['Companhia das Letras','Record','Contexto'], paginas: 480, sinopse: 'Uma viagem pelo tempo e pelos grandes acontecimentos.' },
    'Biografia':         { editoras: ['Intrínseca','Companhia das Letras','Objetiva'], paginas: 450, sinopse: 'A vida de alguém que mudou o mundo.' },
    'Autoajuda':         { editoras: ['Sextante','Objetiva','Alta Books'], paginas: 280, sinopse: 'Uma leitura que transforma a forma como você pensa.' },
    'Informática':       { editoras: ['Alta Books','Novatec','Casa do Código'], paginas: 500, sinopse: 'Um guia essencial para desenvolvedores e profissionais de TI.' },
    'Matemática':        { editoras: ['Cengage','Pearson','Blucher'], paginas: 620, sinopse: 'Um clássico que todo estudante de exatas precisa ter.' },
    'Física':            { editoras: ['Cengage','Pearson','Bookman'], paginas: 680, sinopse: 'Domine os princípios fundamentais da natureza.' },
    'Medicina':          { editoras: ['Elsevier','Artmed','Guanabara Koogan'], paginas: 900, sinopse: 'A referência definitiva para estudantes e profissionais.' },
    'Direito':           { editoras: ['Saraiva Jur','Juspodivm','RT'], paginas: 720, sinopse: 'Um estudo completo da ciência jurídica.' },
    'Administração':     { editoras: ['Atlas','Elsevier','Manole'], paginas: 560, sinopse: 'Um guia completo para gestores e empreendedores.' }
};

const EDICOES_POR_LIVRO = 7;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];

async function main() {
    console.log('🌱 Populando banco...\n');

    // Garante cadastrousuario
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cadastrousuario (
            id INT AUTO_INCREMENT PRIMARY KEY,
            login VARCHAR(120) NOT NULL UNIQUE,
            senha VARCHAR(255) NOT NULL
        )
    `);

    // Recria titulos
    await pool.query('DROP TABLE IF EXISTS titulos');
    await pool.query(`
        CREATE TABLE titulos (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const sql = `
        INSERT INTO titulos
        (isbn, titulo, autor, categoria, numero_de_edicao, copyright, editora, paginas, sinopse, disponivel, destaque)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let total = 0;
    let isbnCounter = 1000000000;
    const inserts = [];

    for (const [categoria, livros] of Object.entries(catalogo)) {
        const cfg = config[categoria];

        for (const [titulo, autor] of livros) {
            for (let ed = 1; ed <= EDICOES_POR_LIVRO; ed++) {
                const isbn = '978-' + (++isbnCounter);
                const editora = pick(cfg.editoras);
                const paginas = cfg.paginas + rand(-80, 250);
                const ano = rand(1850, 2024);
                const disponivel = Math.random() < 0.7 ? 1 : 0;
                const destaque = (ed === 1 && Math.random() < 0.25) ? 1 : 0;
                const tituloFinal = ed > 1 ? `${titulo} (${ed}ª Edição)` : titulo;

                inserts.push([isbn, tituloFinal, autor, categoria, `${ed}ª`, String(ano), editora, paginas, cfg.sinopse, disponivel, destaque]);
                total++;
            }
        }
    }

    // Insere em lotes de 200 (mais rápido)
    const BATCH = 200;
    for (let i = 0; i < inserts.length; i += BATCH) {
        const batch = inserts.slice(i, i + BATCH);
        await pool.query(
            `INSERT INTO titulos (isbn, titulo, autor, categoria, numero_de_edicao, copyright, editora, paginas, sinopse, disponivel, destaque) VALUES ` +
            batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(','),
            batch.flat()
        );
        process.stdout.write(`\r📚 ${Math.min(i + BATCH, inserts.length)}/${inserts.length}`);
    }

    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM titulos');
    console.log(`\n\n✅ SUCESSO!`);
    console.log(`📚 Livros inseridos: ${rows[0].n}`);
    console.log(`🗂️  Categorias: ${Object.keys(catalogo).length}`);
    console.log('\n👉 Rode "npm start" para iniciar o servidor.');
    process.exit(0);
}

main().catch(e => { console.error('❌ Erro:', e); process.exit(1); });