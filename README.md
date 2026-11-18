# Asistente UIG · Fase 1 (sin IA)

App web instalable (PWA) de orientación normativa para Unidades de Igualdad de Género y ciudadanía en Jalisco.
Cada respuesta cita **artículo, ordenamiento y fecha de última reforma**, y funciona **sin conexión** después de la primera visita.

## Publicar en GitHub Pages
1. Repositorio: `UIG` en tu cuenta de GitHub (público).
2. Sube **todo el contenido de esta carpeta** (excepto `_textos/`, que ya está en `.gitignore`).
3. En el repositorio: *Settings → Pages → Build and deployment → Deploy from a branch → main / (root)*.
4. Quedará en `https://arjona87.github.io/UIG/`.

> La app debe servirse por **https** (GitHub Pages ya lo hace) para que funcionen la instalación y el modo sin conexión.
> Para probarla en tu computadora: `python -m http.server 8000` dentro de esta carpeta y abre `http://localhost:8000`.

## Qué hay en cada archivo
| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app (interfaz, búsqueda, detección de riesgo, PDF, salida rápida) |
| `sw.js`, `manifest.webmanifest` | Funcionamiento sin conexión e instalación en el teléfono |
| `aviso-privacidad.html` | Aviso de privacidad genérico (completar campos en amarillo y validar con Jurídico) |
| `data/docs.json` | Ficha de cada documento: nombre oficial, ámbito, fecha de última reforma, estatus, nivel, URL |
| `data/docs/NNN.json` | Texto de cada documento dividido por artículo (o por página en protocolos y manuales) |
| `data/indice.json`, `data/indice-n3.json` | Índices de búsqueda (niveles 1-2 y nivel 3) |
| `data/faq.json` | 20 preguntas frecuentes con respuesta, lectura fácil y citas |
| `data/riesgo.json` | 30 expresiones de riesgo que activan la respuesta de crisis |
| `data/directorio.json` | Directorio de canalización (vacío hasta que lo valides) |
| `herramientas/construir_base.py` | Reconstruye `data/` desde el Excel y la carpeta de documentos |

## Fase 2 (pendiente)
En `app.js`, `CONFIG.ia` y `CONFIG.estadisticas` están apagados. Se activan cuando exista la cuenta del API de Anthropic y el intermediario (Cloudflare Worker).
