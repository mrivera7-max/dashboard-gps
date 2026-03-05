import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine
} from "recharts";

import { PieChart, Pie, Cell } from "recharts";

// ===================== helpers =====================
const CATS_PRODUCTO = [
  "Nuevo Conocimiento",
  "Desarrollo Tecnológico",
  "Apropiación Social",
  "Divulgación pública ciencia",
  "Formación RRHH",
  "N/A",
];

const CAT_KEYS = {
  "Nuevo Conocimiento": "NC",
  "Desarrollo Tecnológico": "DT",
  "Apropiación Social": "ASC",
  "Divulgación pública ciencia": "DIV",
  "Formación RRHH": "FRH",
};

const CAT_COLORS = {
  NC: "#0B3C5D",   // azul oceano
  DT: "#1F77B4",   // azul marino
  ASC: "#1a204e",  // azul medio
  DIV: "#1FA187",  // verde mar
  FRH: "#17BECF",  // turquesa
};

const INV_COLORS = {
  IE: "#6B2D5C", // ciruela
  IS: "#4A1D41", // morado
  IA: "#C4A1C2", // malva
  IJ: "#8B5A8C", // purpura
  SC: "#E6D5E6", // lila
};

const LINEA_COLORS = {
  "Robótica": "#D97706", // naranja quemado
  "Control": "#d14d4d", // rojo oxido
  "Procesamiento de Señales": "#e0ad3e", // mostaza
  "Telecomunicaciones": "#4D7C0F", // verde oliva
  "N/A": "#F5E6C8", // Beige calido
};

const colorTitulo = { color: "#1B75BC", fontWeight: 900 };
const textHeader = { color: "#1B75BC", fontWeight: 900 };   // azul institucional
const textBody = { color: "#0F3E68", fontWeight: 700 };     // azul más oscuro

const CATS_PRODUCTO_SIN_NA = Object.keys(CAT_KEYS); // solo las 5 válidas
const getInvYear = (i) => Number(i.anio_ingreso || i.anio_vinculacion || i.anio || 0);

const CATS_INV = ["IE", "IS", "IA", "IJ", "SC"];
const LINEAS = ["Robótica", "Control", "Procesamiento de Señales", "Telecomunicaciones"];

const init = (keys) => keys.reduce((a, k) => ((a[k] = 0), a), {});
const initCatKeys = () => init(Object.values(CAT_KEYS));

const normProdCat = (v) => {
  const s = (v ?? "").toString().trim();
  return CATS_PRODUCTO.includes(s) ? s : "N/A";
};

const normInvCat = (v) => {
  const s = (v ?? "").toString().trim().toUpperCase();
  return CATS_INV.includes(s) ? s : "SC";
};

const normLinea = (v) => {
  const s = (v ?? "").toString().trim();
  return LINEAS.includes(s) ? s : "N/A";
};

const normTipoProducto = (v) => {
  const s = (v ?? "").toString().trim();
  return s ? s : "Sin tipo";
};

const isActivoInv = (i) => {
  const v = i?.activo;
  if (v === true || String(v).trim().toLowerCase() === "true") return true;

  // solo fallback si activo no está definido (null/undefined/"")
  if (v === undefined || v === null || String(v).trim() === "") {
    const e = String(i?.estado_investigador ?? "").trim().toLowerCase();
    return e === "activo";
  }
  return false;
};

// ===================== loader =====================
async function loadEstadoGeneral() {
  // ===== 1) INVESTIGADORES primero (porque productos lo necesita) =====
  const invSnap = await getDocs(collection(db, "investigadores"));
  const prodSnap = await getDocs(collection(db, "productos"));
  const prodByYear = {};
  prodSnap.forEach((d) => {
    const p = d.data();
    const y = Number(p.anio || 0);
    if (y > 0) prodByYear[y] = (prodByYear[y] || 0) + 1;
  });
  
  const invMap = {}; // id -> { activo, cat }
  const invByCatActivos = init(CATS_INV);
  let invActivos = 0;

  invSnap.forEach((d) => {
    const i = d.data();
    const id = (i.id_investigador || d.id || "").toString().trim();
    const activo = isActivoInv(i);
    const cat = normInvCat(i.categoria_minciencias_investigador);

    invMap[id] = { activo, cat };

    if (activo) {
      invActivos++;
      invByCatActivos[cat] = (invByCatActivos[cat] || 0) + 1;
    }
  });

      // ===== 1B) Evolución de vinculación (activos) =====
    const invVincByYear = {};
    invSnap.forEach((d) => {
      const i = d.data();
      const y = Number(i.anio_vinculacion || 0); // ya lo tienes definido arriba
      if (y > 0) invVincByYear[y] = (invVincByYear[y] || 0) + 1;
    });

  const vinculacionPorAno = Object.keys(invVincByYear)
    .map(Number)
    .sort((a, b) => a - b)
    .map((y) => ({ year: String(y), total: invVincByYear[y] }));

  const vincuUltimos10 = vinculacionPorAno.slice(-10);

  // ===== 2) PRODUCTOS =====
  
  const prodByCat = init([...CATS_PRODUCTO_SIN_NA, "N/A"]);
  
  const matrizTipoCat = {}; // tipo -> {NC,DT,ASC,DIV,FRH}
  const tiposSet = new Set();

  const prodByYearCat = {}; // year -> {NC,DT,ASC,DIV,FRH}
  // Primero: conteo por año (para definir últimos 10)

  const produccionPorAno = Object.keys(prodByYear)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => ({ year: String(year), total: prodByYear[year] }));

  const yearsProduccion = produccionPorAno.map((r) => Number(r.year)); // todos los años
  const produccionUltimos10 = produccionPorAno.slice(-10);
  const last10Years = produccionUltimos10.map((r) => Number(r.year)); // [2017..]
  const last10Set = new Set(last10Years);

  // Estructura: investigadores activos por año/cat (Set para no duplicar)
  const invActivosPorAnoCat = {}; // year -> cat -> Set(invId)
  last10Years.forEach((y) => {
    invActivosPorAnoCat[y] = {};
    CATS_INV.forEach((c) => (invActivosPorAnoCat[y][c] = new Set()));
  });

  // Segunda pasada: KPIs por categoría, series, matriz, y conteo inv por año/cat
  prodSnap.forEach((d) => {
    const p = d.data();
    const y = Number(p.anio || 0);
    if (!last10Set.has(y)) return;

    const catRaw = p.categoria_minciencias_producto ?? p.categoria_minciencias ?? "";
    const cat = normProdCat(catRaw);

    // KPI por categoría (sin N/A)
    if (cat !== "N/A") prodByCat[cat]++;

    // Serie por año y categoría (sin N/A)
    if (y > 0 && cat !== "N/A") {
      const yy = String(y);
      if (!prodByYearCat[yy]) prodByYearCat[yy] = initCatKeys();
      const k = CAT_KEYS[cat];
      prodByYearCat[yy][k] = (prodByYearCat[yy][k] || 0) + 1;
    }

    // Matriz categoría x tipo (sin N/A)
    const tipo = normTipoProducto(p.tipo_producto ?? p.tipo ?? "");
    if (cat !== "N/A") {
      tiposSet.add(tipo);
      if (!matrizTipoCat[tipo]) matrizTipoCat[tipo] = initCatKeys();
      const k = CAT_KEYS[cat];
      matrizTipoCat[tipo][k] = (matrizTipoCat[tipo][k] || 0) + 1;
    }

    // Investigadores activos por año/categoría (solo si el producto lo firma)
    const autorIds = Array.isArray(p.autorIds) ? p.autorIds : [];
    autorIds.forEach((invIdRaw) => {
      const invId = (invIdRaw || "").toString().trim();
      if (!invId) return;
      const inv = invMap[invId];
      if (!inv || inv.activo !== true) return;
      invActivosPorAnoCat[y][inv.cat].add(invId);
    });
  });

  

  // Distribución global (ordenada)
  const distribucionCategorias = CATS_PRODUCTO_SIN_NA
    .map((cat) => ({
      categoria: cat,
      total: prodByCat[cat] ?? 0,
      key: CAT_KEYS[cat],
    }))
    .sort((a, b) => b.total - a.total);

  // Evolución (últimos 10, sin N/A)
  const evolucionCategorias = Object.keys(prodByYearCat)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => ({ year: String(year), ...prodByYearCat[String(year)] }));

  const evolucionCategoriasUltimos10 = evolucionCategorias.slice(-10);

  // Composición 100% (últimos 10)
  const composicionCategorias = evolucionCategorias.map((row) => {
    const total = Object.values(CAT_KEYS).reduce((acc, k) => acc + (row[k] || 0), 0);
    const out = { year: row.year };
    Object.values(CAT_KEYS).forEach((k) => {
      out[k] = total === 0 ? 0 : Number((((row[k] || 0) / total) * 100).toFixed(1));
    });
    return out;
  });

  const composicionCategoriasUltimos10 = composicionCategorias.slice(-10);

  // Matriz tipo x categoría
  const tipos = Array.from(tiposSet).sort((a, b) => a.localeCompare(b));
  const matrizCategoriaTipo = tipos.map((tipo) => ({ tipo, ...matrizTipoCat[tipo] }));

  // KPIs estratégicos (sin N/A)
  const totalSinNA = distribucionCategorias.reduce((a, x) => a + x.total, 0);
  const totNC = prodByCat["Nuevo Conocimiento"] ?? 0;
  const totDT = prodByCat["Desarrollo Tecnológico"] ?? 0;

  const kpisAnalisis = {
    total_sin_na: totalSinNA,
    pct_nc: totalSinNA ? Number(((totNC / totalSinNA) * 100).toFixed(1)) : 0,
    pct_dt: totalSinNA ? Number(((totDT / totalSinNA) * 100).toFixed(1)) : 0,
    indice_nc_dt: totDT ? Number((totNC / totDT).toFixed(2)) : null,
    indice_dt_nc: totNC ? Number((totDT / totNC).toFixed(2)) : null,
  };

 
// investigadores activos por año (según año_vinculacion)
 
// acumulado de investigadores activos

 const currentYear = new Date().getFullYear();
  const startYear = currentYear - 9;

  // ✅ usa invVincByYear (activos por año de vinculación) ya calculado arriba
  
const produccionVsTalento = Array.from({ length: 10 }, (_, idx) => {
  const y = startYear + idx;
  
  return {
    year: String(y),
    productos: prodByYear[y] || 0,
    investigadores: invVincByYear[y] || 0,
  };
});

  const productividadPromedio = invActivos > 0
      ? Number((totalSinNA / invActivos).toFixed(2))
      : 0;

  // Investigadores activos por año/categoría (todos los años disponibles)
  const invByYearCatActivos = {};
  Object.keys(invActivosPorAnoCat).forEach((yy) => {
    invByYearCatActivos[yy] = {};
    CATS_INV.forEach((c) => (invByYearCatActivos[yy][c] = invActivosPorAnoCat[yy][c].size));
  });

  const invActivosPorAnoCategoria = Object.keys(invByYearCatActivos)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => ({ year: String(year), ...invByYearCatActivos[String(year)] }));

  const invActivosUltimos10PorAnoCategoria = last10Years
    .map((y) => {
      const row = { year: String(y) };
      CATS_INV.forEach((cat) => (row[cat] = invActivosPorAnoCat[y][cat].size));
      return row;
    });

  const investigadoresActivosPorCategoria = CATS_INV.map((cat) => ({
    categoria: cat,
    total: invByCatActivos[cat] ?? 0,

  }));

  const PESOS_MADUREZ = { IE: 5, IS: 4, IA: 3, IJ: 2, SC: 1 };

  const sumaPonderada = CATS_INV.reduce(
    (acc, c) => acc + (invByCatActivos[c] || 0) * (PESOS_MADUREZ[c] || 1),
    0
  );

  const indiceMadurez = invActivos > 0
    ? Number((sumaPonderada / invActivos).toFixed(2))
    : 0;

    // ============ PROYECTOS ============
  const proySnap = await getDocs(collection(db, "proyectos"));
  const proyByLinea = init([...LINEAS, "N/A"]);

  // yearsProduccion: usa los años que ya salen de productos (produccionPorAno)
  const yearsProduccionSet = new Set(yearsProduccion);

  // year -> linea -> count (solo años de producción)
  const proyByYearLinea = {};
  yearsProduccion.forEach((y) => {
    proyByYearLinea[y] = init([...LINEAS, "N/A"]);
  });

  proySnap.forEach((d) => {
    const pr = d.data();

    const lineaRaw = pr.linea_investigacion ?? pr["linea_investigación"] ?? "";
    const linea = normLinea(lineaRaw);

    // total global por línea
    proyByLinea[linea]++;

    // por año (anio_inicio)
    const y0 = Number(pr.anio_inicio || 0);
    if (y0 > 0 && yearsProduccionSet.has(y0)) {
      proyByYearLinea[y0][linea] = (proyByYearLinea[y0][linea] || 0) + 1;
    }
  });

  // Pie (%)
  const proyectosPorLineaPie = [...LINEAS]
    .map((linea) => ({ name: linea, value: proyByLinea[linea] ?? 0 }))
    .filter((x) => x.value > 0);

  // Barras por año (años de producción) x línea
  const proyectosPorLineaPorAno = yearsProduccion
    .sort((a, b) => a - b)
    .map((y) => ({
      year: String(y),
      ...proyByYearLinea[y], // Robótica, Control, ...
    }));

  const proyectosPorLinea = [...LINEAS].map((linea) => ({
    linea,
    total: proyByLinea[linea] ?? 0,
  }));

  

   return {
    productos: { total: prodSnap.size, porCategoria: prodByCat },
    investigadores: {
      total: invSnap.size,
      activos: invActivos,
      porCategoriaActivos: invByCatActivos,
    },
    proyectos: { total: proySnap.size, porLinea: proyByLinea },
    charts: {
      produccionPorAno,
      produccionUltimos10,
      distribucionCategorias,
      evolucionCategorias,
      evolucionCategoriasUltimos10,
      composicionCategorias,
      composicionCategoriasUltimos10,
      matrizCategoriaTipo,
      kpisAnalisis,
      investigadoresActivosPorCategoria,
      invActivosPorAnoCategoria,
      invActivosUltimos10PorAnoCategoria,
      proyectosPorLinea,
      proyectosPorLineaPie,
      proyectosPorLineaPorAno,
      produccionVsTalento,
      vinculacionPorAno,
      vinculacionUltimos10: vincuUltimos10,
      kpisTalento: {
        productividad_promedio: productividadPromedio,
        indice_madurez: indiceMadurez,
      },
    },
  };
}

// ===================== styles =====================
const card = {
  background: "white",
  border: "1px solid rgba(45,156,219,0.25)",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};

const h3 = { margin: 0, marginBottom: 10, color: "#1B75BC" };

const row = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  color: "#111827",
  fontWeight: 800,
  marginBottom: 12,
};

const grid6 = { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 };
const grid5 = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 };
const grid4 = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 };

const miniCard = {
  border: "1px solid rgba(45,156,219,0.20)",
  borderRadius: 12,
  padding: 12,
  background: "rgba(45,156,219,0.05)",
};

const miniTitle = { fontSize: 12, fontWeight: 900, color: "#4A5568" };
const miniValue = { fontSize: 22, fontWeight: 900, marginTop: 6, color: "#111827" };

const placeholder = {
  height: 180,
  borderRadius: 12,
  border: "1px dashed rgba(45,156,219,0.45)",
  background: "rgba(45,156,219,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#4A5568",
  fontWeight: 800,
};

// ===================== componente =====================
export default function EstadoGeneralGrupo({ refreshKey }) {
  const [kpis, setKpis] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    loadEstadoGeneral()
      .then(setKpis)
      .catch((e) => {
        console.error(e);
        setErr(e?.message || "Error cargando estado general");
      });
  }, [refreshKey]);

  if (err) return <div style={{ color: "#b91c1c", fontWeight: 900 }}>{err}</div>;
  if (!kpis) return <div>Cargando Indicadores…</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <h3 style={h3}>Productos</h3>
        <div style={row}>
          <div><b>Total:</b> {kpis.productos.total}</div>
        </div>
        <div style={grid6}>
          {CATS_PRODUCTO.map((c) => (
            <div key={c} style={miniCard}>
              <div style={miniTitle}>{c}</div>
              <div style={miniValue}>{kpis.productos.porCategoria[c] ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h3 style={h3}>Investigadores</h3>
        <div style={row}>
          <div><b>Total:</b> {kpis.investigadores.total}</div>
          <div><b>Activos:</b> {kpis.investigadores.activos}</div>
            <div style={grid4}>
              <div style={miniCard}>
                <div style={miniTitle}>Productividad promedio (productos/investigador activo)</div>
                <div style={miniValue}>{kpis.charts.kpisTalento.productividad_promedio}</div>
              </div>

              <div style={miniCard}>
                <div style={miniTitle}>Índice de madurez investigativa</div>
                <div style={miniValue}>{kpis.charts.kpisTalento.indice_madurez}</div>
              </div>
            </div>
        </div>
        <div style={grid5}>
          {CATS_INV.map((c) => (
            <div key={c} style={miniCard}>
              <div style={miniTitle}>{c}</div>
              <div style={miniValue}>{kpis.investigadores.porCategoriaActivos[c] ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h3 style={h3}>Proyectos</h3>
        <div style={row}>
          <div><b>Total:</b> {kpis.proyectos.total}</div>
        </div>
        <div style={grid4}>
          {LINEAS.map((l) => (
            <div key={l} style={miniCard}>
              <div style={miniTitle}>{l}</div>
              <div style={miniValue}>{kpis.proyectos.porLinea[l] ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <h3 style={h3}>Producción por Año</h3>
        {/* Línea histórica */}
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={kpis.charts.produccionPorAno}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" name="Productos" stroke="#1B75BC" strokeWidth={3} />
               
            </LineChart>
          </ResponsiveContainer>
        </div>
     
      
      {/* Barras últimos 10 años */}
      
        <h3 style={h3}>Producción últimos 10 años</h3>
        <div style={{ width: "100%", height: 260, marginTop: 20 }}>
          <ResponsiveContainer>
            <BarChart data={kpis.charts.produccionUltimos10}
              margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              
              <Bar dataKey="total" name="Productos últimos 10 años" fill="#0F3E68" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={card}>
  <h3 style={h3}>Análisis de Producción </h3>

  {/* KPIs estratégicos */}
  <div style={{ ...row, marginBottom: 18 }}>
  <div><span style={colorTitulo}>Total:</span> {kpis.charts.kpisAnalisis.total_sin_na}</div>
  <div><span style={colorTitulo}>% Nuevo Conocimiento:</span> {kpis.charts.kpisAnalisis.pct_nc}%</div>
  <div><span style={colorTitulo}>% Desarrollo Tecnológico:</span> {kpis.charts.kpisAnalisis.pct_dt}%</div>
  <div><span style={colorTitulo}>Índice NC/DT:</span> {kpis.charts.kpisAnalisis.indice_nc_dt ?? "—"}</div>
  <div><span style={colorTitulo}>Índice DT/NC:</span> {kpis.charts.kpisAnalisis.indice_dt_nc ?? "—"}</div>
</div>

{/* (1) Diagnóstico: distribución global */}
<div style={{ width: "100%", height: 320 }}>
  <ResponsiveContainer>
    <BarChart
      data={kpis.charts.distribucionCategorias}
      layout="vertical"
      margin={{ left: 60 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" allowDecimals={false} />
      <YAxis type="category" dataKey="categoria" width={180} />
      <Tooltip />
      <Legend />
      <Bar
        dataKey="total"
        name="Productos"
        fill="#1B75BC"
      />
    </BarChart>
  </ResponsiveContainer>
</div>

  {/* (2) Evolución: apilada (últimos 10) */}
  <div style={{ width: "100%", height: 360, marginTop: 22 }}>
    <div style={{ fontWeight: 900, color: "#1B75BC", marginBottom: 8 }}>
      Evolución por categoría
    </div>
    <ResponsiveContainer>
      <BarChart
        data={kpis.charts.evolucionCategoriasUltimos10}
        margin={{ bottom: 40 }}
        barCategoryGap="20%"
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" angle={-30} textAnchor="end" interval={0} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />

        {/*barras agrupadas */}
        <Bar dataKey="NC" name="Nuevo Conocimiento" fill={CAT_COLORS.NC} />
        <Bar dataKey="DT" name="Desarrollo Tecnológico" fill={CAT_COLORS.DT} />
        <Bar dataKey="ASC" name="Apropiación Social" fill={CAT_COLORS.ASC} />
        <Bar dataKey="DIV" name="Divulgación pública ciencia" fill={CAT_COLORS.DIV} />
        <Bar dataKey="FRH" name="Formación RRHH" fill={CAT_COLORS.FRH} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* (3) Composición: 100% apilada (últimos 10) */}
  <div style={{ width: "100%", height: 360, marginTop: 22 }}>
    <div style={{ fontWeight: 900, color: "#1B75BC", marginBottom: 8 }}>
      Composición porcentual
    </div>
    <ResponsiveContainer>
      <BarChart data={kpis.charts.composicionCategoriasUltimos10} margin={{ bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" angle={-30} textAnchor="end" interval={0} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v) => [`${v}%`, ""]} />
        <Legend />
        <Bar dataKey="NC" stackId="p" name="Nuevo Conocimiento %" fill={CAT_COLORS.NC} />
        <Bar dataKey="DT" stackId="p" name="Desarrollo Tecnológico %" fill={CAT_COLORS.DT} />
        <Bar dataKey="ASC" stackId="p" name="Apropiación Social %" fill={CAT_COLORS.ASC} />
        <Bar dataKey="DIV" stackId="p" name="Divulgación pública ciencia %" fill={CAT_COLORS.DIV} />
        <Bar dataKey="FRH" stackId="p" name="Formación RRHH %" fill={CAT_COLORS.FRH} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* (4) Matriz: categoría x tipo (tabla) */}
  <div style={{ marginTop: 22 }}>
    <div style={{ fontWeight: 900, color: "#1B75BC", marginBottom: 10 }}>
      Caracterización de la producción científica
    </div>

    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...textHeader, textAlign: "left", padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>Tipo</th>
            <th style={{ ...textHeader, padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>NC</th>
            <th style={{ ...textHeader, padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>DT</th>
            <th style={{ ...textHeader, padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>ASC</th>
            <th style={{ ...textHeader, padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>DIV</th>
            <th style={{ ...textHeader, padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>FRH</th>
            <th style={{ ...textHeader, padding: 10, borderBottom: "1px solid rgba(45,156,219,0.25)" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {kpis.charts.matrizCategoriaTipo.map((r) => {
            const total = (r.NC || 0) + (r.DT || 0) + (r.ASC || 0) + (r.DIV || 0) + (r.FRH || 0);
            return (
              <tr key={r.tipo}>
                <td style={{ ...textBody, padding: 10, borderBottom: "1px solid rgba(0,0,0,0.06)", fontWeight: 800 }}>{r.tipo}</td>
                <td style={{ ...textBody, padding: 10, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{r.NC || 0}</td>
                <td style={{ ...textBody, padding: 10, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{r.DT || 0}</td>
                <td style={{ ...textBody, padding: 10, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{r.ASC || 0}</td>
                <td style={{ ...textBody, padding: 10, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{r.DIV || 0}</td>
                <td style={{ ...textBody, padding: 10, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>{r.FRH || 0}</td>
                <td style={{ ...textBody, padding: 10, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.06)", fontWeight: 900 }}>{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
</section>

      <section style={card}>
        <h3 style={h3}>Investigadores activos por categoría </h3>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={kpis.charts.investigadoresActivosPorCategoria}
                dataKey="total"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {kpis.charts.investigadoresActivosPorCategoria.map((e) => (
                  <Cell key={e.categoria} fill={INV_COLORS[e.categoria] || "#1B75BC"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>


        <h3 style={h3}>Evolución de la producción científica y talento investigador</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={kpis.charts.produccionVsTalento}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            
            <YAxis yAxisId="left" allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" allowDecimals={false} />

            <Tooltip />
            <Legend />

            <Bar
              yAxisId="left"
              dataKey="productos"
              name="Productos científicos"
              fill="#2D9CDB"
              barSize={28}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="investigadores"
              name="Investigadores activos"
              stroke="#EB5757"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>



      <section style={card}>
        <h3 style={h3}>Distribución de proyectos por línea de investigación</h3>

        {/* Torta % */}
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={kpis.charts.proyectosPorLineaPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {kpis.charts.proyectosPorLineaPie.map((e) => (
                  <Cell key={e.name} fill={LINEA_COLORS[e.name] || "#1B75BC"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Barras: años de producción (X) y proyectos iniciados ese año (por línea) */}
        <h3 style={{ ...h3, marginTop: 18 }}>Distribución anual de proyectos iniciados </h3>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart data={kpis.charts.proyectosPorLineaPorAno} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" angle={-30} textAnchor="end" interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />

              {/* Barras agrupadas por línea */}
              <Bar dataKey="Robótica" name="Robótica" fill={LINEA_COLORS["Robótica"]} />
              <Bar dataKey="Control" name="Control" fill={LINEA_COLORS["Control"]} />
              <Bar dataKey="Procesamiento de Señales" name="Procesamiento de Señales" fill={LINEA_COLORS["Procesamiento de Señales"]} />
              <Bar dataKey="Telecomunicaciones" name="Telecomunicaciones" fill={LINEA_COLORS["Telecomunicaciones"]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>
  );
}