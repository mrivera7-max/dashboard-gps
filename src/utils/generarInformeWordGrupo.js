import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";



function norm(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function contarCategoriasInvestigadores(investigadores = []) {
  const out = {
    total_is: 0,
    total_ia: 0,
    total_ij: 0,
    total_sin_categoria: 0,
    total_categorizados: 0,
  };

  investigadores.forEach((inv) => {
    const cat = String(
      inv.categoria_minciencias || inv.categoria_minciencias_investigador || ""
    )
      .trim()
      .toUpperCase();

    if (cat === "IS") out.total_is += 1;
    else if (cat === "IA") out.total_ia += 1;
    else if (cat === "IJ") out.total_ij += 1;
    else out.total_sin_categoria += 1;
  });

  out.total_categorizados = out.total_is + out.total_ia + out.total_ij;
  return out;
}

function contarLineasProyectos(proyectos = []) {
  let proy_robotica = 0;
  let proy_control = 0;
  let proy_senales = 0;
  let proy_telecom = 0;

  proyectos.forEach((p) => {
    const linea = norm(p.linea_investigacion);
    if (linea.includes("robot")) proy_robotica += 1;
    else if (linea.includes("control")) proy_control += 1;
    else if (linea.includes("senal") || linea.includes("señal")) proy_senales += 1;
    else if (linea.includes("telecom")) proy_telecom += 1;
  });

  return { proy_robotica, proy_control, proy_senales, proy_telecom };
}

function calcularIndiceMadurez({
  totalInvestigadores = 0,
  totalCategorizados = 0,
  productividadPromedio = 0,
}) {
  if (totalInvestigadores <= 0) return "0.00";

  const pesoCat = totalCategorizados / totalInvestigadores;
  const pesoProd = Math.min(productividadPromedio / 5, 1);
  const indice = (pesoCat * 0.6 + pesoProd * 0.4) * 100;

  return indice.toFixed(2);
}

function calcularCategoriasProducto(productos = []) {
  return productos.reduce(
    (acc, p) => {
      const cat = norm(p.categoria_minciencias_producto);

      if (cat.includes("nuevo conocimiento") || cat === "nc") acc.NC += 1;
      else if (cat.includes("desarrollo tecnologico") || cat.includes("desarrollo tecnológico") || cat === "dt") acc.DT += 1;
      else if (cat.includes("apropiacion social") || cat.includes("apropiación social") || cat === "asc") acc.ASC += 1;
      else if (cat.includes("divulgacion") || cat.includes("divulgación") || cat === "div") acc.DIV += 1;
      else if (cat.includes("formacion") || cat.includes("formación") || cat.includes("rrhh") || cat === "frh") acc.FRH += 1;

      return acc;
    },
    { NC: 0, DT: 0, ASC: 0, DIV: 0, FRH: 0 }
  );
}

function calcularRecomendaciones({
  totalAsc = 0,
  totalFormA = 0,
  totalTopFaltan = 0,
  productosSinProyecto = 0,
  totalProductos = 0,
}) {
  const rec = [];

  if (totalAsc <= 0) {
    rec.push("1. Fortalecer la generación de productos de Apropiación Social del Conocimiento.");
  }

  if (totalTopFaltan > 0) {
    rec.push(`${rec.length + 1}. Priorizar publicaciones científicas de alto impacto (TOP).`);
  }

  if (totalFormA <= 0) {
    rec.push(`${rec.length + 1}. Incrementar la formación de recurso humano mediante tesis de maestría y doctorado.`);
  }

  if (productosSinProyecto > Math.floor(totalProductos * 0.3)) {
    rec.push(`${rec.length + 1}. Consolidar la articulación entre proyectos de investigación y productos generados.`);
  }

  if (rec.length === 0) {
    rec.push("1. Mantener la estrategia actual de producción y consolidación del grupo.");
  }

  return rec.join("\n");
}

function calcularConclusionesProspectiva({
  totalAsc = 0,
  faltanAsc = 0,
  faltanTop = 0,
  faltanFormA = 0,
}) {
  const partes = [];

  if (totalAsc <= 0) {
    partes.push(
      `se identifica como prioridad estratégica el fortalecimiento de los productos de Apropiación Social del Conocimiento, estimándose la necesidad de generar aproximadamente ${faltanAsc} productos en esta categoría`
    );
  }

  if (faltanTop > 0) {
    partes.push(
      `también resulta necesario incrementar la producción de productos TOP, con una necesidad estimada de ${faltanTop} productos`
    );
  }

  if (faltanFormA > 0) {
    partes.push(
      `asimismo, conviene fortalecer la formación de recurso humano tipo A, con una necesidad aproximada de ${faltanFormA} productos`
    );
  }

  if (partes.length === 0) {
    return "El análisis prospectivo no evidencia brechas críticas inmediatas; se recomienda mantener la estrategia actual y fortalecer la consistencia del registro de información del grupo.";
  }

  return `Desde una perspectiva prospectiva, ${partes.join(
    "; "
  )}. La implementación de estas acciones contribuirá al fortalecimiento del posicionamiento del grupo en futuras convocatorias de medición.`;
}

export const generarInformeWordGrupo = async ({
  investigadores = [],
  productos = [],
  proyectos = [],
  nombreLiderGrupo = "—",
  datosConvocatoria2024 = {},
  graficas = {},
}) => {
  try {
    const anioActual = new Date().getFullYear();
    const fechaGeneracion = new Date().toLocaleDateString("es-CO");

    const investigadoresActivos = investigadores.filter((inv) => {
      const estado = String(inv.estado || inv.estado_investigador || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  
      .toLowerCase()
      .trim();
      return inv.activo === true || estado === "activo";
    });

    const productosAnio = productos.filter(
      (p) => Number(p.anio || 0) === anioActual
    );

    const proyectosAnio = proyectos.filter(
      (p) => Number(p.anio_inicio || p.anio || 0) === anioActual
    );

    const categoriasInv = contarCategoriasInvestigadores(investigadoresActivos);
    const lineasProyecto = contarLineasProyectos(proyectos);

    const productividadPromedio =
      investigadoresActivos.length > 0
        ? (productos.length / investigadoresActivos.length).toFixed(2)
        : "0.00";

    const indiceMadurez = calcularIndiceMadurez({
      totalInvestigadores: investigadoresActivos.length,
      totalCategorizados: categoriasInv.total_categorizados,
      productividadPromedio: Number(productividadPromedio),
    });

    const productosPorCategoria = calcularCategoriasProducto(productos);

    const totalNC = productosPorCategoria.NC;
    const totalDT = productosPorCategoria.DT;
    const totalASC = productosPorCategoria.ASC;
    const totalDIV = productosPorCategoria.DIV;
    const totalFRH = productosPorCategoria.FRH;

    const indiceNcDt =
      totalDT > 0 ? (Number(totalNC) / Number(totalDT)).toFixed(2) : "0.00";
    const indiceDtNc =
      totalNC > 0 ? (Number(totalDT) / Number(totalNC)).toFixed(2) : "0.00";

    const brechaTop = Math.max(
      2155.9811590330055 - Number(datosConvocatoria2024?.top || 0),
      0
    );

    const brechaAsc =
      Number(datosConvocatoria2024?.asc || 0) <= 0
        ? 940.0072584914712
        : Math.max(940.0072584914712 - Number(datosConvocatoria2024?.asc || 0), 0);

    const brechaFormA = Math.max(
      684.2128240291044 - Number(datosConvocatoria2024?.formA || 0),
      0
    );

    const faltan_top = Math.max(1, Math.ceil(brechaTop / 450));
    const faltan_asc = Math.max(1, Math.ceil(brechaAsc / 350));
    const faltan_formA = Math.max(1, Math.ceil(brechaFormA / 220));

    const productosSinProyecto = productos.filter(
      (p) => !p.proyecto_asociado_id
    ).length;

    const acciones_recomendadas = calcularRecomendaciones({
      totalAsc: totalASC,
      totalFormA: Number(datosConvocatoria2024?.formA || 0),
      totalTopFaltan: faltan_top,
      productosSinProyecto,
      totalProductos: productos.length,
    });

    const conclusiones_prospectiva = calcularConclusionesProspectiva({
      totalAsc: totalASC,
      faltanAsc: faltan_asc,
      faltanTop: faltan_top,
      faltanFormA: faltan_formA,
    });

    const response = await fetch("/plantillas/Informe_Grupo_GPS.docx");
    if (!response.ok) {
      throw new Error("No se pudo cargar la plantilla del informe del grupo.");
    }

    const content = await response.arrayBuffer();
    const zip = new PizZip(content);
    

    const doc = new Docxtemplater(zip, {
      
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render({
      nombre_grupo: "Grupo de Investigación GPS",
      nombre_lider_grupo: nombreLiderGrupo,
      anio: String(anioActual),
      fecha_generacion: fechaGeneracion,

      total_investigadores: investigadoresActivos.length,
      total_productos: productosAnio.length,
      total_proyectos: proyectosAnio.length,

      total_nc: totalNC,
      total_dt: totalDT,
      total_asc: totalASC,
      total_div: totalDIV,
      total_frh: totalFRH,

      total_is: categoriasInv.total_is,
      total_ia: categoriasInv.total_ia,
      total_ij: categoriasInv.total_ij,
      total_sin_categoria: categoriasInv.total_sin_categoria,
      total_categorizados: categoriasInv.total_categorizados,
      productividad_promedio: productividadPromedio,
      indice_madurez: indiceMadurez,

      proy_robotica: lineasProyecto.proy_robotica,
      proy_control: lineasProyecto.proy_control,
      proy_senales: lineasProyecto.proy_senales,
      proy_telecom: lineasProyecto.proy_telecom,

      indice_nc_dt: indiceNcDt,
      indice_dt_nc: indiceDtNc,

      brecha_top: brechaTop.toFixed(2),
      brecha_asc: brechaAsc.toFixed(2),
      brecha_formA: brechaFormA.toFixed(2),

      faltan_asc: faltan_asc,
      faltan_top: faltan_top,
      faltan_formA: faltan_formA,

      acciones_recomendadas,
      conclusiones_prospectiva,

      investigadores_lista: investigadoresActivos.map((x) => ({
        nombre: `${x.nombres || ""} ${x.apellidos || ""}`.trim() || "—",
        categoria:
          x.categoria_minciencias ||
          x.categoria_minciencias_investigador ||
          "—",
        identificacion: x.identificacion || "—",
      })),

      proyectos_lista: proyectosAnio.map((x) => ({
        codigo: x.codigo || x.id_proyecto || x.id || "—",
        nombre: x.nombre_proyecto || "—",
        linea: x.linea_investigacion || "—",
        estado: x.estado_proyecto || "—",
      })),

      productos_lista: productosAnio.map((x) => ({
        titulo: x.titulo || "—",
        categoria: x.categoria_minciencias_producto || "—",
        anio: x.anio || "—",
        estado: x.estado_producto || "—",
      })),

      
    });

    const blob = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(blob, `Informe_Grupo_GPS_${anioActual}.docx`);
  } catch (error) {
    console.error("Error generando informe Word del grupo:", error);
    alert(
      error?.message || "Ocurrió un error al generar el informe Word del grupo."
    );
  }
};