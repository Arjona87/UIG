# Asistente UIG · v3.0

App web instalable (PWA) de orientación normativa para Unidades de Igualdad de Género y ciudadanía en Jalisco.
Cada respuesta cita **artículo, ordenamiento y fecha de última reforma**, y funciona **sin conexión** después de la primera visita.
Elaborada por CGES/DGAPP/AA.

## Despliegue desde cero (GitHub Pages, desde el navegador)
1. En github.com: **+ → New repository**. Nombre: `UIG` (o el que prefieras). Visibilidad: **Public**. Crear.
2. Descomprime `AsistenteUIG_v3.0.zip` en tu computadora. Entra a la carpeta `AsistenteUIG`.
3. En el repositorio nuevo, toca **uploading an existing file**. Selecciona **todo el contenido** de la carpeta (archivos y carpetas: `assets`, `data`, `fuentes`, `herramientas` y los archivos sueltos) y arrástralo. Son unos 40 archivos: entran en **una sola carga**.
4. Presiona **Commit changes** y espera a que termine de subir (los archivos de `data` pesan unos 30 MB en total).
5. Revisa que `index.html` quede en la **raíz** del repositorio, no dentro de una subcarpeta.
6. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save.**
7. En 1 o 2 minutos aparece *"Your site is live at https://TU-USUARIO.github.io/UIG/"*. Ábrela una vez con internet; después funciona sin conexión.

> El archivo `.gitignore` empieza con punto y algunas computadoras lo ocultan. Si no se sube, no pasa nada.
> Para probar en tu computadora antes de publicar: dentro de la carpeta, `python -m http.server 8000` y abre `http://localhost:8000`.

## Qué trae la v3.0
- **100 preguntas frecuentes** con 268 citas verificadas, agrupadas en 8 temas (botón *Todas las preguntas*).
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
| `fuentes/` | PDF de los documentos elaborados para la base (144 y 145) |

## Fase 2 (pendiente)
En `app.js`, `CONFIG.ia` y `CONFIG.estadisticas` están apagados. Se activan cuando exista la cuenta del API de Anthropic y el intermediario (Cloudflare Worker).
