export default function ResumenEjecutivoGrupo({ data }) {
    const {
        investigadoresActivos = 0,
        productosTotales = 0,
        proyectosActivos = 0,
        categoriaGrupo = "A",
        productividadPromedio = 0,
        brechaA1 = 0,
    } = data || {};

    const cards = [
        {
            titulo: "Investigadores activos",
            valor: investigadoresActivos,
            subtitulo: "Capacidad operativa actual del grupo",
        },
        {
            titulo: "Productos totales",
            valor: productosTotales,
            subtitulo: "Producción científica consolidada",
        },
        {
            titulo: "Proyectos activos",
            valor: proyectosActivos,
            subtitulo: "Proyectos en ejecución",
        },
        {
            titulo: "Categoría del grupo",
            valor: categoriaGrupo,
            subtitulo: "Posición institucional actual",
        },
        {
            titulo: "Productividad promedio",
            valor: productividadPromedio,
            subtitulo: "Productos por investigador activo",
        },
        {
            titulo: "Brecha hacia A1",
            valor: brechaA1,
            subtitulo: "Meta pendiente estimada",
        },
    ];

    return (
        <section style={styles.wrapper}>
            <div style={styles.header}>
                <h3 style={styles.title}>Resumen Ejecutivo</h3>
                <div style={styles.badge}>Panel estratégico del grupo</div>
            </div>

            <div style={styles.grid}>
                {cards.map((item) => (
                    <div key={item.titulo} style={styles.card}>
                        <div style={styles.cardTitle}>{item.titulo}</div>
                        <div style={styles.cardValue}>{item.valor}</div>
                        <div style={styles.cardSubtitle}>{item.subtitulo}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

const styles = {
    wrapper: {
        background: "linear-gradient(135deg, #ffffff 0%, #f7fbff 100%)",
        border: "1px solid rgba(27,117,188,0.18)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 28px rgba(0,0,0,0.06)",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
    },
    title: {
        margin: 0,
        color: "#1B75BC",
        fontWeight: 900,
        fontSize: 22,
    },
    badge: {
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(27,117,188,0.10)",
        color: "#0F3E68",
        fontWeight: 800,
        fontSize: 12,
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
    },
    card: {
        borderRadius: 14,
        padding: 16,
        background: "#ffffff",
        border: "1px solid rgba(27,117,188,0.14)",
        boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: 800,
        color: "#4A5568",
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 30,
        fontWeight: 900,
        color: "#0F3E68",
        lineHeight: 1.1,
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600,
    },
};