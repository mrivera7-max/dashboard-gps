import aiGif from "../assets/ai.gif";

export default function BienvenidaDashboard({ resumen }) {
    const {
        investigadoresActivos = 0,
        productosTotales = 0,
        proyectosActivos = 0,
        categoriaGrupo = "A",
        productividadPromedio = 0,
        brechaA1 = 0,
    } = resumen || {};

    const cards = [
        { icono: "👥", valor: investigadoresActivos, label: "Investigadores activos" },
        { icono: "📄", valor: productosTotales, label: "Productos totales" },
        { icono: "🗂️", valor: proyectosActivos, label: "Proyectos activos" },
        { icono: "📈", valor: productividadPromedio, label: "Productividad promedio" },
        { icono: "🎯", valor: brechaA1, label: "Brecha hacia A1" },
    ];

    return (
        <div style={styles.wrapper}>
            <section style={styles.hero}>
                <div style={styles.left}>
                    <div style={styles.mini}>Inicio</div>
                    <h1 style={styles.title}>Bienvenido(a)</h1>
                    <p style={styles.subtitle}>
                        Visión rápida del estado actual del grupo y acceso a los módulos estratégicos del dashboard.
                    </p>

                    <div style={styles.badge}>
                        <span style={styles.badgeIcon}>🏅</span>
                        <span style={styles.badgeText}>Categoría actual:</span>
                        <span style={styles.badgeValue}>{categoriaGrupo}</span>
                    </div>
                </div>

                <div style={styles.right}>
                    <div style={styles.figureWrap}>
                        <div style={styles.figure}>
                            <div style={styles.figure}>
                                <img
                                    src={aiGif}
                                    alt="Inteligencia Artificial"
                                    style={styles.gif}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section style={styles.kpiSection}>
                <div style={styles.cardsRow}>
                    {cards.map((item) => (
                        <div key={item.label} style={styles.card}>
                            <div style={styles.cardIcon}>{item.icono}</div>
                            <div style={styles.cardValue}>{item.valor}</div>
                            <div style={styles.cardLabel}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

const styles = {
    wrapper: {
        display: "grid",
        gap: 18,
    },
    hero: {
        display: "grid",
        gridTemplateColumns: "1.3fr 0.7fr",
        gap: 18,
        alignItems: "center",
        background: "linear-gradient(135deg, #f8fbff 0%, #eef5fb 100%)",
        border: "1px solid rgba(27,117,188,0.10)",
        borderRadius: 22,
        padding: 26,
        overflow: "hidden",
        boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
    },
    left: {
        display: "grid",
        gap: 12,
    },
    mini: {
        fontSize: 13,
        fontWeight: 800,
        color: "#6B7280",
    },
    title: {
        margin: 0,
        color: "#1E3557",
        fontSize: 32,
        fontWeight: 900,
        lineHeight: 1.15,
    },
    subtitle: {
        margin: 0,
        color: "#4B5563",
        fontSize: 16,
        lineHeight: 1.6,
        maxWidth: 680,
        fontWeight: 500,
    },
    badge: {
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        width: "fit-content",
        padding: "12px 18px",
        borderRadius: 14,
        background: "linear-gradient(135deg, #2C6CB0 0%, #234F8E 100%)",
        color: "white",
        boxShadow: "0 10px 20px rgba(35,79,142,0.20)",
    },
    badgeIcon: {
        fontSize: 24,
    },
    badgeText: {
        fontSize: 15,
        fontWeight: 800,
    },
    badgeValue: {
        fontSize: 26,
        fontWeight: 900,
    },
    right: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    figureWrap: {
        width: 220,
        height: 220,
        borderRadius: "50%",
        background: "radial-gradient(circle at center, rgba(73,128,196,0.10) 0%, rgba(73,128,196,0.03) 60%, transparent 70%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    figure: {
        fontSize: 120,
        lineHeight: 1,
    },
    kpiSection: {
        background: "transparent",
    },
    cardsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: 14,
    },
    card: {
        background: "white",
        border: "1px solid rgba(15,62,104,0.08)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 6px 16px rgba(0,0,0,0.04)",
        textAlign: "center",
    },
    cardIcon: {
        fontSize: 34,
        padding: "18px 12px 10px",
        color: "#75839A",
    },
    cardValue: {
        fontSize: 26,
        fontWeight: 900,
        color: "#233B5E",
        padding: "4px 12px 10px",
        background: "#F5F7FA",
    },
    cardLabel: {
        padding: "12px 10px 14px",
        fontSize: 13,
        fontWeight: 800,
        color: "#2E3A4D",
    },

    gif: {
        width: 160,
        height: "auto",
        objectFit: "contain",
        filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.15))",
    },
};