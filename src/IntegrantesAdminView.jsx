import { useEffect, useMemo, useState } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  getDocs, documentId
} from "firebase/firestore";
import { db } from "./firebaseConfig"; // ajusta tu import

import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts"; 

const getProyTitulo = (pr) =>
  pr.titulo ||
  pr.nombre ||
  pr.titulo_proyecto ||
  pr.nombre_proyecto ||
  pr.proyecto ||
  pr.titulo_del_proyecto ||
  "—";

const CATS_PROD = [
  "Nuevo Conocimiento",
  "Desarrollo Tecnológico",
  "Apropiación Social",
  "Divulgación pública ciencia",
  "Formación RRHH",
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
  ASC: "#2C7FB8",  // azul medio
  DIV: "#1FA187",  // verde mar
  FRH: "#17BECF",  // turquesa
};

const init = (keys) => keys.reduce((a, k) => ((a[k] = 0), a), {});
const initCat = () => init(Object.values(CAT_KEYS));


const normProdCat = (v) => {
  const s = (v ?? "").toString().trim();
  return CATS_PROD.includes(s) ? s : null;
};

const sectionCard = {
  marginTop: 14,
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(45,156,219,0.18)",
  background: "rgba(45,156,219,0.04)",
};

const sectionTitle = {
  margin: 0,
  marginBottom: 10,
  fontWeight: 900,
  color: "#1B75BC",
  fontSize: 14,
};

const CAT_MINCIENCIAS_LABEL = {
  IE: "Investigador Emérito",
  IS: "Investigador Senior",
  IA: "Investigador Asociado",
  IJ: "Investigador Junior",
  SC: "Sin categoría",
};

function PerfilHeader({ inv }) {
  const nombre = inv
    ? `${inv.nombres || ""} ${inv.apellidos || ""}`.trim() || "—"
    : "—";
  
  const catCode = (inv?.categoria_minciencias_investigador || "").toString().trim().toUpperCase();
  const catLabel = CAT_MINCIENCIAS_LABEL[catCode] || "Sin categoría";

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h3 style={{ margin: 0, color: "#1B75BC" }}>Perfil del investigador :</h3>
        <span style={{ color: "#111827", fontWeight: 900, fontSize: 16 }}>{nombre}</span>
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 13.5,
          color: "#4A5568",
          textDecoration: "none",
          borderBottom: "none",
        }}
      >
        <div>
          <b>Categoría MinCiencias:</b> {catLabel}
        </div>
        <div>
          <b>Año de vinculación:</b> {inv?.anio_vinculacion ?? "—"}
        </div>
        <div>
          <b>Estado:</b>{" "}
          <span style={{ fontWeight: 800 }}>
            {inv?.estado_investigador ?? (inv?.activo ? "Activo" : "Inactivo") ?? "—"}
          </span>
        </div>

        <div>
          <b>Email:</b>{" "}
          <span style={{ fontWeight: 800 }}>
            {inv?.email ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function IntegrantesAdminView() {
  const [integrantes, setIntegrantes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [productos, setProductos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [selectedIntegrante, setSelectedIntegrante] = useState(null);
  const [soloActivos, setSoloActivos] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  

  // 1) Cargar integrantes activos
  useEffect(() => {
  let qInv;

  if (soloActivos) {
    qInv = query(
      collection(db, "investigadores"),
      where("activo", "==", true),
      orderBy("apellidos")
    );
  } else {
    qInv = query(
      collection(db, "investigadores"),
      orderBy("apellidos")
    );
  }

  const unsub = onSnapshot(qInv, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data();
      const idInv = (data.id_investigador || d.id || "").toString().trim();
      return { id: idInv, _docId: d.id, ...data };
    });

    setIntegrantes(list);

    // si el seleccionado ya no existe
      if (selectedDocId && !list.some((x) => x._docId === selectedDocId)) {
        setSelectedId(null);
        setSelectedDocId(null);
        setSelectedIntegrante(null);
        setProductos([]);
        setProyectos([]);
      }
  });

  return () => unsub();
}, [soloActivos, selectedDocId]);

  // Mantener el objeto del integrante seleccionado
  useEffect(() => {
    const inv = integrantes.find(x => x.id === selectedId) || null;
    setSelectedIntegrante(inv);
  }, [integrantes, selectedId]);

// 2) Cargar productos del integrante seleccionado (por id_investigador = selectedId)
useEffect(() => {
  setProductos([]);
  if (!selectedId) return;

  let alive = true;
  const invId = String(selectedId).trim();

  const q = query(
    collection(db, "productos"),
    where("id_investigador", "==", invId)
    // si necesitas orden: agrega orderBy("anio","desc") y crea índice
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      if (!alive) return;
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b)=> Number(b.anio||0) - Number(a.anio||0));
      setProductos(list);
    },
    (err) => console.error("[Productos] ERROR:", err)
  );

  return () => { alive = false; unsub(); };
}, [selectedId]);

  // 5) KPIs rápidos (en frontend)
  const kpis = useMemo(() => {
  const totalProductos = productos.length;
  const totalProyectos = proyectos.length;

  // años con producción
  const yearsSet = new Set();
  productos.forEach(p => {
    const y = Number(p.anio);
    if (y) yearsSet.add(y);
  });

  const years = Array.from(yearsSet).sort((a,b)=>a-b);
  const aniosActivos = years.length;

  const promedioPorAnio =
    aniosActivos > 0 ? (totalProductos / aniosActivos).toFixed(2) : "0";

  // año más productivo
  const countByYear = {};
  productos.forEach(p => {
    const y = p.anio;
    if (!y) return;
    countByYear[y] = (countByYear[y] || 0) + 1;
  });

  let anioPico = "—";
  let max = 0;
  Object.entries(countByYear).forEach(([y, n]) => {
    if (n > max) { max = n; anioPico = y; }
  });

  return {
    totalProductos,
    totalProyectos,
    aniosActivos,
    promedioPorAnio,
    anioPico,
  };
}, [productos, proyectos]);

// Cargar proyectos del investigador (investigador_principal == selectedId)
useEffect(() => {
  setProyectos([]);
  if (!selectedId) return;

  let alive = true;
  const invId = String(selectedId).trim();

  const q = query(
    collection(db, "proyectos"),
    where("investigador_principal", "==", invId),
    orderBy("anio_inicio", "desc")
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      if (!alive) return;
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProyectos(list);
    },
    (err) => console.error("[Proyectos] ERROR:", err)
  );

  return () => { alive = false; unsub(); };
}, [selectedId]);

    // 7) Analítica MinCiencias + tendencia (por investigador, filtrado por año)
  const analitica = useMemo(() => {
    const total = productos.length;

    // por categoría MinCiencias (NC/DT/ASC/DIV/FRH)
    const porCat = initCat();

    // tendencia anual (año->total) y por año-categoría
    const byYear = {};
    const byYearCat = {};

    productos.forEach((p) => {
      const y = Number(p.anio || 0);
      if (y > 0) byYear[y] = (byYear[y] || 0) + 1;

      const catRaw = p.categoria_minciencias_producto ?? p.categoria_minciencias ?? "";
      const c = normProdCat(catRaw);
      if (c) {
        const k = CAT_KEYS[c];
        porCat[k] = (porCat[k] || 0) + 1;

        if (y > 0) {
          if (!byYearCat[y]) byYearCat[y] = initCat();
          byYearCat[y][k] = (byYearCat[y][k] || 0) + 1;
        }
      }
    });

    const totNC = porCat.NC || 0;
    const totDT = porCat.DT || 0;

    const kpisM = {
      total,
      pct_nc: total ? Number(((totNC / total) * 100).toFixed(1)) : 0,
      pct_dt: total ? Number(((totDT / total) * 100).toFixed(1)) : 0,
      indice_nc_dt: totDT ? Number((totNC / totDT).toFixed(2)) : null,
    };

    const serieYear = Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b)
      .map((y) => ({ year: String(y), total: byYear[y] }));

    const serieYearCat = Object.keys(byYearCat)
      .map(Number)
      .sort((a, b) => a - b)
      .map((y) => ({ year: String(y), ...byYearCat[y] })); // {year, NC, DT, ...}

    const dataCatBars = Object.entries(porCat).map(([k, v]) => ({ cat: k, total: v }));

    return { kpisM, dataCatBars, serieYear, serieYearCat };
  }, [productos]);

  const matrizProd = useMemo(() => {
    // filas = categoría (NC/DT/ASC/DIV/FRH), columnas = tipo de producto
    const filas = ["NC", "DT", "ASC", "DIV", "FRH"];

    const colSet = new Set();
    productos.forEach(p => {
      const t = (p.tipo || p.tipo_producto || "Sin tipo").toString().trim();
      colSet.add(t || "Sin tipo");
    });
    const cols = Array.from(colSet).sort((a,b) => a.localeCompare(b));

    const M = {};
    filas.forEach(f => { M[f] = {}; cols.forEach(c => { M[f][c] = 0; }); });

    productos.forEach(p => {
      const catRaw = p.categoria_minciencias_producto ?? p.categoria_minciencias ?? "";
      const cat = normProdCat(catRaw);
      if (!cat) return;

      const f = CAT_KEYS[cat]; // NC/DT/...
      const c = (p.tipo || p.tipo_producto || "Sin tipo").toString().trim() || "Sin tipo";
      if (!M[f]) return;

      if (M[f][c] === undefined) M[f][c] = 0;
      M[f][c] += 1;
    });

    // totales
    const rowTotals = filas.reduce((acc,f) => (acc[f] = cols.reduce((s,c)=>s+(M[f][c]||0),0), acc), {});
    const colTotals = cols.reduce((acc,c) => (acc[c] = filas.reduce((s,f)=>s+(M[f][c]||0),0), acc), {});
    const grandTotal = filas.reduce((s,f)=>s+rowTotals[f],0);

    return { filas, cols, M, rowTotals, colTotals, grandTotal };
  }, [productos]);

  // UI mínima (ajústala a tu estilo)
  return (
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      {/* Panel izquierda: lista */}
      <div
        style={{
          background: "white",
          border: "1px solid rgba(45,156,219,0.25)",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <h3>{soloActivos ? "Integrantes activos" : "Integrantes"}</h3>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Mostrar solo investigadores activos
        </label>
      </div>

      <select
        style={{ width: "100%", padding: 8 }}
        value={selectedDocId || ""}
        onChange={(e) => {
          const v = e.target.value || "";

          // 1) limpiar SIEMPRE lo anterior (evita datos pegados)
          setProductos([]);
          setProyectos([]);
          

          if (!v) {
            setSelectedId(null);
            setSelectedDocId(null);
            return;
          }

          // 2) set del nuevo seleccionado
          setSelectedDocId(v);

          const inv = integrantes.find(x => x._docId === v);
          setSelectedId(inv?.id || null);

          // (opcional) si quieres que el perfil aparezca YA sin esperar useEffect:
          setSelectedIntegrante(inv || null);
        }}
      >
          <option value="">-- Selecciona --</option>
          {integrantes.map(inv => (
            <option key={inv._docId} value={inv._docId}>
              {inv.apellidos || ""} {inv.nombres || ""} ({inv.id})
            </option>
          ))}
        </select>
      </div>

      {/* Panel derecha: detalle */}
      <div
        style={{
          background: "white",
          border: "1px solid rgba(45,156,219,0.25)",
          borderRadius: 14,
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        {!selectedId ? (
          <div>Selecciona un integrante para ver su perfil y productos.</div>
        ) : (
          <>
            <PerfilHeader inv={selectedIntegrante} />
            
            {/* KPIs */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>KPIs del investigador</h4>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <KpiCard title="Productos" value={kpis.totalProductos} />
                <KpiCard title="Proyectos" value={kpis.totalProyectos} />
                <KpiCard title="Años activos" value={kpis.aniosActivos} />
                <KpiCard title="Promedio / año" value={kpis.promedioPorAnio} />
                <KpiCard title="Año más productivo" value={kpis.anioPico} />
              </div>
            </div>

            {/* Tendencia */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>Tendencia anual de producción</h4>
              {analitica.serieYear.length === 0 ? (
                <div style={{ color: "#666" }}>Sin datos para el filtro seleccionado.</div>
              ) : (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <LineChart data={analitica.serieYear}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" angle={-30} textAnchor="end" interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Productos" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Matriz Productos*/}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>Caracterización de la producción científica</h4>

              {matrizProd.grandTotal === 0 ? (
                <div style={{ color: "#666" }}>Sin productos para caracterizar.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Categoría</th>
                        {matrizProd.cols.map(c => (
                          <th key={c} style={th}>{c}</th>
                        ))}
                        <th style={th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrizProd.filas.map(f => (
                        <tr key={f}>
                          <td style={td}><b>{f}</b></td>
                          {matrizProd.cols.map(c => (
                            <td key={c} style={td}>{matrizProd.M[f][c] || 0}</td>
                          ))}
                          <td style={td}><b>{matrizProd.rowTotals[f] || 0}</b></td>
                        </tr>
                      ))}
                      <tr>
                        <td style={td}><b>Total</b></td>
                        {matrizProd.cols.map(c => (
                          <td key={c} style={td}><b>{matrizProd.colTotals[c] || 0}</b></td>
                        ))}
                        <td style={td}><b>{matrizProd.grandTotal}</b></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Proyectos */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>Proyectos</h4>
              {proyectos.length === 0 ? (
                <div style={{ fontSize: 13, color: "#666" }}>
                  No se detectaron proyectos.
                </div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {proyectos.map(pr => (
                    <li key={pr.id}>
                      <b>{getProyTitulo(pr)}</b> — {pr.anio_inicio || "—"}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Productos */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>Productos</h4>
              {productos.length === 0 ? (
                <div style={{ color: "#666" }}>Sin productos para el investigador seleccionado.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Año</th>
                        <th style={th}>Mes</th>
                        <th style={th}>Tipo</th>
                        <th style={th}>Título</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(p => (
                        <tr key={p.id}>
                          <td style={td}>{p.anio}</td>
                          <td style={td}>{p.mes}</td>
                          <td style={td}>{p.tipo || p.tipo_producto || "Sin tipo"}</td>
                          <td style={td}>{p.titulo || p.nombre || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: 8 };
const td = { borderBottom: "1px solid #f3f3f3", padding: 8, fontSize: 14 };

