// Exporta a Excel el histórico de proyectos y productos del grupo GPS.
// Excluye registros con eliminación lógica (deleted: true).
import * as XLSX from "xlsx";

const activo = (d) => d && d.deleted !== true && d.deleted !== "true";
const txt = (v) => (v === null || v === undefined ? "" : String(v).trim());
const num = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : "";
};

const ORDEN_CAT = {
  "Nuevo Conocimiento": 1,
  "Desarrollo Tecnológico": 2,
  "Apropiación Social": 3,
  "Divulgación pública ciencia": 4,
  "Formación RRHH": 5,
};

export function exportarHistoricoExcel({ investigadores = [], productos = [], proyectos = [], desde, hasta } = {}) {
  const inv = investigadores.filter(activo);
  const proy = proyectos.filter(activo);
  const prod = productos.filter(activo);

  const nombre = {};
  inv.forEach((i) => {
    const n = `${txt(i.nombres)} ${txt(i.apellidos)}`.trim();
    if (i.id_investigador) nombre[i.id_investigador] = n;
    nombre[i.id] = n;
  });
  const idProy = (p) => p.id_proyecto || p.codigo || p.id;
  const tituloProy = {};
  proy.forEach((p) => (tituloProy[idProy(p)] = txt(p.nombre_proyecto || p.titulo)));

  const enRango = (a) => {
    const n = num(a);
    if (n === "") return desde == null && hasta == null;
    return (desde == null || n >= desde) && (hasta == null || n <= hasta);
  };

  const filasProyectos = proy
    .filter((p) => enRango(p.anio_inicio))
    .sort((a, b) => (num(b.anio_inicio) || 0) - (num(a.anio_inicio) || 0))
    .map((p, k) => ({
      "N°": k + 1,
      "Código": idProy(p),
      "Proyecto": txt(p.nombre_proyecto || p.titulo),
      "Año inicio": num(p.anio_inicio),
      "Estado": txt(p.estado_proyecto),
      "Línea de investigación": txt(p.linea_investigacion),
      "Acto administrativo": txt(p.acto_administrativo),
      "Investigador principal": nombre[p.investigador_principal] || txt(p.investigador_principal),
      "Productos asociados": prod.filter((x) => x.proyecto_asociado_id === idProy(p)).length,
    }));

  const filasProductos = prod
    .filter((p) => enRango(p.anio))
    .sort(
      (a, b) =>
        (ORDEN_CAT[a.categoria_minciencias_producto] || 9) - (ORDEN_CAT[b.categoria_minciencias_producto] || 9) ||
        txt(a.tipo_producto).localeCompare(txt(b.tipo_producto)) ||
        (num(b.anio) || 0) - (num(a.anio) || 0)
    )
    .map((p, k) => ({
      "N°": k + 1,
      "Categoría MinCiencias": txt(p.categoria_minciencias_producto) || "Sin categoría",
      "Tipo de producto": txt(p.tipo_producto),
      "Título": txt(p.titulo),
      "Año": num(p.anio),
      "Estado": txt(p.estado_producto),
      "Investigador": nombre[p.id_investigador] || txt(p.id_investigador),
      "Proyecto asociado": p.proyecto_asociado_id
        ? `${p.proyecto_asociado_id} – ${tituloProy[p.proyecto_asociado_id] || ""}`
        : "",
      "DOI": txt(p.doi),
      "ISBN": txt(p.isbn),
      "N° registro": txt(p.numero_registro),
      "URL": txt(p.url),
      "ID": p.id,
    }));

  const anios = [...new Set([
    ...filasProyectos.map((p) => p["Año inicio"]),
    ...filasProductos.map((p) => p["Año"]),
  ].filter((a) => a !== ""))].sort((a, b) => b - a);
  const cats = Object.keys(ORDEN_CAT);
  const resumen = anios.map((a) => {
    const fila = {
      "Año": a,
      "Proyectos": filasProyectos.filter((p) => p["Año inicio"] === a).length,
      "Productos": filasProductos.filter((p) => p["Año"] === a).length,
    };
    cats.forEach((c) => (fila[c] = filasProductos.filter((p) => p["Año"] === a && p["Categoría MinCiencias"] === c).length));
    return fila;
  });
  const total = { "Año": "Total", "Proyectos": filasProyectos.length, "Productos": filasProductos.length };
  cats.forEach((c) => (total[c] = filasProductos.filter((p) => p["Categoría MinCiencias"] === c).length));
  resumen.push(total);

  const hoja = (filas, anchos) => {
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = anchos.map((w) => ({ wch: w }));
    if (filas.length) ws["!autofilter"] = { ref: ws["!ref"] };
    return ws;
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja(resumen, [8, 10, 10, 18, 20, 18, 22, 16]), "Resumen por año");
  XLSX.utils.book_append_sheet(wb, hoja(filasProyectos, [5, 12, 70, 10, 13, 22, 20, 30, 10]), "Proyectos");
  XLSX.utils.book_append_sheet(wb, hoja(filasProductos, [5, 22, 26, 70, 7, 18, 30, 45, 22, 18, 14, 30, 22]), "Productos");

  const rango = desde || hasta ? `_${desde || "inicio"}-${hasta || "actual"}` : "";
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Historico_GPS${rango}_${fecha}.xlsx`);
  return { proyectos: filasProyectos.length, productos: filasProductos.length };
}
