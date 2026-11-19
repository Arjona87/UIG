#!/usr/bin/env python3
"""
Asistente UIG · Verificador de vigencia

    python herramientas/verificar_vigencia.py --excel Base_Normativa.xlsx --docs carpeta_documentos [--salida vigencia.csv]

Lee la leyenda «Última reforma …» que traen los propios PDF (DOF, Periódico Oficial «El Estado de
Jalisco») y la compara con la columna «Fecha de última reforma» del Excel índice.

Resultados por documento:
  COINCIDE      la fecha del PDF y la del Excel son la misma
  DIFERENTE     no coinciden: revisa cuál es la vigente antes de reconstruir la base
  PDF SIN FECHA el PDF no trae la leyenda (normal en acuerdos, protocolos y libros)
  SIN FECHA EN EL EXCEL  la columna dice «Sin reformas», «Versión del documento», etc. (no hay qué comparar)

No consulta internet: el DOF y el Periódico Oficial no ofrecen un servicio abierto para
automatizarlo. Para confirmar una reforma nueva, abre la URL de la columna «URL ficha».
"""
import argparse, csv, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from construir_base import leer_excel

MESES = {m: i for i, m in enumerate('enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(), 1)}
RE_NUM = re.compile(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})')
RE_TXT = re.compile(r'(\d{1,2})\s+de\s+(' + '|'.join(MESES) + r')\s+(?:de|del)\s+(\d{4})', re.I)
LEYENDA = re.compile(r'[úu]ltima\s+reforma[^\n]{0,160}(?:\n[^\n]{0,120})?', re.I)

def fechas(t):
    out = [(int(a), int(m), int(b)) for a, m, b in RE_NUM.findall(t)]
    out += [(int(a), MESES[m.lower()], int(b)) for a, m, b in RE_TXT.findall(t)]
    out += [(int(d), int(m), int(y)) for y, m, d in re.findall(r'(\d{4})-(\d{2})-(\d{2})', t)]   # fecha leída por Excel como fecha
    return [f for f in out if 1 <= f[1] <= 12 and 1 <= f[0] <= 31]

def texto_inicio(pdf):
    try:
        return subprocess.run(['pdftotext', '-l', '3', '-layout', pdf, '-'], capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return ''

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--excel', required=True); ap.add_argument('--docs', required=True)
    ap.add_argument('--salida', default='vigencia.csv')
    a = ap.parse_args()
    archivos = {f[:3]: os.path.join(a.docs, f) for f in os.listdir(a.docs) if re.match(r'^\d{3}_', f)}
    filas, cuenta = [], {}
    for f in leer_excel(a.excel):
        nid = f'{f["n"]:03d}'
        pdf = archivos.get(nid)
        ley = LEYENDA.search(texto_inicio(pdf)) if pdf and pdf.lower().endswith('.pdf') else None
        f_pdf = fechas(ley.group(0))[:1] if ley else []
        f_xls = fechas(f['fecha'])
        if not f_xls: res = 'SIN FECHA EN EL EXCEL'
        elif not f_pdf: res = 'PDF SIN FECHA'
        elif f_pdf[0] in f_xls: res = 'COINCIDE'
        else: res = 'DIFERENTE'
        cuenta[res] = cuenta.get(res, 0) + 1
        fp = '%02d/%02d/%d' % f_pdf[0] if f_pdf else ''
        filas.append([nid, f['nombre'][:90], f['fecha'], fp, res, ' '.join(ley.group(0).split())[:140] if ley else ''])
    with open(a.salida, 'w', newline='', encoding='utf-8-sig') as h:
        w = csv.writer(h); w.writerow(['#', 'Documento', 'Fecha en el Excel', 'Fecha en el PDF', 'Resultado', 'Leyenda encontrada'])
        w.writerows(filas)
    for r in filas:
        if r[4] == 'DIFERENTE':
            print(f'DIFERENTE  #{r[0]} {r[1][:60]} · Excel: {r[2]} · PDF: {r[3]}')
    print('Resumen:', ', '.join(f'{k}: {v}' for k, v in sorted(cuenta.items())), '· detalle en', a.salida)

if __name__ == '__main__':
    main()
