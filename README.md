# Asistente UIG · v3.3

App web instalable (PWA) de orientación normativa para Unidades de Igualdad de Género y ciudadanía en Jalisco.
Cada respuesta cita **artículo, ordenamiento y fecha de última reforma**, y funciona **sin conexión** después de la primera visita.
Elaborada por CGES/DGAPP/AA.

## Despliegue desde cero (GitHub Pages, desde el navegador)
1. En github.com: **+ → New repository**. Nombre: `UIG` (o el que prefieras). Visibilidad: **Public**. Crear.
2. Descomprime `AsistenteUIG_v3.3.zip` en tu computadora. Entra a la carpeta `AsistenteUIG`.
3. En el repositorio nuevo, toca **uploading an existing file**. Selecciona **todo el contenido** de la carpeta (archivos y carpetas: `assets`, `data`, `descargas`, `herramientas` y los archivos sueltos) y arrástralo. Son unos 40 archivos: entran en **una sola carga**.
4. Presiona **Commit changes** y espera a que termine de subir (los archivos de `data` pesan unos 30 MB en total).
5. Revisa que `index.html` quede en la **raíz** del repositorio, no dentro de una subcarpeta.
6. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save.**
7. En 1 o 2 minutos aparece *"Your site is live at https://TU-USUARIO.github.io/UIG/"*. Ábrela una vez con internet; después funciona sin conexión.

> El archivo `.gitignore` empieza con punto y algunas computadoras lo ocultan. Si no se sube, no pasa nada.
> Para probar en tu computadora antes de publicar: dentro de la carpeta, `python -m http.server 8000` y abre `http://localhost:8000`.

## Qué trae la v3.3
- **Nuevo avatar:** fotografía generada con IA, con la leyenda «Asistente virtual» en el encabezado; también en el ícono de la app y de la pestaña.
- **Presentación «Marco normativo de las UIG» (25N):** al escribir «PPTX», «PPT», «presentación» o «diapositivas», el Asistente ofrece la descarga en PPTX, PPT y PDF (también sin conexión).
- **La presentación entra a la base (#155)** como fuente complementaria: se consulta después de leyes y protocolos, se cita por lámina y lleva la marca «Presentación institucional, no es norma».
- **10 preguntas nuevas** en la categoría «Marco normativo, derechos humanos e indicadores»: derechos humanos y garantías, artículo 1° constitucional, parámetro de regularidad, criterios de la SCJN sobre perspectiva de género, acciones afirmativas, marco normativo de las UIG, NOM-035 y NMX-R-025, derechos en cada etapa de la atención, metas e indicadores del PEDG y la UIG en el Plan Institucional de la CGES.

## Qué trae la v3.2
- **Protocolo Cero** en la base: el texto oficial (Acuerdo DIELAG ACU 043/2019, Periódico Oficial 11/06/2019, leído por OCR y revisado), su Programa de Prevención y su Guía de aplicación.
- **10 preguntas del Protocolo Cero** (qué es, diferencia entre hostigamiento y acoso, conductas, cómo denunciar, autoridades, qué pasa después, medidas, sanciones, trato a la víctima y obligaciones de la dependencia), con descarga de los tres documentos y enlace a la página oficial: https://igualdad.jalisco.gob.mx/acciones/protocolo-cero/
- La pestaña del navegador y la app instalada se llaman «Asistente Unidad de Igualdad de Género».

## Qué trae la v3.1
- **Documento núcleo de las UIG:** el Plan de Trabajo de las Unidades de Igualdad de Género (SISEMH, 2021) y el texto oficial del Acuerdo DIELAG ACU 084/2020 (Periódico Oficial, 31/12/2020) entran a la base y sustituyen a la ficha y al resumen que se habían elaborado (#144 y #145).
- **20 respuestas sobre las UIG** reescritas desde esas fuentes, con la frase «dos líneas estratégicas y cuatro ejes de trabajo rectores del quehacer de las unidades:». Nuevas: crear una UIG desde cero, cargos, sesiones, temas de cada sesión, actividades del plan, informe anual, capacitación y la UIG de la CGES (Acuerdo DIELAG ACU 43/2021).
- **Descargas:** guía «Cómo crear una UIG desde cero» en Word y PDF, Plan de Trabajo (PDF oficial) y Acuerdo 084/2020 (PDF del Periódico Oficial), también sin conexión.

## Qué trae la v3.0
- **100 preguntas frecuentes** (107 en la v3.1) con 268 citas verificadas, agrupadas en 8 temas (botón *Todas las preguntas*).
- **Respuesta según el perfil.** Ciudadanía: nunca recibe fragmentos de ley sin pedirlos; si su pregunta no está en las frecuentes, recibe orientación, preguntas parecidas y a dónde acudir, y puede tocar *Ver qué dice la ley*. Servidoras y servidores públicos: reciben preguntas parecidas y los fragmentos normativos.
- **«¿Te refieres a…?»**: hasta 3 preguntas frecuentes parecidas cuando la consulta no coincide exactamente.
- **Ruta guiada «¿Qué te pasó?»** (ciudadanía): 10 botones para orientarse sin escribir.
- **Escuchar**: lee la respuesta en voz alta con la voz del teléfono.
- **Glosario tocable**: 31 términos jurídicos subrayados; al tocarlos aparece su definición con artículo, ley y fecha.
- **Borrado por inactividad**: tras 10 minutos sin uso la conversación se borra (`CONFIG.inactividadMin` en `app.js`).
- **Directorio por municipio**: se activa solo cuando `data/directorio.json` tenga `"validado": true`.
- **Llamada directa** a la Red de Centros de Justicia para las Mujeres (33 3668 1880, catálogo oficial).

## Qué hay en cada archivo
| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app: interfaz, búsqueda, detección de riesgo, PDF, salida rápida |
| `sw.js`, `manifest.webmanifest` | Funcionamiento sin conexión e instalación en el teléfono |
| `aviso-privacidad.html` | Aviso de privacidad genérico (completar campos en amarillo y validar con Jurídico) |
| `data/docs.json` | Ficha de cada documento: nombre oficial, ámbito, fecha de última reforma, estatus, nivel, URL |
| `data/textos-n1.json`, `-n2`, `-n3` | Texto de todos los documentos, en un archivo por nivel |
| `data/indice.json`, `data/indice-n3.json` | Índices de búsqueda |
| `data/faq.json` | Preguntas frecuentes con respuesta, lectura fácil y citas |
| `data/glosario.json` | 31 términos con definición y cita |
| `data/riesgo.json` | 30 expresiones de riesgo que activan la respuesta de crisis |
| `data/directorio.json` | Directorio de canalización (vacío hasta que se valide) |
| `herramientas/construir_base.py` | Reconstruye `data/` desde el Excel y la carpeta de documentos |
| `herramientas/probar_base.py` | Prueba automática: citas, reconocimiento de las 100 preguntas y sus variantes, frases de riesgo |
| `herramientas/verificar_vigencia.py` | Compara la fecha de última reforma impresa en cada PDF con la del Excel |
| `descargas/` | Guía para crear una UIG (Word y PDF), Plan de Trabajo, Acuerdo 084/2020 los tres documentos del Protocolo Cero y la presentación «Marco normativo de las UIG» (PPTX, PPT y PDF) |
| `herramientas/correcciones/` | Correcciones documentadas: tablas transcritas fila por fila y numeración de páginas de recortes del Periódico Oficial |
| `herramientas/guia/guia.js` | Genera la guía en Word (`node guia.js`, requiere el paquete `docx` de npm) |

## Fase 2 (pendiente)
En `app.js`, `CONFIG.ia` y `CONFIG.estadisticas` están apagados. Se activan cuando exista la cuenta del API de Anthropic y el intermediario (Cloudflare Worker).
