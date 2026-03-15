import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    LineChart,
    Line,
} from "recharts";
import { db } from "../firebaseConfig";

const cardStyle = {
    background: "white",
    border: "1px solid rgba(45,156,219,0.25)",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};

const colorProductoPorTipo = {
    "Artículo": "#1B75BC",
    "Ponencia": "#2D9CDB",
    "Póster": "#27AE60",
    "Prototipo": "#F39C12",
    "Informe": "#8E44AD",
    "Libro": "#E74C3C",
    "Capítulo de libro": "#16A085",
    "Software": "#D35400",
    "Otro": "#7F8C8D",
    "Sin tipo": "#95A5A6",
};

const colorActividadPorTipo = {
    "Reunión": "#1B75BC",
    "Taller": "#27AE60",
    "Capacitación": "#F39C12",
    "Socialización": "#8E44AD",
    "Evento": "#E74C3C",
    "Seminario": "#16A085",
    "Conferencia": "#D35400",
    "Otro": "#7F8C8D",
    "Sin tipo": "#95A5A6",
};

const thStyle = {
    textAlign: "left",
    padding: 8,
    borderBottom: "1px solid #eee",
};

const tdStyle = {
    padding: 8,
    borderBottom: "1px solid #f3f4f6",
};

function normalizar(v) {
    return String(v || "").trim().toLowerCase();
}

export default function SemillerosIndicadoresLider({ semilleroId = "" }) {
    const [semilleros, setSemilleros] = useState([]);
    const [proyectos, setProyectos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [actividades, setActividades] = useState([]);
    const [semilleristas, setSemilleristas] = useState([]);

    useEffect(() => {
        const unsubs = [];

        unsubs.push(
            onSnapshot(collection(db, "semilleros"), (snap) => {
                setSemilleros(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            })
        );

        unsubs.push(
            onSnapshot(collection(db, "semillero_proyectos"), (snap) => {
                setProyectos(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            })
        );

        unsubs.push(
            onSnapshot(collection(db, "semillero_productos"), (snap) => {
                setProductos(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            })
        );

        unsubs.push(
            onSnapshot(collection(db, "semillero_actividades"), (snap) => {
                setActividades(snap.docs.map((d) => ({ _docId: d.id, ...d.data() })));
            })
        );

        unsubs.push(
            onSnapshot(collection(db, "semilleristas"), (snap) => {
                setSemilleristas(
                    snap.docs.map((d) => ({ _docId: d.id, ...d.data() }))
                );
            })
        );

        return () => unsubs.forEach((u) => u && u());
    }, []);

    const resumen = useMemo(() => {

        const proyectosFiltrados = proyectos.filter(
            (x) => x.semillero_id === semilleroId
        );

        const productosFiltrados = productos.filter(
            (x) => x.semillero_id === semilleroId
        );

        const actividadesFiltradas = actividades.filter(
            (x) => x.semillero_id === semilleroId
        );

        /* TOTALES */

        const proyectosTotales = proyectosFiltrados.length;

        const productosTotales = productosFiltrados.length;

        const actividadesTotales = actividadesFiltradas.length;

        /* INDICE PRODUCTIVIDAD */

        const indiceProductividad =
            proyectosTotales === 0
                ? 0
                : (productosTotales / proyectosTotales).toFixed(2);

        /* ---------------- PROYECTOS ---------------- */

        const proyectosActivos = proyectosFiltrados.filter(
            (x) => normalizar(x.estado) === "en ejecución"
        ).length;

        const proyectosFinalizados = proyectosFiltrados.filter(
            (x) => normalizar(x.estado) === "finalizado"
        ).length;


        /* ---------------- PRODUCTOS ---------------- */

        const productosPublicados = productosFiltrados.filter(
            (x) => normalizar(x.estado) === "publicado"
        ).length;

        const productosEnProceso = productosFiltrados.filter(
            (x) => normalizar(x.estado) === "en proceso"
        ).length;

        const productosRegistrados = productosFiltrados.filter(
            (x) => normalizar(x.estado) === "registrado"
        ).length;


        /* -------- PRODUCTOS POR TIPO -------- */

        const productosPorTipoMap = {};

        productosFiltrados.forEach((p) => {
            const tipo = p.tipo || "Sin tipo";
            productosPorTipoMap[tipo] =
                (productosPorTipoMap[tipo] || 0) + 1;
        });

        const productosPorTipo = Object.entries(productosPorTipoMap).map(
            ([tipo, total]) => ({
                tipo,
                total,
            })
        );


        /* -------- PRODUCTOS POR AÑO -------- */

        const productosPorAnioMap = {};

        productosFiltrados.forEach((p) => {
            const anio = p.anio || "Sin año";
            productosPorAnioMap[anio] = (productosPorAnioMap[anio] || 0) + 1;
        });

        const productosPorAnio = Object.entries(productosPorAnioMap)
            .map(([anio, total]) => ({
                anio,
                total,
            }))
            .sort((a, b) => a.anio - b.anio);


        /* -------- PRODUCTO PRINCIPAL -------- */

        const productoPrincipal =
            productosPorTipo.length > 0
                ? [...productosPorTipo].sort((a, b) => b.total - a.total)[0]
                : null;


        /* ---------------- ACTIVIDADES ---------------- */

        const actividadesRealizadas = actividadesFiltradas.filter(
            (x) => normalizar(x.estado) === "realizada"
        ).length;

        const actividadesPendientes = actividadesFiltradas.filter(
            (x) => normalizar(x.estado) === "pendiente"
        ).length;

        const actividadesCanceladas = actividadesFiltradas.filter(
            (x) => normalizar(x.estado) === "cancelada"
        ).length;


        /* -------- ACTIVIDADES POR TIPO -------- */

        const actividadesPorTipoMap = {};

        actividadesFiltradas.forEach((a) => {
            const tipo = a.tipo || "Sin tipo";
            actividadesPorTipoMap[tipo] =
                (actividadesPorTipoMap[tipo] || 0) + 1;
        });

        const actividadesPorTipo = Object.entries(actividadesPorTipoMap).map(
            ([tipo, total]) => ({
                tipo,
                total,
            })
        );


        /* -------- ACTIVIDAD PRINCIPAL -------- */

        const actividadPrincipal =
            actividadesPorTipo.length > 0
                ? [...actividadesPorTipo].sort((a, b) => b.total - a.total)[0]
                : null;


        return {
            proyectosFiltrados,
            productosFiltrados,
            actividadesFiltradas,

            proyectosTotales,
            proyectosActivos,
            proyectosFinalizados,

            productosTotales,
            productosPublicados,
            productosEnProceso,
            productosRegistrados,

            indiceProductividad,

            productosPorTipo,
            productosPorAnio,
            productoPrincipal,

            actividadesTotales,
            actividadesRealizadas,
            actividadesPendientes,
            actividadesCanceladas,

            actividadesPorTipo,
            actividadPrincipal,
        };

    }, [proyectos, productos, actividades, semilleristas, semilleroId]);

    if (!semilleroId) {
        return (
            <div style={{ color: "#6B7280" }}>
                Selecciona un semillero para visualizar sus indicadores.
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* KPIs */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(140px, 1fr))",
                    gap: 12,
                }}
            >
                <div style={cardStyle}>
                    <div style={{ fontSize: 13, color: "#4B5563" }}>
                        Proyectos
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#1B75BC" }}>
                        {resumen.proyectosTotales}
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 13, color: "#4B5563" }}>
                        Productos
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#1B75BC" }}>
                        {resumen.productosTotales}
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 13, color: "#4B5563" }}>
                        Actividades
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#1B75BC" }}>
                        {resumen.actividadesTotales}
                    </div>
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 13, color: "#4B5563" }}>
                        Índice productividad
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#27AE60" }}>
                        {resumen.indiceProductividad}
                    </div>
                </div>
            </div>

            {/* Gráficas */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: 16,
                }}
            >
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
                        Productos por tipo
                    </h3>

                    {resumen.productosPorTipo.length === 0 ? (
                        <div style={{ color: "#6B7280" }}>
                            No hay productos registrados por tipo.
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={resumen.productosPorTipo}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="tipo" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="total">
                                        {resumen.productosPorTipo.map((entry, index) => (
                                            <Cell
                                                key={`prod-tipo-${index}`}
                                                fill={getColorProducto(entry.tipo)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {resumen.productosPorTipo.map((item, i) => (
                            <div
                                key={`legend-prod-${i}`}
                                style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <span
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 999,
                                        background: getColorProducto(item.tipo),
                                        display: "inline-block",
                                    }}
                                />
                                <span style={{ fontSize: 13 }}>{item.tipo}</span>
                            </div>
                        ))}
                    </div>

                </div>

                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
                        Actividades por tipo
                    </h3>

                    {resumen.actividadesPorTipo.length === 0 ? (
                        <div style={{ color: "#6B7280" }}>
                            No hay actividades registradas por tipo.
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart data={resumen.actividadesPorTipo}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="tipo" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="total">
                                        {resumen.actividadesPorTipo.map((entry, index) => (
                                            <Cell
                                                key={`act-tipo-${index}`}
                                                fill={getColorActividad(entry.tipo)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {resumen.actividadesPorTipo.map((item, i) => (
                            <div
                                key={`legend-act-${i}`}
                                style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <span
                                    style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 999,
                                        background: getColorActividad(item.tipo),
                                        display: "inline-block",
                                    }}
                                />
                                <span style={{ fontSize: 13 }}>{item.tipo}</span>
                            </div>
                        ))}
                    </div>

                </div>


                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
                        Evolución de productos por año
                    </h3>

                    {resumen.productosPorAnio.length === 0 ? (
                        <div style={{ color: "#6B7280" }}>
                            No hay productos registrados por año.
                        </div>
                    ) : (
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer>
                                <LineChart data={resumen.productosPorAnio}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="anio" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#8E44AD"
                                        strokeWidth={3}
                                        dot={{ r: 5 }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

            </div>

            {/* Tabla proyectos */}
            <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
                    Proyectos del semillero
                </h3>

                <div style={{ marginTop: 10, fontSize: 13, color: "#4A5568" }}>
                    <b>Total:</b> {resumen.proyectosTotales} |{" "}
                    <b>En ejecución:</b> {resumen.proyectosActivos} |{" "}
                    <b>Finalizados:</b> {resumen.proyectosFinalizados}
                </div>

                <div style={{ overflowX: "auto" }}>
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
                            {resumen.proyectosFiltrados.length === 0 ? (
                                <tr>
                                    <td style={tdStyle} colSpan={4}>
                                        No hay proyectos registrados.
                                    </td>
                                </tr>
                            ) : (
                                resumen.proyectosFiltrados.map((p) => (
                                    <tr key={p._docId}>
                                        <td style={tdStyle}>{p.id_proyecto_semillero || "—"}</td>
                                        <td style={tdStyle}>{p.titulo || "—"}</td>
                                        <td style={tdStyle}>{p.anio || "—"}</td>
                                        <td style={tdStyle}>{p.estado || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tabla productos */}
            <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
                    Productos del semillero
                </h3>

                <div style={{ marginTop: 10, fontSize: 13, color: "#4A5568" }}>
                    <b>Total:</b> {resumen.productosTotales} |{" "}
                    <b>Publicados:</b> {resumen.productosPublicados} |{" "}
                    <b>En proceso:</b> {resumen.productosEnProceso} |{" "}
                    <b>Registrados:</b> {resumen.productosRegistrados}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "#4A5568" }}>
                    <b>Tipo principal:</b> {resumen.productoPrincipal?.tipo || "—"} |{" "}
                    <b>Cantidad:</b> {resumen.productoPrincipal?.total || 0}
                </div>



                <div style={{ overflowX: "auto" }}>
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
                            {resumen.productosFiltrados.length === 0 ? (
                                <tr>
                                    <td style={tdStyle} colSpan={6}>
                                        No hay productos registrados.
                                    </td>
                                </tr>
                            ) : (
                                resumen.productosFiltrados.map((p) => (
                                    <tr key={p._docId}>
                                        <td style={tdStyle}>{p.id_producto_semillero || "—"}</td>
                                        <td style={tdStyle}>{p.titulo || "—"}</td>
                                        <td style={tdStyle}>{p.tipo || "—"}</td>
                                        <td style={tdStyle}>{p.anio || "—"}</td>
                                        <td style={tdStyle}>{p.estado || "—"}</td>
                                        <td style={tdStyle}>{p.identificador || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tabla actividades */}
            <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: "#1B75BC" }}>
                    Actividades del semillero
                </h3>

                <div style={{ marginTop: 10, fontSize: 13, color: "#4A5568" }}>
                    <b>Total:</b> {resumen.actividadesTotales} |{" "}
                    <b>Realizadas:</b> {resumen.actividadesRealizadas} |{" "}
                    <b>Pendientes:</b> {resumen.actividadesPendientes} |{" "}
                    <b>Canceladas:</b> {resumen.actividadesCanceladas}
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "#4A5568" }}>
                    <b>Tipo principal:</b> {resumen.actividadPrincipal?.tipo || "—"} |{" "}
                    <b>Cantidad:</b> {resumen.actividadPrincipal?.total || 0}
                </div>

                <div style={{ overflowX: "auto" }}>
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
                            {resumen.actividadesFiltradas.length === 0 ? (
                                <tr>
                                    <td style={tdStyle} colSpan={5}>
                                        No hay actividades registradas.
                                    </td>
                                </tr>
                            ) : (
                                resumen.actividadesFiltradas.map((a) => (
                                    <tr key={a._docId}>
                                        <td style={tdStyle}>{a.id_actividad_semillero || "—"}</td>
                                        <td style={tdStyle}>{a.actividad || "—"}</td>
                                        <td style={tdStyle}>{a.tipo || "—"}</td>
                                        <td style={tdStyle}>{a.fecha || "—"}</td>
                                        <td style={tdStyle}>{a.estado || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    function getColorProducto(tipo) {
        return colorProductoPorTipo[String(tipo || "Sin tipo").trim()] || "#95A5A6";
    }

    function getColorActividad(tipo) {
        return colorActividadPorTipo[String(tipo || "Sin tipo").trim()] || "#95A5A6";
    }

}