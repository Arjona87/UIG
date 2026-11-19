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
   python herramientas\construir_base.py --excel "C:\ruta\Base_Normativa_Chatbot_v7.xlsx" --docs "C:\ruta\Normativa_vigente" --salida data --textos _textos --solo 080
   ```
4. Revisa el resumen que imprime (documentos, unidades y AVISOS).
5. Sube a GitHub, en una sola carga, la carpeta `data/` completa (10 archivos) y `sw.js`: en el repositorio, **Add file → Upload files**, arrástralos y presiona **Commit changes**. GitHub reemplaza los archivos con el mismo nombre.
   El script cambia la versión de `sw.js` para que los teléfonos descarguen la base nueva. **Si editas a mano** `faq.json` o `directorio.json`, cambia tú el número de `const VERSION` en la línea 3 de `sw.js` (por ejemplo, fecha y hora: `202612011030`).

## Agregar o quitar un documento
- **Agregar:** pon el archivo con un número nuevo (`144_...pdf`), agrega su fila al Excel y llena *Nivel chatbot* (1, 2 o 3) y *Citación en chatbot* (`Normal`, `Con marca: vigencia por confirmar`, `Con aviso de transición`, `Histórico (abrogada): solo si se pide por nombre`).
- **Quitar:** en *Citación en chatbot* escribe `Excluido (motivo)`.

## Columnas del Excel que usa la app
`#`, `Nombre oficial / jurídico`, `Ámbito`, `Tipo de documento`, `Fecha de última reforma`, `Estatus`, `URL documento vigente`, `Nivel chatbot`, `Citación en chatbot`, `Nombre corto (chatbot)`, `Alias de búsqueda` (frases separadas por `|`).

## Preguntas frecuentes y directorio
- `data/faq.json`: si una reforma cambia un artículo citado en una respuesta frecuente, revisa el texto de esa respuesta.
- `data/directorio.json`: captura las instituciones validadas y cambia `"validado": false` a `true`.
