export function calcularResumenEjecutivo({
  investigadores = [],
  productos = [],
  proyectos = [],
  kpis = {},
}) {
  const normalizar = (v) => String(v || "").trim().toLowerCase();

  const isActivoInv = (i) => {
    const v = i?.activo;
    if (v === true || normalizar(v) === "true") return true;

    if (v === undefined || v === null || String(v).trim() === "") {
      return normalizar(i?.estado_investigador) === "activo";
    }
    return false;
  };

  // Excluye registros con eliminación lógica
  const vigente = (x) => x && x.deleted !== true && normalizar(x.deleted) !== "true";

  const investigadoresActivos = investigadores.filter((i) => vigente(i) && isActivoInv(i)).length;

  // Conteo en vivo desde Firestore (el KPI guardado puede incluir eliminados)
  const productosTotales = productos.filter(vigente).length;

  const proyectosActivos = proyectos.filter((p) => {
    if (!vigente(p)) return false;
    const estado = normalizar(p?.estado_proyecto || p?.estado);
    return (
      estado === "en ejecución" ||
      estado === "en ejecucion" ||
      estado === "activo"
    );
  }).length;

  const productividadPromedio =
    investigadoresActivos > 0
      ? Number((productosTotales / investigadoresActivos).toFixed(1))
      : 0;

  const categoriaGrupo = "A";

  // La brecha real hacia A1 requiere los umbrales oficiales MinCiencias (ver Prospectiva).
  // Mientras no estén cargados, se muestra como pendiente en lugar de un valor ficticio.
  const brechaA1 = null;

  return {
    investigadoresActivos,
    productosTotales,
    proyectosActivos,
    categoriaGrupo,
    productividadPromedio,
    brechaA1,
  };
}