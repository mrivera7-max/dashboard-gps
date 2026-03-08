import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export const generarWordFicha = async (form) => {
  const response = await fetch("/plantillas/Formato_Ficha_template_dashboard_anio_vigente.docx");
  const content = await response.arrayBuffer();

  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const anioVigente = String(new Date().getFullYear());

  const total_presupuesto = (Array.isArray(form.presupuesto) ? form.presupuesto : []).reduce(
    (acc, item) => acc + (Number(item.valor) || 0),
    0
  );

  const total_horas_semana = Number(form?.datos_generales?.horas_dedicacion) || 0;

  const total_horas_total = (Array.isArray(form.cronograma) ? form.cronograma : []).reduce(
    (acc, item) => acc + (Number(item.horas_asignadas) || 0),
    0
  );

  const ods = Array.isArray(form?.identificacion_proyecto?.ods)
    ? form.identificacion_proyecto.ods
    : [];

  doc.setData({
    anio_vigente: anioVigente,

    cedula: form?.datos_generales?.cedula || "",
    nombre_investigador: form?.datos_generales?.nombre_investigador || "",
    programa: form?.datos_generales?.programa || "",
    horas_dedicacion: form?.datos_generales?.horas_dedicacion || "",
    fecha_inicio: form?.datos_generales?.fecha_inicio || "",
    fecha_fin: form?.datos_generales?.fecha_fin || "",

    titulo_proyecto: form?.identificacion_proyecto?.titulo_proyecto || "",
    area_conocimiento: form?.identificacion_proyecto?.area_conocimiento || "",
    grupo_investigacion: form?.identificacion_proyecto?.grupo_investigacion || "",
    linea_investigacion: form?.identificacion_proyecto?.linea_investigacion || "",
    area_tematica: form?.identificacion_proyecto?.area_tematica || "",

    ods_lista: Array.isArray(form?.identificacion_proyecto?.ods)
      ? form.identificacion_proyecto.ods.map((ods, i) => ({
          indice: i + 1,
          ods: ods,
        }))
      : [],

    problema: form?.formulacion?.problema || "",
    justificacion: form?.formulacion?.justificacion_viabilidad || "",
    objetivo_general: form?.formulacion?.objetivo_general || "",
    objetivos_especificos: form?.formulacion?.objetivos_especificos || "",

    equipo_trabajo: Array.isArray(form?.equipo_trabajo) ? form.equipo_trabajo : [],
    productos: Array.isArray(form?.productos) ? form.productos : [],

    impactos_lista: Array.isArray(form?.impactos)
    ? form.impactos.map((item) => ({
        impacto: item.tipo || "",
        descripcion: item.descripcion || "",
        beneficiarios: item.beneficiarios || "",
        indicadores: item.indicadores || "",
      }))
    : [],

    apropiacion_social: Array.isArray(form?.apropiacion_social) ? form.apropiacion_social : [],
    presupuesto: Array.isArray(form?.presupuesto) ? form.presupuesto : [],

    cronograma: Array.isArray(form?.cronograma)
      ? form.cronograma.map((item) => ({
          actividad: item.hito || "",
          descripcion: item.descripcion || "",
          fecha_inicio: item.fecha_inicio || "",
          fecha_fin: item.fecha_fin || "",
          horas: item.horas_asignadas || "",
          entregable: item.entregable || "",
        }))
      : [],

    total_presupuesto,
    total_horas_semana,
    total_horas_total,

    preparado_por: form?.firmas?.preparado_por || "",
    revisado_por: form?.firmas?.revisado_por || "",
    aprobado_rector: form?.firmas?.aprobado_rector || "",
    aprobado_investigaciones: form?.firmas?.aprobado_investigaciones || "",
  });

  doc.render();

  const blob = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const nombre = (form?.datos_generales?.nombre_investigador || "Investigador")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  saveAs(blob, `Ficha_Desafio_${anioVigente}_${nombre}.docx`);
};