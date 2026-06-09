import pg from "pg"
import { randomUUID } from "node:crypto"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TARGET_EMAILS = ["wmlwarley@gmail.com", "teste@hotmail.com"]
const EXAM_VERSION = 1
const NIVEIS = ["Fundamental", "Médio", "Pré-vestibular"]

function loadEnv(name) {
  if (process.env[name]) return process.env[name]
  const p = path.resolve(process.cwd(), ".env.development.local")
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith("#")) continue
    const i = s.indexOf("=")
    if (i > 0 && s.slice(0, i).trim() === name)
      return s.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
function shuffle(a) {
  const arr = [...a]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
const sample = (arr, n) => shuffle(arr).slice(0, n)

/** Monta uma questao mcq a partir de uma entrada do banco. */
function mkQuestion(entry, order, points) {
  const options = shuffle([entry.correct, ...sample(entry.distractors, 3)])
  return {
    id: randomUUID(),
    order,
    type: "mcq",
    prompt: entry.prompt,
    options,
    correctIndex: options.indexOf(entry.correct),
    points,
    disciplina: entry.disciplina,
  }
}

// ---------------------------------------------------------------------------
// Banco de questoes
// ---------------------------------------------------------------------------
function genMatematica(count) {
  const ops = [
    () => { const a = rand(6, 12), b = rand(6, 12); return { prompt: `Quanto é ${a} × ${b}?`, val: a * b } },
    () => { const a = rand(20, 90), b = rand(10, 40); return { prompt: `Quanto é ${a} + ${b}?`, val: a + b } },
    () => { const a = rand(50, 99), b = rand(10, 49); return { prompt: `Quanto é ${a} − ${b}?`, val: a - b } },
    () => { const b = rand(3, 12), q = rand(3, 12); return { prompt: `Quanto é ${b * q} ÷ ${b}?`, val: q } },
    () => { const a = rand(2, 12); return { prompt: `Qual é o valor de ${a}²?`, val: a * a } },
    () => { const x = rand(2, 9), b = rand(1, 9); return { prompt: `Se x + ${b} = ${x + b}, qual o valor de x?`, val: x } },
    () => { const p = pick([10, 20, 25, 50]); const base = rand(40, 200); return { prompt: `Quanto é ${p}% de ${base}?`, val: Math.round((base * p) / 100) } },
  ]
  const out = []
  const seen = new Set()
  while (out.length < count) {
    const q = pick(ops)()
    if (seen.has(q.prompt)) continue
    seen.add(q.prompt)
    const distract = new Set()
    while (distract.size < 3) {
      const d = q.val + pick([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10])
      if (d !== q.val && d >= 0) distract.add(d)
    }
    out.push({
      disciplina: "Matemática",
      nivel: pick(NIVEIS),
      prompt: q.prompt,
      correct: String(q.val),
      distractors: [...distract].map(String),
    })
  }
  return out
}

const CAPITAIS = {
  Brasil: "Brasília", Argentina: "Buenos Aires", Chile: "Santiago", Peru: "Lima",
  Colômbia: "Bogotá", Uruguai: "Montevidéu", Paraguai: "Assunção", Bolívia: "Sucre",
  Portugal: "Lisboa", Espanha: "Madri", França: "Paris", Itália: "Roma",
  Alemanha: "Berlim", "Reino Unido": "Londres", Japão: "Tóquio", China: "Pequim",
  Canadá: "Ottawa", "Estados Unidos": "Washington", México: "Cidade do México", Egito: "Cairo",
}
function genGeografia() {
  const caps = Object.values(CAPITAIS)
  return Object.entries(CAPITAIS).map(([pais, cap]) => ({
    disciplina: "Geografia",
    nivel: pick(NIVEIS),
    prompt: `Qual é a capital do(a) ${pais}?`,
    correct: cap,
    distractors: sample(caps.filter((c) => c !== cap), 5),
  }))
}

const FISICA = [
  { prompt: "Qual é a unidade de força no Sistema Internacional?", correct: "Newton", distractors: ["Joule", "Watt", "Pascal", "Ampère"] },
  { prompt: "A velocidade da luz no vácuo é de aproximadamente:", correct: "300.000 km/s", distractors: ["150.000 km/s", "30.000 km/s", "3.000 km/s", "1.080.000 km/s"] },
  { prompt: "Qual a unidade de potência no SI?", correct: "Watt", distractors: ["Newton", "Joule", "Volt", "Pascal"] },
  { prompt: "A aceleração da gravidade na superfície da Terra vale aproximadamente:", correct: "9,8 m/s²", distractors: ["5,0 m/s²", "12,0 m/s²", "1,6 m/s²", "20,0 m/s²"] },
  { prompt: "Energia associada ao movimento de um corpo é chamada de energia:", correct: "Cinética", distractors: ["Potencial", "Térmica", "Nuclear", "Química"] },
  { prompt: "Qual grandeza é medida em ampère?", correct: "Corrente elétrica", distractors: ["Tensão", "Resistência", "Potência", "Carga"] },
  { prompt: "Segundo a 1ª Lei de Newton, um corpo em repouso tende a:", correct: "Permanecer em repouso", distractors: ["Acelerar sozinho", "Cair", "Girar", "Aumentar de massa"] },
  { prompt: "A unidade de temperatura no SI é:", correct: "Kelvin", distractors: ["Celsius", "Fahrenheit", "Joule", "Caloria"] },
  { prompt: "O fenômeno de mudança do estado líquido para gasoso chama-se:", correct: "Vaporização", distractors: ["Fusão", "Solidificação", "Condensação", "Sublimação"] },
  { prompt: "Qual instrumento mede a pressão atmosférica?", correct: "Barômetro", distractors: ["Termômetro", "Amperímetro", "Voltímetro", "Higrômetro"] },
  { prompt: "A força peso de um corpo depende de sua massa e da:", correct: "Gravidade", distractors: ["Temperatura", "Velocidade", "Cor", "Densidade do ar"] },
  { prompt: "Em um circuito, a resistência elétrica é medida em:", correct: "Ohm", distractors: ["Watt", "Volt", "Ampère", "Joule"] },
].map((e) => ({ ...e, disciplina: "Física", nivel: pick(NIVEIS) }))

const PORTUGUES = [
  { prompt: "Qual classe de palavra indica ação?", correct: "Verbo", distractors: ["Substantivo", "Adjetivo", "Advérbio", "Pronome"] },
  { prompt: "Em 'O livro azul é meu', a palavra 'azul' é um:", correct: "Adjetivo", distractors: ["Substantivo", "Verbo", "Artigo", "Numeral"] },
  { prompt: "Qual é o plural de 'cidadão'?", correct: "Cidadãos", distractors: ["Cidadães", "Cidadões", "Cidadans", "Cidadões"] },
  { prompt: "A figura de linguagem em 'chorar rios de lágrimas' é:", correct: "Hipérbole", distractors: ["Metáfora", "Eufemismo", "Ironia", "Antítese"] },
  { prompt: "Qual palavra está acentuada corretamente?", correct: "Você", distractors: ["Voce", "Vôce", "Vocé", "Você​s"] },
  { prompt: "O sujeito da frase 'Choveu muito ontem' é:", correct: "Inexistente (oração sem sujeito)", distractors: ["Oculto", "Simples", "Composto", "Indeterminado"] },
  { prompt: "Qual é um sinônimo de 'belo'?", correct: "Formoso", distractors: ["Feio", "Triste", "Rápido", "Escuro"] },
  { prompt: "A palavra 'rapidamente' é um:", correct: "Advérbio", distractors: ["Adjetivo", "Substantivo", "Verbo", "Pronome"] },
  { prompt: "Em 'Maria comprou pão', o objeto direto é:", correct: "pão", distractors: ["Maria", "comprou", "o", "nenhum"] },
  { prompt: "Qual é o antônimo de 'alegre'?", correct: "Triste", distractors: ["Feliz", "Contente", "Animado", "Sorridente"] },
  { prompt: "A oração 'Estudo para passar' expressa ideia de:", correct: "Finalidade", distractors: ["Causa", "Tempo", "Condição", "Concessão"] },
  { prompt: "Qual é a forma correta?", correct: "Houve muitos alunos", distractors: ["Houveram muitos alunos", "Houvero muitos alunos", "Houveu muitos alunos", "Houvera muitos alunos"] },
].map((e) => ({ ...e, disciplina: "Português", nivel: pick(NIVEIS) }))

const HISTORIA = [
  { prompt: "Em que ano o Brasil proclamou sua independência?", correct: "1822", distractors: ["1500", "1889", "1808", "1922"] },
  { prompt: "Quem 'descobriu' o Brasil em 1500?", correct: "Pedro Álvares Cabral", distractors: ["Cristóvão Colombo", "Vasco da Gama", "Américo Vespúcio", "Fernão de Magalhães"] },
  { prompt: "A Proclamação da República no Brasil ocorreu em:", correct: "1889", distractors: ["1822", "1888", "1500", "1930"] },
  { prompt: "A Lei Áurea, que aboliu a escravidão, foi assinada em:", correct: "1888", distractors: ["1822", "1889", "1850", "1871"] },
  { prompt: "A Revolução Francesa começou no ano de:", correct: "1789", distractors: ["1822", "1500", "1914", "1648"] },
  { prompt: "Qual civilização construiu as pirâmides de Gizé?", correct: "Egípcios", distractors: ["Romanos", "Gregos", "Maias", "Astecas"] },
  { prompt: "A Segunda Guerra Mundial terminou em:", correct: "1945", distractors: ["1918", "1939", "1950", "1929"] },
  { prompt: "O período em que o Brasil foi governado por imperadores chama-se:", correct: "Império", distractors: ["República Velha", "Colônia", "Regência permanente", "Ditadura"] },
  { prompt: "Quem foi o primeiro imperador do Brasil?", correct: "Dom Pedro I", distractors: ["Dom Pedro II", "Dom João VI", "Getúlio Vargas", "Deodoro da Fonseca"] },
  { prompt: "A Guerra Fria opôs principalmente os EUA e:", correct: "União Soviética", distractors: ["Alemanha", "China", "Japão", "França"] },
  { prompt: "O Renascimento teve início na:", correct: "Itália", distractors: ["França", "Inglaterra", "Alemanha", "Espanha"] },
  { prompt: "A Independência dos Estados Unidos foi declarada em:", correct: "1776", distractors: ["1789", "1822", "1492", "1700"] },
].map((e) => ({ ...e, disciplina: "História", nivel: pick(NIVEIS) }))

const BIOLOGIA = [
  { prompt: "Qual organela é responsável pela respiração celular?", correct: "Mitocôndria", distractors: ["Ribossomo", "Núcleo", "Lisossomo", "Complexo de Golgi"] },
  { prompt: "O processo pelo qual as plantas produzem seu alimento chama-se:", correct: "Fotossíntese", distractors: ["Respiração", "Digestão", "Fermentação", "Transpiração"] },
  { prompt: "Qual é a unidade básica da vida?", correct: "Célula", distractors: ["Átomo", "Tecido", "Órgão", "Molécula"] },
  { prompt: "O DNA está localizado principalmente no:", correct: "Núcleo", distractors: ["Citoplasma", "Membrana", "Ribossomo", "Vacúolo"] },
  { prompt: "Os seres que produzem o próprio alimento são chamados de:", correct: "Autótrofos", distractors: ["Heterótrofos", "Decompositores", "Parasitas", "Carnívoros"] },
  { prompt: "Qual gás é liberado pelas plantas na fotossíntese?", correct: "Oxigênio", distractors: ["Gás carbônico", "Nitrogênio", "Hidrogênio", "Metano"] },
  { prompt: "O sangue é bombeado pelo:", correct: "Coração", distractors: ["Pulmão", "Fígado", "Rim", "Estômago"] },
  { prompt: "Os anfíbios, como o sapo, têm a pele:", correct: "Úmida e permeável", distractors: ["Seca e com escamas", "Coberta de pelos", "Coberta de penas", "Impermeável"] },
  { prompt: "A teoria da evolução por seleção natural foi proposta por:", correct: "Charles Darwin", distractors: ["Gregor Mendel", "Louis Pasteur", "Isaac Newton", "Aristóteles"] },
  { prompt: "Qual estrutura controla a entrada e saída de substâncias na célula?", correct: "Membrana plasmática", distractors: ["Parede celular", "Núcleo", "Citoplasma", "Mitocôndria"] },
  { prompt: "Os fungos pertencem ao reino:", correct: "Fungi", distractors: ["Plantae", "Animalia", "Protista", "Monera"] },
  { prompt: "A reprodução em que há união de gametas é chamada de:", correct: "Sexuada", distractors: ["Assexuada", "Por brotamento", "Por divisão", "Por esporos"] },
].map((e) => ({ ...e, disciplina: "Biologia", nivel: pick(NIVEIS) }))

const BANCOS = {
  "Matemática": genMatematica(25),
  "Geografia": genGeografia(),
  "Física": FISICA,
  "Português": PORTUGUES,
  "História": HISTORIA,
  "Biologia": BIOLOGIA,
}

// ---------------------------------------------------------------------------
// Dicas rapidas (40 distintas, distribuidas entre os 2 professores)
// ---------------------------------------------------------------------------
const DICAS = [
  ["Matemática", "Regra de três simples", "Para resolver uma regra de três, monte a proporção e multiplique em cruz. Sempre verifique se as grandezas são diretamente ou inversamente proporcionais."],
  ["Matemática", "Decorar a tabuada", "Pratique a tabuada do 9 com os dedos: abaixe o dedo correspondente ao número multiplicado e leia dezenas e unidades."],
  ["Matemática", "Porcentagem rápida", "10% de qualquer número é só mover a vírgula uma casa para a esquerda. A partir disso, calcule 5%, 20% e 30% rapidamente."],
  ["Matemática", "Frações", "Para somar frações com denominadores diferentes, encontre o MMC dos denominadores antes de somar os numeradores."],
  ["Matemática", "Equação do 1º grau", "Isolar a incógnita é a chave: o que está somando passa subtraindo, o que está multiplicando passa dividindo."],
  ["Matemática", "Área x perímetro", "Não confunda: perímetro é a soma dos lados (contorno) e área é o espaço interno da figura."],
  ["Física", "Unidades sempre!", "Antes de aplicar fórmulas, converta tudo para o SI: metros, quilogramas e segundos. Erros de unidade são os mais comuns."],
  ["Física", "Diagrama de forças", "Em problemas de dinâmica, sempre desenhe o diagrama de corpo livre antes de aplicar a 2ª Lei de Newton."],
  ["Física", "MRU x MRUV", "No MRU a velocidade é constante; no MRUV há aceleração constante. Identifique isso antes de escolher a fórmula."],
  ["Física", "Energia se conserva", "Em sistemas sem atrito, a energia mecânica total (cinética + potencial) permanece constante."],
  ["Geografia", "Leitura de mapas", "Sempre observe a legenda e a escala antes de interpretar um mapa. Eles dizem o que cada símbolo e distância representam."],
  ["Geografia", "Fusos horários", "Cada 15° de longitude equivale a 1 hora de diferença. A leste o horário está adiantado; a oeste, atrasado."],
  ["Geografia", "Clima x tempo", "Tempo é a condição da atmosfera no momento; clima é o padrão médio ao longo de muitos anos."],
  ["Geografia", "Coordenadas", "Latitude mede a distância em relação à Linha do Equador; longitude, em relação ao Meridiano de Greenwich."],
  ["Português", "Crase descomplicada", "Use crase quando houver a junção da preposição 'a' com o artigo 'a'. Antes de palavra masculina, geralmente não há crase."],
  ["Português", "Mas x mais", "'Mas' indica oposição (= porém); 'mais' indica quantidade. Troque por 'porém' para testar."],
  ["Português", "Por que / porque", "'Por que' (separado) em perguntas; 'porque' (junto) em respostas e explicações."],
  ["Português", "Concordância verbal", "O verbo concorda com o sujeito. Localize o sujeito antes de decidir a flexão do verbo."],
  ["Português", "Leitura ativa", "Sublinhe palavras-chave e faça resumos com suas próprias palavras para fixar melhor o conteúdo."],
  ["Português", "Vírgula no sujeito", "Nunca separe o sujeito do predicado por vírgula. 'O aluno, estuda' está errado."],
  ["História", "Linha do tempo", "Monte linhas do tempo para visualizar causas e consequências dos eventos históricos em sequência."],
  ["História", "Contexto importa", "Analise sempre o contexto econômico, social e político da época antes de julgar um acontecimento histórico."],
  ["História", "Fontes históricas", "Diferencie fontes primárias (documentos da época) de fontes secundárias (análises posteriores)."],
  ["História", "Revoluções", "Compare as revoluções (Francesa, Industrial, Russa) por causas, atores e resultados para fixar melhor."],
  ["Biologia", "Cadeia alimentar", "Lembre-se da sequência: produtores → consumidores → decompositores. A energia flui sempre em uma direção."],
  ["Biologia", "Célula animal x vegetal", "A célula vegetal tem parede celular e cloroplastos; a animal, não. Esse é o detalhe mais cobrado."],
  ["Biologia", "Sistema circulatório", "O sangue arterial é rico em oxigênio; o venoso, rico em gás carbônico. Não confunda com artérias e veias."],
  ["Biologia", "Genética básica", "Genótipo é a composição genética; fenótipo é a característica visível resultante do genótipo + ambiente."],
  ["Biologia", "Reinos dos seres vivos", "Memorize os reinos: Monera, Protista, Fungi, Plantae e Animalia, e um exemplo de cada."],
  ["Química", "Tabela periódica", "Famílias (colunas) têm propriedades semelhantes; períodos (linhas) indicam o número de camadas eletrônicas."],
  ["Química", "Balanceamento", "Em uma equação química, o número de átomos de cada elemento deve ser igual nos dois lados."],
  ["Química", "Ácidos e bases", "pH abaixo de 7 indica solução ácida; acima de 7, básica; exatamente 7 é neutro."],
  ["Estudos", "Técnica Pomodoro", "Estude 25 minutos focado e descanse 5. A cada 4 ciclos, faça uma pausa maior. Isso melhora a concentração."],
  ["Estudos", "Revisão espaçada", "Revise o conteúdo 1 dia, 1 semana e 1 mês depois. A repetição espaçada fixa o aprendizado na memória de longo prazo."],
  ["Estudos", "Mapas mentais", "Transforme textos longos em mapas mentais com palavras-chave e setas. O cérebro memoriza melhor por associação."],
  ["Estudos", "Ensine para aprender", "Explicar a matéria para outra pessoa (ou em voz alta) revela exatamente o que você ainda não dominou."],
  ["Estudos", "Sono é estudo", "Dormir bem consolida a memória. Virar a noite estudando costuma render menos do que uma boa noite de sono."],
  ["Estudos", "Resolva provas antigas", "Treinar com provas anteriores ajuda a entender o estilo das questões e a administrar o tempo."],
  ["Inglês", "Cognatos", "Muitas palavras em inglês se parecem com o português (information, possible). Use isso a seu favor na leitura."],
  ["Inglês", "Phrasal verbs", "Aprenda phrasal verbs em contexto, não isolados. 'Give up' (desistir) faz mais sentido dentro de uma frase."],
]

// ---------------------------------------------------------------------------
// Geracao por professor
// ---------------------------------------------------------------------------
const PERSONAS = [
  { disciplinas: ["Matemática", "Física", "Geografia"] },
  { disciplinas: ["Português", "História", "Biologia"] },
]
const TEMAS = ["Parte I", "Parte II", "Fundamentos", "Revisão", "Aprofundamento", "Conceitos-chave", "Treino", "Diagnóstica"]

function makeExam(questions) {
  return { version: EXAM_VERSION, questions }
}

const baseSettings = (disciplina, nivel) => ({
  seed: true,
  tags: [disciplina, nivel],
  disciplina,
  nivel,
  coverUrl: null,
  coverVideoUrl: null,
})

function buildItemsForProfessor(persona, dicaPool) {
  const items = []
  const allBank = Object.values(BANCOS).flat()

  // 5 exercicios (4 questoes mcq cada)
  for (let i = 0; i < 5; i++) {
    const disc = persona.disciplinas[i % persona.disciplinas.length]
    const nivel = pick(NIVEIS)
    const qs = sample(BANCOS[disc], 4).map((e, idx) => mkQuestion(e, idx + 1, 1))
    items.push({
      type: "exercise",
      title: `Exercícios de ${disc} — Lista ${i + 1}`,
      bodyHtml: `<p>Lista de exercícios de ${disc} para praticar os principais conceitos.</p>`,
      settings: { ...baseSettings(disc, nivel), exam: makeExam(qs) },
    })
  }

  // 8 avaliacoes (mcq fechada, 5 a 10 questoes)
  const dueAt = new Date(Date.now() + 30 * 864e5).toISOString()
  for (let i = 0; i < 8; i++) {
    const disc = persona.disciplinas[i % persona.disciplinas.length]
    const nivel = pick(NIVEIS)
    const n = rand(5, 10)
    const qs = sample(BANCOS[disc], n).map((e, idx) => mkQuestion(e, idx + 1, 1))
    items.push({
      type: "assessment",
      title: `Avaliação de ${disc} — ${TEMAS[i % TEMAS.length]}`,
      bodyHtml: `<p>Avaliação de ${disc} com ${qs.length} questões de múltipla escolha.</p>`,
      settings: { ...baseSettings(disc, nivel), exam: makeExam(qs), dueAt, startsAt: null, assessmentClosed: false },
    })
  }

  // 2 simulados (multidisciplinar, 10 questoes com disciplina por questao)
  for (let i = 0; i < 2; i++) {
    const qs = sample(allBank, 10).map((e, idx) => mkQuestion(e, idx + 1, 2))
    items.push({
      type: "simulado",
      title: `Simulado ${i + 1} — Multidisciplinar`,
      bodyHtml: `<p>Simulado multidisciplinar com 10 questões valendo 2 pontos cada.</p>`,
      settings: { ...baseSettings("Multidisciplinar", "Pré-vestibular"), exam: makeExam(qs), dueAt, startsAt: null, assessmentClosed: false },
    })
  }

  // dicas (20 por professor, vindas do pool compartilhado ja dividido)
  for (const [disc, title, body] of dicaPool) {
    items.push({
      type: "dica",
      title,
      bodyHtml: `<p>${body}</p>`,
      settings: {
        seed: true,
        tags: [disc],
        disciplina: disc,
        nivel: undefined,
        coverUrl: null,
        coverVideoUrl: null,
        dicaVideoUrl: null,
        dicaImageUrls: null,
      },
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const client = new pg.Client({ connectionString: loadEnv("DATABASE_URL"), ssl: undefined })
await client.connect()
try {
  const { rows: profs } = await client.query(
    `select p.id, u.email, p.full_name
       from public.profiles p join public.users u on u.id = p.id
      where p.user_type = 'professor' and u.email = any($1::text[])
      order by u.email`,
    [TARGET_EMAILS]
  )
  if (profs.length === 0) {
    console.error("Nenhum professor encontrado para:", TARGET_EMAILS.join(", "))
    process.exit(1)
  }

  // Limpa conteudo previamente semeado (idempotente)
  const ids = profs.map((p) => p.id)
  const del = await client.query(
    `delete from public.content_items where author_id = any($1::uuid[]) and settings->>'seed' = 'true'`,
    [ids]
  )
  console.log(`Limpeza: ${del.rowCount} item(ns) de seed anterior removidos.`)

  // Divide as 40 dicas entre os professores (20 cada se houver 2)
  const shuffledDicas = shuffle(DICAS)
  const per = Math.floor(shuffledDicas.length / profs.length)

  let baseTime = Date.now() - profs.length * 200 * 6e4
  let grand = 0
  for (let pi = 0; pi < profs.length; pi++) {
    const prof = profs[pi]
    const persona = PERSONAS[pi % PERSONAS.length]
    const dicaPool =
      pi === profs.length - 1
        ? shuffledDicas.slice(pi * per) // ultimo leva o resto
        : shuffledDicas.slice(pi * per, (pi + 1) * per)

    const items = buildItemsForProfessor(persona, dicaPool)

    for (const it of items) {
      const publishedAt = new Date(baseTime).toISOString()
      baseTime += rand(5, 40) * 6e4
      await client.query(
        `insert into public.content_items
           (author_id, type, title, body_html, status, visibility, settings, published_at, created_at, updated_at)
         values ($1, $2, $3, $4, 'published', 'public', $5::jsonb, $6, $6, $6)`,
        [prof.id, it.type, it.title, it.bodyHtml, JSON.stringify(it.settings), publishedAt]
      )
    }
    grand += items.length
    const byType = items.reduce((m, it) => ((m[it.type] = (m[it.type] || 0) + 1), m), {})
    console.log(`\n[${prof.email}] (${prof.full_name}) -> ${items.length} itens`)
    console.log("   ", JSON.stringify(byType))
  }
  console.log(`\nTotal inserido: ${grand} itens para ${profs.length} professor(es).`)
} finally {
  await client.end()
}
