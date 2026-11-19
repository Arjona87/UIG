/* Asistente UIG · Fase 1 (sin IA)
   Todas las respuestas salen de la base normativa (data/) o del catálogo de preguntas frecuentes
   redactado y verificado contra el texto literal de los artículos citados. No se inventa nada:
   si no hay coincidencia, la asistente lo dice y canaliza. No se guardan conversaciones. */
'use strict';

const CONFIG = {
  version: '3.1',
  inactividadMin: 10,         // la conversación se borra tras 10 minutos sin uso
  ia: false,                 // Fase 2: activar con intermediario (Cloudflare Worker) y API de Anthropic
  estadisticas: null,        // Fase 2: URL del contador anónimo (solo tema, perfil y fecha)
  salida: 'https://www.google.com/',
  lineaVida: { tel: '8009112000', texto: '800 911 2000', fuente: 'Línea de la Vida, Secretaría de Salud (24 horas, gratuita)' },
  maxResultados: 4,
};

const SALUDO = '¡Hola! Soy Asistente UIG, tu compañera digital para orientarte en las funciones de las Unidades de Igualdad de Género y brindarte la información confiable que requieres.';

const $ = (s, el = document) => el.querySelector(s);
const E = { docs: [], docMap: {}, faq: [], riesgo: [], dir: null, glosario: [], corte: '', modo: null, facil: false, esc: 1,
  idx: null, idxN3: null, shards: new Map(), instalarEvt: null, instaladoMostrado: false };

/* ---------- Normalización (idéntica a construir_base.py) ---------- */
const STOP = new Set(`a al algo algun alguna algunas alguno algunos ante antes asi aun bajo bien cada como con contra cual
cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa esas ese eso esos esta estan estas
este esto estos fue fueron ha han hasta hay la las le les lo los mas me mi mis mismo muy nada ni no nos o otra otras otro
otros para pero poco por porque que quien quienes se segun ser si sido sin sobre son su sus tal tambien tan te tiene
tienen todo todos tu tus u un una unas uno unos y ya yo fraccion fracciones articulo articulos presente ley parrafo
inciso dicha dicho dichos dichas mediante asi cual misma mismas mismos cuya cuyo deberan debera podra podran sera seran`.split(/\s+/));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
function stem(w) {
  if (w.length > 4 && w.endsWith('es') && !'aeiou'.includes(w[w.length - 3])) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s')) w = w.slice(0, -1);
  return w.slice(0, 7);
}
function tokens(s) {
  const out = [];
  for (const w of norm(s).split(' ')) {
    if (!w || STOP.has(w) || w.length < 2 || (/^\d+$/.test(w) && w.length > 4)) continue;
    out.push(stem(w));
  }
  return out;
}
const QSTOP = new Set(['hacer','hago','saber','quiero','quisiera','puedo','pued','necesito','necesit','ayuda','informacion','informac','tengo','dice','decir','pasa','paso','caso','alguien','favor','gracia','hola','buena','buenas','tarde','noche','dia','duda','pregunta','pregunt','explica','explic','debo','deb','como','donde','cual','cuando','esta','estoy'].map(stem));
const MAPA = { 'á':'a','à':'a','ä':'a','â':'a','é':'e','è':'e','ë':'e','ê':'e','í':'i','ì':'i','ï':'i','î':'i','ó':'o','ò':'o','ö':'o','ô':'o','ú':'u','ù':'u','ü':'u','û':'u','ñ':'n' };
const plano = s => Array.from(s.toLowerCase(), c => MAPA[c] || c).join('');   // misma longitud que el original
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* Lenguaje coloquial → términos jurídicos (amplía la búsqueda, no cambia lo que se cita) */
const SINONIMOS = [
  ['me pega','violencia fisica'],['golpe','violencia fisica'],['golpea','violencia fisica'],['empuj','violencia fisica'],
  ['me grita','violencia psicologica'],['insult','violencia psicologica'],['humill','violencia psicologica'],['celos','celotipia violencia psicologica'],['celoso','celotipia violencia psicologica'],
  ['papeles','documentos personales violencia patrimonial'],['documentos','violencia patrimonial'],['dinero','violencia economica percepciones'],['sueldo','violencia economica salario'],['gasto','violencia economica'],
  ['fotos','violencia digital contenido intimo'],['videos','violencia digital contenido intimo'],['packs','violencia digital contenido intimo'],['redes sociales','violencia digital'],['internet','violencia digital'],
  ['jefe','violencia laboral hostigamiento'],['trabajo','violencia laboral'],['maestro','violencia docente'],['escuela','violencia docente'],
  ['no me atendieron','violencia institucional'],['no me hicieron caso','violencia institucional'],
  ['alejamiento','orden de proteccion'],['restriccion','orden de proteccion'],['que no se acerque','orden de proteccion'],
  ['denunciar','denuncia ministerio publico'],['demanda','denuncia'],['abogad','asesoria juridica gratuita asesor juridico'],['licenciad','asesoria juridica'],
  ['albergue','refugio'],['donde quedarme','refugio'],['casa de seguridad','refugio'],
  ['desaparec','desaparicion busqueda persona desaparecida'],['no aparece','desaparicion busqueda'],
  ['violacion','violencia sexual'],['abuso sexual','violencia sexual'],['acoso','acoso hostigamiento'],
  ['pension','obligaciones alimentarias alimentos'],['custodia','guarda custodia'],
  ['parto','violencia obstetrica'],['novio','violencia noviazgo'],['esposo','violencia familiar'],['pareja','violencia familiar'],['marido','violencia familiar'],
  ['feminicidio','violencia feminicida'],['candidata','violencia politica'],['regidora','violencia politica'],
];
function expandir(qn) {
  const p = ' ' + qn;
  return SINONIMOS.filter(([f]) => p.includes(' ' + f)).map(([, x]) => x).join(' ');
}

/* ---------- Utilidades de interfaz ---------- */
const chat = () => $('#chat');
function burbuja(html, { usuario = false, serena = false, clase = '' } = {}) {
  const m = document.createElement('div');
  m.className = 'msg ' + (usuario ? 'usr ' : '') + clase;
  m.innerHTML = usuario ? `<div class="burbuja">${html}</div>`
    : `<img class="av" src="assets/${serena ? 'violeta-serena-96' : 'violeta-96'}.webp" alt="Violeta, Asistente UIG" width="40" height="40"><div class="burbuja">${html}</div>`;
  chat().appendChild(m);
  m.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return m;
}
function escribiendo() {
  return burbuja('<span class="cargando" aria-label="Buscando en la base normativa"><span></span><span></span><span></span></span>');
}
function aclaracion() {
  const extra = E.modo === 'ciudadania' ? ' No estás sola: hay instituciones que te pueden acompañar.' : '';
  return `<p class="aclara">Información orientativa basada en la normativa vigente al ${esc(E.corte)}. No es asesoría legal ni sustituye la atención de una institución; verifica con la instancia correspondiente.${extra}</p>`;
}

/* ---------- Citas ---------- */
function fechaTxt(d) {
  const f = d.fecha || '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(f)) return 'Última reforma: ' + f;
  if (/^versi[oó]n del documento/i.test(f)) return 'Fecha de versión por confirmar';
  return f;
}
function marcas(d) {
  const c = d.cita || '';
  if (c.startsWith('Con marca: vigencia')) return '<span class="marca conf">Vigencia por confirmar</span>';
  if (c.startsWith('Con marca: proyecto')) return '<span class="marca conf">Proyecto, no vigente</span>';
  if (c.startsWith('Con marca: síntesis')) return '<span class="marca conf">Síntesis del texto oficial</span>';
  if (c.startsWith('Con aviso de transición')) return '<span class="marca trans">En transición</span>';
  if (c.startsWith('Doctrina')) return '<span class="marca doct">Doctrina, no es norma</span>';
  if (c.startsWith('Histórico')) return '<span class="marca hist">Abrogada (histórico)</span>';
  return '';
}
const etiquetaUnidad = u => u.replace(/^Pág\. /, 'Página ').replace(/^Págs\. /, 'Páginas ');
function citaHTML(c) {
  const d = E.docMap[c.d]; if (!d) return '';
  const et = etiquetaUnidad(c.u) + (c.det ? ', ' + c.det : '');
  const url = d.url ? ` · <a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">Fuente oficial</a>` : '';
  return `<div class="cita"><b>${esc(et)}</b> · ${esc(d.nombre)} ${marcas(d)}<br>
    <span class="fec">${esc(d.ambito)} · ${esc(fechaTxt(d))}</span>${url}
    <span class="sep">·</span> <button type="button" class="btn-ver" data-d="${c.d}" data-u="${esc(c.u)}">Ver texto</button><div class="txt"></div></div>`;
}
function formatearTexto(t) {
  let h = esc(t);
  h = h.replace(/((?:Fracción|Párrafo|Artículo|Inciso|Apartado|Denominación del Título|Denominación del Capítulo|Capítulo|Título|Fe de erratas)[^.\n]{0,70}?(?:reformad|adicionad|derogad|recorrid|reubicad)[oa]s?[^.\n]{0,40}?DOF \d{2}-\d{2}-\d{4}(?:,? \d{2}-\d{2}-\d{4})*)/g,
    '<span class="nota-ref">[$1]</span>');
  return h;
}

/* ---------- Carga de datos ---------- */
async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }
const archivoNivel = id => `data/textos-n${(E.docMap[id] && E.docMap[id].nivel) || 1}.json`;
async function shard(id) {
  const url = archivoNivel(id);
  if (!E.shards.has(url)) E.shards.set(url, json(url));
  const mapa = await E.shards.get(url);
  return mapa[id] || [];
}
async function textoUnidad(id, etiqueta) {
  const u = await shard(id);
  const x = u.find(([e]) => e === etiqueta);
  return x ? x[1] : null;
}

/* ---------- Riesgo ---------- */
function evaluarRiesgo(texto) {
  const t = ' ' + norm(texto) + ' ';
  const r = { rojo: [], naranja: [], suicidio: false, desaparicion: false };
  for (const e of E.riesgo) {
    if (!e._re) e._re = new RegExp(e.re);
    if (e._re.test(t)) {
      if (e.nivel === 'rojo') r.rojo.push(e);
      else if (e.nivel === 'naranja') r.naranja.push(e);
      else if (e.nivel === 'suicidio') r.suicidio = true;
      else if (e.nivel === 'desaparicion') r.desaparicion = true;
    }
  }
  return r;
}

/* ---------- Preguntas frecuentes ---------- */
const GENERICOS = new Map([['violenc', 0.2], ['mujer', 0.3], ['victim', 0.5], ['jalisco', 0.4], ['ley', 0.2], ['derecho', 0.6]]);
function rankFAQ(texto) {
  const qn = norm(texto);
  const base = [...new Set(tokens(texto))].filter(t => !QSTOP.has(t));
  if (!base.length) return [];
  const ext = new Set(tokens(expandir(qn)));
  const peso = t => GENERICOS.get(t) ?? 1;
  const total = base.reduce((a, t) => a + peso(t), 0);
  const out = [];
  for (const f of E.faq) {
    if (E.modo === 'ciudadania' && f.modo === 'servidora') continue;
    if (!f._k) { f._k = new Set(tokens(f.q + ' ' + f.kw + ' ' + (f.v || []).join(' '))); f._q = new Set(tokens(f.q + ' ' + (f.v || []).join(' '))); f._f = [f.q, ...(f.v || [])].map(norm); }
    let m = 0, enQ = 0, nx = 0, n = 0;
    for (const t of base) if (f._k.has(t)) { m += peso(t); n++; if (f._q.has(t)) enQ++; }
    for (const t of ext) if (f._k.has(t)) nx++;
    const exacta = f._f.includes(qn) ? 0.3 : 0;      // la frase coincide con una forma registrada de la pregunta
    if (m > 0) out.push({ f, n, nb: base.length, s: m / total + enQ * 0.1 + nx * 0.05 + exacta });
  }
  return out.sort((a, b) => b.s - a.s);
}
function buscarFAQ(texto) {
  const r = rankFAQ(texto);
  return r.length && r[0].s >= 0.55 ? r[0].f : null;
}
function sugerenciasHTML(texto, n = 3) {
  // solo sugerencias con fundamento: al menos dos palabras en común (o la única palabra de la consulta)
  const r = rankFAQ(texto).filter(x => x.s >= 0.45 && (x.n >= 2 || x.nb === 1)).slice(0, n);
  if (!r.length) return '';
  return `<p><b>¿Te refieres a…?</b></p><div class="te-refieres">${r.map(x => `<button type="button" class="sug" data-faq="${x.f.id}">${esc(x.f.q)}</button>`).join('')}</div>`;
}

/* ---------- Búsqueda BM25 en la base ---------- */
let vocabPref = null;
function difusos(t, idx) {
  if (t.length < 5) return [];
  if (!vocabPref) { vocabPref = {}; for (const k of Object.keys(idx.p)) (vocabPref[k.slice(0, 2)] ||= []).push(k); }
  const cand = [];
  for (const k of vocabPref[t.slice(0, 2)] || []) if (Math.abs(k.length - t.length) <= 1 && dist1(k, t)) cand.push(k);
  return cand.slice(0, 3);
}
function dist1(a, b) {               // ¿distancia de edición ≤ 1?
  if (a === b) return true;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}
function mencionados(qn) {
  const p = ' ' + qn + ' ', out = new Set();
  for (const d of E.docs) for (const a of d.alias || []) if (a.length > 3 && p.includes(' ' + a + ' ')) out.add(d.id);
  return out;
}
function bm25(idx, pesos, filtroDoc) {
  const k1 = 1.2, b = 0.5, sc = new Map(), cub = new Map();
  for (const [t, w] of pesos) {
    const pl = idx.p[t]; if (!pl) continue;
    const df = pl.length / 2, idf = Math.log(1 + (idx.N - df + 0.5) / (df + 0.5));
    for (let i = 0; i < pl.length; i += 2) {
      const k = pl[i], tf = pl[i + 1];
      if (filtroDoc && !filtroDoc(idx.ref[2 * k])) continue;
      const s = w * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * idx.dl[k] / idx.avgdl));
      sc.set(k, (sc.get(k) || 0) + s);
      cub.set(k, (cub.get(k) || 0) + (w >= 0.7 ? 1 : 0.5));
    }
  }
  return { sc, cub };
}
function pesoDoc(d) {
  let w = d.nivel === 1 ? 1 : d.nivel === 2 ? 0.75 : 0.6;
  const c = d.cita || '';
  if (c.startsWith('Con marca: vigencia')) w *= 0.8;
  if (c.startsWith('Con marca: proyecto')) w *= 0.3;
  if (c.startsWith('Doctrina')) w *= 0.5;
  if (E.modo === 'servidora' && /^(Protocolo|Modelo|Manual|Lineamientos)/.test(d.tipo || '')) w *= 1.15;
  return w;
}
async function buscarNormas(texto, excluir = new Set()) {
  if (!E.idx) E.idx = await E.idxPromise;
  const qn = norm(texto);
  const base = [...new Set(tokens(texto))].filter(t => !QSTOP.has(t));
  if (!base.length) return [];
  const pesos = new Map(base.map(t => [t, 1]));
  for (const t of tokens(expandir(qn))) if (!pesos.has(t)) pesos.set(t, 0.6);
  for (const t of base) if (!E.idx.p[t]) for (const c of difusos(t, E.idx)) if (!pesos.has(c)) pesos.set(c, 0.75);
  const menc = mencionados(qn);
  const res = [];
  const recoger = (idx, filtro) => {
    const { sc, cub } = bm25(idx, pesos, filtro);
    for (const [k, s] of sc) {
      const d = E.docs[idx.ref[2 * k]], ui = idx.ref[2 * k + 1];
      const cov = Math.min(1, (cub.get(k) || 0) / base.length);
      if (base.length >= 2 && cov < 0.5 && !menc.has(d.id)) continue;   // relevancia mínima
      let v = s * pesoDoc(d) * (0.3 + 0.7 * cov);
      if (E.modo !== 'servidora' && d.modo === 'pag') v *= 0.85;
      if (menc.has(d.id)) v *= 2.5;
      if (!d._n) d._n = new Set(tokens(d.nombre).filter(t => !GENERICOS.has(t) && !['general','federal','estado','estatal','nacional','codigo','reglamento'].includes(t)));
      let enNombre = 0; for (const t of base) if (d._n.has(t)) enNombre++;
      if (enNombre) v *= 1 + 0.6 * enNombre;
      res.push({ d, ui, fr: (idx.fx && idx.fx[k]) || '', v });
    }
  };
  recoger(E.idx);
  const n3 = [...menc].filter(id => E.docMap[id] && E.docMap[id].nivel === 3);
  if (n3.length) {
    if (!E.idxN3) E.idxN3 = await json('data/indice-n3.json');
    const set = new Set(n3);
    recoger(E.idxN3, di => set.has(E.docs[di].id));
  }
  res.sort((a, b) => b.v - a.v);
  const out = [], porDoc = {}, vistos = new Set();
  const tope = res.length ? res[0].v : 0;
  for (const r of res) {
    if (r.v < tope * 0.25) break;
    if ((r.d.cita || '').startsWith('Histórico') && !menc.has(r.d.id)) continue;
    const clave = r.d.id + '|' + r.ui;
    if (vistos.has(clave)) continue;
    if ((porDoc[r.d.id] || 0) >= 2) continue;
    const u = (await shard(r.d.id))[r.ui];
    if (excluir.has(r.d.id + '|' + u[0])) continue;
    vistos.add(clave); porDoc[r.d.id] = (porDoc[r.d.id] || 0) + 1;
    out.push({ d: r.d, et: u[0], fr: r.fr, texto: u[1], v: r.v });
    if (out.length >= CONFIG.maxResultados) break;
  }
  // Ley de Transparencia de Jalisco en transición: primero la Ley General (decisión F, opción c)
  if (out.some(x => x.d.id === '065') && !out.some(x => x.d.id === '087') && E.docMap['087']) {
    const { sc } = bm25(E.idx, pesos, di => E.docs[di].id === '087');
    const mejor = [...sc].sort((a, b) => b[1] - a[1])[0];
    if (mejor) { const u = (await shard('087'))[E.idx.ref[2 * mejor[0] + 1]]; out.unshift({ d: E.docMap['087'], et: u[0], fr: (E.idx.fx && E.idx.fx[mejor[0]]) || '', texto: u[1], v: 0 }); }
  }
  return out.map(x => ({ ...x, terms: new Set(pesos.keys()) }));
}
function fraccionTexto(t, fr) {
  const m = new RegExp('(^|\\n)' + fr + '\\.[\\s-]').exec(t);
  if (!m) return t;
  const ini = m.index + m[1].length, sig = /\n[IVXLC]+\.[\s-]/.exec(t.slice(ini + 2));
  return t.slice(ini, sig ? ini + 2 + sig.index : t.length);
}
function fragmento(texto, terms, largo = 320) {
  const p = plano(texto), pos = [];
  for (const m of p.matchAll(/[a-z0-9]+/g)) if (terms.has(stem(m[0]))) pos.push([m.index, m.index + m[0].length]);
  let ini = 0;
  if (pos.length) {
    let mejor = -1;
    for (const [a] of pos) { const n = pos.filter(([x]) => x >= a - 40 && x < a + largo - 40).length; if (n > mejor) { mejor = n; ini = Math.max(0, a - 40); } }
  }
  let fin = Math.min(texto.length, ini + largo);
  if (ini > 0) { const s = texto.indexOf(' ', ini); if (s > 0 && s < ini + 30) ini = s + 1; }
  if (fin < texto.length) { const s = texto.lastIndexOf(' ', fin); if (s > ini + 100) fin = s; }
  let h = '', c = ini;
  for (const [a, b] of pos) { if (a < ini || b > fin) continue; h += esc(texto.slice(c, a)) + '<mark>' + esc(texto.slice(a, b)) + '</mark>'; c = b; }
  h += esc(texto.slice(c, fin));
  return (ini > 0 ? '… ' : '') + h + (fin < texto.length ? ' …' : '');
}

/* ---------- Documentos descargables (carpeta descargas/, disponibles sin conexión) ---------- */
const DESCARGAS = {
  guia_docx: { t: 'Guía: cómo crear una UIG desde cero', f: 'Word', url: 'descargas/Guia_crear_UIG_desde_cero.docx' },
  guia_pdf: { t: 'Guía: cómo crear una UIG desde cero', f: 'PDF', url: 'descargas/Guia_crear_UIG_desde_cero.pdf' },
  plan_pdf: { t: 'Plan de Trabajo de las UIG (SISEMH, 2021)', f: 'PDF oficial', url: 'descargas/Plan_de_Trabajo_UIG_SISEMH_2021.pdf' },
  acuerdo_pdf: { t: 'Acuerdo DIELAG ACU 084/2020 (Periódico Oficial)', f: 'PDF oficial', url: 'descargas/Acuerdo_DIELAG_ACU_084_2020_POEJ_31-12-2020.pdf' }
};
function descargasHTML(f) {
  const ds = (f.descargas || []).map(k => DESCARGAS[k]).filter(Boolean);
  if (!ds.length) return '';
  return `<div class="descargas"><h3>Descargar</h3>${ds.map(d => `<a class="btn-desc" href="${d.url}" download><span class="d-fmt">${esc(d.f)}</span>${esc(d.t)}</a>`).join('')}</div>`;
}

/* ---------- Glosario tocable ---------- */
function glosar(html, usados) {
  if (!E.glosario.length) return html;
  const ph = [];
  for (const [i, g] of E.glosario.entries()) {
    if (usados.has(g.t.toLowerCase())) continue;
    const re = new RegExp('(^|[^\\wáéíóúñÁÉÍÓÚÑ])(' + g.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\wáéíóúñ])', 'i');
    const m = re.exec(html);
    if (!m) continue;
    usados.add(g.t.toLowerCase());
    ph.push(`<button type="button" class="term" data-g="${i}" aria-expanded="false">${m[2]}</button>`);
    html = html.slice(0, m.index + m[1].length) + `\u0000${ph.length - 1}\u0000` + html.slice(m.index + m[0].length);
  }
  return html.replace(/\u0000(\d+)\u0000/g, (_, k) => ph[+k]);
}
function definicionHTML(g) {
  const d = E.docMap[g.c.d];
  const cita = d ? `${etiquetaUnidad(g.c.u)}${g.c.det ? ', ' + g.c.det : ''} · ${d.nombre} · ${fechaTxt(d)}` : '';
  return `<div class="def" role="note"><b>${esc(g.t)}:</b> ${esc(g.d)} <span class="nota-ref">(${esc(cita)})</span></div>`;
}

/* ---------- Respuestas ---------- */
function infografia(tipo) {
  if (tipo === 'tipos') {
    const t = [['Psicológica','Insultos, humillaciones, celos, amenazas','#6B2FA0'],['Física','Daño con fuerza, armas, objetos o sustancias','#8E2B5E'],
      ['Patrimonial','Quitar o retener bienes y documentos','#4A3C8C'],['Económica','Controlar ingresos; pagar menos por igual trabajo','#2F5D8A'],
      ['Sexual','Actos que degradan o dañan el cuerpo','#7A1F3D'],['Interpósita persona','Dañar a hijas, hijos o personas cercanas','#5B2A86'],['Digital (Jalisco)','Por internet: difusión, acoso, amenazas','#3A1560']];
    return `<div class="info-tipos" role="list" aria-label="Infografía: tipos de violencia">${t.map(([a, b, c]) => `<div role="listitem" style="background:${c}"><b>${a}</b>${b}</div>`).join('')}</div>
      <p class="info-pie">Fuente: LGAMVLV, art. 6; Ley de Acceso de Jalisco, art. 10.</p>`;
  }
  if (tipo === 'ruta') {
    const t = [['Identificar','Tipo y modalidad de violencia, riesgos y efectos'],['Priorizar','Necesidades inmediatas y medidas de protección'],
      ['Orientar y canalizar','Lenguaje accesible; instancia que corresponda (preferentemente CJM)'],['Dar seguimiento','Verificar que la derivación se cumpla']];
    return `<div class="info-ruta" role="list" aria-label="Infografía: ruta de atención">${t.map(([a, b], i) => `<div role="listitem"><i>${i + 1}</i><b>${a}</b>${b}</div>`).join('')}</div>
      <p class="info-pie">Fuente: Ley de Acceso de Jalisco, art. 47; Protocolo Unificado de Atención.</p>`;
  }
  return '';
}
function directorioHTML() {
  if (!E.dir || !E.dir.validado || !E.dir.instituciones.length)
    return '<div class="directorio"><b>¿A dónde acudir?</b> Si estás en peligro, llama al <a href="tel:911">911</a>. El directorio de instituciones de Jalisco está en proceso de validación y se publicará aquí.</div>';
  const inst = E.dir.instituciones;
  const muns = [...new Set(inst.map(i => i.municipio).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const sel = muns.length > 1 ? `<label class="sel-mun">Tu municipio: <select data-acc="municipio"><option value="">Todos</option>${muns.map(m => `<option>${esc(m)}</option>`).join('')}</select></label>` : '';
  return '<div class="directorio"><b>¿A dónde acudir?</b>' + sel + inst.map(i =>
    `<div class="inst" data-mun="${esc(i.municipio || '')}"><b>${esc(i.nombre)}</b> · ${esc(i.servicio || '')}<br>${i.telefono ? `<a href="tel:${esc(i.telefono)}">${esc(i.telefono)}</a> · ` : ''}${esc(i.direccion || '')} ${i.horario ? '· ' + esc(i.horario) : ''}${i.municipio ? ' · ' + esc(i.municipio) : ''}</div>`).join('') + '</div>';
}
function acciones() {
  const voz = 'speechSynthesis' in window ? '<button type="button" data-acc="voz">Escuchar</button>' : '';
  return `<div class="acciones">${voz}<button type="button" data-acc="pdf">Descargar PDF</button></div>`;
}
async function responderFAQ(f, { naranja = [], urgente = false } = {}) {
  const alerta = naranja.length ? `<div class="alerta-naranja"><b>Lo que describes puede ser una señal de riesgo.</b> Tienes derecho a protección inmediata. Si en algún momento estás en peligro, llama al <a href="tel:911">911</a>.</div>` : '';
  const urg = urgente ? `<a class="btn911" href="tel:911">Llamar al 911</a>` : '';
  const html = `${alerta}${urg}<span class="etq">Respuesta orientativa</span><h2>${esc(f.q)}</h2>
    <div class="facil"><b>Lectura fácil</b><ul>${f.facil.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="detalle">${(() => { const u = new Set(); return `<p>${glosar(esc(f.intro), u)}</p>${f.lista.length ? `<ul>${f.lista.map(x => `<li>${glosar(esc(x), u)}</li>`).join('')}</ul>` : ''}${f.cierre ? `<p>${glosar(esc(f.cierre), u)}</p>` : ''}`; })()}</div>
    ${f.tel ? `<a class="btnlinea" href="tel:${esc(f.tel)}">Llamar a la Red de Centros de Justicia · ${esc(f.tel.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3'))}</a>` : ''}
    ${f.infografia ? infografia(f.infografia) : ''}
    ${descargasHTML(f)}
    ${f.directorio || urgente || naranja.length ? directorioHTML() : ''}
    <div class="citas"><h3>Fundamento</h3>${f.citas.map(citaHTML).join('')}</div>
    ${acciones()}${aclaracion()}`;
  const m = burbuja(html);
  contar(f.id);
  return m;
}
async function responderBusqueda(texto, naranja) {
  const espera = E.idx ? null : escribiendo();
  let r;
  try { r = await buscarNormas(texto); } finally { if (espera) espera.remove(); }
  if (!r.length) return noEncontrado(naranja, texto);
  const alerta = naranja.length ? `<div class="alerta-naranja"><b>Lo que describes puede ser una señal de riesgo.</b> Tienes derecho a protección inmediata. Si estás en peligro, llama al <a href="tel:911">911</a>.</div>` : '';
  const trans = r.some(x => x.d.id === '065') ? `<p class="alerta-naranja">La Ley de Transparencia de Jalisco está <b>en transición</b> por la nueva Ley General de Transparencia (DOF 20/03/2025). Se muestra primero la ley general; verifica con la Unidad de Transparencia correspondiente.</p>` : '';
  const html = `${alerta}<span class="etq">Lo que dice la normativa</span>${E.modo === 'servidora' ? sugerenciasHTML(texto) : ''}<p>Encontré estos fragmentos relacionados con tu pregunta. Abre el texto completo para leer el artículo íntegro.</p>${trans}
    ${r.map(x => `<div class="resultado"><div class="ref">${esc(etiquetaUnidad(x.et))}${x.fr ? ', fracción ' + esc(x.fr) : ''} · ${esc(x.d.nombre)} ${marcas(x.d)}</div>
      <div class="meta">${esc(x.d.ambito)} · ${esc(fechaTxt(x.d))}${x.d.url ? ` · <a href="${esc(x.d.url)}" target="_blank" rel="noopener noreferrer">Fuente oficial</a>` : ''}</div>
      <div class="frag">${fragmento(x.fr ? fraccionTexto(x.texto, x.fr) : x.texto, x.terms)}</div>
      <button type="button" class="btn-ver acc-sec" data-d="${x.d.id}" data-u="${esc(x.et)}">Ver texto completo</button><div class="txt"></div></div>`).join('')}
    <p class="facil-nota facil">La versión de lectura fácil está disponible en las preguntas frecuentes. Para otros artículos se agregará en la fase 2.</p>
    ${naranja.length ? directorioHTML() : ''}${acciones()}${aclaracion()}`;
  burbuja(html);
  contar('busqueda');
}
function noEncontrado(naranja = [], texto = '') {
  burbuja(`<span class="etq">Sin coincidencias</span><p>No encontré información sobre eso en la base normativa. Para no darte un dato equivocado, prefiero no responder algo que no está en las leyes cargadas.</p>
    ${sugerenciasHTML(texto)}<p>Puedes intentar con otras palabras o ver <button type="button" class="sug" data-acc="todas">todas las preguntas</button>.</p>${naranja.length ? directorioHTML() : ''}${aclaracion()}`);
  contar('sin_resultado');
}
/* Ciudadanía: nunca fragmentos de ley si ella no los pide. */
function responderOrientacion(texto, naranja) {
  const alerta = naranja.length ? `<div class="alerta-naranja"><b>Lo que describes puede ser una señal de riesgo.</b> Tienes derecho a protección inmediata. Si estás en peligro, llama al <a href="tel:911">911</a>.</div>` : '';
  const sug = sugerenciasHTML(texto);
  const m = burbuja(`${alerta}<span class="etq">Te oriento</span>
    <p>${sug ? 'No tengo una respuesta exacta para eso, pero estas preguntas se parecen a lo que buscas:' : 'No tengo una respuesta preparada para eso.'}</p>${sug.replace('<p><b>¿Te refieres a…?</b></p>', '')}
    <p>También puedes elegir <button type="button" class="sug" data-acc="ruta">¿Qué te pasó?</button> o ver <button type="button" class="sug" data-acc="todas">todas las preguntas</button>.</p>
    ${directorioHTML()}
    <p><button type="button" class="btn-ley" data-acc="ley">Ver qué dice la ley</button></p>${aclaracion()}`);
  m.querySelector('[data-acc="ley"]').dataset.q = texto;
  contar('orientacion');
}
function responderCrisis(r) {
  const sui = r.suicidio;
  const html = `<h2>${sui ? 'Tu vida importa. Hay ayuda ahora mismo.' : 'Tu seguridad es lo primero.'}</h2>
    <a class="btn911" href="tel:911">Llamar al 911</a>
    ${sui ? `<p>También puedes llamar a la <b>Línea de la Vida</b>, gratuita y disponible las 24 horas:</p><a class="btnlinea" href="tel:${CONFIG.lineaVida.tel}">Línea de la Vida · ${CONFIG.lineaVida.texto}</a>
      <p class="info-pie">${esc(CONFIG.lineaVida.fuente)}.</p>` : ''}
    ${r.rojo.length ? `<ul><li>Si puedes hacerlo sin riesgo, ve a un lugar seguro o con una persona de confianza.</li>
      <li>Tienes derecho a <b>protección inmediata y efectiva</b> de las autoridades y a una <b>orden de protección</b> urgente.</li>
      <li>Si necesitas cerrar esta página rápido, usa el botón <b>Salir</b>.</li></ul>
      <div class="citas"><h3>Fundamento</h3>${citaHTML({ d: '080', u: 'Artículo 52', det: 'fracción II' })}${citaHTML({ d: '080', u: 'Artículo 27' })}</div>` : ''}
    <p><b>No estás sola.</b></p>${directorioHTML()}
    <p class="aclara">Soy una asistente digital: no soy un servicio de emergencia.</p>`;
  burbuja(html, { serena: true, clase: 'crisis' });
  contar(sui ? 'crisis_suicidio' : 'crisis');
}

/* ---------- Flujo principal ---------- */
async function responder(texto) {
  texto = texto.trim(); if (!texto) return;
  burbuja(esc(texto), { usuario: true });
  if (!E.modo) E.modo = 'ciudadania', pintarModo();
  const r = evaluarRiesgo(texto);
  if (r.suicidio || r.rojo.length) { responderCrisis(r); return; }
  if (r.desaparicion) { await responderFAQ(E.faq.find(f => f.id === 'desaparicion'), { urgente: true }); return; }
  const f = buscarFAQ(texto);
  if (f) await responderFAQ(f, { naranja: r.naranja });
  else if (E.modo === 'ciudadania') responderOrientacion(texto, r.naranja);
  else await responderBusqueda(texto, r.naranja);
}

/* ---------- Ruta guiada «¿Qué te pasó?» ---------- */
const RUTA = [
  ['Estoy en peligro ahora', 'crisis'], ['Me golpean, me insultan o me controlan', 'tipos'], ['Quiero que el agresor no se me acerque', 'orden'],
  ['Necesito un lugar seguro', 'refugio_serv'], ['Quiero denunciar', 'como_denunciar'], ['Difundieron o amenazan con difundir mis fotos', 'digital'],
  ['Me acosan en el trabajo o en la escuela', 'laboral'], ['Una persona desapareció', 'desaparicion'], ['No sé a dónde ir', 'adonde'],
  ['Quiero ayudar a alguien', 'ayudar']];
function mostrarRuta() {
  const m = burbuja(`<span class="etq">Sin escribir</span><h2>¿Qué te pasó?</h2><p>Toca la opción que más se parezca a lo que vives.</p>
    <div class="ruta-btns">${RUTA.map(([t, id], i) => `<button type="button" data-ruta="${i}"${id === 'crisis' ? ' class="r-urg"' : ''}>${esc(t)}</button>`).join('')}</div>`);
  m.querySelectorAll('[data-ruta]').forEach(b => b.onclick = () => {
    const [t, id] = RUTA[+b.dataset.ruta];
    burbuja(esc(t), { usuario: true });
    if (id === 'crisis') return responderCrisis({ rojo: [{}], naranja: [], suicidio: false });
    const f = E.faq.find(x => x.id === id); if (f) responderFAQ(f, { urgente: id === 'desaparicion' });
  });
}
const CATS = [['uig', 'Unidades de Igualdad de Género'], ['adonde', 'A dónde dirigirme'], ['tipos', 'Tipos y modalidades de violencia'], ['proteccion', 'Protección y seguridad'],
  ['denuncia', 'Denuncia y proceso'], ['derechos', 'Derechos y reparación'], ['desaparicion', 'Desaparición de personas'], ['servidoras', 'Para servidoras y servidores públicos']];
function mostrarTodas() {
  const lista = E.faq.filter(f => !(E.modo === 'ciudadania' && f.modo === 'servidora'));
  burbuja(`<span class="etq">Preguntas frecuentes</span><h2>${lista.length} preguntas por tema</h2>
    ${CATS.map(([c, t]) => { const fs = lista.filter(f => f.cat === c); return fs.length ? `<details class="cat"><summary>${esc(t)} (${fs.length})</summary>${fs.map(f => `<button type="button" class="sug" data-faq="${f.id}">${esc(f.q)}</button>`).join('')}</details>` : ''; }).join('')}`);
}

/* Fase 2: conteo anónimo (tema, perfil y fecha). En fase 1 no envía ni guarda nada. */
function contar(tema) {
  if (!CONFIG.estadisticas || !navigator.onLine) return;
  try { navigator.sendBeacon(CONFIG.estadisticas, JSON.stringify({ tema, perfil: E.modo, fecha: new Date().toISOString().slice(0, 10) })); } catch (e) {}
}

/* ---------- Saludo, perfil y sugerencias ---------- */
const CHIPS = { tipos:'Tipos de violencia', psicologica:'¿Es violencia psicológica?', patrimonial:'Me quita dinero o papeles', digital:'Difundieron mis fotos',
  orden:'Orden de protección', denunciar:'¿Dónde denuncio?', abogada:'Abogada gratuita', derechos:'Mis derechos', cjm:'Centro de Justicia para las Mujeres',
  refugio:'Refugio con mis hijos', laboral:'Acoso en el trabajo', mediacion:'¿Me obligan a conciliar?', desaparicion:'Persona desaparecida',
  uig:'¿Qué hace la UIG?', uig_ayuda:'¿La UIG me puede ayudar?', uig_servidora:'Acoso en mi dependencia', uig_crear:'Crear una UIG desde cero', adonde:'¿A dónde voy?', cjm_sedes:'¿Dónde hay CJM?',
  como_denunciar:'¿Cómo denuncio?', protocolo_unif:'Protocolo Unificado', lineam_ordenes:'Lineamientos de órdenes', riesgo:'Análisis de riesgo', diligencia:'Debida diligencia', ruta:'Ruta de atención', institucional:'Violencia institucional', canalizar:'¿Cómo canalizo?', alerta:'Alerta de Violencia de Género',
  politica:'Violencia política', reparacion:'Reparación del daño' };
function pintarSugerencias() {
  const caja = $('#sugerencias'); caja.innerHTML = '';
  const extra = (t, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip-fijo'; b.textContent = t; b.onclick = fn; caja.appendChild(b); };
  if (E.modo !== 'servidora') extra('¿Qué te pasó?', () => mostrarRuta());
  extra('Todas las preguntas', () => mostrarTodas());
  const orden = E.modo === 'servidora'
    ? ['uig','uig_crear','uig_servidora','ruta','canalizar','protocolo_unif','institucional','orden','lineam_ordenes','riesgo','diligencia','tipos','derechos','alerta','politica','reparacion']
    : ['uig','uig_ayuda','adonde','cjm_sedes','tipos','orden','como_denunciar','psicologica','patrimonial','digital','abogada','refugio','derechos','mediacion','desaparicion'];
  for (const id of orden) {
    const f = E.faq.find(x => x.id === id); if (!f) continue;
    const b = document.createElement('button'); b.type = 'button'; b.textContent = CHIPS[id] || f.q;
    b.onclick = () => responder(f.q); caja.appendChild(b);
  }
}
function pintarModo() {
  const b = $('#btnModo'); b.hidden = !E.modo;
  b.textContent = E.modo === 'servidora' ? 'Perfil: servidora pública' : 'Perfil: orientación';
  pintarSugerencias();
}
function elegirModo(m) {
  E.modo = m; pintarModo();
  burbuja(m === 'servidora'
    ? '<p>Perfil de <b>servidora o servidor público</b>. Puedo orientarte sobre rutas de atención, canalización, protocolos y el fundamento de cada paso, con artículo, ordenamiento y fecha de última reforma.</p><p>¿Qué necesitas consultar?</p>'
    : '<p>Gracias por escribir. Puedo explicarte qué dicen las leyes y a dónde acudir. Escribe con tus palabras lo que necesitas saber, o elige una pregunta de abajo.</p><p>Si en algún momento necesitas cerrar esta página rápido, usa el botón <b>Salir</b>.</p>');
  if (m === 'ciudadania') mostrarRuta();
  sugerirInstalar();
  $('#entrada').focus();
}
function saludo() {
  const m = burbuja(`<div class="saludo"><h1>${esc(SALUDO)}</h1>
    <div class="limites"><b>No soy terapeuta, abogada ni un servicio de emergencia.</b> Te oriento con lo que dicen las leyes y te indico a dónde acudir; esta información no es asesoría legal.
    No guardo tus conversaciones ni te pido datos personales. <a href="aviso-privacidad.html">Aviso de privacidad</a>.</div>
    <p>¿Cómo puedo asistirte? Elige una opción:</p>
    <div class="elige"><button type="button" data-modo="ciudadania">Busco orientación<span>Para mí o para alguien cercana</span></button>
    <button type="button" data-modo="servidora">Soy servidora o servidor público<span>Atención en Unidades de Igualdad de Género</span></button></div>
    <p class="aclara">Base normativa vigente al ${esc(E.corte)}: ${E.docs.length} documentos federales, de Jalisco e internacionales.</p></div>`);
  m.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => elegirModo(b.dataset.modo));
}

/* ---------- Acciones dentro de las respuestas ---------- */
document.addEventListener('click', async ev => {
  const v = ev.target.closest('.btn-ver');
  if (v) {
    const caja = v.nextElementSibling;
    if (caja.innerHTML) { caja.innerHTML = ''; v.textContent = v.classList.contains('acc-sec') ? 'Ver texto completo' : 'Ver texto'; return; }
    const t = await textoUnidad(v.dataset.d, v.dataset.u);
    caja.innerHTML = t ? `<div class="texto-completo">${formatearTexto(t)}</div>` : '<p class="aclara">Texto no disponible.</p>';
    v.textContent = 'Ocultar texto';
    return;
  }
  const a = ev.target.closest('[data-acc="pdf"]');
  if (a) { imprimir(a.closest('.burbuja')); return; }
  const sug = ev.target.closest('[data-faq]');
  if (sug) { const f = E.faq.find(x => x.id === sug.dataset.faq); if (f) { burbuja(esc(f.q), { usuario: true }); responderFAQ(f, { urgente: f.urgente }); } return; }
  const term = ev.target.closest('.term');
  if (term) {
    const cont = term.closest('p, li'); const sig = cont.nextElementSibling;
    if (sig && sig.classList.contains('def') && sig.dataset.g === term.dataset.g) { sig.remove(); term.setAttribute('aria-expanded', 'false'); return; }
    cont.insertAdjacentHTML('afterend', definicionHTML(E.glosario[+term.dataset.g])); cont.nextElementSibling.dataset.g = term.dataset.g; term.setAttribute('aria-expanded', 'true');
    return;
  }
  const accion = ev.target.closest('[data-acc]'); if (!accion) return;
  const tipo = accion.dataset.acc;
  if (tipo === 'voz') return leer(accion);
  if (tipo === 'ley') { accion.disabled = true; return responderBusqueda(accion.dataset.q || '', []); }
  if (tipo === 'todas') return mostrarTodas();
  if (tipo === 'ruta') return mostrarRuta();
});
document.addEventListener('change', ev => {
  const s = ev.target.closest('[data-acc="municipio"]'); if (!s) return;
  s.closest('.directorio').querySelectorAll('.inst').forEach(i => { i.hidden = !!s.value && i.dataset.mun !== s.value; });
});

/* ---------- Leer en voz alta (voz del propio dispositivo; funciona sin internet si el teléfono la tiene) ---------- */
let leyendo = null;
function leer(btn) {
  const sintesis = window.speechSynthesis;
  if (leyendo === btn) { sintesis.cancel(); btn.textContent = 'Escuchar'; leyendo = null; return; }
  sintesis.cancel(); if (leyendo) leyendo.textContent = 'Escuchar';
  const b = btn.closest('.burbuja');
  const partes = [b.querySelector('h2')?.innerText || ''];
  partes.push((E.facil ? b.querySelector('.facil') : b.querySelector('.detalle') || b.querySelector('.frag'))?.innerText || '');
  const u = new SpeechSynthesisUtterance(partes.join('. ').replace(/\s+/g, ' '));
  u.lang = 'es-MX'; u.rate = 0.95;
  const voz = sintesis.getVoices().find(v => v.lang && v.lang.startsWith('es'));
  if (voz) u.voice = voz;
  u.onend = u.onerror = () => { btn.textContent = 'Escuchar'; leyendo = null; };
  leyendo = btn; btn.textContent = 'Detener'; sintesis.speak(u);
}

/* ---------- Cierre por inactividad: borra la conversación ---------- */
let reloj = null;
function reiniciarReloj() {
  clearTimeout(reloj);
  reloj = setTimeout(() => {
    if (chat().children.length <= 1) return;
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
    chat().innerHTML = ''; E.modo = null; pintarModo(); saludo();
    burbuja('<p class="aclara">La conversación anterior se borró por inactividad, para proteger tu privacidad.</p>');
  }, CONFIG.inactividadMin * 60000);
}
['click', 'keydown', 'touchstart'].forEach(t => document.addEventListener(t, reiniciarReloj, { passive: true }));
function imprimir(b) {
  const z = $('#zonaImpresion');
  const hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  z.innerHTML = `<div class="imp-cab"><div><b style="font-family:var(--f-display);font-size:14pt;color:#3A1560">Asistente UIG v${CONFIG.version} · Respuesta orientativa</b><br>
    <span style="font-size:9pt">Generado el ${hoy} · Base normativa vigente al ${esc(E.corte)}</span></div><img src="assets/logo-cges.png" alt=""></div>
    ${b.innerHTML}<div class="imp-pie">Asistente UIG no es terapeuta, abogada ni servicio de emergencia; esta información es orientativa y no constituye asesoría legal.
    Si estás en peligro, llama al 911. Verifica la vigencia en la fuente oficial de cada ordenamiento.</div>`;
  z.querySelectorAll('.txt').forEach(x => { if (!x.innerHTML) x.remove(); });
  document.body.classList.add('imprimiendo');
  const fin = () => { document.body.classList.remove('imprimiendo'); z.innerHTML = ''; window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  setTimeout(() => window.print(), 50);
}

/* ---------- Salida rápida ---------- */
function salir() {
  try { document.title = 'Google'; document.body.innerHTML = ''; } catch (e) {}
  location.replace(CONFIG.salida);
}
let ultimoEsc = 0;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const t = Date.now(); if (t - ultimoEsc < 900) salir(); ultimoEsc = t; }
});

/* ---------- Instalación ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); E.instalarEvt = e; });
function sugerirInstalar() {
  if (E.instaladoMostrado || matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!E.instalarEvt && !ios) return;
  E.instaladoMostrado = true;
  const p = $('#instalar'); p.hidden = false;
  if (ios) { $('#instTxt').textContent = 'En Safari toca Compartir y luego «Agregar a inicio». Funcionará sin internet.'; $('#instSi').hidden = true; $('#instNo').textContent = 'Entendido'; }
  $('#instSi').onclick = async () => { p.hidden = true; if (E.instalarEvt) { E.instalarEvt.prompt(); E.instalarEvt = null; } };
  $('#instNo').onclick = () => { p.hidden = true; };
}

/* ---------- Conexión ---------- */
function estadoRed() {
  const a = $('#avisoRed');
  a.hidden = navigator.onLine;
  a.textContent = 'Sin conexión: Asistente UIG funciona con la base guardada en tu dispositivo. Los enlaces a fuentes oficiales requieren internet.';
}
addEventListener('online', estadoRed); addEventListener('offline', estadoRed);

/* ---------- Arranque ---------- */
async function iniciar() {
  $('#btnSalir').onclick = salir;
  $('#btnMenu').onclick = () => { const c = $('#cab'), ab = !c.classList.contains('abierto'); c.classList.toggle('abierto', ab); $('#btnMenu').setAttribute('aria-expanded', String(ab)); };
  $('#btnModo').onclick = () => elegirModo(E.modo === 'servidora' ? 'ciudadania' : 'servidora');
  $('#btnFacil').onclick = () => { E.facil = !E.facil; document.body.classList.toggle('facil-on', E.facil); $('#btnFacil').setAttribute('aria-checked', String(E.facil)); };
  $('#btnTexto').onclick = () => { E.esc = E.esc >= 1.3 ? 1 : +(E.esc + 0.15).toFixed(2); document.documentElement.style.setProperty('--esc', E.esc); };
  const ta = $('#entrada');
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#formEntrada').requestSubmit(); } });
  $('#formEntrada').onsubmit = e => { e.preventDefault(); const t = ta.value; ta.value = ''; ta.style.height = 'auto'; responder(t); };
  estadoRed();
  try {
    const [docs, faq, riesgo, dir, glo] = await Promise.all([json('data/docs.json'), json('data/faq.json'), json('data/riesgo.json'),
      json('data/directorio.json').catch(() => null), json('data/glosario.json').catch(() => ({ terminos: [] }))]);
    E.docs = docs.docs; E.corte = docs.corte; E.faq = faq.faq; E.riesgo = riesgo.expresiones; E.dir = dir;
    E.glosario = glo.terminos.sort((a, b) => b.t.length - a.t.length);
    for (const d of E.docs) E.docMap[d.id] = d;
    E.docsMain = E.docs.filter(d => d.nivel !== 3); E.docsN3 = E.docs.filter(d => d.nivel === 3);
    E.idxPromise = json('data/indice.json');
    E.idxPromise.then(x => { E.idx = x; }).catch(() => {});
  } catch (e) {
    burbuja('<p>No pude cargar la base normativa. Revisa tu conexión e inténtalo de nuevo. Si estás en peligro, llama al <a href="tel:911">911</a>.</p>');
    return;
  }
  saludo();
  pintarSugerencias();
  reiniciarReloj();
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      const listo = await navigator.serviceWorker.ready;
      const urls = ['data/textos-n1.json', 'data/textos-n2.json', ...Object.values(DESCARGAS).map(d => d.url)];
      (listo.active || reg.active)?.postMessage({ tipo: 'precargar', urls });
    } catch (e) {}
  }
}
document.addEventListener('DOMContentLoaded', iniciar);
