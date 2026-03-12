import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "./firebaseConfig";

const cardStyle = {
  border: "1px solid rgba(45,156,219,0.25)",
  borderRadius: 14,
  padding: 16,
  background: "white",
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(45,156,219,0.30)",
  outline: "none",
  fontWeight: 700,
};

const thStyle = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #eee",
};

const tdStyle = {
  padding: 8,
  borderBottom: "1px solid #f3f3f3",
};

const btnPrimary = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "none",
  background: "#2D9CDB",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

export default function SemillerosDocenteView({ semilleros = [] }) {
  const [selectedId, setSelectedId] = useState("");

  const [semilleristas, setSemilleristas] = useState([]);
  const [showNuevoEstudiante, setShowNuevoEstudiante] = useState(false);
  const [estudianteErr, setEstudianteErr] = useState("");
  const [estudianteMsg, setEstudianteMsg] = useState("");

  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    id_semillerista: "",
    nombre: "",
    codigo: "",
    programa: "",
    semestre: "",
    correo: "",
    telefono: "",
    estado: "activo",
    anio_ingreso: new Date().getFullYear(),
  });

  const [showAdminEstudiantes, setShowAdminEstudiantes] = useState(false);

  const [proyectosSemillero, setProyectosSemillero] = useState([]);
    const [showAdminProyectos, setShowAdminProyectos] = useState(false);
    const [showNuevoProyecto, setShowNuevoProyecto] = useState(false);

    const [proyectoErr, setProyectoErr] = useState("");
    const [proyectoMsg, setProyectoMsg] = useState("");

    const [nuevoProyecto, setNuevoProyecto] = useState({
    titulo: "",
    descripcion: "",
    estado: "En ejecución",
    anio: new Date().getFullYear(),
    });

    const [productosSemillero, setProductosSemillero] = useState([]);
    const [showAdminProductos, setShowAdminProductos] = useState(false);
    const [showNuevoProducto, setShowNuevoProducto] = useState(false);

    const [productoErr, setProductoErr] = useState("");
    const [productoMsg, setProductoMsg] = useState("");

    const [nuevoProducto, setNuevoProducto] = useState({
    titulo: "",
    tipo: "Póster",
    estado: "En proceso",
    anio: new Date().getFullYear(),
    identificador: "",
    proyecto_semillero_id: "",
    });

    const [actividadesSemillero, setActividadesSemillero] = useState([]);
    const [showAdminActividades, setShowAdminActividades] = useState(false);
    const [showNuevaActividad, setShowNuevaActividad] = useState(false);

    const [actividadErr, setActividadErr] = useState("");
    const [actividadMsg, setActividadMsg] = useState("");

    const [nuevaActividad, setNuevaActividad] = useState({
    actividad: "",
    tipo: "Reunión",
    fecha: "",
    descripcion: "",
    estado: "Pendiente",
    });
  

  const selectedSemillero = useMemo(
    () => semilleros.find((s) => s._docId === selectedId) || semilleros[0] || null,
    [semilleros, selectedId]
  );

  {/* Estudiantes */}
  const resumenEstudiantes = useMemo(() => {
    const total = semilleristas.length;
    const activos = semilleristas.filter(
        (x) => String(x.estado || "").toLowerCase() === "activo"
    ).length;
    const inactivos = semilleristas.filter(
        (x) => String(x.estado || "").toLowerCase() === "inactivo"
    ).length;

    return { total, activos, inactivos };
    }, [semilleristas]);

    <div style={{ marginTop: 14, overflowX: "auto" }}>
    {semilleristas.length === 0 ? (
        <div style={{ color: "#666" }}>
        No hay estudiantes registrados en este semillero.
        </div>
    ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
            <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Nombre</th>
            <th style={thStyle}>Cédula</th>
            <th style={thStyle}>Programa</th>
            <th style={thStyle}>Semestre</th>
            <th style={thStyle}>Estado</th>
            </tr>
        </thead>
        <tbody>
            {semilleristas.map((est) => (
            <tr key={est._docId}>
                <td style={tdStyle}>{est.id_semillerista || "—"}</td>
                <td style={tdStyle}>{est.nombre || "—"}</td>
                <td style={tdStyle}>{est.cedula || "—"}</td>
                <td style={tdStyle}>{est.programa || "—"}</td>
                <td style={tdStyle}>{est.semestre || "—"}</td>
                <td style={tdStyle}>{est.estado || "—"}</td>
            </tr>
            ))}
        </tbody>
        </table>
    )}
    </div>

  useEffect(() => {
    if (!selectedSemillero?.id_semillero) {
        setSemilleristas([]);
        return;
    }

    const unsub = onSnapshot(
        collection(db, "semilleristas"),
        (snap) => {
        const data = snap.docs
            .map((d) => ({ _docId: d.id, ...d.data() }))
            .filter(
            (x) =>
                String(x.semillero_id || "").trim() ===
                String(selectedSemillero.id_semillero || "").trim()
            )
            .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

        setSemilleristas(data);
        },
        (e) => {
        console.error(e);
        setEstudianteErr("Error leyendo estudiantes del semillero.");
        }
    );

    return () => unsub();
    }, [selectedSemillero]);

  const guardarEstudiante = async () => {
    try {
        setEstudianteErr("");
        setEstudianteMsg("");

        if (!selectedSemillero?.id_semillero) {
        setEstudianteErr("Debes seleccionar un semillero.");
        return;
        }

        const nombre = (nuevoEstudiante.nombre || "").trim();
        if (!nombre) {
        setEstudianteErr("El nombre del estudiante es obligatorio.");
        return;
        }

         // 🔹 buscar estudiantes del mismo semillero
        const q = query(
        collection(db, "semilleristas"),
        where("semillero_id", "==", selectedSemillero.id_semillero)
        );

        const snap = await getDocs(q);

        let max = 0;

        snap.docs.forEach((d) => {
        const id = d.data().id_semillerista || "";
        const num = parseInt(id.replace("SEM-", ""), 10);
        if (!isNaN(num) && num > max) max = num;
        });

        const next = max + 1;

        const idSem = "SEM-" + String(next).padStart(3, "0");

        await addDoc(collection(db, "semilleristas"), {
        ...nuevoEstudiante,
        id_semillerista: idSem,
        nombre,
        semillero_id: selectedSemillero.id_semillero,
        semillero_nombre: selectedSemillero.nombre || "",
        anio_ingreso: Number(nuevoEstudiante.anio_ingreso) || new Date().getFullYear(),
        semestre: Number(nuevoEstudiante.semestre) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        });

        setNuevoEstudiante({
        id_semillerista: "",
        nombre: "",
        codigo: "",
        programa: "",
        semestre: "",
        correo: "",
        telefono: "",
        estado: "activo",
        anio_ingreso: new Date().getFullYear(),
        });

        setShowNuevoEstudiante(false);
        setEstudianteMsg("Estudiante agregado correctamente.");
    } catch (e) {
        console.error(e);
        setEstudianteErr("Error guardando estudiante.");
    }
    };

  const eliminarEstudiante = async (docId) => {
    try {
        setEstudianteErr("");
        setEstudianteMsg("");

        const ok = window.confirm("¿Eliminar este estudiante del semillero?");
        if (!ok) return;

        await deleteDoc(doc(db, "semilleristas", docId));
        setEstudianteMsg("Estudiante eliminado correctamente.");
    } catch (e) {
        console.error(e);
        setEstudianteErr("Error eliminando estudiante.");
    }
    };

  const cambiarEstadoEstudiante = async (docId, nuevoEstado) => {
    try {
        setEstudianteErr("");
        setEstudianteMsg("");

        await updateDoc(doc(db, "semilleristas", docId), {
        estado: nuevoEstado,
        updatedAt: serverTimestamp(),
        });

        setEstudianteMsg("Estado del estudiante actualizado.");
    } catch (e) {
        console.error(e);
        setEstudianteErr("Error actualizando estado del estudiante.");
    }
    };

    {/* Proyectos */}
    useEffect(() => {
        if (!selectedSemillero?.id_semillero) {
            setProyectosSemillero([]);
            return;
        }

        const unsub = onSnapshot(
            collection(db, "semillero_proyectos"),
            (snap) => {
            const data = snap.docs
                .map((d) => ({ _docId: d.id, ...d.data() }))
                .filter(
                (x) =>
                    String(x.semillero_id || "").trim() ===
                    String(selectedSemillero.id_semillero || "").trim()
                )
                .sort((a, b) => (b.anio || 0) - (a.anio || 0));

            setProyectosSemillero(data);
            },
            (e) => {
            console.error(e);
            setProyectoErr("Error leyendo proyectos del semillero.");
            }
        );

        return () => unsub();
        }, [selectedSemillero]);

        const resumenProyectos = useMemo(() => {
        const total = proyectosSemillero.length;

        const activos = proyectosSemillero.filter(
            (p) => (p.estado || "").toLowerCase() === "en ejecución"
        ).length;

        const finalizados = proyectosSemillero.filter(
            (p) => (p.estado || "").toLowerCase() === "finalizado"
        ).length;

        return { total, activos, finalizados };
        }, [proyectosSemillero]);

        const guardarProyecto = async () => {
            try {
                setProyectoErr("");
                setProyectoMsg("");

                if (!selectedSemillero?.id_semillero) {
                setProyectoErr("Debes seleccionar un semillero.");
                return;
                }

                const titulo = (nuevoProyecto.titulo || "").trim();

                if (!titulo) {
                setProyectoErr("El título del proyecto es obligatorio.");
                return;
                }

                const idProyecto = "PS-" + Date.now().toString().slice(-5);

                await addDoc(collection(db, "semillero_proyectos"), {
                ...nuevoProyecto,
                id_proyecto_semillero: idProyecto,
                titulo,
                semillero_id: selectedSemillero.id_semillero,
                semillero_nombre: selectedSemillero.nombre || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                });

                setNuevoProyecto({
                titulo: "",
                descripcion: "",
                estado: "En ejecución",
                anio: new Date().getFullYear(),
                });

                setShowNuevoProyecto(false);
                setProyectoMsg("Proyecto creado correctamente.");
            } catch (e) {
                console.error(e);
                setProyectoErr("Error guardando proyecto.");
            }
        };

            const eliminarProyecto = async (docId) => {
                try {
                    const ok = window.confirm("¿Eliminar este proyecto?");
                    if (!ok) return;

                    await deleteDoc(doc(db, "semillero_proyectos", docId));

                    setProyectoMsg("Proyecto eliminado.");
                } catch (e) {
                    console.error(e);
                    setProyectoErr("Error eliminando proyecto.");
                }
            };

    const cambiarEstadoProyecto = async (docId, nuevoEstado) => {
    try {
        setProyectoErr("");
        setProyectoMsg("");

        await updateDoc(doc(db, "semillero_proyectos", docId), {
        estado: nuevoEstado,
        updatedAt: serverTimestamp(),
        });

        setProyectoMsg("Estado del proyecto actualizado.");
    } catch (e) {
        console.error(e);
        setProyectoErr("Error actualizando estado del proyecto.");
    }
    };

    {/* Productos */}
    useEffect(() => {
    if (!selectedSemillero?.id_semillero) {
        setProductosSemillero([]);
        return;
    }

    const unsub = onSnapshot(
        collection(db, "semillero_productos"),
        (snap) => {
        const data = snap.docs
            .map((d) => ({ _docId: d.id, ...d.data() }))
            .filter(
            (x) =>
                String(x.semillero_id || "").trim() ===
                String(selectedSemillero.id_semillero || "").trim()
            )
            .sort((a, b) => (b.anio || 0) - (a.anio || 0));

        setProductosSemillero(data);
        },
        (e) => {
        console.error(e);
        setProductoErr("Error leyendo productos del semillero.");
        }
    );

    return () => unsub();
    }, [selectedSemillero]);

    const cambiarEstadoProducto = async (docId, nuevoEstado) => {
    try {
        setProductoErr("");
        setProductoMsg("");

        await updateDoc(doc(db, "semillero_productos", docId), {
        estado: nuevoEstado,
        updatedAt: serverTimestamp(),
        });

        setProductoMsg("Estado del producto actualizado.");
    } catch (e) {
        console.error(e);
        setProductoErr("Error actualizando estado del producto.");
    }
    };

    const resumenProductos = useMemo(() => {
    const total = productosSemillero.length;

    const publicados = productosSemillero.filter(
        (p) => (p.estado || "").toLowerCase() === "publicado"
    ).length;

    const enProceso = productosSemillero.filter(
        (p) => (p.estado || "").toLowerCase() === "en proceso"
    ).length;

    const registrados = productosSemillero.filter(
        (p) => String(p.estado || "").toLowerCase() === "registrado"
    ).length;

    return { total, publicados, enProceso, registrados };
    }, [productosSemillero]);

    const guardarProducto = async () => {
    try {
        setProductoErr("");
        setProductoMsg("");

        if (!selectedSemillero?.id_semillero) {
        setProductoErr("Debes seleccionar un semillero.");
        return;
        }

        const titulo = (nuevoProducto.titulo || "").trim();
        if (!titulo) {
        setProductoErr("El título del producto es obligatorio.");
        return;
        }

        const idProducto = "PRS-" + Date.now().toString().slice(-5);

        await addDoc(collection(db, "semillero_productos"), {
        ...nuevoProducto,
        id_producto_semillero: idProducto,
        titulo,
        semillero_id: selectedSemillero.id_semillero,
        semillero_nombre: selectedSemillero.nombre || "",
        anio: Number(nuevoProducto.anio) || new Date().getFullYear(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        });

        setNuevoProducto({
        titulo: "",
        tipo: "Póster",
        estado: "En proceso",
        anio: new Date().getFullYear(),
        identificador: "",
        proyecto_semillero_id: "",
        });

        setShowNuevoProducto(false);
        setProductoMsg("Producto creado correctamente.");
    } catch (e) {
        console.error(e);
        setProductoErr("Error guardando producto.");
    }
    };

    const eliminarProducto = async (docId) => {
    try {
        const ok = window.confirm("¿Eliminar este producto?");
        if (!ok) return;

        await deleteDoc(doc(db, "semillero_productos", docId));
        setProductoMsg("Producto eliminado.");
    } catch (e) {
        console.error(e);
        setProductoErr("Error eliminando producto.");
    }
    };

    {/* Actividades */}
    useEffect(() => {
    if (!selectedSemillero?.id_semillero) {
        setActividadesSemillero([]);
        return;
    }

    const unsub = onSnapshot(
        collection(db, "semillero_actividades"),
        (snap) => {
        const data = snap.docs
            .map((d) => ({ _docId: d.id, ...d.data() }))
            .filter(
            (x) =>
                String(x.semillero_id || "").trim() ===
                String(selectedSemillero.id_semillero || "").trim()
            )
            .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));

        setActividadesSemillero(data);
        },
        (e) => {
        console.error(e);
        setActividadErr("Error leyendo actividades del semillero.");
        }
    );

    return () => unsub();
    }, [selectedSemillero]);

    const resumenActividades = useMemo(() => {
    const total = actividadesSemillero.length;

    const realizadas = actividadesSemillero.filter(
        (a) => (a.estado || "").toLowerCase() === "realizada"
    ).length;

    const pendientes = actividadesSemillero.filter(
        (a) => (a.estado || "").toLowerCase() === "pendiente"
    ).length;

    const canceladas = actividadesSemillero.filter(
        (a) => String(a.estado || "").toLowerCase() === "cancelada"
    ).length;

    return { total, realizadas, pendientes, canceladas };
    }, [actividadesSemillero]);

    const guardarActividad = async () => {
    try {
        setActividadErr("");
        setActividadMsg("");

        if (!selectedSemillero?.id_semillero) {
        setActividadErr("Debes seleccionar un semillero.");
        return;
        }

        const actividad = (nuevaActividad.actividad || "").trim();
        if (!actividad) {
        setActividadErr("El nombre de la actividad es obligatorio.");
        return;
        }

        const idActividad = "ACT-" + Date.now().toString().slice(-5);

        await addDoc(collection(db, "semillero_actividades"), {
        ...nuevaActividad,
        id_actividad_semillero: idActividad,
        actividad,
        semillero_id: selectedSemillero.id_semillero,
        semillero_nombre: selectedSemillero.nombre || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        });

        setNuevaActividad({
        actividad: "",
        tipo: "Reunión",
        fecha: "",
        descripcion: "",
        estado: "Pendiente",
        });

        setShowNuevaActividad(false);
        setActividadMsg("Actividad creada correctamente.");
    } catch (e) {
        console.error(e);
        setActividadErr("Error guardando actividad.");
    }
    };

    const eliminarActividad = async (docId) => {
    try {
        const ok = window.confirm("¿Eliminar esta actividad?");
        if (!ok) return;

        await deleteDoc(doc(db, "semillero_actividades", docId));
        setActividadMsg("Actividad eliminada.");
    } catch (e) {
        console.error(e);
        setActividadErr("Error eliminando actividad.");
    }
    };

    const cambiarEstadoActividad = async (docId, nuevoEstado) => {
        try {
            setActividadErr("");
            setActividadMsg("");

            await updateDoc(doc(db, "semillero_actividades", docId), {
            estado: nuevoEstado,
            updatedAt: serverTimestamp(),
            });

            setActividadMsg("Estado de la actividad actualizado.");
        } catch (e) {
            console.error(e);
            setActividadErr("Error actualizando estado de la actividad.");
        }
        };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#1B75BC" }}>Mis semilleros</h3>

        {semilleros.length === 0 ? (
          <div style={{ color: "#666" }}>No tienes semilleros asignados.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {semilleros.map((sem) => (
              <button
                key={sem._docId}
                type="button"
                onClick={() => setSelectedId(sem._docId)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border:
                    (selectedSemillero?._docId || "") === sem._docId
                      ? "1px solid rgba(27,117,188,0.55)"
                      : "1px solid rgba(45,156,219,0.25)",
                  background:
                    (selectedSemillero?._docId || "") === sem._docId
                      ? "rgba(27,117,188,0.10)"
                      : "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {sem.nombre || sem.id_semillero || sem._docId}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        {!selectedSemillero ? (
          <div>Selecciona un semillero.</div>
        ) : (
          <>
            <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
              {selectedSemillero.nombre || "Semillero"}
            </h3>

            <div style={{ display: "grid", gap: 8 }}>
              <div><b>ID:</b> {selectedSemillero.id_semillero || "—"}</div>
              <div><b>Estado:</b> {selectedSemillero.estado || "—"}</div>
              <div><b>Línea principal:</b> {selectedSemillero.linea_principal || "—"}</div>
              <div><b>Docente responsable:</b> {selectedSemillero.docente_responsable_nombre || "—"}</div>
              <div><b>Descripción:</b> {selectedSemillero.descripcion || "—"}</div>
            </div>

            <div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(45,156,219,0.18)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                        <h3 style={{ marginTop: 0, marginBottom: 4, color: "#1B75BC" }}>
                            Estudiantes del semillero
                        </h3>
                        <div style={{ fontSize: 13, color: "#4A5568" }}>
                            <b>Total:</b> {resumenEstudiantes.total}{" "}
                            | <b>Activos:</b> {resumenEstudiantes.activos}{" "}
                            | <b>Inactivos:</b> {resumenEstudiantes.inactivos}
                        </div>
                        </div>

                        <button
                        type="button"
                        onClick={() => setShowAdminEstudiantes(true)}
                        style={btnPrimary}
                        >
                        Administrar estudiantes
                        </button>
                    </div>

                    {/* TABLA VISIBLE EN PANEL PRINCIPAL */}
                    <div style={{ marginTop: 14, overflowX: "auto" }}>
                        {semilleristas.length === 0 ? (
                        <div style={{ color: "#666" }}>
                            No hay estudiantes registrados en este semillero.
                        </div>
                        ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Nombre</th>
                                <th style={thStyle}>Cédula</th>
                                <th style={thStyle}>Programa</th>
                                <th style={thStyle}>Semestre</th>
                                <th style={thStyle}>Estado</th>
                            </tr>
                            </thead>
                            <tbody>
                            {semilleristas.map((est) => (
                                <tr key={est._docId}>
                                <td style={tdStyle}>{est.id_semillerista || "—"}</td>
                                <td style={tdStyle}>{est.nombre || "—"}</td>
                                <td style={tdStyle}>{est.cedula || "—"}</td>
                                <td style={tdStyle}>{est.programa || "—"}</td>
                                <td style={tdStyle}>{est.semestre || "—"}</td>
                                <td style={tdStyle}>{est.estado || "—"}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        )}
                    </div>



                </div>

                {estudianteErr ? (
                    <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 8 }}>
                    {estudianteErr}
                    </div>
                ) : null}

                {estudianteMsg ? (
                    <div style={{ color: "#166534", fontWeight: 800, marginBottom: 8 }}>
                    {estudianteMsg}
                    </div>
                ) : null}

                {showAdminEstudiantes && (
                    <div
                        style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        }}
                    >
                        <div
                        style={{
                            background: "white",
                            width: 980,
                            maxWidth: "95vw",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            borderRadius: 16,
                            padding: 16,
                        }}
                        >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, color: "#1B75BC" }}>
                            Administrar estudiantes - {selectedSemillero?.nombre || "Semillero"}
                            </h3>

                            <button
                            type="button"
                            onClick={() => {
                                setShowAdminEstudiantes(false);
                                setShowNuevoEstudiante(false);
                            }}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.15)",
                                background: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                            }}
                            >
                              ✕
                            </button>
                        </div>

                        {estudianteErr ? (
                            <div style={{ color: "#b91c1c", fontWeight: 800, marginTop: 10 }}>
                            {estudianteErr}
                            </div>
                        ) : null}

                        {estudianteMsg ? (
                            <div style={{ color: "#166534", fontWeight: 800, marginTop: 10 }}>
                            {estudianteMsg}
                            </div>
                        ) : null}

                        <div style={{ marginTop: 14 }}>
                            <button
                            type="button"
                            onClick={() => setShowNuevoEstudiante((s) => !s)}
                            style={btnPrimary}
                            >
                            {showNuevoEstudiante ? "Ocultar formulario" : "Nuevo estudiante"}
                            </button>
                        </div>

                        {showNuevoEstudiante && (
                            <div
                            style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid rgba(45,156,219,0.22)",
                                background: "rgba(45,156,219,0.04)",
                                display: "grid",
                                gap: 10,
                            }}
                            >
                            <input
                                value={nuevoEstudiante.nombre}
                                onChange={(e) => setNuevoEstudiante((s) => ({ ...s, nombre: e.target.value }))}
                                style={inputStyle}
                                placeholder="Nombre"
                            />

                            <input
                                value={nuevoEstudiante.codigo}
                                onChange={(e) => setNuevoEstudiante((s) => ({ ...s, codigo: e.target.value }))}
                                style={inputStyle}
                                placeholder="Código"
                            />

                            <input
                                value={nuevoEstudiante.programa}
                                onChange={(e) => setNuevoEstudiante((s) => ({ ...s, programa: e.target.value }))}
                                style={inputStyle}
                                placeholder="Programa"
                            />

                            <input
                                type="number"
                                value={nuevoEstudiante.semestre}
                                onChange={(e) => setNuevoEstudiante((s) => ({ ...s, semestre: e.target.value }))}
                                style={inputStyle}
                                placeholder="Semestre"
                            />

                            <input
                                value={nuevoEstudiante.correo}
                                onChange={(e) => setNuevoEstudiante((s) => ({ ...s, correo: e.target.value }))}
                                style={inputStyle}
                                placeholder="Correo"
                            />

                            <input
                                type="number"
                                value={nuevoEstudiante.anio_ingreso}
                                onChange={(e) => setNuevoEstudiante((s) => ({ ...s, anio_ingreso: e.target.value }))}
                                style={inputStyle}
                                placeholder="Año de ingreso"
                            />

                            <button type="button" onClick={guardarEstudiante} style={btnPrimary}>
                                Guardar estudiante
                            </button>
                            </div>
                        )}

                        <div style={{ marginTop: 16, overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>Nombre</th>
                                    <th style={thStyle}>Estado</th>
                                    <th style={thStyle}>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {semilleristas.map((est) => (
                                <tr key={est._docId}>
                                    <td style={tdStyle}>{est.id_semillerista || "—"}</td>
                                    <td style={tdStyle}>{est.nombre || "—"}</td>
                                    <td style={tdStyle}>
                                    <select
                                        value={est.estado || "activo"}
                                        onChange={(e) => cambiarEstadoEstudiante(est._docId, e.target.value)}
                                        style={{ ...inputStyle, padding: "8px 10px", maxWidth: 140 }}
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                    </td>
                                    <td style={tdStyle}>
                                    <button
                                        type="button"
                                        onClick={() => eliminarEstudiante(est._docId)}
                                        style={{
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(220,38,38,0.25)",
                                        background: "rgba(220,38,38,0.08)",
                                        color: "#B91C1C",
                                        fontWeight: 900,
                                        cursor: "pointer",
                                        }}
                                    >
                                        Eliminar
                                    </button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                        </div>
                    </div>
                )}
                </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(45,156,219,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                    <h3 style={{ marginTop: 0, marginBottom: 4, color: "#1B75BC" }}>
                        Proyectos del semillero
                    </h3>

                    <div style={{ fontSize: 13, color: "#4A5568" }}>
                        <b>Total:</b> {resumenProyectos.total} |{" "}
                        <b>En ejecución:</b> {resumenProyectos.activos} |{" "}
                        <b>Finalizados:</b> {resumenProyectos.finalizados}
                    </div>
                </div>

                    <button
                    type="button"
                    onClick={() => setShowAdminProyectos(true)}
                    style={btnPrimary}
                    >
                    Administrar proyectos
                    </button>
                </div>

                <div style={{ marginTop: 14, overflowX: "auto" }}>
                    {proyectosSemillero.length === 0 ? (
                    <div style={{ color: "#666" }}>
                        No hay proyectos registrados en este semillero.
                    </div>
                    ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                        <tr>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Título</th>
                            <th style={thStyle}>Año</th>
                            <th style={thStyle}>Estado</th>
                        </tr>
                        </thead>
                        <tbody>
                        {proyectosSemillero.map((p) => (
                            <tr key={p._docId}>
                            <td style={tdStyle}>{p.id_proyecto_semillero || "—"}</td>
                            <td style={tdStyle}>{p.titulo || "—"}</td>
                            <td style={tdStyle}>{p.anio || "—"}</td>
                            <td style={tdStyle}>{p.estado || "—"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    )}
                </div>
                

                    {showAdminProyectos && (
                        <div
                            style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 9999,
                            }}
                        >
                            <div
                            style={{
                                background: "white",
                                width: 900,
                                maxWidth: "95vw",
                                borderRadius: 16,
                                padding: 16,
                            }}
                            >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 12,
                                }}
                                >
                                <h3 style={{ margin: 0, color: "#1B75BC" }}>
                                    Administrar proyectos - {selectedSemillero?.nombre}
                                </h3>

                                <button
                                    type="button"
                                    onClick={() => setShowAdminProyectos(false)}
                                    style={{
                                    padding: "6px 10px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(0,0,0,0.15)",
                                    background: "white",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                    }}
                                >
                                    ✕
                                </button>
                                </div>

                            <button onClick={() => setShowNuevoProyecto((s) => !s)} style={btnPrimary}>
                                {showNuevoProyecto ? "Cerrar formulario" : "Nuevo proyecto"}
                            </button>

                            {showNuevoProyecto && (
                                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                                <input
                                    placeholder="Título del proyecto"
                                    value={nuevoProyecto.titulo}
                                    onChange={(e) =>
                                    setNuevoProyecto((s) => ({ ...s, titulo: e.target.value }))
                                    }
                                    style={inputStyle}
                                />

                                <textarea
                                    placeholder="Descripción"
                                    value={nuevoProyecto.descripcion}
                                    onChange={(e) =>
                                    setNuevoProyecto((s) => ({ ...s, descripcion: e.target.value }))
                                    }
                                    style={inputStyle}
                                />

                                <input
                                    type="number"
                                    value={nuevoProyecto.anio}
                                    onChange={(e) =>
                                    setNuevoProyecto((s) => ({ ...s, anio: e.target.value }))
                                    }
                                    style={inputStyle}
                                />

                                <select
                                    value={nuevoProyecto.estado}
                                    onChange={(e) =>
                                        setNuevoProyecto((s) => ({ ...s, estado: e.target.value }))
                                    }
                                    style={inputStyle}
                                    >
                                    <option value="En ejecución">En ejecución</option>
                                    <option value="Finalizado">Finalizado</option>
                                </select>

                                <button onClick={guardarProyecto} style={btnPrimary}>
                                    Guardar proyecto
                                </button>
                                </div>
                            )}

                            <div style={{ marginTop: 20 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>Título</th>
                                    <th style={thStyle}>Estado</th>
                                    <th style={thStyle}>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {proyectosSemillero.map((p) => (
                                    <tr key={p._docId}>
                                        <td style={tdStyle}>{p.id_proyecto_semillero}</td>
                                        <td style={tdStyle}>{p.titulo}</td>
                                        <td style={tdStyle}>
                                            <select
                                            value={p.estado || "En ejecución"}
                                            onChange={(e) => cambiarEstadoProyecto(p._docId, e.target.value)}
                                            style={{ ...inputStyle, padding: "8px 10px", maxWidth: 160 }}
                                            >
                                            <option value="En ejecución">En ejecución</option>
                                            <option value="Finalizado">Finalizado</option>
                                            </select>
                                        </td>

                                        <td style={tdStyle}>

                                        <button
                                            type="button"
                                            onClick={() => eliminarProyecto(p._docId)}
                                            style={{
                                            padding: "8px 10px",
                                            borderRadius: 10,
                                            border: "1px solid rgba(220,38,38,0.25)",
                                            background: "rgba(220,38,38,0.08)",
                                            color: "#B91C1C",
                                            fontWeight: 900,
                                            cursor: "pointer",
                                            }}
                                        >
                                            Eliminar
                                        </button>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>

                            
                            </div>
                        </div>
                        )}
                    </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(45,156,219,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                    <h3 style={{ marginTop: 0, marginBottom: 4, color: "#1B75BC" }}>
                        Productos del semillero
                    </h3>

                    <div style={{ fontSize: 13, color: "#4A5568" }}>
                        <b>Total:</b> {resumenProductos.total} |{" "}
                        <b>En proceso:</b> {resumenProductos.enProceso} |{" "}
                        <b>Publicados:</b> {resumenProductos.publicados} |{" "}
                        <b>Registrados:</b> {resumenProductos.registrados}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={() => setShowAdminProductos(true)}
                    style={btnPrimary}
                    >
                    Administrar productos
                    </button>
                </div>

                <div style={{ marginTop: 14, overflowX: "auto" }}>
                    {productosSemillero.length === 0 ? (
                    <div style={{ color: "#666" }}>
                        No hay productos registrados en este semillero.
                    </div>
                    ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                        <tr>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Título</th>
                            <th style={thStyle}>Tipo</th>
                            <th style={thStyle}>Año</th>
                            <th style={thStyle}>Estado</th>
                            <th style={thStyle}>Identificador</th>
                        </tr>
                        </thead>
                        <tbody>
                        {productosSemillero.map((p) => (
                            <tr key={p._docId}>
                            <td style={tdStyle}>{p.id_producto_semillero || "—"}</td>
                            <td style={tdStyle}>{p.titulo || "—"}</td>
                            <td style={tdStyle}>{p.tipo || "—"}</td>
                            <td style={tdStyle}>{p.anio || "—"}</td>
                            <td style={tdStyle}>{p.estado || "—"}</td>
                            <td style={tdStyle}>{p.identificador || "—"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    )}
                </div>

                {showAdminProductos && (
                    <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                    >
                    <div
                        style={{
                        background: "white",
                        width: 980,
                        maxWidth: "95vw",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        borderRadius: 16,
                        padding: 16,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                            }}
                            >
                            <h3 style={{ margin: 0, color: "#1B75BC" }}>
                                Administrar productos - {selectedSemillero?.nombre}
                            </h3>

                            <button
                                type="button"
                                onClick={() => setShowAdminProductos(false)}
                                style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.15)",
                                background: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                                }}
                            >
                                ✕
                            </button>
                            </div>

                        {productoErr ? (
                        <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 8 }}>
                            {productoErr}
                        </div>
                        ) : null}

                        {productoMsg ? (
                        <div style={{ color: "#166534", fontWeight: 800, marginBottom: 8 }}>
                            {productoMsg}
                        </div>
                        ) : null}

                        <button
                        type="button"
                        onClick={() => setShowNuevoProducto((s) => !s)}
                        style={btnPrimary}
                        >
                        {showNuevoProducto ? "Cerrar formulario" : "Nuevo producto"}
                        </button>

                        {showNuevoProducto && (
                        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                            <input
                            placeholder="Título del producto"
                            value={nuevoProducto.titulo}
                            onChange={(e) =>
                                setNuevoProducto((s) => ({ ...s, titulo: e.target.value }))
                            }
                            style={inputStyle}
                            />

                            <select
                            value={nuevoProducto.tipo}
                            onChange={(e) =>
                                setNuevoProducto((s) => ({ ...s, tipo: e.target.value }))
                            }
                            style={inputStyle}
                            >
                            <option value="Póster">Póster</option>
                            <option value="Ponencia">Ponencia</option>
                            <option value="Artículo">Artículo</option>
                            <option value="Prototipo">Prototipo</option>
                            <option value="Informe">Informe</option>
                            <option value="Otro">Otro</option>
                            </select>

                            <select
                            value={nuevoProducto.estado}
                            onChange={(e) =>
                                setNuevoProducto((s) => ({ ...s, estado: e.target.value }))
                            }
                            style={inputStyle}
                            >
                            <option value="En proceso">En proceso</option>
                            <option value="Publicado">Publicado</option>
                            <option value="Registrado">Registrado</option>
                            </select>

                            <input
                            type="number"
                            value={nuevoProducto.anio}
                            onChange={(e) =>
                                setNuevoProducto((s) => ({ ...s, anio: e.target.value }))
                            }
                            style={inputStyle}
                            placeholder="Año"
                            />

                            <input
                            placeholder="Identificador (opcional)"
                            value={nuevoProducto.identificador}
                            onChange={(e) =>
                                setNuevoProducto((s) => ({ ...s, identificador: e.target.value }))
                            }
                            style={inputStyle}
                            />

                            <select
                            value={nuevoProducto.proyecto_semillero_id}
                            onChange={(e) =>
                                setNuevoProducto((s) => ({
                                ...s,
                                proyecto_semillero_id: e.target.value,
                                }))
                            }
                            style={inputStyle}
                            >
                            <option value="">Sin proyecto asociado</option>
                            {proyectosSemillero.map((p) => (
                                <option key={p._docId} value={p.id_proyecto_semillero}>
                                {p.id_proyecto_semillero} - {p.titulo}
                                </option>
                            ))}
                            </select>

                            <button onClick={guardarProducto} style={btnPrimary}>
                            Guardar producto
                            </button>
                        </div>
                        )}

                        <div style={{ marginTop: 20, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Título</th>
                                <th style={thStyle}>Estado</th>
                                <th style={thStyle}>Acción</th>
                            </tr>
                            </thead>
                            <tbody>
                            {productosSemillero.map((p) => (
                                <tr key={p._docId}>
                                <td style={tdStyle}>{p.id_producto_semillero || "—"}</td>
                                <td style={tdStyle}>{p.titulo || "—"}</td>
                                <td style={tdStyle}>{p.identificador || "—"}</td>
                                <td style={tdStyle}>
                                    <select
                                    value={p.estado || "En proceso"}
                                    onChange={(e) => cambiarEstadoProducto(p._docId, e.target.value)}
                                    style={{ ...inputStyle, padding: "8px 10px", maxWidth: 150 }}
                                    >
                                    <option value="En proceso">En proceso</option>
                                    <option value="Publicado">Publicado</option>
                                    <option value="Registrado">Registrado</option>
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <button
                                    type="button"
                                    onClick={() => eliminarProducto(p._docId)}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(220,38,38,0.25)",
                                        background: "rgba(220,38,38,0.08)",
                                        color: "#B91C1C",
                                        fontWeight: 900,
                                        cursor: "pointer",
                                    }}
                                    >
                                    Eliminar
                                    </button>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>

                        
                    </div>
                    </div>
                )}
                </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(45,156,219,0.18)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                    <h3 style={{ marginTop: 0, marginBottom: 4, color: "#1B75BC" }}>
                        Actividades del semillero
                    </h3>

                    <div style={{ fontSize: 13, color: "#4A5568" }}>
                        <b>Total:</b> {resumenActividades.total} |{" "}
                        <b>Realizadas:</b> {resumenActividades.realizadas} |{" "}
                        <b>Pendientes:</b> {resumenActividades.pendientes}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={() => setShowAdminActividades(true)}
                    style={btnPrimary}
                    >
                    Administrar actividades
                    </button>
                </div>

                <div style={{ marginTop: 14, overflowX: "auto" }}>
                    {actividadesSemillero.length === 0 ? (
                    <div style={{ color: "#666" }}>
                        No hay actividades registradas en este semillero.
                    </div>
                    ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                        <tr>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Actividad</th>
                            <th style={thStyle}>Tipo</th>
                            <th style={thStyle}>Fecha</th>
                            <th style={thStyle}>Estado</th>
                        </tr>
                        </thead>
                        <tbody>
                        {actividadesSemillero.map((a) => (
                            <tr key={a._docId}>
                            <td style={tdStyle}>{a.id_actividad_semillero || "—"}</td>
                            <td style={tdStyle}>{a.actividad || "—"}</td>
                            <td style={tdStyle}>{a.tipo || "—"}</td>
                            <td style={tdStyle}>{a.fecha || "—"}</td>
                            <td style={tdStyle}>{a.estado || "—"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    )}
                </div>

                {showAdminActividades && (
                    <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                    >
                    <div
                        style={{
                        background: "white",
                        width: 980,
                        maxWidth: "95vw",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        borderRadius: 16,
                        padding: 16,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                            }}
                            >
                            <h3 style={{ margin: 0, color: "#1B75BC" }}>
                                Administrar actividades - {selectedSemillero?.nombre}
                            </h3>

                            <button
                                type="button"
                                onClick={() => setShowAdminActividades(false)}
                                style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(0,0,0,0.15)",
                                background: "white",
                                fontWeight: 900,
                                cursor: "pointer",
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {actividadErr ? (
                        <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 8 }}>
                            {actividadErr}
                        </div>
                        ) : null}

                        {actividadMsg ? (
                        <div style={{ color: "#166534", fontWeight: 800, marginBottom: 8 }}>
                            {actividadMsg}
                        </div>
                        ) : null}

                        <button
                        type="button"
                        onClick={() => setShowNuevaActividad((s) => !s)}
                        style={btnPrimary}
                        >
                        {showNuevaActividad ? "Cerrar formulario" : "Nueva actividad"}
                        </button>

                        {showNuevaActividad && (
                        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                            <input
                            placeholder="Nombre de la actividad"
                            value={nuevaActividad.actividad}
                            onChange={(e) =>
                                setNuevaActividad((s) => ({ ...s, actividad: e.target.value }))
                            }
                            style={inputStyle}
                            />

                            <select
                            value={nuevaActividad.tipo}
                            onChange={(e) =>
                                setNuevaActividad((s) => ({ ...s, tipo: e.target.value }))
                            }
                            style={inputStyle}
                            >
                            <option value="Reunión">Reunión</option>
                            <option value="Taller">Taller</option>
                            <option value="Capacitación">Capacitación</option>
                            <option value="Socialización">Socialización</option>
                            <option value="Evento">Evento</option>
                            <option value="Otro">Otro</option>
                            </select>

                            <input
                            type="date"
                            value={nuevaActividad.fecha}
                            onChange={(e) =>
                                setNuevaActividad((s) => ({ ...s, fecha: e.target.value }))
                            }
                            style={inputStyle}
                            />

                            <textarea
                            placeholder="Descripción"
                            value={nuevaActividad.descripcion}
                            onChange={(e) =>
                                setNuevaActividad((s) => ({ ...s, descripcion: e.target.value }))
                            }
                            style={inputStyle}
                            />

                            <select
                            value={nuevaActividad.estado}
                            onChange={(e) =>
                                setNuevaActividad((s) => ({ ...s, estado: e.target.value }))
                            }
                            style={inputStyle}
                            >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Realizada">Realizada</option>
                            <option value="Cancelada">Cancelada</option>
                            </select>

                            <button onClick={guardarActividad} style={btnPrimary}>
                            Guardar actividad
                            </button>
                        </div>
                        )}

                        <div style={{ marginTop: 20, overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Actividad</th>
                                <th style={thStyle}>Estado</th>
                                <th style={thStyle}>Acción</th>
                            </tr>
                            </thead>
                            <tbody>
                            {actividadesSemillero.map((a) => (
                                <tr key={a._docId}>
                                <td style={tdStyle}>{a.id_actividad_semillero || "—"}</td>
                                <td style={tdStyle}>{a.actividad || "—"}</td>
                                <td style={tdStyle}>
                                    <select
                                    value={a.estado || "Pendiente"}
                                    onChange={(e) =>
                                        cambiarEstadoActividad(a._docId, e.target.value)
                                    }
                                    style={{ ...inputStyle, padding: "8px 10px", maxWidth: 160 }}
                                    >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="Realizada">Realizada</option>
                                    <option value="Cancelada">Cancelada</option>
                                    </select>
                                </td>
                                <td style={tdStyle}>
                                    <button
                                    type="button"
                                    onClick={() => eliminarActividad(a._docId)}
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(220,38,38,0.25)",
                                        background: "rgba(220,38,38,0.08)",
                                        color: "#B91C1C",
                                        fontWeight: 900,
                                        cursor: "pointer",
                                    }}
                                    >
                                    Eliminar
                                    </button>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>

                        
                    </div>
                    </div>
                )}
                </div>

        

          </>
        )}
      </div>

      


    </div>
  );
}