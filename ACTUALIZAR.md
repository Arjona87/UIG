# Cómo actualizar la base cuando hay una reforma

**La única fuente de verdad es el Excel** (`Base_Normativa_Chatbot_..._v7.xlsx`). La app nunca inventa fechas ni nombres: los toma de ahí.

## Requisitos (una sola vez)
- Python 3.9 o superior: https://www.python.org/downloads/
- En una terminal: `pip install pandas openpyxl pypdf`
- Opcional, mejor extracción: Poppler para Windows (`pdftotext`) y Tesseract (OCR de PDF escaneados).

## Pasos para una reforma
1. Descarga el PDF vigente desde la fuente oficial y reemplaza el archivo en la carpeta `Normativa_vigente` **conservando el número inicial** (por ejemplo `080_...pdf`).
2. En el Excel, en la fila de ese número, actualiza **Fecha de última reforma**, **Estatus** y, si cambió, la **URL**.
3. Corre (cambia las rutas por las tuyas; `--solo` vuelve a extraer solo los números indicados):
   ```
   python herramientas\construir_base.py --excel "C:\ruta\Base_Normativa_Chatbot_v11.xlsx" --docs "C:\ruta\Normativa_vigente" --salida data --textos _textos --solo 080
   ```
4. Revisa el resumen que imprime (documentos, unidades y AVISOS).
   Después corre la prueba automática. Si dice `RESULTADO: REVISAR`, no publiques hasta corregir lo que señala:
   ```
   python herramientas\probar_base.py --datos data
   ```
   Para revisar que las fechas del Excel coincidan con las de los PDF:
   ```
   python herramientas\verificar_vigencia.py --excel "C:\ruta\Base_Normativa_Chatbot_v11.xlsx" --docs "C:\ruta\Normativa_vigente" --salida vigencia.csv
   ```
5. Sube a GitHub, en una sola carga, la carpeta `data/` completa (11 archivos) y `sw.js`: en el repositorio, **Add file → Upload files**, arrástralos y presiona **Commit changes**. GitHub reemplaza los archivos con el mismo nombre.
   El script cambia la versión de `sw.js` para que los teléfonos descarguen la base nueva. **Si editas a mano** `faq.json`, `glosario.json` o `directorio.json`, cambia tú el número de `const VERSION` en la línea 3 de `sw.js` (por ejemplo, fecha y hora: `202612011030`).

## Agregar o quitar un documento
- **Agregar:** pon el archivo con un número nuevo (`144_...pdf`), agrega su fila al Excel y llena *Nivel chatbot* (1, 2 o 3) y *Citación en chatbot* (`Normal`, `Con marca: vigencia por confirmar`, `Con aviso de transición`, `Histórico (abrogada): solo si se pide por nombre`).
- **Quitar:** en *Citación en chatbot* escribe `Excluido (motivo)`.

## Columnas del Excel que usa la app
`#`, `Nombre oficial / jurídico`, `Ámbito`, `Tipo de documento`, `Fecha de última reforma`, `Estatus`, `URL documento vigente`, `Nivel chatbot`, `Citación en chatbot`, `Nombre corto (chatbot)`, `Alias de búsqueda` (frases separadas por `|`).

## Documentos con tratamiento especial
- **Planes con apartados numerados** (Tipo de documento que empieza con «Plan»): se citan por numeral, por ejemplo «Numeral 6 (Sesiones)».
- **Acuerdos publicados en el Periódico Oficial con lineamientos** (Tipo «Acuerdo»): se citan como «Acuerdo Primero», «Lineamiento Quinto», «Transitorios».
- **Protocolos con párrafos numerados** (Tipo «Protocolo (párrafos numerados)»): se citan como «Numeral 24». El Protocolo Cero (#152) usa este tipo.
- **Correcciones** (`herramientas/correcciones/NNN.json`): `unidades` reemplaza el texto de un apartado (por ejemplo, una tabla que el PDF desordena); `pagina_inicial` hace que un recorte del Periódico Oficial se cite con la página del ejemplar.
- **Descargas** (`descargas/`): si cambias la guía o un PDF, conserva el mismo nombre de archivo y cambia la VERSION de `sw.js`. Para rehacer la guía: `node herramientas/guia/guia.js descargas/Guia_crear_UIG_desde_cero.docx` y conviértela a PDF con Word o LibreOffice.

## Preguntas frecuentes y directorio
- `data/faq.json`: si una reforma cambia un artículo citado en una respuesta frecuente, revisa el texto de esa respuesta.
- Cada pregunta frecuente tiene `q` (pregunta), `v` (otras formas de preguntarlo), `kw` (palabras clave), `modo` (`ambos`, `ciudadania` o `servidora`), `facil` (lectura fácil) y `citas` (`d` = número de documento, `u` = artículo tal como aparece en la base) y, opcionalmente, `descargas` (`guia_docx`, `guia_pdf`, `plan_pdf`, `acuerdo_pdf`, `protocolo_pdf`, `guia_pc_pdf`, `programa_pdf` y `protocolo_web`, que es el enlace a la página oficial). La prueba automática avisa si una cita no existe.
- `data/glosario.json`: cada término lleva `t` (término tal como aparece en el texto), `d` (definición) y `c` (cita).
- `data/directorio.json`: captura las instituciones validadas y cambia `"validado": false` a `true`.
