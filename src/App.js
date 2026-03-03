import React, { useEffect, useMemo, useState } from "react";
import udiLogo from "./assets/logo-udi.png";
import gpsLogo from "./assets/logo-gps.png";
import googleLogo from "./assets/google.png";
import DocenteDashboard from "./DocenteDashboard";
import DashboardAdmin from "./Dashboard"; // el admin que ya tienes

import { auth } from "./firebaseConfig";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const provider = new GoogleAuthProvider();

const UDI_BLUE = "#2D9CDB";
const UDI_BLUE_DARK = "#1B75BC";
const SYSTEM = {
  name: "GPS Research Dashboard",
  version: "v1.0",
  year: "2026",
  group: "Grupo de Investigación GPS",
  author: "Ing. María Fernanda Rivera Sanclemente",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("gps_role_selected") || "docente");
  const [loading, setLoading] = useState(false);

  const [liderEmail, setLiderEmail] = useState("");

  const [cfgLoaded, setCfgLoaded] = useState(false);

  const [roleSelected, setRoleSelected] = useState(
  localStorage.getItem("gps_role_selected") || "docente"
);

  useEffect(() => {
    const ref = doc(db, "config", "grupoGPS");
    const unsub = onSnapshot(ref, (snap) => {
      setLiderEmail((snap.data()?.liderEmail || "").toLowerCase());
      setCfgLoaded(true);
    });
    return () => unsub();
  }, []);

  const isLeader = (user?.email || "").toLowerCase() === liderEmail;
  
  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("gps_role_selected");
    setRoleSelected("docente");
  };
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const domainAllowed = useMemo(() => "@udi.edu.co", []);

  const login = async () => {
    if (!role) {
      alert("Selecciona tu rol (Docente o Líder de Grupo) para continuar.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithPopup(auth, provider);
      const email = res.user?.email || "";
      const emailLower = email.toLowerCase();

      if (!emailLower.endsWith(domainAllowed)) {
        await signOut(auth);
        alert(`Solo se permite acceso con correo institucional ${domainAllowed}`);
        return;
      }

      const snap = await getDoc(doc(db, "config", "grupoGPS"));
      const liderEmailFS = (snap.data()?.liderEmail || "").toLowerCase().trim();
      const isLeaderLogin = emailLower.trim() === liderEmailFS;
      
      if (role === "admin" && !isLeaderLogin) {
        await signOut(auth);
        alert("Solo el líder actual del grupo puede ingresar como 'Líder de Grupo'.");
        return;
      }

      localStorage.setItem("gps_role_selected", role);
      setRoleSelected(role); // <- esto fuerza re-render y corrige selectedRole
    } catch (e) {
      console.error(e);
      alert(e?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = useMemo(() => {
    if (!user || !cfgLoaded) return null;
    if (roleSelected === "admin" && !isLeader) return "docente";
    return roleSelected;
  }, [user, cfgLoaded, roleSelected, isLeader]);

  console.log("CFG", {
  liderEmail,
  cfgLoaded,
  userEmail: user?.email,
  isLeader,
  selectedRole,
  roleUI: role,
  savedRole: localStorage.getItem("gps_role_selected"),
});

  if (user && !cfgLoaded) {
    return <div style={{ padding: 24 }}>Cargando configuración...</div>;
  }

  return !user ? (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.left}>
          <div style={styles.udiLogoCorner}>
            <img src={udiLogo} alt="Logo UDI" style={styles.udiLogoImg} />
          </div>

          <div style={styles.gpsCenter}>
            <img src={gpsLogo} alt="Logo GPS" style={styles.gpsLogoImg} />

            <div style={{ textAlign: "center" }}>
              <div style={styles.groupText}>Grupo de Investigación GPS</div>
              <div style={styles.platformText}>
                Plataforma de seguimiento de productos MinCiencias
              </div>
            </div>
          </div> {/* ✅ CIERRA gpsCenter */}
        </div> {/* ✅ CIERRA left */}

        <div style={styles.right}>
          <div style={styles.welcome}>Bienvenido</div>
          <div style={styles.subtitle}>Inicia sesión para continuar</div>

          <div style={styles.label}>Selecciona tu rol:</div>

          <div style={styles.roleRow}>
            <RoleButton
              text="Docente"
              active={role === "docente"}
              onClick={() => setRole("docente")}
            />
            <RoleButton
              text="Líder de Grupo"
              active={role === "admin"}
              onClick={() => setRole("admin")}
              disabled={!cfgLoaded}
            />
          </div>

          <button onClick={login} style={styles.googleButton} disabled={loading}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                justifyContent: "center",
              }}
            >
              <img src={googleLogo} alt="Google" style={{ height: 30 }} />
              {loading ? "Iniciando..." : "Continuar con Google"}
            </div>
          </button>

          <div style={styles.terms}>
            Al continuar, acepta nuestros términos y condiciones
          </div>
          <div style={styles.loginFooter}>Diseñado por: {SYSTEM.author}</div>
        </div>
      </div>
    </div>
  ) : selectedRole === "admin" ? (
    <div style={{ minHeight: "100vh", width: "100%" }}>
      <DashboardAdmin logout={logout} />
    </div>
  ) : (
    <div style={{ minHeight: "100vh", width: "100%" }}>
      <DocenteDashboard logout={logout} />
    </div>
  );
}

function RoleButton({ text, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.roleButton,
        ...(active ? styles.roleButtonActive : {}),
        ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}),
      }}
    >
      {text}
    </button>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background:
      "linear-gradient(135deg, rgba(45,156,219,0.20) 0%, rgba(27,117,188,0.25) 100%)",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "min(980px, 95vw)",
    minHeight: 520,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "white",
    boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
    border: "1px solid rgba(45,156,219,0.25)",
  },
  left: {
    position: "relative",
    background:
      "linear-gradient(135deg, rgba(45,156,219,0.95) 0%, rgba(27,117,188,0.95) 100%)",
    color: "white",
    padding: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  udiLogoCorner: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 12,
    padding: 10,
    backdropFilter: "blur(6px)",
  },
  udiLogoImg: {
    height: 38,
    width: "auto",
    display: "block",
  },
  gpsCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    textAlign: "center",
    padding: 16,
  },
  gpsLogoImg: {
    height: 260,
    width: "auto",
    maxWidth: "90%",
    objectFit: "contain",
    filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.25))",
  },
  groupText: {
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 0.4,
    opacity: 0.95,
  },
  platformText: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  right: {
    padding: 34,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 520,
  },
  welcome: {
    fontSize: 34,
    fontWeight: 800,
    color: "#1B75BC",
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: 16,
    color: "#4A5568",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2D3748",
    marginTop: 6,
  },
  roleRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  roleButton: {
    padding: "12px 10px",
    borderRadius: 12,
    border: "1px solid rgba(45,156,219,0.45)",
    backgroundColor: "white",
    fontWeight: 800,
    color: "#1B75BC",
    cursor: "pointer",
  },
  roleButtonActive: {
    backgroundColor: "rgba(45,156,219,0.12)",
    border: "2px solid #2D9CDB",
  },
  googleButton: {
    marginTop: 8,
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "none",
    backgroundColor: "#2D9CDB",
    color: "white",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    opacity: 1,
  },
  terms: {
    marginTop: 8,
    fontSize: 12.5,
    color: "#718096",
  },
  loginFooter: {
    marginTop: "auto",
    paddingTop: 14,
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    fontWeight: 700,
    borderTop: "1px solid rgba(45,156,219,0.18)",
  },
};