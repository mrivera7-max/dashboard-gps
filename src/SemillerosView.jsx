import { useEffect, useState } from "react";
import SemillerosIndicadoresLider from "./components/SemillerosIndicadoresLider";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const cardStyle = {
  background: "white",
  border: "1px solid rgba(45,156,219,0.25)",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};

const labelStyle = {
  fontSize: 12.5,
  fontWeight: 900,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(45,156,219,0.30)",
  outline: "none",
  fontWeight: 700,
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

const btnSecondary = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(45,156,219,0.35)",
  background: "white",
  color: "#1B75BC",
  fontWeight: 900,
  cursor: "pointer",
};

export default function SemillerosView() {
  const [semilleros, setSemilleros] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [selectedSemilleroId, setSelectedSemilleroId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    id_semillero: "",
    nombre: "",
    estado: "activo",
    descripcion: "",
    linea_principal: "",
    docente_responsable_id: "",
    correo: "",
    link_asistencia: "",
    link_cvlac: "",
    lider_grupo_nombre: "",
    director_investigaciones_nombre: "",
  });

  const [mostrarIndicadores, setMostrarIndicadores] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "semilleros"),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ _docId: d.id, ...d.data() }))
          .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setSemilleros(data);
      },
      (e) => {
        console.error("[Semilleros] ERROR code:", e?.code);
        console.error("[Semilleros] ERROR message:", e?.message);
        setErr(e?.message || "Error leyendo semilleros.");
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "investigadores")),
      (snap) => {
        const data = snap.docs
          .map((d) => {
            const obj = d.data();
            return {
              _docId: d.id,
              ...obj,
              id: (obj.id_investigador || d.id || "").toString().trim(),
            };
          })
          .filter((inv) => inv.activo === true)
          .sort((a, b) => (a.apellidos || "").localeCompare(b.apellidos || ""));
        setIntegrantes(data);
      },
      (e) => {
        console.error(e);
        setErr("Error leyendo integrantes.");
      }
    );

    return () => unsub();
  }, []);

  const selectedSemillero =
    semilleros.find((s) => s._docId === selectedSemilleroId) || null;

  useEffect(() => {
    if (!selectedSemillero) return;

    setForm({
      id_semillero: selectedSemillero.id_semillero || selectedSemillero._docId || "",
      nombre: selectedSemillero.nombre || "",
      estado: selectedSemillero.estado || "activo",
      descripcion: selectedSemillero.descripcion || "",
      linea_principal: selectedSemillero.linea_principal || "",
      docente_responsable_id: selectedSemillero.docente_responsable_id || "",
      correo: selectedSemillero.correo || "",
      link_asistencia: selectedSemillero.link_asistencia || "",
      link_cvlac: selectedSemillero.link_cvlac || "",
      lider_grupo_nombre: selectedSemillero.lider_grupo_nombre || "",
      director_investigaciones_nombre:
        selectedSemillero.director_investigaciones_nombre || "",
    });
  }, [selectedSemillero]);

  const guardarSemillero = async () => {
    try {
      setErr("");
      setMsg("");

      const idSem = (form.id_semillero || "").trim().toUpperCase();
      const nombre = (form.nombre || "").trim();

      if (!idSem) {
        setErr("El ID del semillero es obligatorio.");
        return;
      }

      if (!nombre) {
        setErr("El nombre del semillero es obligatorio.");
        return;
      }

      const docente = integrantes.find(
        (x) =>
          String(x.id).trim() === String(form.docente_responsable_id || "").trim()
      );

      const docenteNombre = docente
        ? `${docente.nombres || ""} ${docente.apellidos || ""}`.trim()
        : "";

      await setDoc(
        doc(db, "semilleros", idSem),
        {
          id_semillero: idSem,
          nombre,
          estado: form.estado || "activo",
          descripcion: (form.descripcion || "").trim(),
          linea_principal: (form.linea_principal || "").trim(),
          docente_responsable_id: (form.docente_responsable_id || "").trim(),
          docente_responsable_nombre: docenteNombre,
          correo: (form.correo || "").trim(),
          link_asistencia: (form.link_asistencia || "").trim(),
          link_cvlac: (form.link_cvlac || "").trim(),
          lider_grupo_nombre: (form.lider_grupo_nombre || "").trim(),
          director_investigaciones_nombre:
            (form.director_investigaciones_nombre || "").trim(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMsg("Semillero guardado correctamente.");
      setSelectedSemilleroId(idSem);
    } catch (e) {
      console.error(e);
      setErr("Error guardando el semillero.");
    }
  };

  const eliminarSemillero = async (idSemillero) => {
    try {
      setErr("");
      setMsg("");

      if (!window.confirm("¿Eliminar este semillero?")) return;

      await deleteDoc(doc(db, "semilleros", idSemillero));

      setMsg("Semillero eliminado correctamente.");
      setSelectedSemilleroId("");
      setForm({
        id_semillero: "",
        nombre: "",
        estado: "activo",
        descripcion: "",
        linea_principal: "",
        docente_responsable_id: "",
        correo: "",
        link_asistencia: "",
        link_cvlac: "",
        lider_grupo_nombre: "",
        director_investigaciones_nombre: "",
      });
    } catch (e) {
      console.error(e);
      setErr("Error eliminando el semillero.");
    }
  };



  const limpiarFormulario = () => {
    setSelectedSemilleroId("");
    setForm({
      id_semillero: "",
      nombre: "",
      estado: "activo",
      descripcion: "",
      linea_principal: "",
      docente_responsable_id: "",
      correo: "",
      link_asistencia: "",
      link_cvlac: "",
      lider_grupo_nombre: "",
      director_investigaciones_nombre: "",
    });
    setErr("");
    setMsg("");
  };

  useEffect(() => {
    setMostrarIndicadores(false);
  }, [selectedSemilleroId]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 380px 1fr",
        gap: 16,
        alignItems: "start",
      }}
    >
      {/* COLUMNA 1: LISTA */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#1B75BC" }}>Semilleros</h3>

        <button
          type="button"
          onClick={limpiarFormulario}
          style={{ ...btnPrimary, width: "100%", marginBottom: 14 }}
        >
          Nuevo semillero
        </button>

        <div style={{ display: "grid", gap: 8 }}>
          {semilleros.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No hay semilleros registrados.</div>
          ) : (
            semilleros.map((sem) => (
              <button
                key={sem._docId}
                type="button"
                onClick={() => setSelectedSemilleroId(sem._docId)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px",
                  borderRadius: 12,
                  border:
                    selectedSemilleroId === sem._docId
                      ? "1px solid rgba(27,117,188,0.55)"
                      : "1px solid rgba(45,156,219,0.25)",
                  background:
                    selectedSemilleroId === sem._docId
                      ? "rgba(27,117,188,0.10)"
                      : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 900, color: "#111827" }}>
                  {sem.nombre || sem.id_semillero || sem._docId}
                </div>
                <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
                  ID: {sem.id_semillero || "—"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {sem.estado || "—"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* COLUMNA 2: FORMULARIO */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
          {selectedSemillero ? "Editar semillero" : "Crear semillero"}
        </h3>

        {err ? (
          <div style={{ color: "#b91c1c", fontWeight: 800, marginBottom: 8 }}>
            {err}
          </div>
        ) : null}

        {msg ? (
          <div style={{ color: "#166534", fontWeight: 800, marginBottom: 8 }}>
            {msg}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={labelStyle}>ID semillero</div>
            <input
              value={form.id_semillero}
              onChange={(e) =>
                setForm((s) => ({ ...s, id_semillero: e.target.value }))
              }
              style={inputStyle}
              placeholder="Ej: ZION"
            />
          </div>

          <div>
            <div style={labelStyle}>Nombre</div>
            <input
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              style={inputStyle}
              placeholder="Ej: Semillero ZION"
            />
          </div>

          <div>
            <div style={labelStyle}>Estado</div>
            <select
              value={form.estado}
              onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value }))}
              style={inputStyle}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div>
            <div style={labelStyle}>Línea principal</div>
            <input
              value={form.linea_principal}
              onChange={(e) =>
                setForm((s) => ({ ...s, linea_principal: e.target.value }))
              }
              style={inputStyle}
              placeholder="Ej: Procesamiento de Señales"
            />
          </div>

          <div>
            <div style={labelStyle}>Docente responsable</div>
            <select
              value={form.docente_responsable_id}
              onChange={(e) =>
                setForm((s) => ({ ...s, docente_responsable_id: e.target.value }))
              }
              style={inputStyle}
            >
              <option value="">Selecciona docente</option>
              {integrantes.map((inv) => (
                <option key={inv._docId} value={inv.id}>
                  {(inv.apellidos || "").trim()} {(inv.nombres || "").trim()} ({inv.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>Correo institucional</div>
            <input
              value={form.correo}
              onChange={(e) => setForm((s) => ({ ...s, correo: e.target.value }))}
              style={inputStyle}
              placeholder="Ej: zion@udi.edu.co"
            />
          </div>

          <div>
            <div style={labelStyle}>Descripción</div>
            <textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm((s) => ({ ...s, descripcion: e.target.value }))
              }
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
              placeholder="Describe el semillero"
            />
          </div>

          <button
            type="button"
            onClick={guardarSemillero}
            style={{ ...btnPrimary, width: "100%" }}
          >
            {selectedSemillero ? "Actualizar semillero" : "Guardar semillero"}
          </button>

          <button
            type="button"
            onClick={limpiarFormulario}
            style={{ ...btnSecondary, width: "100%" }}
          >
            Limpiar formulario
          </button>
        </div>
      </div>

      {/* COLUMNA 3: DETALLE */}
      <div style={{ ...cardStyle, minHeight: 420 }}>
        {!selectedSemillero ? (
          <div style={{ color: "#4b5563", lineHeight: 1.6 }}>
            Selecciona un semillero para ver su detalle. Aquí podrás visualizar
            la información general, responsable, estado y más adelante los
            indicadores del semillero.
          </div>
        ) : (
          <>
            <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
              {selectedSemillero.nombre || "Semillero"}
            </h3>

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <b>ID:</b> {selectedSemillero.id_semillero || "—"}
              </div>
              <div>
                <b>Estado:</b> {selectedSemillero.estado || "—"}
              </div>
              <div>
                <b>Línea principal:</b> {selectedSemillero.linea_principal || "—"}
              </div>
              <div>
                <b>Docente responsable:</b>{" "}
                {selectedSemillero.docente_responsable_nombre || "No asignado"}
              </div>
              <div>
                <b>Correo:</b> {selectedSemillero.correo || "—"}
              </div>
              <div>
                <b>Descripción:</b> {selectedSemillero.descripcion || "—"}
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid rgba(45,156,219,0.18)",
              }}
            >
              <h4 style={{ marginTop: 0, color: "#1B75BC" }}>Acciones</h4>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setMostrarIndicadores((v) => !v)}
                  style={btnSecondary}
                >
                  {mostrarIndicadores ? "Ocultar indicadores" : "Ver indicadores"}
                </button>

                <button
                  type="button"
                  onClick={() => eliminarSemillero(selectedSemillero._docId)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(220,38,38,0.4)",
                    background: "rgba(220,38,38,0.08)",
                    color: "#b91c1c",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Eliminar semillero
                </button>
              </div>

              {mostrarIndicadores && (
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(45,156,219,0.18)",
                  }}
                >
                  <h4 style={{ marginTop: 0, color: "#1B75BC" }}>
                    Indicadores del semillero
                  </h4>

                  <SemillerosIndicadoresLider
                    semilleroId={selectedSemillero?.id_semillero || ""}
                  />
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}