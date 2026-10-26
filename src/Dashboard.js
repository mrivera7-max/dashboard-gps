import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, collection, onSnapshot } from "firebase/firestore";
import IntegrantesAdminView from "./IntegrantesAdminView";
import EstadoGeneralGrupo from "./components/EstadoGeneralGrupo";
import SemillerosView from "./SemillerosView";
import ProspectivaGrupo from "./components/prospectiva/ProspectivaGrupo";

import gpsLogo from "./assets/logo-gps.png";
import udiLogo from "./assets/logo-udi.png";

import { auth, db, functions } from "./firebaseConfig";
import { generarInformeWordGrupo } from "./utils/generarInformeWordGrupo";
import { generarGraficasInforme } from "./utils/generarGraficasInforme";
import { exportarHistoricoExcel } from "./utils/exportarHistoricoExcel";

import BienvenidaDashboard from "./components/BienvenidaDashboard";
import { calcularResumenEjecutivo } from "./utils/indicadoresResumen";

const UDI_BLUE_DARK = "#1B75BC";

// Íconos de la barra superior
const iconoProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const IconoSigma = () => (<svg {...iconoProps}><path d="M18 4H6l6 8-6 8h12" /></svg>);
const IconoDescarga = () => (<svg {...iconoProps}><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" /></svg>);
const IconoDocumento = () => (<svg {...iconoProps}><path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6" /></svg>);
const SYSTEM = {
  name: "GPS Research Dashboard",
  version: "v1.0",
  year: String(new Date().getFullYear()),
  group: "Grupo de Investigación GPS",
};

export default function Dashboard({ logout }) {
  const role = useMemo(
    () => localStorage.getItem("gps_role_selected") || "no definido",
    []
  );

  const [activeView, setActiveView] = useState("inicio"); // estado | docentes | semilleros | prospectiva
  const [estadoRefresh, setEstadoRefresh] = useState(0);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [investigadores, setInvestigadores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proyectos, setProyectos] = useState([]);

  // Aviso flotante: { texto, tipo: "ok" | "error" | "info" }
  const [aviso, setAviso] = useState(null);
  const avisar = (texto, tipo = "info") => setAviso({ texto, tipo, t: Date.now() });
  useEffect(() => {
    if (!aviso || aviso.tipo === "info") return undefined;
    const id = setTimeout(() => setAviso(null), aviso.tipo === "error" ? 6000 : 4000);
    return () => clearTimeout(id);
  }, [aviso]);
  const [histDesde, setHistDesde] = useState("");
  const [histHasta, setHistHasta] = useState("");

  const [kpis, setKpis] = useState({
    total_productos: null,
    total_investigadores: null,
    total_proyectos: null,
  });
  const [kpiError, setKpiError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = doc(db, "kpis", "global");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setKpiError("No existe el documento kpis/global en Firestore.");
          return;
        }
        setKpiError("");
        const data = snap.data();
        setKpis({
          total_productos: data.total_productos ?? 0,
          total_investigadores: data.total_investigadores ?? 0,
          total_proyectos: data.total_proyectos ?? 0,
        });
      },
      (err) => {
        console.error(err);
        setKpiError(err?.message || "Error leyendo Indicadores");
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = collection(db, "investigadores");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setInvestigadores(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("Error leyendo investigadores:", err);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = collection(db, "productos");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("Error leyendo productos:", err);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = collection(db, "proyectos");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProyectos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("Error leyendo proyectos:", err);
      }
    );

    return () => unsub();
  }, []);

  const recalcular = async () => {
    try {
      console.log("authLoading:", authLoading);
      console.log("user state:", user?.email, user?.uid);
      console.log("auth.currentUser:", auth.currentUser?.email, auth.currentUser?.uid);

      if (authLoading) {
        avisar("Cargando sesión…", "info");
        return;
      }
      if (!user) {
        avisar("Debes iniciar sesión.", "error");
        return;
      }
      if (role !== "admin") {
        avisar("No tienes permisos para recalcular indicadores.", "error");
        return;
      }

      avisar("Recalculando indicadores…", "info");
      const fn = httpsCallable(functions, "recalcularKPIsManual");
      const res = await fn();

      const status = res?.data?.status;
      avisar(status === "ok" ? "Indicadores actualizados" : "Recálculo terminado", "ok");
      setEstadoRefresh((x) => x + 1);
    } catch (e) {
      console.error(e);
      avisar("No se pudieron recalcular los indicadores. Intenta de nuevo.", "error");
    }
  };

  const datosConvocatoria2024 = useMemo(
    () => ({
      nombreGrupo:
        "Grupo de Investigación en Robótica, Control y Procesamiento de Señal - GPS",
      categoriaActual: "A",
      indicadorGrupo: 1.0878082216564888,
      top: 1128.6465358690596,
      tipoA: 654.133384053872,
      tipoB: 420.318918162599,
      asc: 0,
      divulgacion: 1769.7784705582599,
      formA: 269.17778929697033,
      formB: 910.0296908413974,
      cohesion: 0.711538462,
      colaboracion: 0.314102564,
      investigadoresSenior: 5,
      investigadoresAsociados: 5,
      investigadoresEmeritos: 0,
      aniosExistencia: 19,
    }),
    []
  );

    const resumenEjecutivo = calcularResumenEjecutivo({
      investigadores,
      productos,
      proyectos,
      kpis,
    });

  return (
    <div style={styles.page2col}>
      <aside style={styles.sidebar}>
        <div style={styles.sideTop}>
          <div style={styles.udiBlock}>
            <img src={udiLogo} alt="UDI" style={styles.udiLogo} />
          </div>

          <div style={styles.sideBrand}>
            <img src={gpsLogo} alt="GPS" style={styles.sideLogo} />
            <div>
              <div style={styles.sideTitle}>GRUPO GPS</div>
            </div>
          </div>

          <div style={styles.sideProfile}>
            <div style={styles.userLineSide}>
              <span style={styles.userLabel}>Usuario:</span>
              <span style={styles.userValue}>
                {authLoading ? "Cargando…" : user?.email || "—"}
              </span>
            </div>
            <div style={styles.userLineSide}>
              <span style={styles.userLabel}>Rol:</span>
              <span style={styles.rolePillSide}>
                {role === "admin" ? "Líder de Grupo" : role}
              </span>
            </div>
          </div>

          <div style={styles.nav}>
            <NavBtn
              text="Inicio"
              active={activeView === "inicio"}
              onClick={() => setActiveView("inicio")}
            />
            <NavBtn
              text="Estado general del grupo"
              active={activeView === "estado"}
              onClick={() => setActiveView("estado")}
            />
            <NavBtn
              text="Integrantes"
              active={activeView === "docentes"}
              onClick={() => setActiveView("docentes")}
            />
            <NavBtn
              text="Semilleros"
              active={activeView === "semilleros"}
              onClick={() => setActiveView("semilleros")}
            />
            <NavBtn
              text="Prospectiva"
              active={activeView === "prospectiva"}
              onClick={() => setActiveView("prospectiva")}
            />
          </div>
        </div>

        <div style={styles.sideBottom}>
          <button onClick={logout} style={styles.logoutBtnSide}>
            Cerrar sesión
          </button>

          <div style={styles.systemInfoSide}>
            {SYSTEM.name} {SYSTEM.version} — {SYSTEM.year}
            <br />
            {SYSTEM.group}
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.brand}>
            <img src={gpsLogo} alt="GPS" style={styles.brandLogo} />
            <div>
              <div style={styles.brandTitle}>GRUPO GPS</div>
              <div style={styles.brandSubtitle}>
                Plataforma de seguimiento (MinCiencias)
              </div>
            </div>
          </div>

          {role === "admin" ? (
            <div style={styles.actionRow}>
              {/* Mantenimiento */}
              <button
                onClick={recalcular}
                style={{ ...styles.btnGhost, opacity: authLoading ? 0.6 : 1 }}
                disabled={authLoading}
                title="Recalcular los indicadores del grupo"
              >
                <IconoSigma /> Recalcular
              </button>

              <div style={styles.separador} />

              {/* Histórico */}
              <div style={styles.histBox}>
                <span style={styles.histLabel}>Histórico</span>
                <input
                  type="number"
                  placeholder="Desde"
                  value={histDesde}
                  onChange={(e) => setHistDesde(e.target.value)}
                  style={styles.histInput}
                  title="Año inicial (vacío = desde el inicio)"
                />
                <span style={{ color: "#94a3b8" }}>–</span>
                <input
                  type="number"
                  placeholder="Hasta"
                  value={histHasta}
                  onChange={(e) => setHistHasta(e.target.value)}
                  style={styles.histInput}
                  title="Año final (vacío = hasta hoy)"
                />
                <button
                  onClick={() => {
                    try {
                      const r = exportarHistoricoExcel({
                        investigadores,
                        productos,
                        proyectos,
                        desde: histDesde ? Number(histDesde) : null,
                        hasta: histHasta ? Number(histHasta) : null,
                      });
                      avisar(`Histórico descargado: ${r.proyectos} proyectos, ${r.productos} productos`, "ok");
                    } catch (e) {
                      console.error(e);
                      avisar("No se pudo generar el histórico. Intenta de nuevo.", "error");
                    }
                  }}
                  style={{ ...styles.histBtn, opacity: authLoading ? 0.6 : 1 }}
                  disabled={authLoading}
                  title="Descargar histórico de proyectos y productos en Excel"
                >
                  <IconoDescarga /> Excel
                </button>
              </div>

              <div style={styles.separador} />

              {/* Acción principal */}
              <button
                onClick={async () => {
                  try {
                    avisar("Generando documento Word…", "info");
                    await generarInformeWordGrupo({
                      investigadores,
                      productos,
                      proyectos,
                      nombreLiderGrupo: user?.displayName || user?.email || "—",
                      datosConvocatoria2024,
                    });
                    avisar("Informe generado correctamente", "ok");
                  } catch (e) {
                    console.error(e);
                    avisar("No se pudo generar el informe. Intenta de nuevo.", "error");
                  }
                }}
                style={{ ...styles.btnPrimario, opacity: authLoading ? 0.6 : 1 }}
                disabled={authLoading}
                title="Generar informe Word del grupo"
              >
                <IconoDocumento /> Generar informe
              </button>
            </div>
          ) : null}
        </div>

        {aviso ? (
          <div
            role="status"
            onClick={() => setAviso(null)}
            style={{ ...styles.aviso, ...styles[`aviso_${aviso.tipo}`] }}
            title="Clic para cerrar"
          >
            {aviso.tipo === "ok" ? "✓ " : aviso.tipo === "error" ? "⚠ " : "⏳ "}
            {aviso.texto}
          </div>
        ) : null}

        <div style={styles.content}>
          {activeView === "inicio" ? (
            <BienvenidaDashboard resumen={resumenEjecutivo} />
          ) : activeView === "estado" ? (
            <EstadoGeneralGrupo refreshKey={estadoRefresh} />
          ) : activeView === "docentes" ? (
            <IntegrantesAdminView refreshKey={estadoRefresh} />
          ) : activeView === "semilleros" ? (
            <SemillerosView />
          ) : activeView === "prospectiva" ? (
            <ProspectivaGrupo
              convocatoria={datosConvocatoria2024}
              productos={productos}
              proyectos={proyectos}
              investigadores={investigadores}
            />
          ) : null}
        </div>

        
      </main>
    </div>
  );
}

function NavBtn({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navBtn,
        ...(active ? styles.navBtnActive : {}),
      }}
    >
      {text}
    </button>
  );
}

const styles = {
  rolePillSide: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "white",
    fontWeight: 900,
    fontSize: 12.5,
    textTransform: "capitalize",
  },

  page: {
    minHeight: "100vh",
    width: "100%",
    background: "rgba(45,156,219,0.10)",
    fontFamily: "Arial, sans-serif",
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "white",
    borderBottom: "1px solid rgba(45,156,219,0.25)",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 260,
  },
  brandLogo: {
    height: 44,
    width: "auto",
    objectFit: "contain",
  },
  brandTitle: {
    fontWeight: 900,
    color: UDI_BLUE_DARK,
    fontSize: 18,
    lineHeight: 1.1,
  },
  brandSubtitle: {
    color: "#4A5568",
    fontSize: 12.5,
    marginTop: 2,
  },
  userLabel: {
    color: "#374151",
    fontWeight: 800,
  },
  userValue: {
    fontWeight: 900,
    color: "#111827",
  },
  logoutBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(45,156,219,0.45)",
    background: "white",
    color: UDI_BLUE_DARK,
    fontWeight: 900,
    cursor: "pointer",
  },
  content: {
    padding: 18,
    maxWidth: 1400,
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  actionRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  btnGhost: {
    height: 38,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "white",
    color: "#334155",
    fontWeight: 800,
    fontSize: 13.5,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    cursor: "pointer",
  },
  btnPrimario: {
    height: 38,
    padding: "0 16px",
    borderRadius: 10,
    border: "none",
    background: UDI_BLUE_DARK,
    color: "white",
    fontWeight: 800,
    fontSize: 13.5,
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(27,117,188,0.30)",
  },
  separador: {
    width: 1,
    height: 30,
    background: "#e2e8f0",
  },
  histBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "5px 6px 5px 12px",
  },
  histLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  histInput: {
    width: 72,
    height: 30,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "white",
    textAlign: "center",
    fontSize: 13.5,
    color: "#0f172a",
    boxSizing: "border-box",
  },
  histBtn: {
    height: 30,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${UDI_BLUE_DARK}`,
    background: "white",
    color: UDI_BLUE_DARK,
    fontWeight: 800,
    fontSize: 12.5,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
  },
  aviso: {
    position: "fixed",
    top: 86,
    right: 24,
    zIndex: 50,
    maxWidth: 420,
    padding: "11px 14px",
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: 800,
    boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
    cursor: "pointer",
  },
  aviso_ok: { background: "#ecfdf5", border: "1px solid #86efac", color: "#166534" },
  aviso_error: { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" },
  aviso_info: { background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e3a8a" },

  systemInfo: {
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: 800,
    lineHeight: 1.35,
    textAlign: "right",
  },

  page2col: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    background: "rgba(45,156,219,0.10)",
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    background: "linear-gradient(180deg, #1B75BC 0%, #0F3E68 100%)",
    borderRight: "1px solid rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: "white",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  sideTop: { padding: 16 },
  sideBrand: { display: "flex", gap: 10, alignItems: "center" },
  sideLogo: { height: 40, width: "auto" },
  sideTitle: { fontWeight: 900, color: "white" },
  sideProfile: { marginTop: 14, display: "grid", gap: 8 },
  nav: { marginTop: 16, display: "grid", gap: 10 },

  navBtn: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.08)",
    fontWeight: 900,
    color: "white",
    cursor: "pointer",
    textAlign: "left",
  },
  navBtnActive: {
    background: "white",
    border: "none",
    color: "#1B75BC",
  },

  sideBottom: {
    padding: 16,
    borderTop: "1px solid rgba(45,156,219,0.18)",
    position: "sticky",
    bottom: 0,
    background:
      "linear-gradient(180deg, rgba(27,117,188,0.0) 0%, rgba(15,62,104,1) 35%)",
  },
  logoutBtnSide: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "transparent",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  systemInfoSide: {
    marginTop: 14,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.75)",
    fontWeight: 700,
    lineHeight: 1.4,
  },
  main: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflowY: "auto",
  },

  udiBlock: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    padding: "10px 0",
    background: "white",
    borderRadius: 10,
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  },

  udiLogo: {
    height: 38,
    width: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))",
  },

  userLineSide: {
    display: "flex",
    gap: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  userLabelSide: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: 800,
  },
  userValueSide: {
    color: "white",
    fontWeight: 800,
  },
};