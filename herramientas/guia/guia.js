// Guía «Cómo crear una Unidad de Igualdad de Género desde cero» · CGES/DGAPP/AA
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  BorderStyle, LevelFormat, Footer, Header, PageNumber, HeadingLevel, VerticalAlign, TableLayoutType, ExternalHyperlink
} = require('docx');

const AZUL = '18345D', NARANJA = 'F08013', GRIS = '5A6472', CLARO = 'EEF2F7', LINEA = 'B8C3D1';
const ANCHO = 10080; // carta con márgenes de 0.75"
const F = 'Arial';

const run = (t, o = {}) => new TextRun({ text: t, font: F, size: o.size || 20, bold: o.bold, italics: o.it, color: o.color });
// Texto con **negritas** simples
const runs = (t, o = {}) => t.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(s => s.startsWith('**') ? run(s.slice(2, -2), { ...o, bold: true }) : run(s, o));
const p = (t, o = {}) => new Paragraph({ children: runs(t, o), spacing: { before: o.before ?? 0, after: o.after ?? 120, line: 276 }, alignment: o.align, keepNext: o.keepNext });
const bullet = (t, o = {}) => new Paragraph({ children: runs(t, o), numbering: { reference: 'vinetas', level: 0 }, spacing: { after: 40, line: 264 } });
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: F })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: F })] });
const fuente = t => new Paragraph({ children: [run('Fuente: ' + t, { size: 16, color: GRIS, it: true })], spacing: { before: 60, after: 200 } });

const borde = { style: BorderStyle.SINGLE, size: 4, color: LINEA };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

function celda(contenido, ancho, o = {}) {
  const items = Array.isArray(contenido) ? contenido : [contenido];
  const hijos = items.map(x => {
    if (typeof x === 'string' && x.startsWith('• ')) return bullet(x.slice(2), { size: o.size || 18, color: o.color });
    return new Paragraph({ children: runs(String(x), { size: o.size || 18, bold: o.bold, color: o.color }), spacing: { after: 40, line: 252 } });
  });
  return new TableCell({
    children: hijos, width: { size: ancho, type: WidthType.DXA }, borders: bordes,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 }, verticalAlign: o.v || VerticalAlign.TOP,
    rowSpan: o.rowSpan, columnSpan: o.columnSpan
  });
}

// filas: arreglo de arreglos; primera columna resaltada si destacar=true
function tabla(anchos, encabezado, filas, o = {}) {
  const total = anchos.reduce((a, b) => a + b, 0);
  const rows = [new TableRow({ tableHeader: true, cantSplit: true, children: encabezado.map((t, i) => celda(t, anchos[i], { fill: AZUL, color: 'FFFFFF', bold: true, v: VerticalAlign.CENTER })) })];
  const pend = anchos.map(() => 0);   // columnas ocupadas por celdas combinadas verticalmente
  for (const f of filas) {
    let i = 0;
    const cells = [];
    const saltar = () => { while (i < anchos.length && pend[i] > 0) { pend[i]--; i++; } };
    for (const c of f) {
      saltar();
      if (c && c.span) { cells.push(celda(c.t, anchos.slice(i, i + c.span).reduce((a, b) => a + b, 0), { columnSpan: c.span, fill: c.fill || CLARO, bold: c.bold })); i += c.span; continue; }
      if (c && c.rowSpan) { cells.push(celda(c.t, anchos[i], { rowSpan: c.rowSpan, fill: CLARO, bold: true })); pend[i] = c.rowSpan - 1; i++; continue; }
      cells.push(celda(c, anchos[i], (o.destacar && i === 0) ? { fill: CLARO, bold: true } : {}));
      i++;
    }
    saltar();
    rows.push(new TableRow({ cantSplit: true, children: cells }));
  }
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: anchos, rows, layout: TableLayoutType.FIXED });
}

function recuadro(titulo, lineas, color = NARANJA) {
  const b = { style: BorderStyle.SINGLE, size: 18, color };
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA }, columnWidths: [ANCHO], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: ANCHO, type: WidthType.DXA }, borders: { top: borde, bottom: borde, right: borde, left: b },
      shading: { fill: 'FFF7EF', type: ShadingType.CLEAR, color: 'auto' }, margins: { top: 100, bottom: 100, left: 180, right: 140 },
      children: [new Paragraph({ children: [run(titulo, { bold: true, size: 20, color: AZUL })], spacing: { after: 80 } }),
        ...lineas.map(l => l.startsWith('• ') ? bullet(l.slice(2), { size: 19 }) : new Paragraph({ children: runs(l, { size: 19 }), spacing: { after: 60, line: 264 } }))]
    })] })]
  });
}
const esp = (n = 120) => new Paragraph({ children: [], spacing: { after: n } });

const PLAN = 'Plan de Trabajo de las Unidades de Igualdad de Género en la Administración Pública del Estado de Jalisco (SISEMH, 08/03/2021)';
const ACU = 'Acuerdo DIELAG ACU 084/2020 y Lineamientos (Periódico Oficial «El Estado de Jalisco», 31/12/2020, Núm. 49, Secc. VI)';

const contenido = [
  // ---------------- Portada
  new Paragraph({ children: [run('Unidades de Igualdad de Género · Gobierno de Jalisco', { size: 20, color: NARANJA, bold: true })], spacing: { after: 160 } }),
  new Paragraph({ children: [run('Cómo crear una Unidad de Igualdad de Género desde cero', { size: 44, bold: true, color: AZUL })], spacing: { after: 160 } }),
  p('Guía práctica en tablas: quién la integra, qué hace, cómo se instala, cuándo sesiona, qué actividades programa y cómo rinde cuentas.', { size: 24, color: GRIS, after: 240 }),
  tabla([2600, 7480], ['Dato', 'Contenido'], [
    ['Fuente principal', 'Plan de Trabajo de las Unidades de Igualdad de Género en la Administración Pública del Estado de Jalisco. Plan Modelo. Secretaría de Igualdad Sustantiva entre Mujeres y Hombres (SISEMH), Guadalajara, 8 de marzo de 2021.'],
    ['Fundamento', 'Acuerdo del Gobernador DIELAG ACU 084/2020, por el que se instruye la instalación de las Unidades de Igualdad de Género y se emiten los Lineamientos para su integración y funcionamiento. Periódico Oficial «El Estado de Jalisco», 31 de diciembre de 2020, Núm. 49, Sección VI, págs. 3 a 13.'],
    ['Ejemplo de reglamento', 'Acuerdo DIELAG ACU 43/2021, que incorpora la Unidad de Igualdad de Género al Reglamento Interno de la Coordinación General Estratégica de Seguridad. Periódico Oficial «El Estado de Jalisco», 1 de junio de 2021, Núm. 14, Sección III, págs. 26 a 30.'],
    ['Elaboró', 'CGES/DGAPP/AA · Asistente UIG · noviembre de 2026'],
    ['Alcance', 'Documento de orientación. Reproduce y ordena lo que dicen las fuentes; no las sustituye. Cada tabla indica su fuente. Las dudas y diferencias entre fuentes se declaran en el apartado 12.']
  ], { destacar: true }),
  esp(200),
  recuadro('En una frase', [
    'Las Unidades de Igualdad de Género forman parte de la Política de Igualdad entre Mujeres y Hombres del Gobierno del Estado. Para esto se definieron **dos líneas estratégicas y cuatro ejes de trabajo rectores del quehacer de las unidades** (apartado 3).'
  ], AZUL),

  // ---------------- 1. Ruta
  h1('1. La ruta en ocho pasos'),
  p('Resumen de todo el proceso. Cada paso se detalla en los apartados siguientes.'),
  tabla([500, 2900, 1900, 1980, 1400, 1400], ['#', 'Qué se hace', 'Quién', 'Cuándo', 'Evidencia', 'Fundamento'], [
    ['1', 'Designar por oficio a las personas integrantes titulares: nivel superior a dirección o jefatura, con facultad de decisión, de las seis áreas obligatorias.', 'Persona titular de la dependencia o entidad', 'Al crear la Unidad', 'Oficios de designación', 'Plan, num. 5 y 5.1; Acuerdo, Lin. Séptimo y Octavo'],
    ['2', 'Notificar la integración a la SISEMH, con nombre, cargo y datos de contacto.', 'Dependencia, por oficio', 'Dentro del plazo de instalación', 'Oficio a la SISEMH', 'Acuerdo, Lin. Séptimo; Transitorio Segundo'],
    ['3', 'Nombrar suplentes: nivel jerárquico inmediato inferior y de la misma dirección de cada titular.', 'Cada persona titular', 'Primera sesión', 'Acta', 'Plan, num. 5.2 y 6.1.1 c)'],
    ['4', 'Instalar formalmente la Unidad; nombrar representante y secretaría técnica; aprobar el Plan de Trabajo de la Unidad.', 'Integrantes, en la primera sesión ordinaria', 'Primera sesión ordinaria', 'Acta de instalación; plan aprobado', 'Plan, num. 6.1.1; Acuerdo, Lin. Noveno y Undécimo'],
    ['5', 'Modificar el reglamento interno para incorporar las funciones de la Unidad y publicarlo en el Periódico Oficial.', 'Representante, secretaría técnica y área Jurídica', 'Octubre (según el plan)', 'Publicación en el Periódico Oficial', 'Plan, num. 6.1.1 e) y 9; Acuerdo, Transitorio Cuarto'],
    ['6', 'Ejecutar las actividades de los cuatro ejes.', 'Responsables de cada actividad', 'De marzo a diciembre', 'Capacitaciones, publicaciones, informes', 'Plan, num. 9'],
    ['7', 'Segunda sesión: monitoreo de avances y presentación del informe anual, que se envía a la SISEMH.', 'Representante y secretaría técnica', 'Segunda sesión ordinaria; envío en octubre', 'Acta e informe', 'Plan, num. 5, 6.1.2 y 8; Acuerdo, Lin. Duodécimo'],
    ['8', 'Capacitar a titulares y suplentes en las cinco temáticas.', 'SISEMH con la dependencia', 'A lo largo de la administración', 'Constancias', 'Plan, num. 7; Acuerdo, Lin. Decimotercero']
  ]),
  fuente(PLAN + '; ' + ACU + '.'),

  // ---------------- 2. Qué es
  h1('2. Qué es una Unidad de Igualdad de Género'),
  tabla([2400, 5880, 1800], ['Concepto', 'Contenido', 'Fuente'], [
    ['Naturaleza', 'Órganos consultivos especializados de las dependencias y entidades en materia de transversalización e institucionalización de la perspectiva de género y los derechos humanos.', 'Acuerdo, Lin. Primero'],
    ['Objetivo', 'Garantizar la institucionalización de la perspectiva de género, la igualdad sustantiva y los derechos humanos como pilares fundamentales en la toma de decisiones, tanto en el diseño como en la ejecución de las políticas públicas de las dependencias y entidades de la Administración Pública del Estado de Jalisco.', 'Plan, num. 3; Acuerdo, Lin. Segundo'],
    ['Lugar en la política estatal', 'Forman parte de la Política de Igualdad entre Mujeres y Hombres del Gobierno del Estado y son responsables de desarrollar acciones para promover la igualdad en los ámbitos de competencia de cada dependencia.', 'Plan, num. 2'],
    ['Principios de actuación', ['• Igualdad de género', '• Igualdad sustantiva', '• Transversalización de la perspectiva de género', '• Perspectiva de género', '• Derechos humanos de las mujeres y niñas'], 'Plan, num. 2; Acuerdo, Lin. Tercero'],
    ['Qué no hacen', 'Sus Lineamientos no les asignan atención al público ni recepción de denuncias. Ante casos de acoso u hostigamiento sexual o laboral orientan y canalizan al personal con las autoridades competentes, conforme al Protocolo Cero.', 'Acuerdo, Lin. Sexto, fr. V; Plan, num. 4 d)']
  ], { destacar: true }),
  fuente(PLAN + '; ' + ACU + '.'),

  // ---------------- 3. Líneas y ejes
  h1('3. Dos líneas estratégicas y cuatro ejes de trabajo'),
  p('El Plan de Trabajo lo enuncia así: «Para esto se definieron **dos líneas estratégicas y cuatro ejes de trabajo rectores del quehacer de las unidades:**»'),
  h2('3.1 Líneas estratégicas'),
  tabla([2300, 7780], ['Línea', 'Qué comprende (Plan, numeral 2)'], [
    ['a) Al interior de la institución', ['• Adoptar e implementar un Programa de Cultura Institucional para alcanzar un mejor clima laboral dentro de la Administración Pública del Estado.',
      '• Adoptar una política contra el hostigamiento y acoso sexual dentro de la dependencia o entidad, difundiendo el Protocolo Cero como mecanismo de denuncia de casos de acoso y hostigamiento sexual y/o laboral.']],
    ['b) Al exterior de la institución', ['• Asegurar que la comunicación institucional sea incluyente, universal y no sexista.',
      '• Incorporar la perspectiva de género en el Reglamento y lineamientos internos de cada dependencia y entidad.',
      '• Incidir desde la perspectiva de género en el diseño, implementación y evaluación de planes, programas, presupuestos, reglas de operación e indicadores.',
      '• Desagregar los datos al menos por sexo, grupo etario y municipio de procedencia; de ser posible, también por orientación sexual, origen étnico, condición de discapacidad, número de hijas e hijos y estado civil, siempre que obtenerlos no genere discriminación.']]
  ], { destacar: true }),
  fuente(PLAN + ', numeral 2. El Acuerdo (Lin. Cuarto) formula las líneas como: I. Programa de Cultura Institucional; II. Incidir en la planeación, presupuestación y evaluación.'),
  h2('3.2 Ejes de trabajo'),
  tabla([2300, 7780], ['Eje', 'Acciones que establece el Acuerdo (Lin. Quinto)'], [
    ['I. Política Institucional', ['• A. Adoptar e implementar un Programa de Cultura Institucional.', '• B. Procurar las condiciones materiales, financieras y humanas para cumplirlo.', '• C. Dar seguimiento y monitoreo a la política interna de igualdad de género, inclusión y no discriminación.']],
    ['II. Ambientes libres de acoso', ['• A. Difundir el Protocolo Cero como mecanismo para denunciar los casos de acoso y hostigamiento sexual laboral.', '• B. Canalizar a las instancias competentes, conforme al Protocolo Cero, los casos de los que tengan conocimiento.']],
    ['III. Promoción, difusión y comunicación', ['• A. Promover, difundir y publicar información sobre igualdad de género, inclusión y no discriminación.', '• B. Asegurar que la comunicación institucional, interna y externa, sea incluyente, universal y no sexista.', '• C. Difundir la existencia y las acciones del Programa de Cultura Institucional.', '• D. Promover información sobre programas, acciones y beneficios en favor de la igualdad.']],
    ['IV. Planeación, evaluación y seguimiento', ['• A. Incorporar la perspectiva de género en el Reglamento y los lineamientos internos.', '• B. Incidir en el diseño, implementación y evaluación de planes, programas, presupuestos, reglas de operación e indicadores.', '• C. Desagregar los datos al menos por sexo, grupo etario y municipio de procedencia.', '• D. Emitir periódicamente informes de evaluación de resultados.']]
  ], { destacar: true }),
  fuente(ACU + ', Lineamiento Quinto; ' + PLAN + ', numeral 9.'),

  // ---------------- 4. Integración
  h1('4. Quiénes la integran'),
  tabla([3000, 7080], ['Elemento', 'Regla'], [
    ['Quién designa', 'La persona titular de la dependencia o entidad, por oficio. La designación se notifica por oficio a la SISEMH.'],
    ['Requisito de titulares', 'Nivel jerárquico superior a dirección y/o jefatura, con facultades para la toma de decisiones.'],
    ['Áreas obligatorias', ['• Planeación', '• Presupuestación', '• Evaluación y Seguimiento', '• Administración y Recursos Humanos', '• Jurídica', '• Comunicación (enlace de comunicación social)']],
    ['Área adicional', 'Si la dependencia está certificada en la Norma Mexicana NMX-R-025-SCFI-2015 en Igualdad Laboral y No Discriminación, también la persona titular del Comité de Igualdad Laboral y No Discriminación o su equivalente.'],
    ['Cargos internos', 'De entre sus integrantes se elige a una persona representante (enlace ante la SISEMH) y a una persona secretaria técnica.'],
    ['Suplentes', 'Cada integrante nombra suplente del nivel jerárquico inmediato inferior y de la misma dirección, para que conozca los temas de la sesión y pueda tomar decisiones.']
  ], { destacar: true }),
  fuente(PLAN + ', numerales 5, 5.1 y 5.2; ' + ACU + ', Lineamientos Séptimo, Octavo y Noveno.'),

  // ---------------- 5. Funciones
  h1('5. Funciones'),
  h2('5.1 Funciones de la Unidad'),
  tabla([600, 9480], ['', 'La Unidad de Igualdad de Género (Plan, numeral 4)'], [
    ['a)', 'Ser vínculo con la SISEMH para promover acciones en materia de igualdad.'],
    ['b)', 'Adoptar, implementar y monitorear el funcionamiento del Programa de Cultura Institucional al interior de la dependencia o entidad.'],
    ['c)', 'Elaborar y ejecutar un plan de trabajo.'],
    ['d)', 'Orientar y canalizar al personal con las autoridades competentes en casos de acoso y hostigamiento sexual y/o laboral al interior de la dependencia.'],
    ['e)', 'Dar seguimiento a la política interna de promoción de igualdad de género, inclusión y no discriminación.'],
    ['f)', 'Impulsar la perspectiva de género en el diseño y evaluación de políticas, programas, planes y presupuestos.'],
    ['g)', 'Fomentar que la construcción de indicadores sea con perspectiva de género.'],
    ['h)', 'Promover la desagregación de datos estadísticos por sexo, grupo etario, municipio de procedencia, origen étnico, personas con discapacidad, número de hijas e hijos, estado civil y cualquier otro que aporte a la igualdad.']
  ], { destacar: true }),
  fuente(PLAN + ', numeral 4. El Acuerdo enlista las mismas funciones en nueve fracciones (Lin. Sexto).'),
  h2('5.2 Funciones de la persona representante y de la secretaría técnica'),
  tabla([5040, 5040], ['Representante', 'Secretaría técnica'], [
    [['• Ser enlace con la SISEMH.', '• Presidir y conducir las sesiones.', '• Autorizar el orden del día y las fechas de las sesiones ordinarias.', '• Aprobar la convocatoria para las sesiones extraordinarias.', '• Promover que las funciones de quienes integran la Unidad garanticen la institucionalización de la perspectiva de género.', '• Presentar, con la secretaría técnica, el informe anual de actividades, que se remite a la SISEMH.'],
     ['• Emitir y notificar las convocatorias: ordinarias con 5 días hábiles de anticipación y extraordinarias con 3, previo acuerdo con la persona representante.', '• Confirmar la recepción de la convocatoria y la asistencia de integrantes o suplentes.', '• Formular el orden del día, previo acuerdo con la persona representante.', '• Integrar la información que se presentará en las sesiones.', '• Tomar asistencia y declarar quórum.', '• Levantar las actas y enviarlas para aprobación y firma.', '• Solicitar la información del informe anual, que se remite a la SISEMH en octubre.', '• Recibir las propuestas de temas: 5 días hábiles antes para ordinarias y 3 días para extraordinarias.']]
  ]),
  fuente(PLAN + ', numeral 5, incisos a) y b). Ver en el apartado 12 la diferencia de plazos para extraordinarias.'),

  // ---------------- 6. Sesiones
  h1('6. Cómo sesiona'),
  tabla([2600, 3740, 3740], ['Regla', 'Ordinarias', 'Extraordinarias'], [
    ['Frecuencia', 'Dos al año.', 'Cuando se consideren pertinentes: asuntos pendientes de las ordinarias o a solicitud de algún integrante.'],
    ['Tema', 'Los del orden del día (ver 6.1).', 'Un solo tema, que origina la sesión.'],
    ['Propuesta del tema', 'A la secretaría técnica, 5 días hábiles antes.', 'A la secretaría técnica, 1 día hábil antes de la sesión (numeral 6.2).'],
    ['Convocatoria', '5 días hábiles de anticipación.', '2 días hábiles de anticipación (numeral 6).'],
    ['Medio', { span: 2, t: 'Oficio o cualquier medio electrónico conforme a la ley que asegure su recepción. Debe señalar tipo y número de sesión, lugar, fecha y hora, orden del día y documentación de soporte.', fill: 'FFFFFF' }],
    ['Quórum', { span: 2, t: 'La mitad más una de las personas integrantes, con presencia de la persona representante y de la secretaría técnica o su suplente.', fill: 'FFFFFF' }]
  ], { destacar: true }),
  fuente(PLAN + ', numerales 6, 6.1 y 6.2; ' + ACU + ', Lineamiento Undécimo.'),
  h2('6.1 Temas de las sesiones ordinarias'),
  tabla([2000, 8080], ['Sesión', 'Temas (de manera enunciativa y no limitativa)'], [
    ['Primera', ['• Instalación formal de la Unidad con sus integrantes titulares.', '• Nombramiento de la secretaría técnica y de la persona representante, que funge como enlace ante la SISEMH.', '• Nombramiento de suplentes (nivel inmediato inferior y misma dirección).', '• Presentación y aprobación del Plan de Trabajo de la Unidad, que establece la ruta de acciones al interior.', '• Informe de la modificación del reglamento interno para incorporar las funciones de la Unidad; si no se ha publicado en el Periódico Oficial, se define la fecha.']],
    ['Segunda', ['• Informes de avances y acuerdos de la instalación y de la extraordinaria anterior, si la hubo.', '• Monitoreo de las acciones del plan de trabajo, presupuestación, indicadores y capacitaciones.', '• Seguimiento a la publicación de la modificación del reglamento interno.', '• Presentación del informe anual de actividades, que se envía a la SISEMH.']]
  ], { destacar: true }),
  fuente(PLAN + ', numerales 6.1.1 y 6.1.2. El Plan detalla estos temas para 2021; en los años siguientes cada dependencia define los temas.'),
  h2('6.2 Contenido obligatorio del acta'),
  tabla([600, 9480], ['', 'Cada acta se firma por las personas asistentes y detalla de manera circunstanciada'], [
    ['a)', 'Lugar, fecha y hora de inicio y de terminación de la sesión.'], ['b)', 'Tipo de sesión.'], ['c)', 'Registro de asistentes, resaltando la dirección que representan.'],
    ['d)', 'Orden del día.'], ['e)', 'Desahogo del orden del día.'], ['f)', 'Descripción de las intervenciones.'], ['g)', 'Acuerdos adoptados, con su votación.'], ['h)', 'Firma autógrafa de quienes asistieron.']
  ], { destacar: true }),
  fuente(PLAN + ', numeral 6.'),

  // ---------------- 7. Planeación
  h1('7. Plan de trabajo: actividades, verificación, periodo y responsables'),
  p('Tabla del numeral 9 del Plan de Trabajo, transcrita fila por fila. Cada Unidad la adopta y la adapta en su propio plan anual.'),
  tabla([1700, 2350, 1750, 1300, 2980], ['Eje', 'Actividad específica', 'Medio de verificación', 'Periodo', 'Responsable'], [
    [{ rowSpan: 4, t: 'I. Política Institucional' }, 'Adoptar un Programa de Cultura Institucional', 'Capacitaciones', 'Marzo - Octubre', 'Integrantes de la Unidad de Igualdad'],
    ['Implementar el Programa de Cultura Institucional', 'Publicación', 'Marzo - Octubre', 'Secretario/a técnico/a; Representante de la Unidad de Igualdad'],
    ['Seguimiento a las acciones establecidas en el Programa de Cultura Institucional', 'Informe', 'Noviembre', 'Integrantes de la Unidad de Igualdad'],
    ['Monitoreo de actividades de la Unidad de Igualdad de Género', 'Informe', 'Octubre', 'Representante de la Unidad de Igualdad; Secretario/a técnico/a'],
    [{ rowSpan: 1, t: 'II. Ambientes libres de acoso' }, 'Difundir Protocolo Cero', 'Difusión', 'Mayo', 'Integrantes de la Unidad de Igualdad'],
    [{ rowSpan: 2, t: 'III. Promoción, difusión y comunicación' }, 'Difusión de información en materia de igualdad de género', 'Publicaciones', 'Noviembre', 'Integrante que corresponda a la Dirección de Comunicación'],
    ['Comunicación institucional con lenguaje incluyente, universal y no sexista', 'Capacitaciones', 'Octubre', 'Representante de la Unidad de Igualdad; Integrante de la Dirección de Comunicación'],
    [{ rowSpan: 4, t: 'IV. Planeación, evaluación y seguimiento' }, 'Modificación de los Reglamentos internos y lineamientos', 'Publicación en el Periódico Oficial «El Estado de Jalisco»', 'Octubre', 'Representante de la Unidad de Igualdad; Secretario/a técnico/a; Integrante que corresponda a la Dirección de Jurídico'],
    ['Presupuestos con perspectiva de género', 'Capacitaciones', 'Mayo - Septiembre', 'Integrantes que correspondan a las Direcciones de Planeación; Presupuestación; Evaluación y Seguimiento'],
    ['Presupuestos con perspectiva de género', 'Publicación del anexo transversal de igualdad de género', 'Diciembre', 'Representante de la Unidad de Igualdad; Secretario/a técnico/a; Integrantes de las Direcciones de Planeación; Presupuestación; Evaluación y Seguimiento'],
    ['Indicadores con perspectiva de género', 'Capacitaciones', 'Mayo - Octubre', 'Integrantes de las Direcciones de Administración y Recursos Humanos; Planeación; Presupuestación; Evaluación y Seguimiento']
  ]),
  fuente(PLAN + ', numeral 9 (págs. 8 y 9).'),

  // ---------------- 8. Capacitación
  h1('8. Capacitación obligatoria'),
  tabla([600, 6480, 3000], ['', 'Temática', 'Quién'], [
    ['a)', 'Igualdad de género, derechos humanos y no discriminación', { rowSpan: 5, t: 'Todas las personas titulares y suplentes, a lo largo de la administración. La SISEMH, en coordinación con cada dependencia, gestiona y procura los recursos.' }],
    ['b)', 'Transversalización de la perspectiva de género'],
    ['c)', 'Cultura institucional desde la perspectiva de género'],
    ['d)', 'Comunicación incluyente y no sexista'],
    ['e)', 'Planes, programas, presupuestos e indicadores con perspectiva de género']
  ], { destacar: true }),
  fuente(PLAN + ', numeral 7. El Acuerdo (Lin. Decimotercero) enlista los mismos temas y separa «Indicadores con perspectiva de género» como sexto tema.'),

  // ---------------- 9. Informe
  h1('9. Informe anual de actividades'),
  p('Objeto: dar cuenta de las acciones realizadas en el año, con base en el plan de trabajo; sirve para el monitoreo, el seguimiento y la rendición de cuentas ante la ciudadanía.'),
  tabla([2600, 7480], ['Apartado', 'Qué debe contener'], [
    ['a) Identificación', 'Nombre de la dependencia o entidad.'],
    ['b) Integrantes', 'Nombre y datos de contacto de quienes integran la Unidad.'],
    ['c) Actividades', ['• Por cada dirección, en el marco de sus facultades, ordenadas por los ejes de trabajo del Acuerdo.', '• Para cada acción: ¿qué se reporta?, ¿cuándo se realizó?, ¿cómo se ejecutó?, ¿qué resultados o productos se obtuvieron?', '• Tablas con información oficial y verificable y su fuente; si hace falta, un Excel adjunto con gráficas.', '• Datos con perspectiva de género: desagregados por sexo y, al menos, grupo de edad.', '• Redacción en pasado, homogénea, clara, concisa y consistente, en la que se aprecien los enfoques de derechos humanos, igualdad de género, transversalización y perspectiva de género.']],
    ['d) Conclusiones', 'Retos y obstáculos en la operación de la Unidad dentro de la dependencia o entidad.'],
    ['Entrega', 'Lo presentan la persona representante y la secretaría técnica; se remite a la SISEMH, que lo valida. El Plan Modelo indica octubre (ver apartado 12).']
  ], { destacar: true }),
  fuente(PLAN + ', numerales 5, 8 y 8.1; ' + ACU + ', Lineamiento Duodécimo.'),

  // ---------------- 10. Reglamento
  h1('10. Incorporar la Unidad al reglamento interno'),
  p('El Acuerdo dio a las dependencias 45 días hábiles desde su publicación para presentar al Ejecutivo los proyectos de modificación de sus reglamentos internos (Transitorio Cuarto). En el plan de trabajo, la publicación en el Periódico Oficial es una actividad del eje IV. Ejemplo publicado:'),
  tabla([2200, 7880], ['Reglamento Interno de la CGES', 'Contenido adicionado por el Acuerdo DIELAG ACU 43/2021 (Sección Quinta)'], [
    ['Artículo 22', 'Define a la Unidad como órgano consultivo especializado y fija su objeto.'],
    ['Artículo 23', 'Le asigna 14 atribuciones, entre ellas el Programa de Cultura Institucional, el plan de trabajo, la difusión del Protocolo Cero, la canalización de casos de acoso y hostigamiento sexual laboral y la comunicación incluyente.'],
    ['Artículo 24', 'La integran las personas titulares de la Coordinación Administrativa, la Coordinación Jurídica, la Dirección General de Gestión Transversal y la Dirección General de Análisis y Políticas Públicas; cada una nombra suplente.'],
    ['Artículo 25', 'La persona titular de la Coordinación Administrativa es el enlace ante la SISEMH; la persona titular de la Coordinación designa a quien ocupa la secretaría técnica.']
  ], { destacar: true }),
  fuente('Acuerdo DIELAG ACU 43/2021, Periódico Oficial «El Estado de Jalisco», 1 de junio de 2021, Núm. 14, Sección III, págs. 26 a 30 (texto leído por reconocimiento óptico; consultar el ejemplar para citas formales). En el mismo ejemplar se publicaron los acuerdos 30/2021, 31/2021 y 42/2021 para otras dependencias.'),

  // ---------------- 11. Lista de verificación
  h1('11. Lista de verificación'),
  tabla([500, 5780, 3800], ['✓', 'Requisito', 'Evidencia'], [
    ['☐', 'Oficios de designación de titulares de las seis áreas (y del Comité de Igualdad Laboral, si aplica).', 'Oficios firmados por la persona titular'],
    ['☐', 'Integración notificada a la SISEMH con nombre, cargo y contacto.', 'Oficio con acuse'],
    ['☐', 'Suplentes nombrados (nivel inmediato inferior, misma dirección).', 'Acta de la primera sesión'],
    ['☐', 'Unidad instalada; representante y secretaría técnica nombradas.', 'Acta de instalación'],
    ['☐', 'Plan de Trabajo de la Unidad aprobado y enviado a la SISEMH para validación.', 'Plan aprobado; oficio de envío'],
    ['☐', 'Reglamento interno modificado y publicado en el Periódico Oficial.', 'Ejemplar del Periódico Oficial'],
    ['☐', 'Programa de Cultura Institucional adoptado e implementado.', 'Capacitaciones; publicación'],
    ['☐', 'Protocolo Cero difundido entre el personal.', 'Evidencia de difusión'],
    ['☐', 'Capacitaciones de presupuestos, indicadores y comunicación incluyente.', 'Listas y constancias'],
    ['☐', 'Anexo transversal de igualdad de género publicado.', 'Publicación'],
    ['☐', 'Dos sesiones ordinarias celebradas con quórum y actas firmadas.', 'Convocatorias y actas'],
    ['☐', 'Informe anual entregado a la SISEMH.', 'Informe y acuse']
  ]),
  fuente(PLAN + '; ' + ACU + '.'),

  // ---------------- 12. Notas
  h1('12. Notas, diferencias entre fuentes y dudas'),
  recuadro('Lo que conviene confirmar con la SISEMH', [
    '• **Plazo para convocar a extraordinarias.** El Plan da dos plazos: 3 días hábiles en las funciones de la secretaría técnica (numeral 5, inciso b, fracción i) y 2 días hábiles en las reglas de sesión (numeral 6).',
    '• **Plazo para proponer temas de extraordinarias.** Tres días según el numeral 5 (inciso b, fracción viii) y 1 día hábil según el numeral 6.2.',
    '• **Planes anuales.** Este documento es el Plan Modelo de 2021. La SISEMH ha publicado planes anuales posteriores (2022, 2023 y 2024 en igualdad.jalisco.gob.mx) que ajustan fechas; por ejemplo, el Plan 2024 propone la primera sesión ordinaria del 8 al 12 de abril, la segunda el 8 de agosto y la entrega del informe el 30 de septiembre. Esos planes no forman parte de la base del Asistente UIG: revisar el del año en curso.',
    '• **Plazos históricos.** Los 20 días hábiles para instalar las Unidades y los 45 días hábiles para presentar los proyectos de reglamento corrían desde la publicación del Acuerdo (31/12/2020). Una Unidad que se crea hoy debe confirmar con la SISEMH el plazo aplicable.',
    '• **Capacitación.** El Plan fija cinco temáticas; el Acuerdo seis (separa «Indicadores con perspectiva de género»).',
    '• **Calendario.** Los meses de la tabla del apartado 7 son los del Plan Modelo, no un calendario fijo.'
  ]),

  // ---------------- 13. Fuentes
  h1('13. Fuentes'),
  p('Secretaría de Igualdad Sustantiva entre Mujeres y Hombres. (2021). Plan de Trabajo de las Unidades de Igualdad de Género en la Administración Pública del Estado de Jalisco. Plan Modelo. Gobierno del Estado de Jalisco. https://igualdad.jalisco.gob.mx/wp-content/uploads/2021/11/plan-de-trabajo-de-las-unidades-de-igualdad-de-genero-en-la-adminsitracio-publica-del-estado-de-jalisco.pdf', { size: 18 }),
  p('Acuerdo DIELAG ACU 084/2020 del Gobernador Constitucional del Estado de Jalisco, mediante el cual se instruye a las dependencias y entidades de la Administración Pública del Estado de Jalisco para que lleven a cabo la instalación de las Unidades de Igualdad de Género y se emiten los Lineamientos para la integración y funcionamiento de las mismas. (2020, 31 de diciembre). Periódico Oficial «El Estado de Jalisco», núm. 49, secc. VI, 3-13. https://apiperiodico.jalisco.gob.mx/api/sites/periodicooficial.jalisco.gob.mx/files/12-31-20-vi.pdf', { size: 18 }),
  p('Acuerdo DIELAG ACU 43/2021 del Gobernador Constitucional del Estado de Jalisco, mediante el cual se adicionan diversas disposiciones al Reglamento Interno de la Coordinación General Estratégica de Seguridad del Estado de Jalisco, en materia de la Unidad de Igualdad de Género. (2021, 1 de junio). Periódico Oficial «El Estado de Jalisco», núm. 14, secc. III, 26-30.', { size: 18 }),
  p('Secretaría de Igualdad Sustantiva entre Mujeres y Hombres. (2024). Plan de Trabajo 2024, Unidades de Igualdad de Género (referido solo en el apartado 12). https://igualdad.jalisco.gob.mx/wp-content/uploads/2024/11/Plan-de-Trabajo-Unidades-de-Igualdad-2024-3.pdf', { size: 18 }),
];

const doc = new Document({
  creator: 'CGES/DGAPP/AA', title: 'Cómo crear una Unidad de Igualdad de Género desde cero', description: 'Guía en tablas basada en el Plan de Trabajo de las UIG (SISEMH, 2021) y el Acuerdo DIELAG ACU 084/2020',
  styles: {
    default: { document: { run: { font: F, size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 30, bold: true, color: AZUL }, paragraph: { spacing: { before: 360, after: 140 }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 24, bold: true, color: AZUL }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, keepLines: true, outlineLevel: 1 } }
    ]
  },
  numbering: { config: [{ reference: 'vinetas', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 280, hanging: 200 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('Guía: cómo crear una Unidad de Igualdad de Género desde cero', { size: 16, color: GRIS })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      run('CGES/DGAPP/AA · Documento de orientación basado en fuentes oficiales · Página ', { size: 16, color: GRIS }),
      new TextRun({ children: [PageNumber.CURRENT], font: F, size: 16, color: GRIS }), run(' de ', { size: 16, color: GRIS }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: F, size: 16, color: GRIS })] })] }) },
    children: contenido
  }]
});

Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || 'Guia_crear_UIG_desde_cero.docx', b); console.log('ok'); });
