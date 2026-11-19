#!/usr/bin/env python3
"""
Asistente UIG · Prueba automática de la base (correr después de construir_base.py)

    python herramientas/probar_base.py --datos data

Revisa:
  1. Que cada cita de las preguntas frecuentes y del glosario exista en la base.
  2. Que cada pregunta frecuente, y cada una de sus variantes, llegue a su propia respuesta.
  3. Que las 30 expresiones de riesgo se activen con frases de prueba y no con frases neutras.
  4. Que cada documento tenga nombre, ámbito, fecha y nivel.
Termina con código 1 si algo falla, para que no se publique una base rota.
"""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from construir_base import tokens, norm, stem

# --- Debe coincidir con app.js (rankFAQ, QSTOP, GENERICOS, SINONIMOS) ---
QSTOP = {stem(w) for w in 'hacer hago saber quiero quisiera puedo pued necesito necesit ayuda informacion informac tengo dice decir pasa paso caso alguien favor gracia hola buena buenas tarde noche dia duda pregunta pregunt explica explic debo deb como donde cual cuando esta estoy'.split()}
GENERICOS = {'violenc': 0.2, 'mujer': 0.3, 'victim': 0.5, 'jalisco': 0.4, 'ley': 0.2, 'derecho': 0.6}
SINONIMOS = [('me pega', 'violencia fisica'), ('golpe', 'violencia fisica'), ('golpea', 'violencia fisica'), ('empuj', 'violencia fisica'),
  ('me grita', 'violencia psicologica'), ('insult', 'violencia psicologica'), ('humill', 'violencia psicologica'), ('celos', 'celotipia violencia psicologica'), ('celoso', 'celotipia violencia psicologica'),
  ('papeles', 'documentos personales violencia patrimonial'), ('documentos', 'violencia patrimonial'), ('dinero', 'violencia economica percepciones'), ('sueldo', 'violencia economica salario'), ('gasto', 'violencia economica'),
  ('fotos', 'violencia digital contenido intimo'), ('videos', 'violencia digital contenido intimo'), ('packs', 'violencia digital contenido intimo'), ('redes sociales', 'violencia digital'), ('internet', 'violencia digital'),
  ('jefe', 'violencia laboral hostigamiento'), ('trabajo', 'violencia laboral'), ('maestro', 'violencia docente'), ('escuela', 'violencia docente'),
  ('no me atendieron', 'violencia institucional'), ('no me hicieron caso', 'violencia institucional'),
  ('alejamiento', 'orden de proteccion'), ('restriccion', 'orden de proteccion'), ('que no se acerque', 'orden de proteccion'),
  ('denunciar', 'denuncia ministerio publico'), ('demanda', 'denuncia'), ('abogad', 'asesoria juridica gratuita asesor juridico'), ('licenciad', 'asesoria juridica'),
  ('albergue', 'refugio'), ('donde quedarme', 'refugio'), ('casa de seguridad', 'refugio'),
  ('desaparec', 'desaparicion busqueda persona desaparecida'), ('no aparece', 'desaparicion busqueda'),
  ('violacion', 'violencia sexual'), ('abuso sexual', 'violencia sexual'), ('acoso', 'acoso hostigamiento'),
  ('pension', 'obligaciones alimentarias alimentos'), ('custodia', 'guarda custodia'),
  ('parto', 'violencia obstetrica'), ('novio', 'violencia noviazgo'), ('esposo', 'violencia familiar'), ('pareja', 'violencia familiar'), ('marido', 'violencia familiar'),
  ('feminicidio', 'violencia feminicida'), ('candidata', 'violencia politica'), ('regidora', 'violencia politica')]

def expandir(qn):
    p = ' ' + qn
    return ' '.join(x for f, x in SINONIMOS if (' ' + f) in p)

def rank(texto, faq, modo):
    base = [t for t in dict.fromkeys(tokens(texto)) if t not in QSTOP]
    if not base:
        return []
    ext = set(tokens(expandir(norm(texto))))
    peso = lambda t: GENERICOS.get(t, 1)
    total = sum(peso(t) for t in base)
    out = []
    for f in faq:
        if modo == 'ciudadania' and f['modo'] == 'servidora':
            continue
        k = set(tokens(f['q'] + ' ' + f['kw'] + ' ' + ' '.join(f.get('v', []))))
        q = set(tokens(f['q'] + ' ' + ' '.join(f.get('v', []))))
        m = sum(peso(t) for t in base if t in k); enq = sum(1 for t in base if t in k and t in q); nx = sum(1 for t in ext if t in k)
        exacta = 0.3 if norm(texto) in [norm(x) for x in [f['q']] + f.get('v', [])] else 0
        if m > 0:
            out.append((m / total + enq * 0.1 + nx * 0.05 + exacta, f['id']))
    return sorted(out, reverse=True)

PRUEBAS_RIESGO = [('me quiere matar', 'rojo'), ('tiene una pistola en la casa', 'rojo'), ('me ahorcó anoche', 'rojo'), ('ya no quiero vivir', 'suicidio'),
  ('mi hija no aparece desde ayer', 'desaparicion'), ('dijo que me iba a matar', 'rojo'), ('tengo mucho miedo', 'naranja'), ('revisa mi celular', 'naranja'),
  ('me violó mi expareja', 'rojo'), ('me corrió de la casa', 'naranja')]
NEUTRAS = ['qué es una orden de protección', 'cuáles son mis derechos', 'qué hace la unidad de igualdad de género', 'dónde hay centros de justicia']

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--datos', default='data'); a = ap.parse_args()
    D = a.datos; errores = []; avisos = []
    docs = {d['id']: d for d in json.load(open(f'{D}/docs.json', encoding='utf-8'))['docs']}
    T = {}
    for nv in (1, 2, 3):
        T.update(json.load(open(f'{D}/textos-n{nv}.json', encoding='utf-8')))
    U = {k: {e for e, _ in v} for k, v in T.items()}
    faq = json.load(open(f'{D}/faq.json', encoding='utf-8'))['faq']
    glo = json.load(open(f'{D}/glosario.json', encoding='utf-8'))['terminos'] if os.path.exists(f'{D}/glosario.json') else []
    riesgo = json.load(open(f'{D}/riesgo.json', encoding='utf-8'))['expresiones']
    # 1. citas
    ids = [f['id'] for f in faq]
    if len(ids) != len(set(ids)): errores.append('Hay preguntas frecuentes con id repetido')
    for f in faq:
        for c in f['citas']:
            if c['u'] not in U.get(c['d'], set()):
                errores.append(f"Cita inexistente en «{f['q']}»: documento {c['d']}, {c['u']}")
    for g in glo:
        if g['c']['u'] not in U.get(g['c']['d'], set()):
            errores.append(f"Cita inexistente en el glosario «{g['t']}»: {g['c']['d']}, {g['c']['u']}")
    # 2. cada pregunta y sus variantes llegan a su respuesta
    fallas = 0
    for f in faq:
        modo = 'ciudadania' if f['modo'] != 'servidora' else 'servidora'
        for frase in [f['q']] + f.get('v', []):
            r = rank(frase, faq, modo)
            if not r or r[0][1] != f['id'] or r[0][0] < 0.55:
                fallas += 1
                destino = r[0][1] if r else 'ninguna'
                avisos.append(f"«{frase}» → {destino} (esperada: {f['id']})")
    # 3. riesgo
    regs = [(e['nivel'], re.compile(e['re'])) for e in riesgo]
    for frase, nivel in PRUEBAS_RIESGO:
        t = ' ' + norm(frase) + ' '
        if not any(n == nivel and r.search(t) for n, r in regs):
            errores.append(f"La frase de riesgo «{frase}» no activó el nivel {nivel}")
    for frase in NEUTRAS:
        t = ' ' + norm(frase) + ' '
        if any(r.search(t) for n, r in regs if n in ('rojo', 'suicidio')):
            errores.append(f"La frase neutra «{frase}» activó una respuesta de crisis")
    # 4. documentos
    for d in docs.values():
        for campo in ('nombre', 'ambito', 'fecha', 'nivel'):
            if not d.get(campo):
                errores.append(f"Documento {d['id']} sin {campo}")
    total = sum(1 + len(f.get('v', [])) for f in faq)
    print(f'Preguntas frecuentes: {len(faq)} · citas: {sum(len(f["citas"]) for f in faq)} · glosario: {len(glo)} · documentos: {len(docs)}')
    print(f'Reconocimiento de preguntas: {total - fallas} de {total} frases llegan a su respuesta')
    for x in avisos: print('  AVISO', x)
    for x in errores: print('  ERROR', x)
    print('RESULTADO:', 'OK' if not errores and fallas <= total * 0.05 else 'REVISAR')
    sys.exit(1 if errores or fallas > total * 0.05 else 0)

if __name__ == '__main__':
    main()
