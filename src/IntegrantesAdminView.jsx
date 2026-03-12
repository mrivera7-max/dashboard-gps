import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  runTransaction,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebaseConfig"; 

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

const estadoColor = {
    "En proceso": {
      background: "rgba(107,114,128,0.15)",
      color: "#374151",
      border: "1px solid rgba(107,114,128,0.35)"
    },
    "Sometido": {
      background: "rgba(59,130,246,0.15)",
      color: "#1E40AF",
      border: "1px solid rgba(59,130,246,0.35)"
    },
    "Aprobado (Institucional)": {
      background: "rgba(234,179,8,0.15)",
      color: "#92400E",
      border: "1px solid rgba(234,179,8,0.35)"
    },
    "Registrado": {
      background: "rgba(168,85,247,0.15)",
      color: "#6B21A8",
      border: "1px solid rgba(168,85,247,0.35)"
    },
    "Publicado": {
      background: "rgba(34,197,94,0.15)",
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.35)"
    }
  };

  const estadoBadge = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12
  };

const makeInvId = (docId) => {
  const clean = (docId || "").replace(/[^a-zA-Z0-9]/g, "");
  const tail = clean.slice(-6).toUpperCase();
  return `INV-${tail || "XXXXXX"}`;
};

function PerfilHeader({ inv }) {
  const nombre = inv
    ? `${inv.nombres || ""} ${inv.apellidos || ""}`.trim() || "—"
    : "—";
  
  const catCode = (inv?.categoria_minciencias_investigador || "").toString().trim().toUpperCase();
  const catLabel = CAT_MINCIENCIAS_LABEL[catCode] || "Sin categoría";

  const makeInvId = (docId) => {
  const tail = (docId || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `INV-${tail || "XXXXXX"}`;
};

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
  const [adminOpen, setAdminOpen] = useState(false);
  const [liderDocId, setLiderDocId] = useState(null);

  const [semilleroZion, setSemilleroZion] = useState(null);
  const [docenteSemilleroId, setDocenteSemilleroId] = useState("");
  const [semilleroMsg, setSemilleroMsg] = useState("");
  const [semilleroErr, setSemilleroErr] = useState("");
  const [savingSemillero, setSavingSemillero] = useState(false);
  
  // cambiar de lider
  useEffect(() => {
  const ref = doc(db, "config", "grupoGPS");
  const unsub = onSnapshot(ref, (snap) => {
    setLiderDocId(snap.exists() ? snap.data().liderDocId || null : null);
  });
  return () => unsub();
}, []);


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

  useEffect(() => {
    const ref = doc(db, "semilleros", "ZION");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setSemilleroZion(null);
          setDocenteSemilleroId("");
          return;
        }

        const data = snap.data();
        setSemilleroZion(data);
        setDocenteSemilleroId(data.docente_responsable_id || "");
      },
      (err) => {
        console.error("[Semillero ZION] ERROR:", err);
        setSemilleroErr("Error leyendo el semillero ZION.");
      }
    );

    return () => unsub();
  }, []);

// 2) Cargar productos del integrante seleccionado (por id_investigador = selectedId)
useEffect(() => {
  setProductos([]);
  if (!selectedId) return;

  let alive = true;
  const invIdNorm = String(selectedId).trim().toLowerCase(); // normalizado

  const q = query(
    collection(db, "productos"),
    where("id_investigador_norm", "==", invIdNorm)
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
// Cargar proyectos donde el investigador participa como principal o coinvestigador
useEffect(() => {
  setProyectos([]);
  if (!selectedId) return;

  let alive = true;
  const invId = String(selectedId).trim();

  const q = query(
    collection(db, "proyectos"),
    orderBy("anio_inicio", "desc")
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      if (!alive) return;

      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => {
          const esPrincipal =
            String(p.investigador_principal || "").trim() === invId;

          const coinvGrupo = Array.isArray(p.coinvestigadores_grupo_ids)
            ? p.coinvestigadores_grupo_ids.map((x) => String(x).trim())
            : [];

          const esCoinvestigador = coinvGrupo.includes(invId);

          return esPrincipal || esCoinvestigador;
        });

      setProyectos(list);
    },
    (err) => console.error("[Proyectos] ERROR:", err)
  );

  return () => {
    alive = false;
    unsub();
  };
}, [selectedId]);

const proyectosDetalle = useMemo(() => {
  if (!selectedId) return [];

  const invId = String(selectedId).trim();

  return proyectos.map((p) => {
    const coinvGrupoIds = Array.isArray(p.coinvestigadores_grupo_ids)
      ? p.coinvestigadores_grupo_ids.map((x) => String(x).trim())
      : [];

    const coinvExternos = Array.isArray(p.coinvestigadores_externos)
      ? p.coinvestigadores_externos
      : [];

    const rol =
      String(p.investigador_principal || "").trim() === invId
        ? "IP"
        : coinvGrupoIds.includes(invId)
        ? "Coinvestigador"
        : "—";

    return {
      ...p,
      rol,
      totalInternos: coinvGrupoIds.length,
      totalExternos: coinvExternos.length,
    };
  });
}, [proyectos, selectedId]);

const resumenProyectos = useMemo(() => {
  const comoIP = proyectosDetalle.filter((p) => p.rol === "IP").length;
  const comoCoinv = proyectosDetalle.filter((p) => p.rol === "Coinvestigador").length;

  return {
    total: proyectosDetalle.length,
    comoIP,
    comoCoinv,
  };
}, [proyectosDetalle]);

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

  const resumenProductos = useMemo(() => {
  const r = {
    total: productos.length,
    NC: 0,
    DT: 0,
    ASC: 0,
    DIV: 0,
    FRH: 0,
  };

  productos.forEach((p) => {
    const catRaw =
      p.categoria_minciencias_producto ?? p.categoria_minciencias ?? "";

    const cat = normProdCat(catRaw);
    if (!cat) return;

    const key = CAT_KEYS[cat];
    if (key) r[key] += 1;
  });

  return r;
}, [productos]);

  const isAdmin = true; // temporal mientras conectas roles reales

  const toggleActivo = async (inv) => {
    if (!inv?._docId) return;

    const nextActivo = !Boolean(inv.activo);

    await updateDoc(doc(db, "investigadores", inv._docId), {
      activo: nextActivo,
      estado_investigador: nextActivo ? "Activo" : "Inactivo",
      updatedAt: serverTimestamp(),
    });
  };

  const guardarDocenteResponsableSemillero = async () => {
    try {
      setSemilleroErr("");
      setSemilleroMsg("");

      const id = String(docenteSemilleroId || "").trim();
      if (!id) {
        setSemilleroErr("Debes seleccionar un docente responsable.");
        return;
      }

      const inv = integrantes.find((x) => String(x.id).trim() === id);
      if (!inv) {
        setSemilleroErr("No se encontró el investigador seleccionado.");
        return;
      }

      const nombreCompleto =
        `${inv.nombres || ""} ${inv.apellidos || ""}`.trim() || id;

      setSavingSemillero(true);

      await updateDoc(doc(db, "semilleros", "ZION"), {
        docente_responsable_id: id,
        docente_responsable_nombre: nombreCompleto,
        updatedAt: serverTimestamp(),
      });

      setSemilleroMsg("Docente responsable asignado correctamente.");
    } catch (e) {
      console.error(e);
      setSemilleroErr("Error guardando el docente responsable del semillero.");
    } finally {
      setSavingSemillero(false);
    }
  };

  
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

      {isAdmin && (
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(45,156,219,0.35)",
            background: "rgba(27,117,188,0.08)",
            fontWeight: 900,
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          Administrar integrantes
        </button>
      )}

        

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
              <h4 style={sectionTitle}>Indicador del investigador</h4>
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
                  <ResponsiveContainer width="100%" height="100%">
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

                  <div style={{ marginBottom: 10, color: "#4A5568", fontSize: 13 }}>
                    <b>Total:</b> {resumenProyectos.total}{" "}
                    | <b>Como IP:</b> {resumenProyectos.comoIP}{" "}
                    | <b>Como coinvestigador:</b> {resumenProyectos.comoCoinv}
                  </div>

                  {proyectosDetalle.length === 0 ? (
                    <div style={{ color: "#666" }}>
                      No se detectaron proyectos.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={th}>Año</th>
                            <th style={th}>Acto administrativo</th>
                            <th style={th}>Título</th>
                            <th style={th}>Rol</th>
                            <th style={th}>Int. grupo</th>
                            <th style={th}>Ext.</th>
                          </tr>
                        </thead>

                        <tbody>
                          {proyectosDetalle.map((pr) => (
                            <tr key={pr.id}>
                              <td style={td}>{pr.anio_inicio || "—"}</td>

                              <td style={td}>
                                {pr.acto_administrativo || "—"}
                              </td>

                              <td style={td}>
                                {getProyTitulo(pr)}
                              </td>

                              <td style={td}>
                                <b>{pr.rol}</b>
                              </td>

                              <td style={td}>
                                {pr.totalInternos}
                              </td>

                              <td style={td}>
                                {pr.totalExternos}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

            {/* Semillero ZION */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>Semillero ZION</h4>

              {semilleroErr ? (
                <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 8 }}>
                  {semilleroErr}
                </div>
              ) : null}

              {semilleroMsg ? (
                <div style={{ color: "#166534", fontWeight: 800, marginBottom: 8 }}>
                  {semilleroMsg}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <b>Nombre:</b> {semilleroZion?.nombre || "Semillero ZION"}
                </div>

                <div>
                  <b>Estado:</b> {semilleroZion?.estado || "—"}
                </div>

                <div>
                  <b>Docente responsable actual:</b>{" "}
                  {semilleroZion?.docente_responsable_nombre || "No asignado"}
                </div>

                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 900, color: "#374151", marginBottom: 6 }}>
                    Seleccionar docente responsable
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select
                      value={docenteSemilleroId}
                      onChange={(e) => setDocenteSemilleroId(e.target.value)}
                      style={{
                        minWidth: 320,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(45,156,219,0.30)",
                        outline: "none",
                        fontWeight: 700,
                      }}
                    >
                      <option value="">-- Selecciona un docente --</option>
                      {integrantes
                        .filter((inv) => !!inv.activo)
                        .map((inv) => (
                          <option key={inv._docId} value={inv.id}>
                            {(inv.apellidos || "").trim()} {(inv.nombres || "").trim()} ({inv.id})
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={guardarDocenteResponsableSemillero}
                      disabled={savingSemillero}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(45,156,219,0.35)",
                        background: "rgba(27,117,188,0.08)",
                        fontWeight: 900,
                        cursor: savingSemillero ? "not-allowed" : "pointer",
                        opacity: savingSemillero ? 0.7 : 1,
                      }}
                    >
                      {savingSemillero ? "Guardando..." : "Asignar docente"}
                    </button>
                  </div>
                </div>
              </div>
            </div>    

            {/* Productos */}
            <div style={sectionCard}>
              <h4 style={sectionTitle}>Productos</h4>

              <div style={{ marginBottom: 10, color: "#4A5568", fontSize: 13 }}>
                <b>Total:</b> {resumenProductos.total}{" "}
                | <b>NC:</b> {resumenProductos.NC}{" "}
                | <b>DT:</b> {resumenProductos.DT}{" "}
                | <b>ASC:</b> {resumenProductos.ASC}{" "}
                | <b>DIV:</b> {resumenProductos.DIV}{" "}
                | <b>FRH:</b> {resumenProductos.FRH}
              </div>

              {productos.length === 0 ? (
                <div style={{ color: "#666" }}>
                  Sin productos para el investigador seleccionado.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={th}>Año</th>
                        <th style={th}>Estado</th>
                        <th style={th}>Tipo</th>
                        <th style={th}>Título</th>
                        <th style={th}>Identificador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map((p) => (
                        <tr key={p.id}>
                          <td style={td}>{p.anio}</td>
                          <td style={td}>
                            <span
                              style={{
                                ...estadoBadge,
                                ...(estadoColor[p.estado_producto] || estadoColor["En proceso"])
                              }}
                            >
                              {p.estado_producto || "En proceso"}
                            </span>
                          </td>
                          <td style={td}>{p.tipo || p.tipo_producto || "Sin tipo"}</td>
                          <td style={td}>{p.titulo || p.nombre || "—"}</td>
                          <td style={td}>{p.doi || p.isbn || p.numero_registro || p.url || "—"}</td>
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
      {/* Modal administración */}
      <AdminIntegrantesModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        integrantes={integrantes}
        onToggle={toggleActivo}
        liderDocId={liderDocId}
        onSetLider={setLider}
      />
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

function AdminIntegrantesModal({ open, onClose, integrantes, onToggle, liderDocId, onSetLider }) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    identificacion: "",
    genero: "",
    categoria_minciencias_investigador: "SC",
    anio_vinculacion: "",
    activo: true,
  });

  
  if (!open) return null;

  const isEmailValid = (email) => {
    if (!email) return true; // permitido vacío si aún no lo tienen
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const resetForm = () => {
    setForm({
      nombres: "",
      apellidos: "",
      email: "",
      identificacion: "",
      genero: "",
      categoria_minciencias_investigador: "SC",
      anio_vinculacion: "",
      activo: true,
    });
    setErr("");
  };

  const createIntegrante = async () => {
    setErr("");

    const nombres = form.nombres.trim();
    const apellidos = form.apellidos.trim();
    const email = form.email.trim().toLowerCase();

    if (!nombres || !apellidos) {
      setErr("Nombres y apellidos son obligatorios.");
      return;
    }
    if (!isEmailValid(email)) {
      setErr("Email inválido.");
      return;
    }

    setSaving(true);
    try {
      // Anti-duplicado por email (si lo llenan)
      if (email) {
        const qDup = query(
          collection(db, "investigadores"),
          where("email", "==", email)
        );
        const snapDup = await getDocs(qDup);
        if (!snapDup.empty) {
          setErr("Ya existe un integrante con ese email.");
          setSaving(false);
          return;
        }
      }

      const activo = !!form.activo;

      // 1) crear doc
      const ref = await addDoc(collection(db, "investigadores"), {
        ...form,
        nombres,
        apellidos,
        email: email || "",
        activo,
        estado_investigador: activo ? "Activo" : "Inactivo",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2) setear id_investigador estable
      const newId = makeInvId(ref.id);
      await updateDoc(doc(db, "investigadores", ref.id), {
        id_investigador: newId,
        updatedAt: serverTimestamp(),
      });

      // listo
      resetForm();
      setShowCreate(false);
    } catch (e) {
      console.error(e);
      setErr("Error creando integrante. Revisa consola/logs.");
    } finally {
      setSaving(false);
    }
  };

  const th = { textAlign: "left", borderBottom: "1px solid #eee", padding: 8 };
  const td = { borderBottom: "1px solid #f3f3f3", padding: 8, fontSize: 14 };

  const input = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999
    }}>
      <div style={{
        background: "white",
        width: 820,
        maxWidth: "95vw",
        borderRadius: 16,
        padding: 16
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#1B75BC" }}>Administrar integrantes</h3>
          <button onClick={() => { setShowCreate(false); resetForm(); onClose(); }} style={{ fontWeight: 900 }}>X</button>
        </div>

        {/* Crear integrante (seguro) */}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => { setShowCreate(s => !s); setErr(""); }}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(45,156,219,0.35)",
              background: "rgba(27,117,188,0.08)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {showCreate ? "Ocultar formulario" : "+ Nuevo integrante"}
          </button>

          {showCreate && (
            <div style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(45,156,219,0.25)",
              background: "rgba(45,156,219,0.04)"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input style={input} placeholder="Nombres *"
                  value={form.nombres}
                  onChange={(e)=>setForm(s=>({...s, nombres:e.target.value}))}
                />
                <input style={input} placeholder="Apellidos *"
                  value={form.apellidos}
                  onChange={(e)=>setForm(s=>({...s, apellidos:e.target.value}))}
                />
                <input style={input} placeholder="Email"
                  value={form.email}
                  onChange={(e)=>setForm(s=>({...s, email:e.target.value}))}
                />
                <input style={input} placeholder="Identificación"
                  value={form.identificacion}
                  onChange={(e)=>setForm(s=>({...s, identificacion:e.target.value}))}
                />
                <input style={input} placeholder="Género"
                  value={form.genero}
                  onChange={(e)=>setForm(s=>({...s, genero:e.target.value}))}
                />
                <input style={input} placeholder="Año vinculación (Ej: 2022)"
                  value={form.anio_vinculacion}
                  onChange={(e)=>setForm(s=>({...s, anio_vinculacion:e.target.value}))}
                />

                <select style={input}
                  value={form.categoria_minciencias_investigador}
                  onChange={(e)=>setForm(s=>({...s, categoria_minciencias_investigador:e.target.value}))}
                >
                  <option value="IE">IE - Investigador Emérito</option>
                  <option value="IS">IS - Investigador Senior</option>
                  <option value="IA">IA - Investigador Asociado</option>
                  <option value="IJ">IJ - Investigador Junior</option>
                  <option value="SC">SC - Sin categoría</option>
                </select>

                <select style={input}
                  value={form.activo ? "1" : "0"}
                  onChange={(e)=>setForm(s=>({...s, activo: e.target.value === "1"}))}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>

              {err && <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>{err}</div>}

              <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={createIntegrante}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(45,156,219,0.35)",
                    background: "#1B75BC",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? "Guardando..." : "Guardar integrante"}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#4A5568" }}>
                * El <b>id_investigador</b> se genera automáticamente.
              </div>
            </div>
          )}
        </div>

        {/* Tabla administración */}
        <div style={{ marginTop: 12, maxHeight: "55vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th>
                <th style={th}>ID</th>
                <th style={th}>Estado</th>
                <th style={th}>Líder</th>
                <th style={th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {integrantes.map((inv) => {
                const nombre = `${inv.apellidos || ""} ${inv.nombres || ""}`.trim() || "—";
                const activo = !!inv.activo;
                const esLider = inv._docId === liderDocId;

                return (
                  <tr key={inv._docId}>
                    <td style={td}>{nombre}</td>
                    <td style={td}>{inv.id || inv.id_investigador || "—"}</td>
                    <td style={td}><b>{activo ? "Activo" : "Inactivo"}</b></td>

                    {/* COLUMNA LÍDER */}
                    <td style={td}>
                      {esLider ? <b style={{ color: "#1B75BC" }}>Líder actual</b> : "—"}
                    </td>

                    {/* COLUMNA ACCIÓN */}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => onToggle(inv)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(45,156,219,0.35)",
                            background: activo ? "#fff7ed" : "#ecfeff",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {activo ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          disabled={!activo || esLider}
                          onClick={() => onSetLider(inv._docId)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(45,156,219,0.35)",
                            background: esLider ? "#eef2ff" : "white",
                            fontWeight: 900,
                            cursor: (!activo || esLider) ? "not-allowed" : "pointer",
                            opacity: (!activo || esLider) ? 0.6 : 1,
                          }}
                        >
                          {esLider ? "Líder actual" : "Hacer líder"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => { setShowCreate(false); resetForm(); onClose(); }}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.2)",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const setLider = async (nuevoLiderDocId) => {
  if (!nuevoLiderDocId) return;

  await runTransaction(db, async (tx) => {
    const cfgRef = doc(db, "config", "grupoGPS");
    const cfgSnap = await tx.get(cfgRef);

    const invRef = doc(db, "investigadores", nuevoLiderDocId);
    const invSnap = await tx.get(invRef);

    if (!invSnap.exists()) throw new Error("Investigador no existe");
    const inv = invSnap.data();
    if (!inv.activo) throw new Error("Solo puedes asignar líder a un integrante ACTIVO");

    // si config no existe, lo creas
    const prev = cfgSnap.exists() ? (cfgSnap.data().liderDocId || null) : null;

    if (prev === nuevoLiderDocId) return; // ya es líder

    tx.set(cfgRef, {
      liderDocId: nuevoLiderDocId,
      updatedAt: serverTimestamp(),
      // updatedBy: auth.currentUser?.uid ?? null, // opcional
    }, { merge: true });
  });
};

