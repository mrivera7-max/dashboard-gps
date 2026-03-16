import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

function norm(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function contarPorCampo(lista = [], campo) {
  return lista.reduce((acc, item) => {
    const key = item?.[campo] || "Sin dato";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function contarPorAnio(lista = [], campoAnio) {
  return lista.reduce((acc, item) => {
    const anio = Number(item?.[campoAnio] || 0);
    if (!anio) return acc;
    acc[anio] = (acc[anio] || 0) + 1;
    return acc;
  }, {});
}

function investigadoresPorCategoria(investigadores = []) {
  return investigadores
    .filter((inv) => inv.activo === true || norm(inv.estado_investigador).includes("activo"))
    .reduce((acc, inv) => {
      const cat = String(
        inv.categoria_minciencias || inv.categoria_minciencias_investigador || "Sin categoría"
      ).trim() || "Sin categoría";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
}

function evaluarTalento({ investigadores = [], productos = [] }) {
  const activos = investigadores.filter(
    (inv) => inv.activo === true || norm(inv.estado_investigador).includes("activo")
  );

  const categorias = investigadoresPorCategoria(activos);

  const totalCat =
    (categorias.IS || 0) + (categorias.IA || 0) + (categorias.IJ || 0);

  const productividad = activos.length > 0 ? productos.length / activos.length : 0;

  return {
    labels: ["Activos", "Categorizados", "Prod. prom."],
    values: [activos.length, totalCat, Number(productividad.toFixed(2))],
  };
}

async function renderChartToDataUrl(config, width = 1200, height = 650) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const chart = new Chart(ctx, config);

  await new Promise((resolve) => setTimeout(resolve, 300));
  const dataUrl = canvas.toDataURL("image/png");
  chart.destroy();

  return dataUrl;
}

export async function generarGraficasInforme({
  investigadores = [],
  productos = [],
  proyectos = [],
}) {
  const productosPorAnio = contarPorAnio(productos, "anio");
  const aniosProductos = Object.keys(productosPorAnio)
    .map(Number)
    .sort((a, b) => a - b);

  const ultimos10 = aniosProductos.slice(-10);
  const proyectosPorLinea = contarPorCampo(proyectos, "linea_investigacion");
  const proyectosPorAnio = contarPorAnio(proyectos, "anio_inicio");
  const invCategoria = investigadoresPorCategoria(investigadores);
  const talento = evaluarTalento({ investigadores, productos });

  const grafica_produccion_anual = await renderChartToDataUrl({
    type: "bar",
    data: {
      labels: aniosProductos,
      datasets: [
        {
          label: "Producción anual",
          data: aniosProductos.map((a) => productosPorAnio[a] || 0),
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: "Producción científica anual" },
      },
    },
  });

  const grafica_produccion_diez_anios = await renderChartToDataUrl({
    type: "line",
    data: {
      labels: ultimos10,
      datasets: [
        {
          label: "Producción últimos 10 años",
          data: ultimos10.map((a) => productosPorAnio[a] || 0),
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: "Producción científica últimos 10 años" },
      },
    },
  });

  const lineas = Object.keys(proyectosPorLinea);
  const grafica_proyectos_linea = await renderChartToDataUrl({
    type: "bar",
    data: {
      labels: lineas,
      datasets: [
        {
          label: "Proyectos por línea",
          data: lineas.map((k) => proyectosPorLinea[k] || 0),
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: "Distribución de proyectos por línea" },
      },
    },
  });

  const aniosProyectos = Object.keys(proyectosPorAnio)
    .map(Number)
    .sort((a, b) => a - b);

  const grafica_proyectos_anuales = await renderChartToDataUrl({
    type: "line",
    data: {
      labels: aniosProyectos,
      datasets: [
        {
          label: "Proyectos iniciados",
          data: aniosProyectos.map((a) => proyectosPorAnio[a] || 0),
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: "Distribución anual de proyectos iniciados" },
      },
    },
  });

  const catsInv = Object.keys(invCategoria);
  const grafica_investigadores_categoria = await renderChartToDataUrl({
    type: "bar",
    data: {
      labels: catsInv,
      datasets: [
        {
          label: "Investigadores por categoría",
          data: catsInv.map((k) => invCategoria[k] || 0),
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: { display: true, text: "Investigadores activos por categoría" },
      },
    },
  });

  const grafica_evaluacion_talento = await renderChartToDataUrl({
    type: "bar",
    data: {
      labels: talento.labels,
      datasets: [
        {
          label: "Evaluación talento investigador",
          data: talento.values,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: "Evaluación de la producción científica y talento investigador",
        },
      },
    },
  });

  return {
    grafica_produccion_anual,
    grafica_produccion_diez_anios,
    grafica_proyectos_linea,
    grafica_proyectos_anuales,
    grafica_investigadores_categoria,
    grafica_evaluacion_talento,
  };
}