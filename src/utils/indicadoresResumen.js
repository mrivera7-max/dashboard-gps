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

  const investigadoresActivos = investigadores.filter(isActivoInv).length;

  const productosTotales =
    typeof kpis?.total_productos === "number"
      ? kpis.total_productos
      : productos.length;

  const proyectosActivos = proyectos.filter((p) => {
    const estado = normalizar(p?.estado);
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

  const brechaA1 = Math.max(100 - productosTotales, 0);

  return {
    investigadoresActivos,
    productosTotales,
    proyectosActivos,
    categoriaGrupo,
    productividadPromedio,
    brechaA1,
  };
}