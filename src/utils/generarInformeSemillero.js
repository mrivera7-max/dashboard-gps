// src/utils/generarInformeSemillero.js

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const RESUMEN_SEMILLERO_ZION = `
El semillero de investigación ZION nace a partir de las necesidades propias del programa de Ingeniería Electrónica, en donde se involucran estudiantes de pregrado y posgrado. Dichos integrantes pueden sumergirse en el pensamiento científico; para ello, semestralmente se abren convocatorias institucionales para pertenecer al semillero bajo la línea de investigación: Robótica, Control y Procesamiento de Señal.

En este espacio los integrantes desarrollan proyectos de investigación que permiten aplicar y consolidar conceptos de ingeniería electrónica. Asimismo, se estudian diferentes áreas de investigación con el fin de generar productos de publicación o desarrollos tecnológicos que contribuyan al crecimiento académico del semillero.
`;

    const OBJETIVO_GENERAL_ZION = `
Fortalecer las habilidades investigativas de los estudiantes de pregrado y/o posgrado a través del desarrollo de proyectos de investigación orientados al diseño y construcción de equipos analógicos y digitales enfocados a la robótica educativa e industrial. Mediante el método científico se fomenta la participación en procesos de comunicación académica desde sus diferentes roles.
`;

    const METODOLOGIA_ZION = `
Se emplea una metodología de aprendizaje activo y práctico que combina conocimientos teóricos y prácticos. Los estudiantes participan en proyectos concretos donde aplican sus habilidades de ingeniería, complementados con actividades de socialización científica y participación en eventos académicos. Además, se promueve la colaboración con comunidades académicas y científicas para enriquecer el aprendizaje y difundir los resultados obtenidos.
`;



function safe(v, fallback = "") {
  return v === undefined || v === null || v === "" ? fallback : String(v);
}

function normalizeText(text) {
  return safe(text).replace(/\s+/g, " ").trim();
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  try {
    if (dateValue?.toDate) {
      return dateValue.toDate().toLocaleDateString("es-CO");
    }
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString("es-CO");
  } catch {
    return String(dateValue);
  }
}

async function getCollectionBySemillero(collectionName, semilleroId) {
  const q = query(
    collection(db, collectionName),
    where("semillero_id", "==", semilleroId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
}

function countByEstado(items, estadoBuscado) {
  return items.filter(
    (x) =>
      normalizeText(x.estado).toLowerCase() ===
      normalizeText(estadoBuscado).toLowerCase()
  ).length;
}

function actividadCumplimiento(actividad) {
  const estado = normalizeText(actividad.estado).toLowerCase();
  if (estado === "realizada") return "100%";
  if (estado === "pendiente") return "50%";
  if (estado === "cancelada") return "0%";
  return "100%";
}

function buildResultadosTexto({ estudiantes, proyectos, productos, actividades }) {
  const items = [];

  if (estudiantes.length) {
    items.push(`Vinculación de ${estudiantes.length} estudiantes al semillero.`);
  }
  if (proyectos.length) {
    items.push(`Desarrollo y seguimiento de ${proyectos.length} proyecto(s).`);
  }
  if (productos.length) {
    items.push(`Generación de ${productos.length} producto(s) asociados al semillero.`);
  }
  if (actividades.length) {
    items.push(`Ejecución de ${actividades.length} actividad(es) académicas y formativas.`);
  }

  if (!items.length) {
    items.push("Durante el periodo se consolidó la organización básica y el registro de información del semillero.");
  }

  return items.map((x) => `• ${x}`).join("\n");
}

function buildConclusionesTexto(semillero, indicadores) {
  return [
    `El semillero ${safe(semillero.nombre)} fortaleció las competencias investigativas y técnicas de sus integrantes durante el periodo reportado.`,
    `Se registraron ${indicadores.estudiantesActivos} estudiantes activos, ${indicadores.proyectosActivos} proyectos activos, ${indicadores.productosTotales} productos y ${indicadores.actividadesRealizadas} actividades realizadas.`,
    `Se recomienda continuar fortaleciendo la trazabilidad de evidencias, la generación de productos y la participación en escenarios de divulgación científica.`,
  ].join("\n\n");
}

export async function generarInformeSemillero(semilleroId) {
  try {
    const semilleroRef = doc(db, "semilleros", semilleroId);
    const semilleroSnap = await getDoc(semilleroRef);

    if (!semilleroSnap.exists()) {
      throw new Error("No se encontró el semillero.");
    }

    const semillero = { id: semilleroSnap.id, ...semilleroSnap.data() };

    const [estudiantes, proyectos, productos, actividades] = await Promise.all([
      getCollectionBySemillero("semilleristas", semilleroId),
      getCollectionBySemillero("semillero_proyectos", semilleroId),
      getCollectionBySemillero("semillero_productos", semilleroId),
      getCollectionBySemillero("semillero_actividades", semilleroId),
    ]);

    const indicadores = {
      estudiantesTotales: estudiantes.length,
      estudiantesActivos: countByEstado(estudiantes, "Activo"),
      proyectosTotales: proyectos.length,
      proyectosActivos: countByEstado(proyectos, "En ejecución"),
      productosTotales: productos.length,
      actividadesTotales: actividades.length,
      actividadesRealizadas: countByEstado(actividades, "Realizada"),
    };

    const response = await fetch("/plantillas/Informe_Final_Semillero_Template.docx");
    if (!response.ok) {
      throw new Error("No se pudo cargar la plantilla .docx");
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const docxTemplate = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    docxTemplate.render({
      fecha_elaboracion: formatDate(new Date()),
      titulo_proyecto:
        safe(semillero.titulo_informe) ||
        `Informe final del semillero ${safe(semillero.nombre)}`,

      
      
      fecha_inicio: formatDate(semillero.fecha_inicio),
      fecha_final: formatDate(semillero.fecha_final),
      tipo_proyecto: safe(semillero.tipo_proyecto, "Semillero de Investigación"),
      grupo_investigacion: safe(semillero.grupo_investigacion, "GPS"),

      coordinador: safe(semillero.docente_responsable_nombre, "No registrado"),
      
      correo: safe(semillero.correo, "No registrado"),

      resumen: RESUMEN_SEMILLERO_ZION,

      objetivo_general: OBJETIVO_GENERAL_ZION,

      objetivos_especificos: Array.isArray(semillero.objetivos_especificos)
        ? semillero.objetivos_especificos.map((o) => ({ objetivo: o }))
        : [
            { objetivo: "Desarrollar competencias investigativas y técnicas en los integrantes del semillero." },
            { objetivo: "Promover la participación en actividades de investigación, divulgación y formación." },
            { objetivo: "Fortalecer la generación de proyectos y productos asociados a la línea de trabajo del semillero." },
          ],

      metodologia: [
        METODOLOGIA_ZION,
        safe(semillero.metodologia, "")
        ]
        .filter((x) => x && x.trim() !== "")
        .join("\n"),

      actividades: actividades.length
        ? actividades.map((a) => ({
            actividad: safe(a.actividad),
            dificultades: safe(a.dificultades, "Ninguna"),
            contingencia: safe(a.plan_contingencia, "Ninguna"),
            cumplimiento: actividadCumplimiento(a),
          }))
        : [
            {
              actividad: "Sin actividades registradas",
              dificultades: "",
              contingencia: "",
              cumplimiento: "0%",
            },
          ],

      resultados_texto: buildResultadosTexto({
        estudiantes,
        proyectos,
        productos,
        actividades,
      }),

      estudiantes_totales: indicadores.estudiantesTotales,
      estudiantes_activos: indicadores.estudiantesActivos,
      proyectos_totales: indicadores.proyectosTotales,
      proyectos_activos: indicadores.proyectosActivos,
      productos_totales: indicadores.productosTotales,
      actividades_totales: indicadores.actividadesTotales,
      actividades_realizadas: indicadores.actividadesRealizadas,

      link_asistencia: safe(semillero.link_asistencia, ""),
      link_cvlac: safe(semillero.link_cvlac, ""),

      estudiantes: estudiantes.length
        ? estudiantes.map((e) => ({
            id_semillerista: safe(e.id_semillerista),
            nombre: safe(e.nombre),
            programa: safe(e.programa),
            semestre: safe(e.semestre),
            estado: safe(e.estado),
          }))
        : [
            {
              id_semillerista: "",
              nombre: "Sin estudiantes registrados",
              programa: "",
              semestre: "",
              estado: "",
            },
          ],

        

      proyectos: proyectos.length
        ? proyectos.map((p) => ({
            id_proyecto_semillero: safe(p.id_proyecto_semillero),
            titulo: safe(p.titulo),
            anio: safe(p.anio),
            estado: safe(p.estado),
            descripcion: safe(p.descripcion),
          }))
        : [
            {
              id_proyecto_semillero: "",
              titulo: "Sin proyectos registrados",
              anio: "",
              estado: "",
              descripcion: "",
            },
          ],

      productos: productos.length
        ? productos.map((p) => ({
            id_producto_semillero: safe(p.id_producto_semillero),
            titulo: safe(p.titulo),
            tipo: safe(p.tipo),
            anio: safe(p.anio),
            estado: safe(p.estado),
          }))
        : [
            {
              id_producto_semillero: "",
              titulo: "Sin productos registrados",
              tipo: "",
              anio: "",
              estado: "",
            },
          ],

      actividades_detalle: actividades.length
        ? actividades.map((a) => ({
            id_actividad_semillero: safe(a.id_actividad_semillero),
            actividad: safe(a.actividad),
            tipo: safe(a.tipo),
            fecha: formatDate(a.fecha),
            estado: safe(a.estado),
            descripcion: safe(a.descripcion),
          }))
        : [
            {
              id_actividad_semillero: "",
              actividad: "Sin actividades registradas",
              tipo: "",
              fecha: "",
              estado: "",
              descripcion: "",
            },
          ],

      aplicacion_conocimiento:
        "Fortalecimiento de competencias investigativas, apoyo a procesos académicos y consolidación de evidencias del semillero.",

      sector_beneficiado: "Educativo",

      beneficiarios: `Se beneficiaron directamente ${indicadores.estudiantesTotales} integrante(s) registrados del semillero, además de los participantes alcanzados mediante actividades de formación, socialización o divulgación.`,

      conclusiones: [
        buildConclusionesTexto(semillero, indicadores),
        safe(semillero.conclusiones, "")
        ]
        .filter((x) => x && x.trim() !== "")
        .join("\n"),

      referencias: safe(
        semillero.referencias_texto,
        "Las referencias y evidencias del periodo pueden ser ajustadas manualmente según los soportes institucionales."
      ),

      preparado_por: safe(semillero.docente_responsable_nombre, "Docente responsable del semillero"),
      revisado_por: safe(semillero.docente_responsable_nombre, "Docente responsable del semillero"),
      aprobado_por_1: safe(semillero.lider_grupo_nombre, "Líder Grupo de Investigación"),
      aprobado_por_2: safe(semillero.director_investigaciones_nombre, "Director de Investigaciones"),
    });

    const out = docxTemplate.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const anioActual = new Date().getFullYear();

    const nombreArchivo = `Informe_Semillero_${safe(
    semillero.nombre,
    semilleroId
    ).replace(/\s+/g, "_")}_${anioActual}.docx`;

    saveAs(out, nombreArchivo);

    return { ok: true, nombreArchivo };
  } catch (error) {
    console.error("Error generando informe desde plantilla:", error);
    return {
      ok: false,
      error: error.message || "No se pudo generar el informe con plantilla.",
    };
  }
}