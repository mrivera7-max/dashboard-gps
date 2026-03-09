import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export const generarInformeWordGrupo = async ({
  investigadores = [],
  productos = [],
  proyectos = [],
  kpis = {},
  nombreLiderGrupo = "—",
}) => {
  try {
    const anioActual = new Date().getFullYear();
    const fechaGeneracion = new Date().toLocaleDateString("es-CO");

    // Investigadores activos
    const investigadoresActivos = investigadores.filter((inv) => {
      const estado = String(inv.estado || inv.estado_investigador || "")
        .toLowerCase()
        .trim();
      return estado.includes("activo");
    });

    // Productos del año vigente
    const productosAnio = productos.filter(
      (p) => Number(p.anio || 0) === anioActual
    );

    // Proyectos del año vigente
    const proyectosAnio = proyectos.filter(
      (p) => Number(p.anio_inicio || p.anio || 0) === anioActual
    );

    // Cargar plantilla Word
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

    // Datos para Word
    doc.setData({
      
      nombre_grupo: "Grupo de Investigación GPS",
      nombre_lider_grupo: nombreLiderGrupo,
      
      anio: String(anioActual),
      fecha_generacion: fechaGeneracion,
      
      total_investigadores: investigadoresActivos.length,
      total_productos: productosAnio.length,
      total_proyectos: proyectosAnio.length,

      total_nc: kpis?.porCategoria?.NC ?? 0,
      total_dt: kpis?.porCategoria?.DT ?? 0,
      total_asc: kpis?.porCategoria?.ASC ?? 0,
      total_div: kpis?.porCategoria?.DIV ?? 0,
      total_frh: kpis?.porCategoria?.FRH ?? 0,

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

    doc.render();

    const blob = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    saveAs(blob, `Informe_Grupo_GPS_${anioActual}.docx`);
  } catch (error) {
    console.error("Error generando informe Word del grupo:", error);
    alert(
      error?.message ||
        "Ocurrió un error al generar el informe Word del grupo."
    );
  }
};