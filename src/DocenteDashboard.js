import React, { useEffect, useMemo, useState } from "react";
import gpsLogo from "./assets/logo-gps.png";
import udiLogo from "./assets/logo-udi.png";
import { auth, db } from "./firebaseConfig";


import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  setDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  getDocs,
  limit
} from "firebase/firestore";


const UDI_BLUE = "#2D9CDB";
const UDI_BLUE_DARK = "#1B75BC";
const SYSTEM = {
  name: "GPS Research Dashboard",
  version: "v1.0",
  year: String(new Date().getFullYear()),
  group: "Grupo de Investigación GPS",
};

const categoriaMincienciasMap = {
  IE: "Investigador Emérito",
  IS: "Investigador Senior",
  IA: "Investigador Asociado",
  IJ: "Investigador Junior",
  SC: "Sin Categoría"
};

export default function DocenteDashboard({ logout }) {
  const role = useMemo(() => "docente", []);
  const [activeView, setActiveView] = useState("perfil"); // perfil | produccion

  const user = auth.currentUser;
  const uid = user?.uid;
  const photoURL = user?.photoURL || "";
  const displayName = user?.displayName || "—";
  const email = user?.email || "—";

  // PERFIL docente desde Firestore: usuarios/{uid}
  const [perfil, setPerfil] = useState(null);
  const [perfilErr, setPerfilErr] = useState("");

  useEffect(() => {
    if (!uid) return;

    const emailLower = (auth.currentUser?.email || "").toLowerCase().trim();
    if (!emailLower) return;

     (async () => {
        try {
          const refInv = collection(db, "investigadores");
          const qInv = query(refInv, where("email", "==", emailLower), limit(1));
          const snap = await getDocs(qInv);

          if (snap.empty) return; // no está registrado como investigador aún

          const inv = snap.docs[0].data();

          // Normaliza estado
          const estadoInv = String(inv.estado_investigador || "").toLowerCase();
          const esActivo = estadoInv.includes("activo") || inv.activo === true;

          await setDoc(
            doc(db, "usuarios", uid),
            {
              // campos que quieres ver en Perfil docente
              nombres: inv.nombres || "",
              apellidos: inv.apellidos || "",
              identificacion: inv.identificacion || "",
              genero: inv.genero || "",
              categoria_minciencias: inv.categoria_minciencias_investigador || "",
              estado: esActivo ? "activo" : "pendiente",

              // de paso guardas el email institucional
              correo: emailLower,

              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          console.error("SYNC investigadores->usuarios error:", e);
        }
      })();
  }, [uid]);

  useEffect(() => {
  if (!uid) return;

  const ref = doc(db, "usuarios", uid);

  const syncFromInvestigadores = async () => {
    try {
    const emailLower = (auth.currentUser?.email || "").toLowerCase().trim();
    console.log("[SYNC] emailLower:", emailLower);
    if (!emailLower) return;

    const refInv = collection(db, "investigadores");
    const qInv = query(refInv, where("email", "==", emailLower), limit(1));
    const invSnap = await getDocs(qInv);

    console.log("[SYNC] invSnap.empty:", invSnap.empty, "size:", invSnap.size);

    if (invSnap.empty) {
      console.warn("[SYNC] No encontró investigador con email =", emailLower);
      return; // aún no existe en investigadores
    }

    const inv = invSnap.docs[0].data();
     console.log("[SYNC] inv encontrado:", invSnap.docs[0].id, inv);

    await updateDoc(doc(db, "usuarios", uid), {
      nombres: inv.nombres || "",
      apellidos: inv.apellidos || "",
      identificacion: inv.identificacion || "",
      categoria_minciencias: categoriaMincienciasMap[inv.categoria_minciencias_investigador] || "",
      estado: (inv.estado_investigador || "").toLowerCase() || "pendiente",
      updatedAt: serverTimestamp(),
    });
     console.log("[SYNC] ✅ usuarios actualizado");
    } catch (e) {
      console.error("[SYNC] ❌ error:", e);
    }

  };

    const unsub = onSnapshot(
    ref,
    async (snap) => {
      if (!snap.exists()) {
        // ✅ Crear perfil base automáticamente
        await setDoc(
          ref,
          {
            uid,
            correo: auth.currentUser?.email || "",
            displayName: auth.currentUser?.displayName || "",
            photoURL: auth.currentUser?.photoURL || "",
            rol: "docente",
            estado: "pendiente",
            
            // conexiones iniciales para que nunca sean undefined
            conexiones: {
              academicas: {
                googleScholar: { enabled: false, url: "" },
                researchGate: { enabled: false, url: "" },
                ssrn: { enabled: false, url: "" },
                academiaEdu: { enabled: false, url: "" },
                linkedIn: { enabled: false, url: "" },
              },
              identificadores: {
                cvlac: { enabled: false, url: "" },
                researcherId: { enabled: false, url: "" },
                scopusAuthorId: { enabled: false, url: "" },
                orcid: { enabled: false, url: "" },
                otro: { enabled: false, url: "" },
              },
            },

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // dejamos que el snapshot vuelva a disparar y ya exista
        return;
      }

      setPerfilErr("");
      setPerfil(snap.data());
      await syncFromInvestigadores();
    },
    (err) => {
      console.error(err);
      setPerfilErr(err?.message || "Error leyendo perfil");
      setPerfil(null);
    }
  );

  return () => unsub();
}, [uid]);

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sideTop}>
          <img src={udiLogo} alt="UDI" style={styles.sideLogo} />

          <div style={styles.sideProfile}>
            <div style={styles.avatarWrap}>
              {photoURL ? (
                <img src={photoURL} alt="Foto" style={styles.avatar} />
              ) : (
                <div style={styles.avatarFallback}>👤</div>
              )}
            </div>

            <div style={styles.sideName}>{displayName}</div>
            <div style={styles.sideRole}>Docente</div>
          </div>

          <div style={styles.nav}>
            <NavBtn
              text="Perfil docente"
              active={activeView === "perfil"}
              onClick={() => setActiveView("perfil")}
            />
            <NavBtn
              text="Producción"
              active={activeView === "produccion"}
              onClick={() => setActiveView("produccion")}
            />
            <NavBtn
              text="Conexiones"
              active={activeView === "conexiones"}
              onClick={() => setActiveView("conexiones")}
            />
          </div>
        </div>

       <div style={styles.sideBottom}>
          <button onClick={logout} style={styles.logoutBtn}>
            Cerrar sesión
          </button>

          <div style={styles.systemInfo}>
            {SYSTEM.name} {SYSTEM.version} — {SYSTEM.year} <br />
            {SYSTEM.group}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* HEADER */}
       <header style={styles.header}>
            <div style={styles.headerLeft}>
                <img src={gpsLogo} alt="GPS" style={styles.headerLogo} />
                <div style={styles.headerTitle}>
                    Seguimiento Producción Investigación
                </div>
            </div>

            <div style={styles.headerUser}>
                <div style={{ textAlign: "right" }}>
                    <div style={styles.headerName}>{displayName}</div>
                    <div style={styles.headerMeta}>{role}</div>
                </div>

                {photoURL ? (
                    <img src={photoURL} alt="Foto" style={styles.headerAvatar} />
                ) : (
                    <div style={styles.headerAvatarFallback}>👤</div>
                )}
            </div>
        </header>

        {/* CONTENT */}
        <section style={styles.content}>
          {perfilErr ? <div style={styles.errorBox}>{perfilErr}</div> : null}

          {activeView === "perfil" ? (
            <PerfilDocente perfil={perfil} emailFallback={email} />
          ) : activeView === "produccion" ? (
            <ProduccionDocente uid={uid} />
          ) : (
            <ConexionesDocente perfil={perfil} />
          )}
        </section>
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

function PerfilDocente({ perfil, emailFallback }) {
  const redes = perfil?.redes || {};
  const uid = auth.currentUser?.uid;

  // editor perfil académico
  const [perfilTxt, setPerfilTxt] = useState(perfil?.perfil || "");
  // editor teléfono
  const [telTxt, setTelTxt] = useState(perfil?.telefono || "");

  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingTel, setSavingTel] = useState(false);

  const [errPerfil, setErrPerfil] = useState("");
  const [okPerfil, setOkPerfil] = useState("");

  const [errTel, setErrTel] = useState("");
  const [okTel, setOkTel] = useState("");

  // sincroniza con Firestore
  useEffect(() => setPerfilTxt(perfil?.perfil || ""), [perfil?.perfil]);
  useEffect(() => setTelTxt(perfil?.telefono || ""), [perfil?.telefono]);

  const estado = (perfil?.estado || "pendiente").toString().toLowerCase();
  const isActivo = estado === "activo";

  const guardarPerfil = async () => {
    try {
      setErrPerfil("");
      setOkPerfil("");
      if (!uid) return setErrPerfil("No hay sesión.");

      const text = (perfilTxt || "").trim();
      if (text.length > 3000) return setErrPerfil("El perfil supera 3000 caracteres.");

      setSavingPerfil(true);
      await updateDoc(doc(db, "usuarios", uid), {
        perfil: text,
        updatedAt: serverTimestamp(),
      });
      setOkPerfil("Perfil actualizado ✅");
    } catch (e) {
      console.error(e);
      setErrPerfil(e?.message || "Error guardando perfil");
    } finally {
      setSavingPerfil(false);
    }
  };

  const guardarTelefono = async () => {
    try {
      setErrTel("");
      setOkTel("");
      if (!uid) return setErrTel("No hay sesión.");

      const tel = (telTxt || "").trim();
      if (tel.length > 30) return setErrTel("Teléfono muy largo.");

      setSavingTel(true);
      await updateDoc(doc(db, "usuarios", uid), {
        telefono: tel,
        updatedAt: serverTimestamp(),
      });
      setOkTel("Teléfono actualizado ✅");
    } catch (e) {
      console.error(e);
      setErrTel(e?.message || "Error guardando teléfono");
    } finally {
      setSavingTel(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={styles.grid2}>
        <Card title="Información general">
          <Row
            label="Categoría MinCiencias"
            value={perfil?.categoria_minciencias || "Pendiente de activación"}
          />

          {/* ✅ Teléfono editable, MISMO lugar */}
          <div style={styles.row}>
            <div style={styles.rowLabel}>Teléfono</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                value={telTxt}
                onChange={(e) => setTelTxt(e.target.value)}
                style={{ ...styles.input, padding: "10px 12px" }}
                placeholder="Escribe tu teléfono"
              />
              <button
                onClick={guardarTelefono}
                style={styles.secondaryBtn}
                disabled={savingTel}
                title="Guardar teléfono"
              >
                {savingTel ? "..." : "Guardar"}
              </button>
            </div>
          </div>
          {errTel ? <div style={styles.inlineError}>{errTel}</div> : null}
          {okTel ? <div style={styles.inlineOk}>{okTel}</div> : null}

          <Row label="Correo" value={perfil?.correo || emailFallback || "—"} />

          <div style={{ marginTop: 12 }}>
            <div style={styles.label}>Redes</div>
            <RedesSoloLinks conexiones={perfil?.conexiones} />
          </div>
        </Card>

        <Card title="Detalles del docente">
          <Row label="Nombres" value={perfil?.nombres || "Pendiente de activación"} />
          <Row label="Apellidos" value={perfil?.apellidos || "Pendiente de activación"} />
          <Row label="Identificación" value={perfil?.identificacion || "Pendiente de activación"} />
          <Row label="Género" value={perfil?.genero || "Pendiente de activación"} />

          {/* ✅ Estado con color */}
          <div style={styles.row}>
            <div style={styles.rowLabel}>Estado</div>
            <div style={styles.rowValue}>
              <span style={{ ...styles.badge, ...(isActivo ? styles.badgeOk : styles.badgeWarn) }}>
                {isActivo ? "Activo" : "Pendiente"}
              </span>
            </div>
          </div>

          <Row label="CvLAC URL" value={perfil?.cvlac_url || redes?.cvlacUrl || "—"} isLink />
        </Card>
      </div>

      <Card title="Perfil académico">
        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={perfilTxt}
            onChange={(e) => setPerfilTxt(e.target.value)}
            style={styles.textarea}
            placeholder="Describe tu perfil académico: formación, líneas de investigación, experiencia, intereses..."
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={guardarPerfil} style={styles.primaryBtn} disabled={savingPerfil}>
              {savingPerfil ? "Guardando..." : "Guardar"}
            </button>

            <div style={{ color: "#6B7280", fontWeight: 800 }}>
              {(perfilTxt?.length || 0)}/3000
            </div>

            {errPerfil ? <div style={{ color: "#b91c1c", fontWeight: 900 }}>{errPerfil}</div> : null}
            {okPerfil ? <div style={{ color: "#166534", fontWeight: 900 }}>{okPerfil}</div> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

function RedesSoloLinks({ conexiones }) {
  const items = [];

  const A = conexiones?.academicas || {};
  const I = conexiones?.identificadores || {};

  const pushIf = (enabled, name, url) => {
    if (enabled && url && String(url).trim()) items.push({ name, url: String(url).trim() });
  };

  // Redes Académicas
  pushIf(A.googleScholar?.enabled, "Google Scholar", A.googleScholar?.url);
  pushIf(A.researchGate?.enabled, "ResearchGate", A.researchGate?.url);
  pushIf(A.ssrn?.enabled, "SSRN", A.ssrn?.url);
  pushIf(A.academiaEdu?.enabled, "Academia.edu", A.academiaEdu?.url);
  pushIf(A.linkedIn?.enabled, "LinkedIn", A.linkedIn?.url);

  // Identificadores
  pushIf(I.cvlac?.enabled, "CvLAC", I.cvlac?.url);
  pushIf(I.researcherId?.enabled, "ResearcherID (WOS)", I.researcherId?.url);
  pushIf(I.scopusAuthorId?.enabled, "Scopus Author ID", I.scopusAuthorId?.url);
  pushIf(I.orcid?.enabled, "ORCID", I.orcid?.url);
  pushIf(I.otro?.enabled, "Otro", I.otro?.url);

  if (items.length === 0) return <div style={{ color: "#4A5568", fontWeight: 700 }}>—</div>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {items.map((x) => (
        <a key={x.name} href={x.url} target="_blank" rel="noreferrer" style={styles.linkPill}>
          {x.name}
        </a>
      ))}
    </div>
  );
}

function ProduccionDocente({ uid }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // KPIs locales
  const [totalProyectos, setTotalProyectos] = useState(0);

  // Form
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Artículo");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [estado, setEstado] = useState("Borrador");
  const [url, setUrl] = useState("");

  // ====== Productos del docente ======
  useEffect(() => {
    if (!uid) return;

    setErr("");
    const ref = collection(db, "productos");
    const qy = query(ref, where("ownerUid", "==", uid), orderBy("anio", "desc"));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(data);
      },
      (e) => {
        console.error(e);
        setErr(e?.message || "Error leyendo productos");
      }
    );

    return () => unsub();
  }, [uid]);

  // ====== Proyectos del docente ======
  useEffect(() => {
    if (!uid) return;

    setErr("");

    // ✅ Opción A: proyectos con miembrosUids: [uid,...]
    const ref = collection(db, "proyectos");
    const qA = query(ref, where("miembrosUids", "array-contains", uid));

    const unsub = onSnapshot(
      qA,
      (snap) => setTotalProyectos(snap.size),
      async (e) => {
        // Si falla (porque no existe el campo o índice), intenta opción B:
        console.warn("Query proyectos opción A falló, intentando opción B:", e?.message);

        try {
          const qB = query(ref, where("ownerUid", "==", uid));
          return onSnapshot(
            qB,
            (snap) => setTotalProyectos(snap.size),
            (e2) => {
              console.error(e2);
              setErr(e2?.message || "Error leyendo proyectos");
            }
          );
        } catch (e2) {
          console.error(e2);
          setErr(e2?.message || "Error leyendo proyectos");
        }
      }
    );

    return () => unsub();
  }, [uid]);

  const crearProducto = async () => {
    try {
      setMsg("");
      setErr("");

      if (!uid) return setErr("No hay sesión.");

      if (!titulo.trim() || titulo.trim().length < 8) {
        return setErr("El título es obligatorio (mínimo 8 caracteres).");
      }

      const y = Number(anio);
      const thisYear = new Date().getFullYear();
      if (!Number.isFinite(y) || y < 2000 || y > thisYear + 1) {
        return setErr(`Año inválido. Usa un valor entre 2000 y ${thisYear + 1}.`);
      }

      await addDoc(collection(db, "productos"), {
        grupo: "GPS",
        ownerUid: uid,
        titulo: titulo.trim(),
        tipo,
        anio: y,
        estado,
        url: url.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitulo("");
      setUrl("");
      setMsg("Producto registrado ✅");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error creando producto");
    }
  };

  const actualizarEstado = async (id, newEstado) => {
    try {
      await updateDoc(doc(db, "productos", id), {
        estado: newEstado,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error actualizando estado");
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ✅ KPI BAR */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total productos registrados</div>
          <div style={styles.kpiValue}>{rows.length}</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total proyectos registrados</div>
          <div style={styles.kpiValue}>{totalProyectos}</div>
        </div>
      </div>

      <Card title="Registrar nuevo producto">
        {err ? <div style={styles.inlineError}>{err}</div> : null}
        {msg ? <div style={styles.inlineOk}>{msg}</div> : null}

        <div style={styles.formGrid}>
          <div>
            <div style={styles.label}>Título</div>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              style={styles.input}
              placeholder="Ej: Artículo sobre ..."
            />
          </div>

          <div>
            <div style={styles.label}>Tipo</div>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={styles.input}>
              <option>Artículo</option>
              <option>Ponencia</option>
              <option>Capítulo de libro</option>
              <option>Libro</option>
              <option>Software</option>
              <option>Proyecto</option>
              <option>Otro</option>
            </select>
          </div>

          <div>
            <div style={styles.label}>Año</div>
            <input
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <div style={styles.label}>Estado</div>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} style={styles.input}>
              <option>Borrador</option>
              <option>Enviado</option>
              <option>Aceptado</option>
              <option>Publicado</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={styles.label}>URL (opcional)</div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={styles.input}
              placeholder="https://..."
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={crearProducto} style={styles.primaryBtn}>
            Guardar producto
          </button>
        </div>
      </Card>

      <Card title="Mis productos">
        <ProductosTable rows={rows} onChangeEstado={actualizarEstado} />
      </Card>
    </div>
  );
}

function ConexionesDocente({ perfil }) {
  const uid = auth.currentUser?.uid;

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const init = useMemo(() => {
    const c = perfil?.conexiones || {};
    const a = c.academicas || {};
    const i = c.identificadores || {};

    const def = (obj) => ({ enabled: !!obj?.enabled, url: obj?.url || "" });

    return {
      academicas: {
        googleScholar: def(a.googleScholar),
        researchGate: def(a.researchGate),
        ssrn: def(a.ssrn),
        academiaEdu: def(a.academiaEdu),
        linkedIn: def(a.linkedIn),
      },
      identificadores: {
        cvlac: def(i.cvlac),
        researcherId: def(i.researcherId),
        scopusAuthorId: def(i.scopusAuthorId),
        orcid: def(i.orcid),
        otro: def(i.otro),
      },
    };
  }, [perfil]);

  const [form, setForm] = useState(init);

  useEffect(() => setForm(init), [init]);

  const setA = (k, patch) =>
    setForm((s) => ({ ...s, academicas: { ...s.academicas, [k]: { ...s.academicas[k], ...patch } } }));

  const setI = (k, patch) =>
    setForm((s) => ({ ...s, identificadores: { ...s.identificadores, [k]: { ...s.identificadores[k], ...patch } } }));

  const guardar = async () => {
    try {
      setErr("");
      setOk("");
      if (!uid) return setErr("No hay sesión.");

      setSaving(true);

      // Limpieza: si no está enabled, vacía url
      const clean = (obj) => ({
        enabled: !!obj.enabled,
        url: obj.enabled ? (obj.url || "").trim() : "",
      });

      const payload = {
        conexiones: {
          academicas: {
            googleScholar: clean(form.academicas.googleScholar),
            researchGate: clean(form.academicas.researchGate),
            ssrn: clean(form.academicas.ssrn),
            academiaEdu: clean(form.academicas.academiaEdu),
            linkedIn: clean(form.academicas.linkedIn),
          },
          identificadores: {
            cvlac: clean(form.identificadores.cvlac),
            researcherId: clean(form.identificadores.researcherId),
            scopusAuthorId: clean(form.identificadores.scopusAuthorId),
            orcid: clean(form.identificadores.orcid),
            otro: clean(form.identificadores.otro),
          },
        },
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "usuarios", uid), payload);
      setOk("Conexiones guardadas ✅");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error guardando conexiones");
    } finally {
      setSaving(false);
    }
  };
   if (!perfil) {
    return (
      <Card title="Conexiones">
        <div style={{ color: "#4A5568", fontWeight: 800 }}>
          No se encontró tu perfil aún. Si acabas de iniciar sesión, recarga la página.
        </div>
      </Card>
    );
  } 
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card title="Conexiones">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={guardar} style={styles.primaryBtn} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          {err ? <div style={{ color: "#b91c1c", fontWeight: 900 }}>{err}</div> : null}
          {ok ? <div style={{ color: "#166534", fontWeight: 900 }}>{ok}</div> : null}
        </div>
      </Card>

      <Card title="Redes sociales académicas">
        <div style={styles.conHeader}>
            <div></div>
            <div style={{ textAlign: "center", fontWeight: 900, color: "#374151" }}>Pertenece?</div>
            <div style={{ fontWeight: 900, color: "#374151" }}>URL</div>
        </div>
        <ConRow
          label="Google Scholar"
          value={form.academicas.googleScholar}
          onToggle={(v) => setA("googleScholar", { enabled: v })}
          onUrl={(v) => setA("googleScholar", { url: v })}
        />
        <ConRow
          label="ResearchGate"
          value={form.academicas.researchGate}
          onToggle={(v) => setA("researchGate", { enabled: v })}
          onUrl={(v) => setA("researchGate", { url: v })}
        />
        <ConRow
          label="Social Sciences Research (SSRN)"
          value={form.academicas.ssrn}
          onToggle={(v) => setA("ssrn", { enabled: v })}
          onUrl={(v) => setA("ssrn", { url: v })}
        />
        <ConRow
          label="Academia.edu"
          value={form.academicas.academiaEdu}
          onToggle={(v) => setA("academiaEdu", { enabled: v })}
          onUrl={(v) => setA("academiaEdu", { url: v })}
        />
        <ConRow
          label="LinkedIn"
          value={form.academicas.linkedIn}
          onToggle={(v) => setA("linkedIn", { enabled: v })}
          onUrl={(v) => setA("linkedIn", { url: v })}
        />
      </Card>

      <Card title="Identificador de autor">
        <div style={styles.conHeader}>
            <div></div>
            <div style={{ textAlign: "center", fontWeight: 900, color: "#374151" }}>Pertenece?</div>
            <div style={{ fontWeight: 900, color: "#374151" }}>URL</div>
        </div>
        <ConRow
          label="CvLAC"
          value={form.identificadores.cvlac}
          onToggle={(v) => setI("cvlac", { enabled: v })}
          onUrl={(v) => setI("cvlac", { url: v })}
        />
        <ConRow
          label="ResearcherID (Thomson Reuters - WOS)"
          value={form.identificadores.researcherId}
          onToggle={(v) => setI("researcherId", { enabled: v })}
          onUrl={(v) => setI("researcherId", { url: v })}
        />
        <ConRow
          label="Autor ID (Scopus)"
          value={form.identificadores.scopusAuthorId}
          onToggle={(v) => setI("scopusAuthorId", { enabled: v })}
          onUrl={(v) => setI("scopusAuthorId", { url: v })}
        />
        <ConRow
          label="ORCID"
          value={form.identificadores.orcid}
          onToggle={(v) => setI("orcid", { enabled: v })}
          onUrl={(v) => setI("orcid", { url: v })}
        />
        <ConRow
          label="Otro"
          value={form.identificadores.otro}
          onToggle={(v) => setI("otro", { enabled: v })}
          onUrl={(v) => setI("otro", { url: v })}
        />
      </Card>
    </div>
  );
}

function ConRow({ label, value, onToggle, onUrl }) {
  const v = value || { enabled: false, url: "" };

  return (
    <div style={styles.conRow}>
      <div style={{ fontWeight: 900, color: "#111827" }}>{label}</div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <input
          type="checkbox"
          checked={!!v.enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </div>

      <input
        value={v.url || ""}
        onChange={(e) => onUrl(e.target.value)}
        style={{ ...styles.input, padding: "10px 12px" }}
        placeholder="URL"
        disabled={!v.enabled}
      />
    </div>
  );
}

function ProductosTable({ rows, onChangeEstado }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: "#4A5568", fontWeight: 700 }}>Sin registros todavía.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={th}>Año</th>
            <th style={th}>Tipo</th>
            <th style={th}>Título</th>
            <th style={th}>Estado</th>
            <th style={th}>URL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td style={td}>{p.anio ?? "—"}</td>
              <td style={td}>{p.tipo ?? "—"}</td>
              <td style={td}>{p.titulo ?? "—"}</td>
              <td style={td}>
                <select
                  value={p.estado || "Borrador"}
                  onChange={(e) => onChangeEstado(p.id, e.target.value)}
                  style={{ ...styles.input, padding: "8px 10px" }}
                >
                  <option>Borrador</option>
                  <option>Enviado</option>
                  <option>Aceptado</option>
                  <option>Publicado</option>
                </select>
              </td>
              <td style={td}>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" style={styles.link}>
                    Ver
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value, isLink = false, multiline = false }) {
  const v = value ?? "—";
  const looksLikeUrl = typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"));

  return (
    <div style={styles.row}>
      <div style={styles.rowLabel}>{label}</div>
      <div style={{ ...styles.rowValue, whiteSpace: multiline ? "pre-wrap" : "nowrap" }}>
        {isLink && looksLikeUrl ? (
          <a href={v} target="_blank" rel="noreferrer" style={styles.link}>
            {v}
          </a>
        ) : (
          <span>{v}</span>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px 1fr",
    background: "rgba(45,156,219,0.08)",
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
  sideLogo: { height: 40, width: "auto" },

  sideProfile: { marginTop: 18, textAlign: "center" },
  avatarWrap: { display: "flex", justifyContent: "center" },
  avatar: { height: 92, width: 92, borderRadius: 999, objectFit: "cover", border: "2px solid rgba(45,156,219,0.35)" },
  avatarFallback: {
    height: 92,
    width: 92,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(45,156,219,0.10)",
    border: "2px solid rgba(45,156,219,0.35)",
    fontSize: 34,
  },
  sideName: { marginTop: 10, fontWeight: 900, color: "white" },
  sideRole: { marginTop: 4, fontWeight: 800, color: "#E0F2FE"},

  nav: { marginTop: 18, display: "grid", gap: 10 },
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
  logoutBtn: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.35)",
    background:"transparent",
    color:  "white",
    fontWeight: 900,
    cursor: "pointer",
  },

  main: { display: "flex", flexDirection: "column", minWidth: 0 },
  header: {
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
  headerTitle: { fontWeight: 900, color: UDI_BLUE_DARK, fontSize: 16 },
  headerUser: { display: "flex", alignItems: "center", gap: 12 },
  headerName: { fontWeight: 900, color: "#111827", fontSize: 13 },
  headerMeta: { fontWeight: 800, color: "#6B7280", fontSize: 12, textTransform: "capitalize" },
  headerAvatar: { height: 38, width: 38, borderRadius: 999, objectFit: "cover", border: "1px solid rgba(45,156,219,0.35)" },
  headerAvatarFallback: {
    height: 38,
    width: 38,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(45,156,219,0.10)",
    border: "1px solid rgba(45,156,219,0.35)",
  },

  headerLeft: {
  display: "flex",
  alignItems: "center",
  gap: 10,
},

headerLogo: {
  height: 34,
  width: "auto",
  objectFit: "contain",
},
  content: { padding: 18, maxWidth: 1300, margin: "0 auto", width: "100%" },
  errorBox: {
    marginBottom: 12,
    color: "#b91c1c",
    fontWeight: 800,
    background: "rgba(185, 28, 28, 0.08)",
    border: "1px solid rgba(185, 28, 28, 0.25)",
    padding: 10,
    borderRadius: 12,
  },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: {
    border: "1px solid rgba(45,156,219,0.25)",
    borderRadius: 14,
    padding: 16,
    background: "white",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    minWidth: 0,
  },
  cardTitle: { fontWeight: 900, color: UDI_BLUE_DARK, marginBottom: 12 },

  row: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, padding: "8px 0" },
  rowLabel: { color: "#6B7280", fontWeight: 800 },
  rowValue: { color: "#111827", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" },

  formGrid: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginTop: 10 },
  label: { fontSize: 12.5, fontWeight: 900, color: "#374151", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(45,156,219,0.30)",
    outline: "none",
    fontWeight: 700,
  },
  primaryBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: UDI_BLUE,
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  link: { color: UDI_BLUE_DARK, fontWeight: 900, textDecoration: "underline" },
  inlineError: {
    color: "#b91c1c",
    fontWeight: 900,
    marginBottom: 8,
  },
  inlineOk: {
    color: "#166534",
    fontWeight: 900,
    marginBottom: 8,
  },

  linkPill: {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(45,156,219,0.35)",
  background: "rgba(45,156,219,0.10)",
  color: UDI_BLUE_DARK,
  fontWeight: 900,
  textDecoration: "none",
  },

  conRow: {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.7fr 1.6fr",
  gap: 10,
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid rgba(45,156,219,0.12)",
},
checkWrap: {
  display: "flex",
  gap: 8,
  alignItems: "center",
  color: "#111827",
},
conHeader: {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.7fr 1.6fr",
  gap: 10,
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid rgba(45,156,219,0.18)",
},

textarea: {
  width: "100%",
  minHeight: 160,
  resize: "vertical",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(45,156,219,0.30)",
  outline: "none",
  fontWeight: 700,
  fontFamily: "Arial, sans-serif",
},

secondaryBtn: {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(45,156,219,0.40)",
  background: "white",
  color: UDI_BLUE_DARK,
  fontWeight: 900,
  cursor: "pointer",
},
badge: {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
},
badgeOk: {
  background: "rgba(22, 101, 52, 0.12)",
  color: "#166534",
  border: "1px solid rgba(22, 101, 52, 0.25)",
},
badgeWarn: {
  background: "rgba(202, 138, 4, 0.12)",
  color: "#92400e",
  border: "1px solid rgba(202, 138, 4, 0.25)",
},

kpiGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
},
kpiCard: {
  border: "1px solid rgba(45,156,219,0.25)",
  borderRadius: 14,
  padding: 16,
  background: "white",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
},
kpiLabel: { color: "#6B7280", fontWeight: 900, fontSize: 12.5 },
kpiValue: { color: "#111827", fontWeight: 900, fontSize: 28, marginTop: 6 },

systemInfo: {
  marginTop: 14,
  fontSize: 11.5,
  color: "rgba(255,255,255,0.75)",
  fontWeight: 700,
  lineHeight: 1.4,
},


};

const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid rgba(45,156,219,0.18)",
  color: "#1F2937",
  fontWeight: 900,
};
const td = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(45,156,219,0.12)",
  color: "#111827",
  fontWeight: 700,
};
