import React, { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";

import gpsLogo from "./assets/logo-gps.png";
import udiLogo from "./assets/logo-udi.png";

// AJUSTA ESTA RUTA a tu proyecto
import { auth, db, functions } from "./firebaseConfig"; // ajusta ruta real

const UDI_BLUE_DARK = "#1B75BC";
const SYSTEM = {
  name: "GPS Research Dashboard",
  version: "v1.0",
  year: String(new Date().getFullYear()),
  group: "Grupo de Investigación GPS",
};

export default function Dashboard({ logout }) {
  // Rol (según tu implementación actual con localStorage)
  const role = useMemo(
    () => localStorage.getItem("gps_role_selected") || "no definido",
    []
  );
  const [activeView, setActiveView] = useState("estado"); // estado | docentes
  // Sesión (estado REAL de Firebase Auth)
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Mensaje del botón
  const [msg, setMsg] = useState("");

  // KPIs
  const [kpis, setKpis] = useState({
    total_productos: null,
    total_investigadores: null,
    total_proyectos: null,
  });
  const [kpiError, setKpiError] = useState("");

  useEffect(() => {
    // OJO: aquí mantengo tu doc actual "kpis/global"
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
        setKpiError(err?.message || "Error leyendo KPIs");
      }
    );

    return () => unsub();
  }, []);

  // Callable: recalcularKPIsManual
  const recalcular = async () => {
    try {
      console.log("authLoading:", authLoading);
      console.log("user state:", user?.email, user?.uid);
      console.log("auth.currentUser:", auth.currentUser?.email, auth.currentUser?.uid);
      if (authLoading) {
        setMsg("Cargando sesión…");
        return;
      }
      if (!user) {
        setMsg("Debes iniciar sesión.");
        return;
      }
      if (role !== "admin") {
        setMsg("No tienes permisos para recalcular KPIs.");
        return;
      }

      setMsg("Recalculando…");
      const fn = httpsCallable(functions, "recalcularKPIsManual");
      const res = await fn();

      // Si tu function retorna {status:"ok"} esto queda perfecto
      const status = res?.data?.status;
      setMsg(status === "ok" ? "Listo ✅ KPIs actualizados" : "Listo ✅");
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "Error recalculando KPIs");
    }
  };

  return (
  <div style={styles.page2col}>
    {/* SIDEBAR */}
    <aside style={styles.sidebar}>
      <div style={styles.sideTop}>
        {/* Logo UDI arriba */}
        <div style={styles.udiBlock}>
          <img src={udiLogo} alt="UDI" style={styles.udiLogo} />
        </div>

        {/* Marca del sistema */}
        <div style={styles.sideBrand}>
          <img src={gpsLogo} alt="GPS" style={styles.sideLogo} />
          <div>
            <div style={styles.sideTitle}>GRUPO GPS</div>
          </div>
        </div>

        <div style={styles.sideProfile}>
          <div style={styles.userLineSide}>
            <span style={styles.userLabel}>Usuario:</span>
            <span style={styles.userValue}>{authLoading ? "Cargando…" : user?.email || "—"}</span>
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
            text="Estado general del grupo"
            active={activeView === "estado"}
            onClick={() => setActiveView("estado")}
          />
          <NavBtn
            text="Docentes"
            active={activeView === "docentes"}
            onClick={() => setActiveView("docentes")}
          />
        </div>
      </div>

      <div style={styles.sideBottom}>
        <button onClick={logout} style={styles.logoutBtnSide}>
          Cerrar sesión
        </button>

        <div style={styles.systemInfoSide}>
          GPS Research Dashboard v1.0 — 2026 <br />
          Grupo de Investigación GPS
        </div>
      </div>
    </aside>

    {/* MAIN */}
    <main style={styles.main}>
      {/* Topbar opcional: si quieres mantenerla */}
      <div style={styles.topbar}>
        <div style={styles.brand}>
          <img src={gpsLogo} alt="GPS" style={styles.brandLogo} />
          <div>
            <div style={styles.brandTitle}>GRUPO GPS</div>
            <div style={styles.brandSubtitle}>Plataforma de seguimiento (MinCiencias)</div>
          </div>
        </div>

        {/* Botón recalcular solo admin */}
        {role === "admin" ? (
          <div style={styles.actionRow}>
            <button
              onClick={recalcular}
              style={{ ...styles.logoutBtn, opacity: authLoading ? 0.6 : 1 }}
              disabled={authLoading}
              title={authLoading ? "Cargando sesión…" : "Recalcular KPIs"}
            >
              Recalcular KPIs
            </button>
            <div style={styles.msg}>{msg}</div>
          </div>
        ) : null}
      </div>

      <div style={styles.content}>
        {activeView === "estado" ? (
          <>
            {/* KPIs */}
            {kpiError ? <div style={styles.errorBox}>{kpiError}</div> : null}

            <div style={styles.kpiGrid}>
              <KPI title="Total productos" value={kpis.total_productos ?? "—"} />
              <KPI title="Total investigadores" value={kpis.total_investigadores ?? "—"} />
              <KPI title="Total proyectos" value={kpis.total_proyectos ?? "—"} />
            </div>

            <div style={styles.mainGrid}>
              <Panel title="Producción por año (próximo)">
                <Placeholder />
              </Panel>

              <Panel title="Productos por categoría (próximo)">
                <Placeholder />
              </Panel>

              <Panel title="Tabla de productos (próximo)" span={2}>
                <Placeholder />
              </Panel>
            </div>
          </>
        ) : (
          <Panel title="Consulta de docentes">
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800, color: "#4A5568" }}>
                Aquí va el buscador + tabla de docentes (por ejemplo: nombre, correo, estado, categoría MinCiencias, productos).
              </div>
              <Placeholder />
            </div>
          </Panel>
        )}
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

function KPI({ title, value }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiTitle}>{title}</div>
      <div style={styles.kpiValue}>{value}</div>
    </div>
  );
}

function Panel({ title, children, span = 1 }) {
  return (
    <div style={{ ...styles.panel, gridColumn: span === 2 ? "span 2" : "span 1" }}>
      <div style={styles.panelHeader}>{title}</div>
      <div style={styles.panelBody}>{children}</div>
    </div>
  );
}

function Placeholder() {
  return (
    <div style={styles.placeholder}>
      Aquí va el contenido (gráficas, tablas, filtros).
    </div>
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
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  userLine: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13.5,
    color: "#1F2937",
  },
  userLabel: {
    color: "#374151",
    fontWeight: 800,
  },
  userValue: {
    fontWeight: 900,
    color: "#111827",
  },
  rolePill: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(45,156,219,0.12)",
    border: "1px solid rgba(45,156,219,0.35)",
    color: UDI_BLUE_DARK,
    fontWeight: 800,
    fontSize: 12.5,
    textTransform: "capitalize",
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
    maxWidth: 1300,
    margin: "0 auto",
  },
  errorBox: {
    marginBottom: 10,
    color: "#b91c1c",
    fontWeight: 800,
    background: "rgba(185, 28, 28, 0.08)",
    border: "1px solid rgba(185, 28, 28, 0.25)",
    padding: 10,
    borderRadius: 12,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 4,
  },
  kpiCard: {
    border: "1px solid rgba(45,156,219,0.25)",
    borderRadius: 14,
    padding: 16,
    background: "white",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  },
  kpiTitle: {
    fontSize: 13,
    color: "#4A5568",
    fontWeight: 800,
  },
  kpiValue: {
    fontSize: 30,
    fontWeight: 900,
    marginTop: 6,
    color: "#111827",
  },
  actionRow: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  msg: {
    color: "#4A5568",
    fontWeight: 800,
  },
  mainGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  panel: {
    border: "1px solid rgba(45,156,219,0.25)",
    borderRadius: 14,
    background: "white",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    overflow: "hidden",
    minHeight: 220,
  },
  panelHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(45,156,219,0.18)",
    fontWeight: 900,
    color: UDI_BLUE_DARK,
    fontSize: 14,
  },
  panelBody: {
    padding: 14,
  },
  placeholder: {
    height: 160,
    borderRadius: 12,
    border: "1px dashed rgba(45,156,219,0.45)",
    background: "rgba(45,156,219,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#4A5568",
    fontWeight: 700,
    textAlign: "center",
    padding: 12,
  },

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
},
sidebar: {
  background: "linear-gradient(180deg, #1B75BC 0%, #0F3E68 100%)",
  borderRight: "1px solid rgba(0,0,0,0.15)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  color: "white",
},
sideTop: { padding: 16 },
sideBrand: { display: "flex", gap: 10, alignItems: "center" },
sideLogo: { height: 40, width: "auto" },
sideTitle: { fontWeight: 900, color: "white" },
sideSubtitle: { marginTop: 2, fontWeight: 700, color: "rgba(255,255,255,0.80)", fontSize: 12 },
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

sideBottom: { padding: 16, borderTop: "1px solid rgba(45,156,219,0.18)" },
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
main: { minWidth: 0, display: "flex", flexDirection: "column" },

udiBlock: {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 16,
  padding: "10px 0",
  background: "white",          // 👈 contraste real
  borderRadius: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
},

udiLogo: {
  height: 38,
  width: "auto",
  objectFit: "contain",
  filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))",
},

userLineSide: { display: "flex", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.9)" },
userLabelSide: { color: "rgba(255,255,255,0.7)", fontWeight: 800 },
userValueSide: { color: "white", fontWeight: 800 },

};