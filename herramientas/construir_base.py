#!/usr/bin/env python3
"""
Asistente UIG · Construcción de la base normativa
=================================================
Convierte la carpeta de documentos + el Excel índice en los archivos de datos que usa la app.

Uso (Windows o Linux):
    python construir_base.py --excel Base_Normativa_Chatbot_v7.xlsx --docs "C:\\ruta\\Normativa_vigente" --salida app\\data

Opcional:
    --textos carpeta_cache   Guarda/reutiliza el texto extraído (acelera reconstrucciones)
    --solo 080,050           Re-extrae solo esos números (útil después de una reforma)

Requisitos: Python 3.9+, pandas, openpyxl. Para extraer texto usa `pdftotext` (Poppler) si está
instalado; si no, usa `pypdf` (pip install pypdf). El OCR (tesseract) es opcional.

La única fuente de verdad es el Excel: nombre oficial, fecha de última reforma, estatus, URL,
Nivel chatbot y Citación en chatbot. Para actualizar una reforma: reemplace el PDF, corrija la fila
del Excel y vuelva a correr este script (ver ACTUALIZAR.md).
"""
import argparse, json, os, re, shutil, subprocess, sys, unicodedata, math, datetime, gzip
from collections import Counter, defaultdict

# ---------------------------------------------------------------- normalización (idéntica en app.js)
STOP = set("""a al algo algun alguna algunas alguno algunos ante antes asi aun bajo bien cada como con contra cual
cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa esas ese eso esos esta estan estas
este esto estos fue fueron ha han hasta hay la las le les lo los mas me mi mis mismo muy nada ni no nos o otra otras otro
otros para pero poco por porque que quien quienes se segun ser si sido sin sobre son su sus tal tambien tan te tiene
tienen todo todos tu tus u un una unas uno unos y ya yo fraccion fracciones articulo articulos presente ley parrafo
inciso dicha dicho dichos dichas mediante asi cual misma mismas mismos cuya cuyo deberan debera podra podran sera seran""".split())

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s)

def stem(w):
    if len(w) > 4 and w.endswith('es') and w[-3] not in 'aeiou':
        w = w[:-2]
    elif len(w) > 3 and w.endswith('s'):
        w = w[:-1]
    return w[:7]

def tokens(s):
    out = []
    for w in norm(s).split():
        if w in STOP or len(w) < 2 or (w.isdigit() and len(w) > 4):
            continue
        out.append(stem(w))
    return out

# ---------------------------------------------------------------- extracción
def extraer(pdf, destino):
    if pdf.lower().endswith('.doc') or pdf.lower().endswith('.docx'):
        tmp = os.path.dirname(destino)
        subprocess.run(['soffice', '--headless', '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', tmp, pdf],
                       capture_output=True)
        base = os.path.splitext(os.path.basename(pdf))[0] + '.txt'
        if os.path.exists(os.path.join(tmp, base)):
            shutil.move(os.path.join(tmp, base), destino)
        return
    if shutil.which('pdftotext'):
        subprocess.run(['pdftotext', '-enc', 'UTF-8', pdf, destino], capture_output=True)
    else:
        from pypdf import PdfReader
        r = PdfReader(pdf)
        open(destino, 'w', encoding='utf-8').write('\f'.join((p.extract_text() or '') for p in r.pages) + '\f')
    if shutil.which('tesseract') and shutil.which('pdftoppm'):
        pags = open(destino, encoding='utf-8', errors='ignore').read().split('\f')
        vacias = [i for i, p in enumerate(pags[:-1]) if len(p.strip()) < 80]
        if vacias and len(vacias) <= 400:
            for i in vacias:
                base = destino + f'.p{i}'
                subprocess.run(['pdftoppm', '-r', '200', '-gray', '-f', str(i + 1), '-l', str(i + 1), '-png', '-singlefile', pdf, base], capture_output=True)
                r = subprocess.run(['tesseract', base + '.png', '-', '-l', 'spa'], capture_output=True, text=True)
                pags[i] = r.stdout
                if os.path.exists(base + '.png'): os.remove(base + '.png')
            open(destino, 'w', encoding='utf-8').write('\f'.join(pags))

# ---------------------------------------------------------------- limpieza
def limpiar_paginas(texto):
    pags = texto.split('\f')
    if pags and not pags[-1].strip():
        pags = pags[:-1]
    cuenta = Counter()
    for p in pags:
        for l in set(x.strip() for x in p.split('\n') if x.strip()):
            cuenta[l] += 1
    umbral = max(4, int(len(pags) * 0.25))
    repetidas = {l for l, c in cuenta.items() if c >= umbral and len(pags) >= 4 and len(l) < 160
                 and len(l) >= 6 and not re.match(r'^([IVXLC]+|[a-zA-Z]|\d{1,3})[\.\)]?-?$', l)}
    out = []
    for p in pags:
        ls = [l for l in p.split('\n') if l.strip() not in repetidas
              and not re.match(r'^\s*(p[áa]g(ina)?\.?\s*)?\d{1,4}(\s*(de|/)\s*\d{1,4})?\s*$', l, re.I)]
        out.append('\n'.join(ls))
    return out

def parrafos(t):
    t = re.sub(r'(\w)-\n(\w)', r'\1\2', t)
    t = re.sub(r'[ \t]+', ' ', t)
    # conserva saltos antes de fracciones, incisos y numerales; une el resto
    t = re.sub(r'\n(?!\s*(?:[IVXLC]+\.|[IVXLC]+\s*\.-|[a-zñ]\)|\d+\.\s|\d+\)|[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{6,}$))', ' ', t)
    t = re.sub(r'\n\s*\n+', '\n', t)
    return re.sub(r' {2,}', ' ', t).strip()

ENCAB = re.compile(r'\s(?:T[ÍI]TULO|CAP[ÍI]TULO|SECCI[ÓO]N|LIBRO)\s+(?:[IVXLC]+|[ÚU]NIC[OA]|PRIMER[OA]?|SEGUND[OA]|TERCER[OA]?|CUART[OA]|QUINT[OA]|SEXT[OA]|S[ÉE]PTIM[OA]|OCTAV[OA]|NOVEN[OA]|D[ÉE]CIM[OA])\b')

def quitar_encabezados(c):
    """Quita encabezados de Título/Capítulo que quedan pegados al final del artículo anterior."""
    for m in ENCAB.finditer(c):
        resto = c[m.start():]
        letras = [ch for ch in resto[:80] if ch.isalpha()]
        if len(resto) < 450 and letras and sum(ch.isupper() for ch in letras) / len(letras) > 0.45:
            return c[:m.start()].rstrip()
    return c

TIPOS_ART = ('Ley', 'Código', 'Reglamento', 'Constitución', 'Tratado', 'Declaración', 'Principios', 'Resolución', 'Convención', 'Convenio', 'Pacto')
HEAD = re.compile(r'^[ \t]*(?:ART[ÍI]CULO|Art[íi]culo|ARTICULO)\s+(\d{1,4})\s*(?:o\.?|º|°|\.o\.?)?\s*'
                  r'(?:-\s*)?((?i:qu[áa]terdecies|terdecies|duodecies|undecies|quindecies|decies|nonies|octies|septies|sex[ií]es|quinquies|quintus|sextus|s[ée]ptimus|octavus|novenus|qu[áa]ter|ter|bis)(?:\s*\d+)?|[A-Z](?:\s+(?i:bis|ter|qu[áa]ter))?(?=\s*[\.\-–—]))?'
                  r'\s*(?:[\.\-–—:]|$|(?=\s+[A-ZÁÉÍÓÚÑ]))', re.M)
TRANS = re.compile(r'^\s*(?:ART[ÍI]CULOS\s+)?TRANSITORIOS?\s*\.?\s*$', re.M | re.I)

def segmentar(texto, tipo):
    pags = limpiar_paginas(texto)
    todo = '\n'.join(pags)
    if any(tipo.startswith(t) for t in TIPOS_ART):
        ms = list(HEAD.finditer(todo))
        ini = next((i for i, m in enumerate(ms) if int(m.group(1)) == 1), None)
        if ini is not None:
            fin_txt = TRANS.search(todo, ms[ini].start())
            limite = fin_txt.start() if fin_txt else len(todo)
            acept, prev = [], 0
            for m in ms[ini:]:
                if m.start() >= limite: break
                n = int(m.group(1))
                if prev <= n <= prev + 15:
                    acept.append(m); prev = n
            if len(acept) >= 5:
                units, vistos = [], {}
                for i, m in enumerate(acept):
                    fin = acept[i + 1].start() if i + 1 < len(acept) else limite
                    cuerpo = quitar_encabezados(re.sub(r'^[\s\.\-–—:]+', '', parrafos(todo[m.end():fin])))
                    suf = (' ' + ' '.join(w if len(w) == 1 else w.capitalize() for w in m.group(2).split())) if m.group(2) else ''
                    et = f'Artículo {int(m.group(1))}{suf}'
                    vistos[et] = vistos.get(et, 0) + 1
                    if vistos[et] > 1: et += f' [{vistos[et]}]'
                    if len(cuerpo) > 3:
                        units.append([et, cuerpo])
                return 'art', units
    units, buf, ini = [], '', 1
    for i, p in enumerate(pags):
        if not buf: ini = i + 1
        buf += ('\n' if buf else '') + p
        if len(buf.strip()) >= 400 or i == len(pags) - 1:
            if buf.strip():
                etiqueta = f'Pág. {ini}' if ini == i + 1 else f'Págs. {ini}-{i + 1}'
                units.append([etiqueta, parrafos(buf)])
            buf = ''
    return 'pag', units

FRAC = re.compile(r'(?m)^([IVXLC]+)\.[\s-]')
def fracciones(cuerpo):
    """Artículos largos con fracciones se indexan por fracción (el texto mostrado sigue siendo el artículo completo)."""
    ms = list(FRAC.finditer(cuerpo))
    if len(cuerpo) < 1500 or len(ms) < 3:
        return [('', cuerpo)]
    intro = cuerpo[:ms[0].start()][:300]
    out = [('', intro)] if intro.strip() else []
    for i, m in enumerate(ms):
        fin = ms[i + 1].start() if i + 1 < len(ms) else len(cuerpo)
        out.append((m.group(1), intro + ' ' + cuerpo[m.start():fin]))
    return out

# ---------------------------------------------------------------- Excel
def leer_excel(ruta):
    import pandas as pd
    d = pd.read_excel(ruta, sheet_name='Base_Normativa', header=3)
    d = d[pd.to_numeric(d['#'], errors='coerce').notna()].copy()
    col = lambda k: [c for c in d.columns if str(c).startswith(k)][0]
    filas = []
    for _, r in d.iterrows():
        g = lambda k: ('' if str(r[col(k)]) == 'nan' else str(r[col(k)]).strip())
        filas.append(dict(n=int(r['#']), nombre=g('Nombre oficial'), ambito=g('Ámbito'), tipo=g('Tipo'),
                          fecha=g('Fecha de última'), estatus=g('Estatus'), url=g('URL documento vigente') or g('URL ficha'),
                          ficha=g('URL ficha'), nivel=g('Nivel chatbot'), cita=g('Citación en chatbot'),
                          corto=g('Nombre corto'), alias=g('Alias de búsqueda')))
    return filas

# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--excel', required=True); ap.add_argument('--docs', required=True)
    ap.add_argument('--salida', required=True); ap.add_argument('--textos', default=None)
    ap.add_argument('--solo', default='')
    a = ap.parse_args()
    textos = a.textos or os.path.join(a.salida, '..', '_textos')
    os.makedirs(textos, exist_ok=True)
    solo = {s.strip().zfill(3) for s in a.solo.split(',') if s.strip()}
    archivos = {f[:3]: os.path.join(a.docs, f) for f in os.listdir(a.docs) if re.match(r'^\d{3}_', f)}
    filas = leer_excel(a.excel)
    os.makedirs(a.salida, exist_ok=True)
    docs, units_main, units_n3, avisos = [], [], [], []
    textos_por_nivel = {1: {}, 2: {}, 3: {}}
    for f in filas:
        nid = f'{f["n"]:03d}'
        if f['cita'].startswith('Excluido') or not f['nivel'] or f['nivel'] == '—':
            continue
        if nid not in archivos:
            avisos.append(f'#{nid}: está en el Excel pero no hay archivo'); continue
        txt = os.path.join(textos, nid + '.txt')
        if not os.path.exists(txt) or nid in solo:
            print('extrayendo', nid); extraer(archivos[nid], txt)
        texto = open(txt, encoding='utf-8', errors='ignore').read()
        modo, units = segmentar(texto, f['tipo'])
        if not units:
            avisos.append(f'#{nid}: sin texto utilizable'); continue
        nivel = int(float(f['nivel']))
        nombre = f['nombre']
        if f['n'] == 76:  # el archivo es la ley nueva (ver auditoría del Excel v7)
            nombre, f['fecha'], f['estatus'] = 'Ley en Materia de Telecomunicaciones y Radiodifusión', 'Sin reformas (nueva ley DOF 16/07/2025)', 'Vigente'
        meta = dict(id=nid, n=f['n'], nombre=nombre, corto=f['corto'] or nombre, ambito=f['ambito'], tipo=f['tipo'],
                    fecha=f['fecha'], estatus=f['estatus'], nivel=nivel, cita=f['cita'], url=f['url'], modo=modo,
                    alias=sorted({norm(x).strip() for x in (f['alias'].split('|') + [f['corto'] or nombre, nombre]) if norm(x).strip()}), nu=len(units))
        docs.append(meta)
        textos_por_nivel[nivel][nid] = units
        destino = units_n3 if nivel == 3 else units_main
        for i, (et, cuerpo) in enumerate(units):
            for fr, txt in fracciones(cuerpo) if modo == 'art' else [('', cuerpo)]:
                destino.append((len(docs) - 1, i, fr, tokens(et + ' ' + txt)))
    for nombre, lista in (('indice.json', units_main), ('indice-n3.json', units_n3)):
        post = defaultdict(list); dl = []; ref = []; fx = {}
        for k, (di, ui, fr, toks) in enumerate(lista):
            ref += [di, ui]; dl.append(len(toks))
            if fr: fx[k] = fr
            for t, c in Counter(toks).items():
                post[t] += [k, c]
        idx = dict(N=len(dl), avgdl=round(sum(dl) / max(1, len(dl)), 2), dl=dl, ref=ref, fx=fx, p=post)
        json.dump(idx, open(os.path.join(a.salida, nombre), 'w', encoding='utf-8'), separators=(',', ':'))
    # Textos en 3 archivos (uno por nivel): permite subir todo el sitio a GitHub en una sola carga
    for nv, mapa in textos_por_nivel.items():
        json.dump(mapa, open(os.path.join(a.salida, f'textos-n{nv}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    viejo = os.path.join(a.salida, 'docs')
    if os.path.isdir(viejo):
        shutil.rmtree(viejo)   # formato anterior (un archivo por documento)
    hoy = datetime.date.today().strftime('%d/%m/%Y')
    json.dump({'corte': hoy, 'docs': docs}, open(os.path.join(a.salida, 'docs.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    json.dump({'version': datetime.datetime.now().strftime('%Y%m%d%H%M'), 'corte': hoy},
              open(os.path.join(a.salida, 'version.json'), 'w'), separators=(',', ':'))
    sw = os.path.join(a.salida, '..', 'sw.js')
    if os.path.exists(sw):
        v = datetime.datetime.now().strftime('%Y%m%d%H%M')
        s = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{v}';", open(sw, encoding='utf-8').read())
        open(sw, 'w', encoding='utf-8').write(s)
    print(f'Documentos: {len(docs)}  ·  unidades núcleo+complementario: {len(units_main)}  ·  nivel 3: {len(units_n3)}')
    for x in avisos: print('AVISO', x)

if __name__ == '__main__':
    main()
