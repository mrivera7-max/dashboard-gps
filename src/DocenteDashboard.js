import React, { useEffect, useMemo, useState } from "react";
import gpsLogo from "./assets/logo-gps.png";
import udiLogo from "./assets/logo-udi.png";
import { auth, db } from "./firebaseConfig";
import { generarWordFicha } from "./utils/generarWordFicha";



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
  getDoc,
  limit,
  runTransaction,
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

const LINEAS_GRUPO = [
  "Robótica",
  "Control",
  "Procesamiento de Señales",
  "Telecomunicaciones",
];

const ODS_LIST = [
      "ODS 1 - Fin de la pobreza",
      "ODS 2 - Hambre cero",
      "ODS 3 - Salud y bienestar",
      "ODS 4 - Educación de calidad",
      "ODS 5 - Igualdad de género",
      "ODS 6 - Agua limpia y saneamiento",
      "ODS 7 - Energía asequible y no contaminante",
      "ODS 8 - Trabajo decente y crecimiento económico",
      "ODS 9 - Industria, innovación e infraestructura",
      "ODS 10 - Reducción de desigualdades",
      "ODS 11 - Ciudades y comunidades sostenibles",
      "ODS 12 - Producción y consumo responsables",
      "ODS 13 - Acción por el clima",
      "ODS 14 - Vida submarina",
      "ODS 15 - Vida de ecosistemas terrestres",
      "ODS 16 - Paz, justicia e instituciones sólidas",
      "ODS 17 - Alianzas para lograr los objetivos",
    ];

const CATEGORIAS_PRODUCTOS_ESPERADOS = [
  "Producto de Generación de Nuevo Conocimiento (GNC)",
  "Producto de Desarrollo Tecnológico (DT)",
  "Producto Apropiación Social del Conocimiento (ASC)",
  "Producto de Formación del Recurso Humano (FRH)",
];

const AREAS_CONOCIMIENTO_MINCIENCIAS = [
    "Ciencias Naturales",
    "Ingeniería y Tecnología",
    "Ciencias Médicas y de la Salud",
    "Ciencias Agrícolas",
    "Ciencias Sociales",
    "Humanidades",
  ];

  const CATALOGO_PRODUCTOS_SUGERIDOS = {
    GNC: [
      "Artículo científico",
      "Ponencia en evento científico",
      "Capítulo de libro de investigación",
    ],
    DT: [
      "Software registrado",
      "Prototipo funcional",
      "Modelo analítico validado",
      "Base de datos estructurada",
    ],
    ASC: [
      "Taller de apropiación social",
      "Webinar de divulgación",
      "Manual técnico o guía de uso",
      "Socialización con comunidad o empresa",
    ],
    FRH: [
      "Trabajo de grado de pregrado",
      "Trabajo de grado de maestría",
      "Formación de semillero",
      "Dirección de joven investigador",
    ],
  };

export default function DocenteDashboard({ logout }) {
  const role = useMemo(() => "docente", []);
  const [activeView, setActiveView] = useState("perfil"); // perfil | produccion | ficha | conexiones

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
              id_investigador: inv.id_investigador || "",
              estado: esActivo ? "activo" : "pendiente",
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
      id_investigador: inv.id_investigador || "",
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
              text="Ficha de desafío"
              active={activeView === "ficha"}
              onClick={() => setActiveView("ficha")}
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
            <ProduccionDocente uid={uid} perfil={perfil} />
          ) : activeView === "ficha" ? (
            <FichaDesafioDocente uid={uid} perfil={perfil} />
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

function ProduccionDocente({ uid, perfil }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [totalProyectos, setTotalProyectos] = useState(0);
  const [categoria, setCategoria] = useState("Nuevo Conocimiento");
  const [proyectoAsociado, setProyectoAsociado] = useState("");
  const [doi, setDoi] = useState("");
  const [isbn, setIsbn] = useState("");
  const [misProyectos, setMisProyectos] = useState([]);

  // Form
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("Artículo");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [estado, setEstado] = useState("Borrador");
  const [url, setUrl] = useState("");

  const idInvestigador = (perfil?.id_investigador || "").toString().trim();
  const idInvestigadorNorm = idInvestigador.toLowerCase();

  const [nombreProyecto, setNombreProyecto] = useState("");
  const [anioInicioProyecto, setAnioInicioProyecto] = useState(new Date().getFullYear());
  const [estadoProyecto, setEstadoProyecto] = useState("En ejecución");
  const [lineaInvestigacion, setLineaInvestigacion] = useState("");
  const [descripcionProyecto, setDescripcionProyecto] = useState("");

  

  const [form, setForm] = useState({
    titulo: "",
    tipo_producto: "",
    anio: "",
    estado_producto: "Borrador",
    url: "",
    proyecto_asociado_id: "",
  });

  // ====== Productos del docente ======
  useEffect(() => {
    if (!uid || !idInvestigadorNorm) { 
      setRows([]);
      return;
    }

    setErr("");

    const qy = query(
      collection(db, "productos"),
      where("id_investigador_norm", "==", idInvestigadorNorm)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => Number(b.anio || 0) - Number(a.anio || 0));
        setRows(data);
      },
      (e) => {
        console.error("[productos]", e);
        setErr(e?.message || "Error leyendo productos");
      }
    );

    return () => unsub();
  }, [idInvestigadorNorm]);

  // ====== Proyectos del docente ======
  useEffect(() => {
    if (!idInvestigador) {
      setMisProyectos([]);
      return;
    }

    const unsub = onSnapshot(
      query(
        collection(db, "proyectos"),
        where("investigador_principal", "==", idInvestigador)
      ),
      async (proySnap) => {
        try {

          const proyectos = proySnap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }));

          const prodSnap = await getDocs(
            query(
              collection(db, "productos"),
              where("id_investigador_norm", "==", idInvestigadorNorm)
            )
          );

          const productos = prodSnap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }));

          const proyectosConConteo = proyectos.map((p) => {
            const productosProyecto = productos.filter(
              (prod) => (prod.proyecto_asociado_id || "") === p.id
            );

            const totalProductos = productosProyecto.length;

            const totalNC = productosProyecto.filter(
              (prod) => (prod.categoria_minciencias_producto || "") === "Nuevo Conocimiento"
            ).length;

            const totalDT = productosProyecto.filter(
              (prod) => (prod.categoria_minciencias_producto || "") === "Desarrollo Tecnológico"
            ).length;

            const totalASC = productosProyecto.filter(
              (prod) => (prod.categoria_minciencias_producto || "") === "Apropiación Social"
            ).length;

            return {
              ...p,
              total_productos_asociados: totalProductos,
              total_nc: totalNC,
              total_dt: totalDT,
              total_asc: totalASC,
            };
          });

          proyectosConConteo.sort(
            (a, b) => Number(b.anio_inicio || 0) - Number(a.anio_inicio || 0)
          );

          setMisProyectos(proyectosConConteo);

        } catch (err) {
          console.error("Error cargando proyectos:", err);
        }
      }
    );

    return () => unsub();

  }, [idInvestigador, idInvestigadorNorm]);

  useEffect(() => {
  if (!idInvestigador) {
    setMisProyectos([]);
    return;
  }

  const qy = query(
    collection(db, "proyectos"),
    where("investigador_principal", "==", idInvestigador)
  );

  const unsub = onSnapshot(
    qy,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMisProyectos(data);
    },
    (e) => {
      console.error("[misProyectos]", e);
      setErr(e?.message || "Error leyendo proyectos del docente");
    }
  );

  return () => unsub();
}, [idInvestigador]);

  const generarCodigoProyecto = async () => {
    const cfgRef = doc(db, "config", "grupoGPS");

    const nextNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(cfgRef);

      const actual = snap.exists() ? Number(snap.data()?.contador_proyectos || 0) : 0;
      const siguiente = actual + 1;

      tx.set(
        cfgRef,
        {
          contador_proyectos: siguiente,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return siguiente;
    });

    return `PROY-${String(nextNumber).padStart(3, "0")}`;
  };

  const crearProyecto = async () => {
    try {
      setErr("");
      setMsg("");

      if (!idInvestigador) {
        setErr("No se encontró id_investigador.");
        return;
      }

      if (!nombreProyecto.trim()) {
        setErr("El nombre del proyecto es obligatorio.");
        return;
      }

      const y = Number(anioInicioProyecto);
      const thisYear = new Date().getFullYear();

      if (!Number.isFinite(y) || y < 2000 || y > thisYear + 1) {
        return setErr(`Año inválido. Usa un valor entre 2000 y ${thisYear + 1}.`);
      }

      const codigoGenerado = await generarCodigoProyecto();

      await setDoc(doc(db, "proyectos", codigoGenerado), {
        id_proyecto: codigoGenerado,
        codigo: codigoGenerado,
        grupo: "GPS",

        nombre_proyecto: nombreProyecto.trim(),
        anio_inicio: y,
        estado_proyecto: estadoProyecto,
        linea_investigacion: lineaInvestigacion,
        descripcion_tema: descripcionProyecto.trim() || null,

        investigador_principal: idInvestigador,
        investigador_principal_norm: idInvestigadorNorm,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNombreProyecto("");
      setAnioInicioProyecto(new Date().getFullYear());
      setEstadoProyecto("En ejecución");
      setLineaInvestigacion("Robótica");
      setDescripcionProyecto("");

      setMsg(`Proyecto registrado ✅ Código asignado: ${codigoGenerado}`);

    } catch (e) {
      console.error(e);
      setErr("Error registrando proyecto");
    }
  };


  const generarCodigoProducto = async () => {
    const cfgRef = doc(db, "config", "grupoGPS");

    const nextNumber = await runTransaction(db, async (tx) => {
      const snap = await tx.get(cfgRef);
      const actual = snap.exists() ? Number(snap.data()?.contador_productos || 0) : 0;
      const siguiente = actual + 1;

      tx.set(
        cfgRef,
        {
          contador_productos: siguiente,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return siguiente;
    });

    return `PROD-${String(nextNumber).padStart(3, "0")}`;
  };

  const crearProducto = async () => {
    try {
      setMsg("");
      setErr("");

      if (!uid) return setErr("No hay sesión.");
      if (!idInvestigador) return setErr("No se encontró id_investigador para este docente.");

      const y = Number(anio);
      const thisYear = new Date().getFullYear();
      
      if (!titulo.trim() || titulo.trim().length < 8) {
        return setErr("El título es obligatorio (mínimo 8 caracteres).");
      }

      if (!categoria) {
        return setErr("Debes seleccionar una categoría MinCiencias.");
      }

      if (doi.trim() && isbn.trim()) {
        return setErr("Usa DOI o ISBN según corresponda, no ambos a la vez.");
      }

      if (!Number.isFinite(y) || y < 2000 || y > thisYear + 1) {
        return setErr(`Año inválido. Usa un valor entre 2000 y ${thisYear + 1}.`);
      }

      await addDoc(collection(db, "productos"), {
        grupo: "GPS",
        ownerUid: uid, 
        id_investigador: idInvestigador,
        id_investigador_norm: idInvestigadorNorm,
        titulo: titulo.trim(),
        tipo_producto: tipo,
        anio: y,
        estado_producto: estado,
        categoria_minciencias_producto: categoria,
        proyecto_asociado_id: proyectoAsociado || null,

        doi: doi.trim() || null,
        isbn: isbn.trim() || null,
        url: url.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitulo("");
      setTipo("Artículo");
      setAnio(new Date().getFullYear());
      setEstado("Borrador");
      setUrl("");
      setCategoria("Nuevo Conocimiento");
      setProyectoAsociado("");
      setDoi("");
      setIsbn("");
      setMsg("Producto registrado ✅");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error creando producto");
    }
  };

  const actualizarEstado = async (id, newEstado) => {
    try {
      await updateDoc(doc(db, "productos", id), {
        estado_producto: newEstado,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error actualizando estado");
    }
  };

  const kpisPersonales = useMemo(() => {
    const totalProductos = rows.length;
    const totalProyectosLocal = misProyectos.length;

    const porCategoria = {
      NC: 0,
      DT: 0,
      ASC: 0,
      DIV: 0,
      FRH: 0,
    };

    const porAnio = {};

    rows.forEach((p) => {
      const cat = (p.categoria_minciencias_producto || "").toString().trim();
      const anioProd = Number(p.anio || 0);

      if (cat === "Nuevo Conocimiento") porCategoria.NC++;
      else if (cat === "Desarrollo Tecnológico") porCategoria.DT++;
      else if (cat === "Apropiación Social") porCategoria.ASC++;
      else if (cat === "Divulgación pública ciencia") porCategoria.DIV++;
      else if (cat === "Formación RRHH") porCategoria.FRH++;

      if (anioProd > 0) {
        porAnio[anioProd] = (porAnio[anioProd] || 0) + 1;
      }
    });

    const anios = Object.keys(porAnio).map(Number).sort((a, b) => a - b);
    const totalAnios = anios.length;

    const promedioPorAnio =
      totalAnios > 0 ? Number((totalProductos / totalAnios).toFixed(2)) : 0;

    let anioMasProductivo = "—";
    let maxProd = 0;
    Object.entries(porAnio).forEach(([anio, total]) => {
      if (total > maxProd) {
        maxProd = total;
        anioMasProductivo = anio;
      }
    });

    const serieProduccion = anios.map((anio) => ({
      year: String(anio),
      total: porAnio[anio],
    }));

    return {
      totalProductos,
      totalProyectos: totalProyectosLocal,
      porCategoria,
      promedioPorAnio,
      anioMasProductivo,
      serieProduccion,
    };
  }, [rows, misProyectos]);

  const categorias = kpisPersonales.porCategoria;
  const codigoPerfil = Object.entries(categorias)
   .sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const coloresPerfil = {
    NC: "#0B3C5D",   // azul oceano
    DT: "#1F77B4",   // azul marino
    ASC: "#2C7FB8",  // azul medio
    DIV: "#1FA187",  // verde mar
    FRH: "#17BECF",  // turquesa
  };

  const nombresCategorias = {
    NC: "Nuevo Conocimiento",
    DT: "Desarrollo Tecnológico",
    ASC: "Apropiación Social del Conocimiento",
    DIV: "Divulgación Científica",
    FRH: "Formación de Recurso Humano"
  };

  

  

  const perfilPredominante = nombresCategorias[codigoPerfil] || codigoPerfil;

  if (!idInvestigador) {
    return (
      <Card title="Producción">
        <div style={{ color: "#92400e", fontWeight: 800 }}>
          Tu perfil aún no tiene asociado un id_investigador. Verifica la sincronización con la colección investigadores.
        </div>
      </Card>
    );
  }

  return (
  <>
    <div style={styles.kpiGrid}>
      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Total productos registrados</div>
        <div style={styles.kpiValue}>{kpisPersonales.totalProductos}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Total proyectos registrados</div>
        <div style={styles.kpiValue}>{kpisPersonales.totalProyectos}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Promedio productos por año</div>
        <div style={styles.kpiValue}>{kpisPersonales.promedioPorAnio}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Año más productivo</div>
        <div style={styles.kpiValue}>{kpisPersonales.anioMasProductivo}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>Perfil predominante</div>

        <div
          style={{
            ...styles.kpiValue,
            fontSize: 18,
            color: coloresPerfil[codigoPerfil] || "#2D3748"
          }}
        >
          {perfilPredominante}
        </div>
      </div>

    </div>

    <div style={styles.kpiGridExtended}>
      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>NC</div>
        <div style={styles.kpiValue}>{kpisPersonales.porCategoria.NC}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>DT</div>
        <div style={styles.kpiValue}>{kpisPersonales.porCategoria.DT}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>ASC</div>
        <div style={styles.kpiValue}>{kpisPersonales.porCategoria.ASC}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>DIV</div>
        <div style={styles.kpiValue}>{kpisPersonales.porCategoria.DIV}</div>
      </div>

      <div style={styles.kpiCard}>
        <div style={styles.kpiLabel}>FRH</div>
        <div style={styles.kpiValue}>{kpisPersonales.porCategoria.FRH}</div>
      </div>
    </div>

      <Card title="Registrar nuevo proyecto">

        {err ? <div style={styles.inlineError}>{err}</div> : null}
        {msg ? <div style={styles.inlineOk}>{msg}</div> : null}

        <div style={styles.formGrid}>
          <div style={{ gridColumn: "1 / span 2" }}>
            <div style={styles.label}>Nombre del proyecto</div>
            <input
              value={nombreProyecto}
              onChange={(e)=>setNombreProyecto(e.target.value)}
              style={styles.input}
              placeholder="Ej: Sistema inteligente para ..."
            />
          </div>

          <div>
            <div style={styles.label}>Año inicio</div>
            <input
              type="number"
              value={anioInicioProyecto}
              onChange={(e)=>setAnioInicioProyecto(e.target.value)}
              style={styles.input}
            />
          </div>

            <div>
              <div style={styles.label}>Estado</div>
              <select
                value={estadoProyecto}
                onChange={(e)=>setEstadoProyecto(e.target.value)}
                style={styles.input}
              >
                <option>En ejecución</option>
                <option>Finalizado</option>
                <option>Formulación</option>
              </select>
            </div>

            <div>
              <div style={styles.label}>Línea de investigación</div>
              <select
                value={lineaInvestigacion}
                onChange={(e) => setLineaInvestigacion(e.target.value)}
                style={styles.input}
              >
                <option value="">Seleccionar</option>
                {LINEAS_GRUPO.map((linea) => (
                  <option key={linea} value={linea}>
                    {linea}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={styles.label}>Descripción / tema</div>
              <textarea
                value={descripcionProyecto}
                onChange={(e) => setDescripcionProyecto(e.target.value)}
                style={styles.textarea}
                placeholder="Describe brevemente el tema, propósito o enfoque del proyecto"
              />
            </div>
          </div>

          <div style={{marginTop:12}}>
            <button onClick={crearProyecto} style={styles.primaryBtn}>
              Guardar proyecto
            </button>
          </div>
      </Card>

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
              <option>Libro Investigación</option>
              <option>Software</option>
              <option>Proyecto</option>
              <option>Prototipo</option>
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
              <option>Registrado</option>
              <option>Publicado</option>
            </select>
          </div>

          <div>
            <div style={styles.label}>Categoría MinCiencias</div>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={styles.input}>
              <option>Nuevo Conocimiento</option>
              <option>Desarrollo Tecnológico</option>
              <option>Apropiación Social</option>
              <option>Divulgación pública ciencia</option>
              <option>Formación RRHH</option>
            </select>
          </div>

          <div>
            <div style={styles.label}>Proyecto asociado</div>
            <select
              value={form.proyecto_asociado_id}
              onChange={(e) =>
                setForm({ ...form, proyecto_asociado_id: e.target.value })
              }
              style={styles.input}
            >
              <option value="">Seleccionar proyecto</option>

              {misProyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.codigo || p.id_proyecto || p.id)} - {p.nombre_proyecto}
                </option>
              ))}

            </select>
          </div>

          <div>
            <div style={styles.label}>DOI</div>
            <input
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              style={styles.input}
              placeholder="10.xxxx/xxxxx"
            />
          </div>

          <div>
            <div style={styles.label}>ISBN</div>
            <input
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              style={styles.input}
              placeholder="978-..."
            />
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

      <Card title="Mis proyectos">
        <ProyectosTable rows={misProyectos} />
      </Card>

      <Card title="Mis productos">
        <ProductosTable rows={rows} onChangeEstado={actualizarEstado} />
      </Card>
    
  </>
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

  const [form, setForm] = useState(null);

  // solo inicializa una vez cuando llega perfil
  useEffect(() => {
    if (!perfil || form) return;
    setForm(init);
  }, [perfil, init, form]);

  const setA = (k, patch) =>
    setForm((s) => {
      const next = { ...s.academicas[k], ...patch };
      if (patch.enabled === false) next.url = "";
      return { ...s, academicas: { ...s.academicas, [k]: next } };
    });

  const setI = (k, patch) =>
    setForm((s) => {
      const next = { ...s.identificadores[k], ...patch };
      if (patch.enabled === false) next.url = "";
      return { ...s, identificadores: { ...s.identificadores, [k]: next } };
    });

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

  if (!form) {
    return (
      <Card title="Conexiones">
        <div style={{ color: "#4A5568", fontWeight: 800 }}>
          Cargando conexiones...
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

function FichaDesafioDocente({ uid, perfil }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loaded, setLoaded] = useState(false);
  
  const esLider = (perfil?.rol || "").toLowerCase() === "lider";

  const [productosSugeridos, setProductosSugeridos] = useState([]);

  const productosObligatoriosLider = [
    {
      categoria: "Producto de Formación del Recurso Humano (FRH)",
      subcategoria: "Informe final de las actividades desarrolladas en el grupo o semillero de investigación",
      fecha_entrega: "",
      obligatorio: true,
    },
    {
      categoria: "Producto de Apropiación Social del Conocimiento (ASC)",
      subcategoria: "Evidencia de actualización de CvLAC o GrupLAC",
      fecha_entrega: "",
      obligatorio: true,
    },
  ];

  const initialState = useMemo(() => ({
    datos_generales: {
      cedula: perfil?.identificacion || "",
      nombre_investigador: `${perfil?.nombres || ""} ${perfil?.apellidos || ""}`.trim(),
      programa: "",
      horas_dedicacion: "",
      fecha_inicio: "",
      fecha_fin: "",
    },

    identificacion_proyecto: {
      titulo_proyecto: "",
      grupo_investigacion: "GPS",
      linea_investigacion: "Robótica",
      area_tematica: "",
      area_conocimiento: "",
      ods: [""],
    },

    formulacion: {
      problema: "",
      justificacion_viabilidad: "",
      objetivo_general: "",
      objetivos_especificos: "",
    },
    equipo_trabajo: [
      {
        nombre: `${perfil?.nombres || ""} ${perfil?.apellidos || ""}`.trim(),
        grupo: "GPS",
        rol: "Investigador principal",
        cvlac: perfil?.conexiones?.identificadores?.cvlac?.url || "",
      },
    ],
    productos: esLider
    ? [
        ...productosObligatoriosLider,
        {
          categoria: "",
          subcategoria: "",
          fecha_entrega: "",
          obligatorio: false,
        },
      ]
    : [
        {
          categoria: "",
          subcategoria: "",
          fecha_entrega: "",
          obligatorio: false,
        },
      ],

    impactos: [
      {
        tipo: "En el desarrollo regional",
        descripcion: "",
        beneficiarios: "",
        indicadores: "",
      },
      {
        tipo: "Económico",
        descripcion: "",
        beneficiarios: "",
        indicadores: "",
      },
      {
        tipo: "Ambiental",
        descripcion: "",
        beneficiarios: "",
        indicadores: "",
      },
      {
        tipo: "Para el fortalecimiento de la UDI",
        descripcion: "",
        beneficiarios: "",
        indicadores: "",
      },
    ],
    apropiacion_social: [
      {
        actividad: "",
        comunidades_empresas: "",
        objetivo: "",
      },
    ],
    presupuesto: [
      {
        rubro: "",
        justificacion: "",
        valor: "",
      },
    ],
    cronograma: [
      {
        hito: "",
        descripcion: "",
        fecha_inicio: "",
        fecha_fin: "",
        horas_asignadas: "",
        entregable: "",
      },
    ],

    firmas: {
      preparado_por: "",
      revisado_por: "",
      aprobado_rector: "",
      aprobado_investigaciones: "",
    },

  }), [perfil]);

  
  const [form, setForm] = useState(initialState);

  const fechaFinProyecto = form?.datos_generales?.fecha_fin || "";

   useEffect(() => {
    if (!uid || loaded) return;

    const cargarFicha = async () => {
      try {
        const ref = doc(db, "fichas_desafio", uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          setForm({
            ...initialState,
            ...data,

            datos_generales: {
              ...initialState.datos_generales,
              ...(data.datos_generales || {}),
            },

            identificacion_proyecto: {
              ...initialState.identificacion_proyecto,
              ...(data.identificacion_proyecto || {}),
              ods: Array.isArray(data.identificacion_proyecto?.ods)
                ? data.identificacion_proyecto.ods
                : initialState.identificacion_proyecto.ods,
            },

            formulacion: {
              ...initialState.formulacion,
              ...(data.formulacion || {}),
            },

            impactos:
              Array.isArray(data.impactos) && data.impactos.length
                ? data.impactos
                : initialState.impactos,

            firmas: {
              ...initialState.firmas,
              ...(data.firmas || {}),
            },

            equipo_trabajo:
              Array.isArray(data.equipo_trabajo) && data.equipo_trabajo.length
                ? data.equipo_trabajo
                : initialState.equipo_trabajo,

            productos: (() => {
              const productosGuardados =
                Array.isArray(data.productos) && data.productos.length
                  ? data.productos
                  : initialState.productos;

              if (!esLider) return productosGuardados;

              const yaTieneInforme = productosGuardados.some(
                (p) =>
                  (p.subcategoria || "").trim().toLowerCase() ===
                  "informe final de las actividades desarrolladas en el grupo o semillero de investigación"
                    .toLowerCase()
              );

              const yaTieneEvidencia = productosGuardados.some(
                (p) =>
                  (p.subcategoria || "").trim().toLowerCase() ===
                  "evidencia de actualización de cvlac o gruplac"
                    .replace(" ", "")
              );

              const obligatorios = [];

              if (!yaTieneInforme) {
                obligatorios.push(productosObligatoriosLider[0]);
              }

              if (!yaTieneEvidencia) {
                obligatorios.push(productosObligatoriosLider[1]);
              }

              return [...obligatorios, ...productosGuardados];
            })(),

            apropiacion_social:
              Array.isArray(data.apropiacion_social) && data.apropiacion_social.length
                ? data.apropiacion_social
                : initialState.apropiacion_social,

            presupuesto:
              Array.isArray(data.presupuesto) && data.presupuesto.length
                ? data.presupuesto
                : initialState.presupuesto,

            cronograma:
              Array.isArray(data.cronograma) && data.cronograma.length
                ? data.cronograma
                : initialState.cronograma,
          });
        } else {
          setForm(initialState);
        }

        setLoaded(true);
      } catch (e) {
        console.error(e);
        setErr("Error cargando ficha");
      }
    };

    cargarFicha();
  }, [uid, loaded]);

  const setSectionField = (section, field, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const generarSugerenciasProductos = () => {
    const titulo = (form.identificacion_proyecto?.titulo_proyecto || "").toLowerCase();
    const linea = (form.identificacion_proyecto?.linea_investigacion || "").toLowerCase();
    const areaTematica = (form.identificacion_proyecto?.area_tematica || "").toLowerCase();
    const tieneEquipo = Array.isArray(form.equipo_trabajo) && form.equipo_trabajo.length > 1;
    const tieneASC =
      Array.isArray(form.apropiacion_social) &&
      form.apropiacion_social.some(
        (a) => (a.actividad || "").trim() || (a.objetivo || "").trim()
      );

    const sugerencias = [];

    // GNC obligatorio
    sugerencias.push({
      categoria: "Producto de Generación de Nuevo Conocimiento (GNC)",
      subcategoria: "Artículo científico",
      fecha_entrega: "",
      motivo: "El proyecto puede generar resultados publicables.",
      seleccionado: true,
    });

    // DT si hay software, modelo, sistema, prototipo
    if (
      titulo.includes("software") ||
      titulo.includes("modelo") ||
      titulo.includes("sistema") ||
      titulo.includes("prototipo")
    ) {
      sugerencias.push({
        categoria: "Producto de Desarrollo Tecnológico (DT)",
        subcategoria: "Software registrado",
        fecha_entrega: "",
        motivo: "El proyecto plantea desarrollo tecnológico susceptible de registro.",
        seleccionado: true,
      });
    } else {
      sugerencias.push({
        categoria: "Producto de Desarrollo Tecnológico (DT)",
        subcategoria: "Prototipo funcional",
        fecha_entrega: "",
        motivo: "El proyecto puede derivar en una solución tecnológica validable.",
        seleccionado: true,
      });
    }

    // ASC
    if (tieneASC || titulo.includes("comunidad") || titulo.includes("salud")) {
      sugerencias.push({
        categoria: "Producto Apropiación Social del Conocimiento (ASC)",
        subcategoria: "Taller de apropiación social",
        fecha_entrega: "",
        motivo: "El proyecto tiene potencial de socialización y transferencia.",
        seleccionado: true,
      });
    }

    // FRH
    if (tieneEquipo) {
      sugerencias.push({
        categoria: "Producto de Formación del Recurso Humano (FRH)",
        subcategoria: "Trabajo de grado de pregrado",
        fecha_entrega: "",
        motivo: "El proyecto involucra equipo de trabajo y formación investigativa.",
        seleccionado: true,
      });
    } else {
      sugerencias.push({
        categoria: "Producto de Formación del Recurso Humano (FRH)",
        subcategoria: "Formación de semillero",
        fecha_entrega: "",
        motivo: "El proyecto puede fortalecer procesos formativos en investigación.",
        seleccionado: true,
      });
    }

    setProductosSugeridos(sugerencias);
  };

  const agregarSugeridosAProductos = () => {
    const seleccionados = productosSugeridos.filter((p) => p.seleccionado);

    if (!seleccionados.length) return;

    const actuales = Array.isArray(form.productos) ? form.productos : [];

    const nuevos = seleccionados.filter(
      (sug) =>
        !actuales.some(
          (p) =>
            (p.categoria || "").trim() === sug.categoria &&
            (p.subcategoria || "").trim() === sug.subcategoria
        )
    );

    setForm((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        ...nuevos.map((x) => ({
          categoria: x.categoria,
          subcategoria: x.subcategoria,
          fecha_entrega: "",
          obligatorio: false,
        })),
      ],
    }));
  };

  const setArrayField = (section, index, field, value) => {
    setForm((prev) => {
      const next = [...prev[section]];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, [section]: next };
    });
  };

  const addArrayItem = (section, emptyRow) => {
    setForm((prev) => ({
      ...prev,
      [section]: [...prev[section], emptyRow],
    }));
  };

  const removeArrayItem = (section, index) => {
    setForm((prev) => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index),
    }));
  };

  const guardarFicha = async () => {
    try {
      setErr("");
      setOk("");

      if (!uid) {
        setErr("No hay sesión.");
        return;
      }

      if (!form.identificacion_proyecto.titulo_proyecto.trim()) {
        setErr("El título del proyecto es obligatorio.");
        return;
      }

      setSaving(true);

      await setDoc(
        doc(db, "fichas_desafio", uid),
        {
          ...form,
          uid,
          updatedAt: serverTimestamp(),
          createdBy: uid,
        },
        { merge: true }
      );

      setOk("Ficha guardada ✅");
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Error guardando ficha");
    } finally {
      setSaving(false);
    }
  };

  const contarPalabras = (texto) => {
    if (!texto) return 0;
    return texto.trim().split(/\s+/).filter(Boolean).length;
  };

  const totalPresupuesto = (Array.isArray(form.presupuesto) ? form.presupuesto : []).reduce(
    (acc, item) => acc + (Number(String(item.valor || "").replace(/[^\d.-]/g, "")) || 0),
    0
  );

  const totalHorasSemana = Number(form?.datos_generales?.horas_dedicacion) || 0;

  const totalHorasProyecto = (Array.isArray(form.cronograma) ? form.cronograma : []).reduce(
    (acc, item) => acc + (Number(item.horas_asignadas) || 0),
    0
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card title="Ficha de desafío">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={guardarFicha} style={styles.primaryBtn} disabled={saving}>
            {saving ? "Guardando..." : "Guardar ficha"}
          </button>

          <button
            type="button"
            onClick={async () => {
              await guardarFicha();
              generarWordFicha(form);
            }}
            style={styles.secondaryBtn}
          >
            Generar Word
          </button>

          {err ? <div style={styles.inlineError}>{err}</div> : null}
          {ok ? <div style={styles.inlineOk}>{ok}</div> : null}
        </div>
      </Card>

      <Card title="Datos generales">
        <div style={styles.formGrid}>
          
          <div style={{ gridColumn: "span 1" }}>
            <div style={styles.label}>Cédula</div>
            <input
              type="number"
              value={form.datos_generales.cedula}
              onChange={(e) =>
                setSectionField("datos_generales", "cedula", e.target.value)
              }
              style={{ ...styles.input, maxWidth: 90 }}
            />
          </div>

          <div style={{ gridColumn: "span 3" }}>
            <div style={styles.label}>Nombre del investigador</div>
            <input
              value={form.datos_generales.nombre_investigador}
              onChange={(e) => setSectionField("datos_generales", "nombre_investigador", e.target.value)}
              style={{ ...styles.input, maxWidth: 400 }}
            />
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={styles.label}>Programa</div>
            <input
              value={form.datos_generales.programa}
              onChange={(e) =>
                setSectionField("datos_generales", "programa", e.target.value)
              }
              style={styles.input}
            />
          </div>

          <div style={{ gridColumn: "1 / 2", gridRow: "2"}}>
            <div style={styles.label}>Horas de dedicación</div>
            <input
              type="number"
              value={form.datos_generales.horas_dedicacion}
              onChange={(e) =>
                setSectionField(
                  "datos_generales",
                  "horas_dedicacion",
                  e.target.value
                )
              }
              style={{ ...styles.input, maxWidth: 90 }}
            />
          </div>

          <div style={{ gridColumn: "2 / 3", gridRow: "2"}}>
            <div style={styles.label}>Fecha inicio</div>
            <input
              type="date"
              value={form.datos_generales.fecha_inicio}
              onChange={(e) =>
                setSectionField("datos_generales", "fecha_inicio", e.target.value)
              }
              style={{ ...styles.input, maxWidth: 120 }}
            />
          </div>

          <div style={{ gridColumn: "3 / 4", gridRow: "2" }}>
            <div style={styles.label}>Fecha fin</div>
            <input
              type="date"
              value={form.datos_generales.fecha_fin}
              onChange={(e) =>
                setSectionField("datos_generales", "fecha_fin", e.target.value)
              }
              style={{ ...styles.input, maxWidth: 120 }}
            />
          </div>
        </div>
      </Card>

      <Card title="Identificación del proyecto">
        <div style={styles.formGrid}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={styles.label}>Título del proyecto</div>
            <input
              value={form.identificacion_proyecto.titulo_proyecto}
              onChange={(e) => setSectionField("identificacion_proyecto", "titulo_proyecto", e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={styles.label}>Área de conocimiento</div>

            <select
              value={form.identificacion_proyecto.area_conocimiento}
              onChange={(e) =>
                setSectionField(
                  "identificacion_proyecto",
                  "area_conocimiento",
                  e.target.value
                )
              }
              style={styles.input}
            >
              <option value="">Seleccionar área de conocimiento</option>

              {AREAS_CONOCIMIENTO_MINCIENCIAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={styles.label}>Grupo de investigación</div>
            <input
              value={form.identificacion_proyecto.grupo_investigacion}
              onChange={(e) => setSectionField("identificacion_proyecto", "grupo_investigacion", e.target.value)}
              style={{...styles.input, maxWidth: 80}}
            />
          </div>
          
          <div style={{ gridColumn: "2 / 4" }}>
            <div style={styles.label}>Línea de investigación</div>
            <select
              value={form.identificacion_proyecto.linea_investigacion}
              onChange={(e) =>
                setSectionField("identificacion_proyecto", "linea_investigacion", e.target.value)
              }
              style={{...styles.input, maxWidth: 300}}
            >
              <option value="">Seleccionar</option>
              {LINEAS_GRUPO.map((linea) => (
                <option key={linea} value={linea}>
                  {linea}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ gridColumn: "4 / 6" }}>
            <div style={styles.label}>Área temática</div>
            <input
              value={form.identificacion_proyecto.area_tematica}
              onChange={(e) => setSectionField("identificacion_proyecto", "area_tematica", e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={styles.label}>ODS asociados</div>

            {form.identificacion_proyecto.ods.map((ods, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 8 }}>

                <select
                  value={ods}
                  onChange={(e) => {
                    const next = [...form.identificacion_proyecto.ods];
                    next[idx] = e.target.value;

                    setSectionField("identificacion_proyecto", "ods", next);
                  }}
                  style={styles.input}
                >
                  <option value="">Seleccionar ODS</option>

                  {ODS_LIST.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const next = form.identificacion_proyecto.ods.filter((_, i) => i !== idx);
                    setSectionField("identificacion_proyecto", "ods", next);
                  }}
                  style={styles.secondaryBtn}
                >
                  Eliminar
                </button>

              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const next = [...form.identificacion_proyecto.ods, ""];
                setSectionField("identificacion_proyecto", "ods", next);
              }}
              style={styles.secondaryBtn}
            >
              Agregar ODS
            </button>
          </div>
      
        </div>
      </Card>

      <Card title="Formulación">
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={styles.label}>Noción del problema</div>

            <div style={{fontSize:12, color:"#374151", marginBottom:6}}>
              Describa el problema a resolver, las características más críticas del mismo,
              vinculando el fenómeno específico que se pretende investigar. Utilizar entre
              <b>150 y 200 palabras</b>, en un solo párrafo, sin citas o referencias bibliográficas.
            </div>

            <textarea
              value={form.formulacion.problema}
              onChange={(e) => {
                const texto = e.target.value;
                const palabras = contarPalabras(texto);

                if (palabras <= 200) {
                  setSectionField("formulacion", "problema", texto);
                }
              }}
              style={styles.textarea}
            />

            <div style={{fontSize:12, marginTop:6, fontWeight:700}}>
              {contarPalabras(form.formulacion.problema)} / 200 palabras
            </div>
          </div>

          <div>
            <div style={styles.label}>Justificación</div>

            <div style={{fontSize:12, color:"#374151", marginBottom:6}}>
              Especifique de forma clara y concisa la solución planteada con el desarrollo del
              proyecto. Considere la conveniencia, relevancia social, implicaciones prácticas,
              valor teórico y utilidad metodológica. Utilizar entre <b>150 y 200 palabras</b>,
              en un solo párrafo, sin citas o referencias bibliográficas.
            </div>

            <textarea
              value={form.formulacion.justificacion_viabilidad}
              onChange={(e) => {
                const texto = e.target.value;
                const palabras = contarPalabras(texto);

                if (palabras <= 200) {
                  setSectionField("formulacion", "justificacion_viabilidad", texto);
                }
              }}
              style={styles.textarea}
            />

            <div style={{fontSize:12, marginTop:6, fontWeight:700}}>
              {contarPalabras(form.formulacion.justificacion_viabilidad)} / 200 palabras
            </div>
          </div>

          <div>
            <div style={styles.label}>Objetivo general</div>
            <textarea
              value={form.formulacion.objetivo_general}
              onChange={(e) => setSectionField("formulacion", "objetivo_general", e.target.value)}
              style={{ ...styles.textarea, minHeight: 70 }}
            />
          </div>

          <div>
            <div style={styles.label}>Objetivos específicos</div>
            <textarea
              value={form.formulacion.objetivos_especificos}
              onChange={(e) => setSectionField("formulacion", "objetivos_especificos", e.target.value)}
              style={{ ...styles.textarea, minHeight: 150 }}
            />
          </div>
        </div>
      </Card>

      <Card title="Equipo de trabajo Interdisiplinar (si aplica)">
        <div style={{ display: "grid", gap: 10 }}>
          {form.equipo_trabajo.map((item, idx) => (
            
            <div key={idx} style={styles.formGrid}>

              <div style={{ gridColumn: "1 / 3" }}>
                <div style={styles.label}>Nombre</div>
                <input
                  value={item.nombre}
                  onChange={(e) =>
                    setArrayField("equipo_trabajo", idx, "nombre", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 300}}
                />
              </div>

              <div style={{ gridColumn: "3 / 4" }}>
                <div style={styles.label}>Grupo</div>
                <input
                  value={item.grupo}
                  onChange={(e) =>
                    setArrayField("equipo_trabajo", idx, "grupo", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 100}}
                />
              </div>

              <div style={{ gridColumn: "4 / 5" }}>
                <div style={styles.label}>Rol</div>
                <input
                  value={item.rol}
                  onChange={(e) =>
                    setArrayField("equipo_trabajo", idx, "rol", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 140}}
                />
              </div>

              <div style={{ gridColumn: "5 / 7" }}>
                <div style={styles.label}>CvLAC</div>
                <input
                  value={item.cvlac}
                  onChange={(e) =>
                    setArrayField("equipo_trabajo", idx, "cvlac", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 450}}
                />
              </div>

              <div style={{ gridColumn: "8/ 8", display: "flex", alignItems: "end" }}>
                <button
                  type="button"
                  onClick={() => removeArrayItem("equipo_trabajo", idx)}
                  style={styles.secondaryBtn}
                >
                  Eliminar
                </button>
              </div>

            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              addArrayItem("equipo_trabajo", {
                nombre: "",
                grupo: "",
                rol: "",
                cvlac: "",
              })
            }
            style={styles.secondaryBtn}
          >
            Agregar integrante
          </button>
        </div>
      </Card>

      <Card title="Productos esperados">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
            En este aspecto, elija los productos que fortalezcan y fomenten la sostenibilidad
            de los productos de investigación con alta calidad investigativa de la UDI.
            Debe seleccionar por lo menos un producto de <b>Generación de Nuevo Conocimiento (GNC)</b> y
            <b> Desarrollo Tecnológico (DT)</b>, un producto de
            <b> Apropiación Social del Conocimiento (ASC)</b> y un producto de
            <b> Formación del Recurso Humano (FRH)</b>. También deben incluir informe final
            de las actividades desarrolladas en el grupo o semillero de investigación,
            evidencia de actualización de CvLAC o GrupLAC, este último si es líder de un grupo.
          </div>

          {form.productos.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 12,
                alignItems: "end",
              }}
            >
              <div style={{ gridColumn: "1 / 4" }}>
                <div style={styles.label}>Categoría</div>
                <select
                  value={item.categoria}
                  onChange={(e) =>
                    setArrayField("productos", idx, "categoria", e.target.value)
                  }
                  style={styles.input}
                >
                  <option value="">Seleccionar categoría</option>
                  {CATEGORIAS_PRODUCTOS_ESPERADOS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "4 / 7" }}>
                <div style={styles.label}>Subcategoría</div>
                <input
                  value={item.subcategoria}
                  onChange={(e) =>
                    setArrayField("productos", idx, "subcategoria", e.target.value)
                  }
                  style={styles.input}
                />
              </div>

              <div style={{ gridColumn: "8 / 8" }}>
                <div style={styles.label}>Fecha de entrega</div>
                <input
                  type="date"
                  value={item.fecha_entrega}
                  max={form?.datos_generales?.fecha_fin || ""}
                  onChange={(e) =>{
                    const fecha = e.target.value;

                    if (fechaFinProyecto && fecha > fechaFinProyecto) {
                      setErr("La fecha de entrega del producto no puede superar la fecha fin del proyecto.");
                      return;
                    }

                    setErr("");
                    setArrayField("productos", idx, "fecha_entrega", fecha);
                  }}
                  style={{...styles.input, maxWidth: 110}}
                />
              </div>

              <div style={{ gridColumn: "9 / 9", display: "flex", alignItems: "end" }}>
                <button
                  type="button"
                  onClick={() => removeArrayItem("productos", idx)}
                  style={styles.secondaryBtn}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              addArrayItem("productos", {
                categoria: "",
                subcategoria: "",
                fecha_entrega: "",
              })
            }
            style={styles.secondaryBtn}
          >
            Agregar producto esperado
          </button>
        </div>
      </Card>

      <Card title="Productos sugeridos según el proyecto">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
            A partir del título, línea de investigación, área temática y alcance del proyecto,
            el sistema propone productos potenciales de GNC, DT, ASC y FRH. Seleccione los
            que desee incorporar a la sección de productos esperados.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={generarSugerenciasProductos}
              style={styles.secondaryBtn}
            >
              Generar sugerencias
            </button>

            <button
              type="button"
              onClick={agregarSugeridosAProductos}
              style={styles.primaryBtn}
            >
              Agregar seleccionados
            </button>
          </div>

          {productosSugeridos.map((item, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid rgba(45,156,219,0.20)",
                borderRadius: 12,
                padding: 12,
                background: "rgba(45,156,219,0.04)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={!!item.seleccionado}
                  onChange={(e) => {
                    const next = [...productosSugeridos];
                    next[idx].seleccionado = e.target.checked;
                    setProductosSugeridos(next);
                  }}
                />

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 900, color: "#1B75BC" }}>
                    {item.categoria}
                  </div>
                  <div style={{ fontWeight: 800 }}>{item.subcategoria}</div>
                  <div style={{ fontSize: 12, color: "#4B5563" }}>
                    {item.motivo}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Impactos esperados">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>
            Indique todos los impactos que se van a generar en las empresas, comunidades u
            organizaciones al ejecutar el proyecto. Los indicadores verificables de impacto
            deben dar cuenta del número de personas o empresas beneficiadas, mejoras
            potenciadas con los resultados del proyecto, transferencia de conocimiento,
            fortalecimiento institucional u otros efectos derivados de la implementación
            del proyecto.
          </div>

          {(Array.isArray(form.impactos) ? form.impactos : []).map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gap: 12,
                padding: 14,
                border: "1px solid rgba(45,156,219,0.18)",
                borderRadius: 12,
                background: "rgba(45,156,219,0.03)",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "#1B75BC",
                  fontSize: 15,
                  borderBottom: "1px solid rgba(45,156,219,0.15)",
                  paddingBottom: 6,
                }}
              >
                {item.tipo}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={styles.label}>Descripción del impacto</div>
                  <textarea
                    value={item.descripcion}
                    onChange={(e) =>
                      setArrayField("impactos", idx, "descripcion", e.target.value)
                    }
                    style={{ ...styles.textarea, minHeight: 80, maxWidth: 350 }}
                  />
                </div>

                <div>
                  <div style={styles.label}>Beneficiarios</div>
                  <textarea
                    value={item.beneficiarios}
                    onChange={(e) =>
                      setArrayField("impactos", idx, "beneficiarios", e.target.value)
                    }
                    style={{ ...styles.textarea, minHeight: 80, maxWidth: 350 }}
                  />
                </div>

                <div>
                  <div style={styles.label}>Indicadores verificables</div>
                  <textarea
                    value={item.indicadores}
                    onChange={(e) =>
                      setArrayField("impactos", idx, "indicadores", e.target.value)
                    }
                    style={{ ...styles.textarea, minHeight: 80, maxWidth: 350 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Apropiación social del conocimiento">
        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>
          En línea con el nuevo modelo de medición de grupos de investigación de
          MinCiencias 2024, se hace énfasis en la apropiación social del conocimiento,
          siguiendo una metodología específica para estas actividades. Describa las
          actividades de apropiación social a realizar y los objetivos que se esperan
          alcanzar con las comunidades, empresas u organizaciones beneficiadas.
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {form.apropiacion_social.map((item, idx) => (
            <div key={idx} style={styles.formGrid}>

              <div style={{ gridColumn: "1 / 3" }}>
                <div style={styles.label}>Actividad</div>
                <input
                  value={item.actividad}
                  onChange={(e) =>
                    setArrayField("apropiacion_social", idx, "actividad", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 300}}
                />
              </div>

              <div style={{ gridColumn: "3 / 5" }}>
                <div style={styles.label}>Comunidades / Empresas</div>
                <input
                  value={item.comunidades_empresas}
                  onChange={(e) =>
                    setArrayField(
                      "apropiacion_social",
                      idx,
                      "comunidades_empresas",
                      e.target.value
                    )
                  }
                  style={{...styles.input, maxWidth: 300}}
                />
              </div>

              <div style={{ gridColumn: "5 / 8" }}>
                <div style={styles.label}>Objetivo</div>
                <input
                  value={item.objetivo}
                  onChange={(e) =>
                    setArrayField("apropiacion_social", idx, "objetivo", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 460}}
                />
              </div>

              <div style={{ gridColumn: "8 / 8", display: "flex", alignItems: "end" }}>
                <button
                  type="button"
                  onClick={() => removeArrayItem("apropiacion_social", idx)}
                  style={styles.secondaryBtn}
                >
                  Eliminar
                </button>
              </div>

            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              addArrayItem("apropiacion_social", {
                actividad: "",
                comunidades_empresas: "",
                objetivo: "",
              })
            }
            style={styles.secondaryBtn}
          >
            Agregar actividad
          </button>
        </div>
      </Card>

      <Card title="Presupuesto estimado">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>
            En este aspecto no considerar las horas de desarrollo institucional asignadas
            de investigaciones para el desarrollo del proyecto.
          </div>

          {form.presupuesto.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 12,
                alignItems: "end",
              }}
            >
              
              <div style={{ gridColumn: "1 / 4" }}>
                <div style={styles.label}>Rubro</div>
                <input
                  value={item.rubro}
                  onChange={(e) =>
                    setArrayField("presupuesto", idx, "rubro", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 400}}
                />
              </div>

              <div style={{ gridColumn: "4 / 7" }}>
                <div style={styles.label}>Justificación</div>
                <input
                  value={item.justificacion}
                  onChange={(e) =>
                    setArrayField("presupuesto", idx, "justificacion", e.target.value)
                  }
                  style={styles.input}
                />
              </div>

              <div style={{ gridColumn: "8 / 8" }}>
                <div style={styles.label}>Valor</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={item.valor}
                  onChange={(e) =>
                    setArrayField("presupuesto", idx, "valor", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 120}}
                  placeholder="0"
                />
              </div>

              <div style={{ gridColumn: "9 / 9" }}>
                <button
                  type="button"
                  onClick={() => removeArrayItem("presupuesto", idx)}
                  style={styles.secondaryBtn}
                >
                  Eliminar
                </button>
              </div>
              
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() =>
                addArrayItem("presupuesto", {
                  rubro: "",
                  justificacion: "",
                  valor: "",
                })
              }
              style={styles.secondaryBtn}
            >
              Agregar rubro
            </button>

            <div
              style={{
                marginLeft: "auto",
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(45,156,219,0.10)",
                border: "1px solid rgba(45,156,219,0.25)",
                fontWeight: 900,
                color: "#1B75BC",
              }}
            >
              Total presupuesto: ${totalPresupuesto.toLocaleString("es-CO")}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Cronograma del proyecto">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, marginBottom: 8 }}>
            En este aspecto considerar los principales hitos o actividades dentro del
            proyecto, duración, fecha de entrega y producto, resultado o evidencia de la
            actividad que permita evidenciar su cumplimiento. También deben incluir informe
            final de las actividades desarrolladas en el grupo o semillero de investigación,
            evidencia de actualización de CvLAC o GrupLAC, este último si es líder de un grupo.
          </div>

          {form.cronograma.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 12,
                alignItems: "end",
              }}
            >
              <div style={{ gridColumn: "1 / 3" }}>
                <div style={styles.label}>Actividad</div>
                <input
                  value={item.hito}
                  onChange={(e) =>
                    setArrayField("cronograma", idx, "hito", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 250}}
                />
              </div>

              <div style={{ gridColumn: "3 / 5" }}>
                <div style={styles.label}>Descripción</div>
                <input
                  value={item.descripcion}
                  onChange={(e) =>
                    setArrayField("cronograma", idx, "descripcion", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 250}}
                />
              </div>

              <div style={{ gridColumn: "5 / 5" }}>
                <div style={styles.label}>Fecha inicio</div>
                <input
                  type="date"
                  value={item.fecha_inicio}
                  onChange={(e) =>
                    setArrayField("cronograma", idx, "fecha_inicio", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 120}}
                />
              </div>

              <div style={{ gridColumn: "6 / 6" }}>
                <div style={styles.label}>Fecha fin</div>
                <input
                  type="date"
                  value={item.fecha_fin}
                  max={form?.datos_generales?.fecha_fin || ""}
                  onChange={(e) =>{
                    const fecha = e.target.value;

                    if (fechaFinProyecto && fecha > fechaFinProyecto) {
                      setErr("La fecha del cronograma no puede superar la fecha fin del proyecto.");
                      return;
                    }

                    setErr("");
                    setArrayField("cronograma", idx, "fecha_fin", fecha);
                  }}
                  style={{...styles.input, maxWidth: 120}}
                />
              </div>

              <div style={{ gridColumn: "7 / 7" }}>
                <div style={styles.label}>Horas</div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.horas_asignadas}
                    onChange={(e) =>
                      setArrayField("cronograma", idx, "horas_asignadas", e.target.value)
                    }
                    style={{...styles.input, maxWidth: 120}}
                  />
              </div>

              <div style={{ gridColumn: "8 / 8" }}>
                <div style={styles.label}>Entregable</div>
                <input
                  value={item.entregable}
                  onChange={(e) =>
                    setArrayField("cronograma", idx, "entregable", e.target.value)
                  }
                  style={{...styles.input, maxWidth: 120}}
                />
              </div>

              <div style={{ gridColumn: "9 / 9", display: "flex", alignItems: "end" }}>
                <button
                  type="button"
                  onClick={() => removeArrayItem("cronograma", idx)}
                  style={styles.secondaryBtn}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() =>
                addArrayItem("cronograma", {
                  hito: "",
                  descripcion: "",
                  fecha_inicio: "",
                  fecha_fin: "",
                  horas_asignadas: "",
                  entregable: "",
                })
              }
              style={styles.secondaryBtn}
            >
              Agregar actividad
            </button>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(45,156,219,0.10)",
                  border: "1px solid rgba(45,156,219,0.25)",
                  fontWeight: 900,
                  color: "#1B75BC",
                }}
              >
                Total horas dedicadas (semana): {totalHorasSemana}
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(27,117,188,0.10)",
                  border: "1px solid rgba(27,117,188,0.25)",
                  fontWeight: 900,
                  color: "#0F3E68",
                }}
              >
                Total horas dedicadas (total): {totalHorasProyecto}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Aprobaciones">

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
            marginTop: 10,
          }}
        >

          <div>
            <div style={styles.label}>Preparado por</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
              Investigador principal
            </div>
            <input
              value={form.firmas?.preparado_por || ""}
              onChange={(e) =>
                setSectionField("firmas", "preparado_por", e.target.value)
              }
              style={{...styles.input, maxWidth: 280}}
            />
          </div>

          <div>
            <div style={styles.label}>Revisado por</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
              Líder grupo de investigación
            </div>
            <input
              value={form.firmas.revisado_por || ""}
              onChange={(e) =>
                setSectionField("firmas", "revisado_por", e.target.value)
              }
              style={{...styles.input, maxWidth: 280}}
            />
          </div>

          <div>
            <div style={styles.label}>Aprobado por</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
              Rector
            </div>
            <input
              value={form.firmas.aprobado_rector || ""}
              onChange={(e) =>
                setSectionField("firmas", "aprobado_rector", e.target.value)
              }
              style={{...styles.input, maxWidth: 280}}
            />
          </div>

          <div>
            <div style={styles.label}>Aprobado por</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
              Director de Investigaciones
            </div>
            <input
              value={form.firmas.aprobado_investigaciones || ""}
              onChange={(e) =>
                setSectionField("firmas", "aprobado_investigaciones", e.target.value)
              }
              style={{...styles.input, maxWidth: 280}}
            />
          </div>

        </div>

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

function ProyectosTable({ rows }) {

    if (!rows || rows.length === 0) {
      return (
        <div style={{ color: "#4A5568", fontWeight: 700 }}>
          Sin proyectos registrados todavía.
        </div>
      );
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>

          <thead>
            <tr>
              <th style={th}>Código</th>
              <th style={th}>Proyecto</th>
              <th style={th}>Año</th>
              <th style={th}>Estado</th>
              <th style={th}>Línea</th>
              <th style={th}>Productos</th>
              <th style={th}>Impacto</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.codigo || p.id_proyecto || p.id}</td>
                <td style={td}>{p.nombre_proyecto || "—"}</td>
                <td style={td}>{p.anio_inicio || "—"}</td>
                <td style={td}>{p.estado_proyecto || "—"}</td>
                <td style={td}>{p.linea_investigacion || "—"}</td>
                <td style={{ ...td, fontWeight: 900 }}>{p.total_productos_asociados ?? 0}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={styles.impactBadgeNC}>NC: {p.total_nc ?? 0}</span>
                    <span style={styles.impactBadgeDT}>DT: {p.total_dt ?? 0}</span>
                    <span style={styles.impactBadgeASC}>ASC: {p.total_asc ?? 0}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
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
            <th style={th}>Categoría</th>
            <th style={th}>Estado</th>
             <th style={th}>DOI / ISBN</th>
            <th style={th}>URL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td style={td}>{p.anio ?? "—"}</td>
              <td style={td}>{p.tipo_producto || p.tipo || "—"}</td>
              <td style={td}>{p.titulo ?? "—"}</td>
              <td style={td}>{p.categoria_minciencias_producto || "—"}</td>
              <td style={td}>
                <select
                  value={p.estado_producto || p.estado || "Borrador"}
                  onChange={(e) => onChangeEstado(p.id, e.target.value)}
                  style={{ ...styles.input, padding: "8px 10px" }}
                >
                  <option>Borrador</option>
                  <option>Enviado</option>
                  <option>Aceptado</option>
                  <option>Registrado</option>
                  <option>Publicado</option>
                </select>
              </td>
              <td style={td}>{p.doi || p.isbn || "—"}</td>
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
  const looksLikeUrl = typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"))

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
    height: "100vh",
    position: "sticky",
    top: 0,
    overflowY: "auto",
    color: "white",
  },
  sideTop: {
    padding: 16,
    flex: 1,
  },
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

  sideBottom: {
    padding: 16,
    borderTop: "1px solid rgba(45,156,219,0.18)",
    marginTop: "auto",
  },
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

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 12,
    alignItems: "end"
  },
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
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 16,
  alignItems: "center",
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

impactBadgeNC: {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 8px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
  background: "rgba(11, 60, 93, 0.12)",
  color: "#0B3C5D",
  border: "1px solid rgba(11, 60, 93, 0.25)",
},

impactBadgeDT: {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 8px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
  background: "rgba(31, 119, 180, 0.12)",
  color: "#1F77B4",
  border: "1px solid rgba(31, 119, 180, 0.25)",
},

impactBadgeASC: {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 8px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
  background: "rgba(44, 127, 184, 0.12)",
  color: "#2C7FB8",
  border: "1px solid rgba(44, 127, 184, 0.25)",
},

kpiGridExtended: {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 12,
  alignItems: "center",
}

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
