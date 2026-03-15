import React, { useMemo, useState } from "react";

const CUARTILES = {
    grupo: {
        q4: 0.5615702596158825,
        q3: 1.0751281522065663,
        q2: 1.8786025312610932,
        max: 6.142451056332907,
    },
    top: {
        q4: 471.4881631826182,
        q3: 1138.67155313629,
        q2: 2155.9811590330055,
        max: 7098.217270487773,
    },
    tipoA: {
        q4: 257.4906625578987,
        q3: 535.9773493602333,
        q2: 1049.0718015725406,
        max: 7103.926101967456,
    },
    tipoB: {
        q4: 51.017099779008745,
        q3: 159.9691282428318,
        q2: 420.02151644572933,
        max: 3539.9083840581,
    },
    asc: {
        q4: 364.64311358790917,
        q3: 940.0072584914712,
        q2: 1941.5578343164498,
        max: 8968.26371522207,
    },
    divulgacion: {
        q4: 364.64311358790917,
        q3: 940.0072584914712,
        q2: 1941.5578343164498,
        max: 15687.466660609422,
    },
    formA: {
        q4: 235.0018146228678,
        q3: 376.0029033965885,
        q2: 684.2128240291044,
        max: 2480.015448803621,
    },
    formB: {
        q4: 435.33498303576266,
        q3: 769.8969742972657,
        q2: 1272.5632001596543,
        max: 4065.3264212517906,
    },
};

const DEFAULT_CONVOCATORIA = {
    nombreGrupo: "Grupo GPS",
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
};

const FACTORES_PRODUCTO = {
    top: 450,
    asc: 350,
    formA: 220,
    tipoA: 180,
};

const FACTORES_SIMULACION = {
    top: 280,
    tipoA: 180,
    asc: 350,
    div: 140,
    formA: 180,
    formB: 90,
};

const REGLAS_A1 = {
    minAsc: 1,
    minInvestigadoresCat: 5,
    minFormA: 1,
};

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function normalizarTexto(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function formatNumber(value, decimals = 2) {
    return safeNumber(value).toLocaleString("es-CO", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function formatInt(value) {
    return safeNumber(value).toLocaleString("es-CO", {
        maximumFractionDigits: 0,
    });
}

function clamp(value, min = 0, max = Number.POSITIVE_INFINITY) {
    return Math.max(min, Math.min(value, max));
}

function getBrecha(actual, objetivo) {
    return clamp(safeNumber(objetivo) - safeNumber(actual), 0);
}

function getCuartilLabel(valor, rangos) {
    const v = safeNumber(valor);
    if (v >= rangos.q2) return "Q2 o superior";
    if (v >= rangos.q3) return "Q3";
    if (v >= rangos.q4) return "Q4";
    if (v > 0) return "Por debajo de Q4";
    return "Sin indicador";
}

function contarPorCampo(lista, campo) {
    return (lista || []).reduce((acc, item) => {
        const key = item?.[campo] || "Sin dato";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function topEntries(obj, limit = 6) {
    return Object.entries(obj || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function getYearNow() {
    return new Date().getFullYear();
}

function sumarCategorias(obj, keys = []) {
    return keys.reduce((acc, key) => acc + safeNumber(obj?.[key]), 0);
}

export default function ProspectivaGrupo({
    convocatoria = DEFAULT_CONVOCATORIA,
    productos = [],
    proyectos = [],
    investigadores = [],
}) {
    const baseConvocatoria = { ...DEFAULT_CONVOCATORIA, ...convocatoria };

    const [escenario, setEscenario] = useState({
        nuevosTOP: 0,
        nuevosTipoA: 0,
        nuevosASC: 0,
        nuevosDIV: 0,
        nuevosFormA: 0,
        nuevosFormB: 0,
        nuevosIS: 0,
        nuevosIA: 0,
    });

    const analisisActual = useMemo(() => {
        const yearNow = getYearNow();
        const yearLimit = yearNow - 4;

        const productosValidos = (productos || []).filter(Boolean);
        const proyectosValidos = (proyectos || []).filter(Boolean);
        const investigadoresValidos = (investigadores || []).filter(Boolean);

        const productosPublicados = productosValidos.filter(
            (p) => normalizarTexto(p.estado_producto) === "publicado"
        );

        const productosUltimos5 = productosValidos.filter(
            (p) => safeNumber(p.anio) >= yearLimit
        );

        const proyectosActivos = proyectosValidos.filter((p) => {
            const estado = normalizarTexto(p.estado_proyecto);
            return (
                estado.includes("ejec") ||
                estado.includes("activo") ||
                estado.includes("vigente") ||
                estado.includes("curso")
            );
        });

        const proyectosFinalizados = proyectosValidos.filter((p) =>
            normalizarTexto(p.estado_proyecto).includes("final")
        );

        const investigadoresActivos = investigadoresValidos.filter(
            (i) => i.activo === true || normalizarTexto(i.estado_investigador) === "activo"
        );

        const categoriasInv = contarPorCampo(
            investigadoresActivos,
            "categoria_minciencias_investigador"
        );

        const productosPorCategoria = contarPorCampo(
            productosValidos,
            "categoria_minciencias_producto"
        );

        const productosPorTipo = contarPorCampo(productosValidos, "tipo_producto");
        const proyectosPorLinea = contarPorCampo(proyectosValidos, "linea_investigacion");

        const productividadPorInvestigador = investigadoresActivos.length
            ? productosValidos.length / investigadoresActivos.length
            : 0;

        const productosSinProyecto = productosValidos.filter(
            (p) => !p.proyecto_asociado_id
        ).length;

        const ascCount = sumarCategorias(productosPorCategoria, [
            "Apropiación Social",
            "Apropiación social",
            "Apropiación Social del Conocimiento",
            "Apropiacion Social",
            "Apropiacion Social del Conocimiento",
        ]);

        const divulgacionCount = sumarCategorias(productosPorCategoria, [
            "Divulgación pública ciencia",
            "Divulgación Pública de la Ciencia",
            "Divulgación pública de la ciencia",
            "Divulgacion Publica de la Ciencia",
        ]);

        const formacionCount = sumarCategorias(productosPorCategoria, [
            "Formación RRHH",
            "Formación de recurso humano",
            "Formacion RRHH",
            "Formacion de recurso humano",
        ]);

        const ncCount = sumarCategorias(productosPorCategoria, [
            "Nuevo Conocimiento",
            "Nuevo conocimiento",
        ]);

        const dtCount = sumarCategorias(productosPorCategoria, [
            "Desarrollo Tecnológico",
            "Desarrollo tecnologico",
            "Desarrollo Tecnológico e Innovación",
            "Desarrollo Tecnologico e Innovacion",
        ]);

        const seniorCount = safeNumber(categoriasInv["IS"]);
        const asociadoCount = safeNumber(categoriasInv["IA"]);
        const emeritoCount = safeNumber(categoriasInv["IE"]);

        const fortalezas = [];
        if (investigadoresActivos.length >= 8) {
            fortalezas.push("Existe una base amplia de investigadores activos.");
        }
        if (seniorCount + asociadoCount + emeritoCount > 0) {
            fortalezas.push("El grupo mantiene investigadores categorizados por MinCiencias.");
        }
        if (proyectosValidos.length >= 10) {
            fortalezas.push("Se observa una base histórica amplia de proyectos.");
        }
        if (productosValidos.length >= 30) {
            fortalezas.push("La producción acumulada del grupo es significativa.");
        }
        if (ncCount > 0) {
            fortalezas.push("Hay productos de nuevo conocimiento en el registro actual.");
        }

        let probabilidadSubirA1 = "Baja";
        if (
            investigadoresActivos.length >= 8 &&
            seniorCount + asociadoCount + emeritoCount >= 3 &&
            productosUltimos5.length >= 25 &&
            proyectosActivos.length >= 4 &&
            ascCount > 0
        ) {
            probabilidadSubirA1 = "Media";
        }

        if (
            investigadoresActivos.length >= 10 &&
            seniorCount + asociadoCount + emeritoCount >= 5 &&
            productosUltimos5.length >= 40 &&
            proyectosActivos.length >= 5 &&
            ascCount > 0 &&
            formacionCount >= 10
        ) {
            probabilidadSubirA1 = "Alta";
        }

        return {
            yearNow,
            productosValidos,
            productosPublicados,
            productosUltimos5,
            proyectosValidos,
            proyectosActivos,
            proyectosFinalizados,
            investigadoresValidos,
            investigadoresActivos,
            categoriasInv,
            productosPorCategoria,
            productosPorTipo,
            proyectosPorLinea,
            productividadPorInvestigador,
            productosSinProyecto,
            ascCount,
            divulgacionCount,
            formacionCount,
            ncCount,
            dtCount,
            seniorCount,
            asociadoCount,
            emeritoCount,
            fortalezas,
            probabilidadSubirA1,
        };
    }, [productos, proyectos, investigadores]);

    const comparativo = useMemo(() => {
        const deltaInvestigadoresCat =
            analisisActual.seniorCount +
            analisisActual.asociadoCount +
            analisisActual.emeritoCount -
            (safeNumber(baseConvocatoria.investigadoresSenior) +
                safeNumber(baseConvocatoria.investigadoresAsociados) +
                safeNumber(baseConvocatoria.investigadoresEmeritos));

        return {
            ascActualVsConv: analisisActual.ascCount - safeNumber(baseConvocatoria.asc),
            formacionActualVsConv:
                analisisActual.formacionCount -
                safeNumber(baseConvocatoria.formA) -
                safeNumber(baseConvocatoria.formB),
            investigadoresCatDelta: deltaInvestigadoresCat,
        };
    }, [analisisActual, baseConvocatoria]);

    const escenarioCalculado = useMemo(() => {
        const nuevosTOP = safeNumber(escenario.nuevosTOP);
        const nuevosTipoA = safeNumber(escenario.nuevosTipoA);
        const nuevosASC = safeNumber(escenario.nuevosASC);
        const nuevosDIV = safeNumber(escenario.nuevosDIV);
        const nuevosFormA = safeNumber(escenario.nuevosFormA);
        const nuevosFormB = safeNumber(escenario.nuevosFormB);
        const nuevosIS = safeNumber(escenario.nuevosIS);
        const nuevosIA = safeNumber(escenario.nuevosIA);

        const topEstimado =
            safeNumber(baseConvocatoria.top) + nuevosTOP * FACTORES_SIMULACION.top;

        const tipoAEstimado =
            safeNumber(baseConvocatoria.tipoA) +
            nuevosTipoA * FACTORES_SIMULACION.tipoA;

        const ascEstimado =
            safeNumber(baseConvocatoria.asc) + nuevosASC * FACTORES_SIMULACION.asc;

        const divEstimado =
            safeNumber(baseConvocatoria.divulgacion) +
            nuevosDIV * FACTORES_SIMULACION.div;

        const formAEstimado =
            safeNumber(baseConvocatoria.formA) +
            nuevosFormA * FACTORES_SIMULACION.formA;

        const formBEstimado =
            safeNumber(baseConvocatoria.formB) +
            nuevosFormB * FACTORES_SIMULACION.formB;

        const investigadoresCatEstimados =
            safeNumber(baseConvocatoria.investigadoresSenior) +
            safeNumber(baseConvocatoria.investigadoresAsociados) +
            safeNumber(baseConvocatoria.investigadoresEmeritos) +
            nuevosIS +
            nuevosIA;

        const indiceTop = topEstimado / CUARTILES.top.max;
        const indiceTipoA = tipoAEstimado / CUARTILES.tipoA.max;
        const indiceTipoB = safeNumber(baseConvocatoria.tipoB) / CUARTILES.tipoB.max;
        const indiceAsc = ascEstimado / CUARTILES.asc.max;
        const indiceDiv = divEstimado / CUARTILES.divulgacion.max;
        const indiceFormA = formAEstimado / CUARTILES.formA.max;
        const indiceFormB = formBEstimado / CUARTILES.formB.max;
        const indiceCoh =
            safeNumber(baseConvocatoria.cohesion) / 4.791666667;
        const indiceCol =
            safeNumber(baseConvocatoria.colaboracion) / 6.0;

        const indicadorEstimado =
            indiceTop * 3.7 +
            indiceTipoA * 2.3 +
            indiceTipoB * 0.4 +
            indiceAsc * 1.5 +
            indiceDiv * 0.5 +
            indiceFormA * 1.0 +
            indiceFormB * 0.2 +
            indiceCoh * 0.1 +
            indiceCol * 0.3;

        const bloqueos = [];

        if (nuevosASC <= 0 && safeNumber(baseConvocatoria.asc) <= 0) {
            bloqueos.push("Sin productos ASC, no se puede proyectar A1.");
        }

        if (investigadoresCatEstimados < REGLAS_A1.minInvestigadoresCat) {
            bloqueos.push("Se requieren más investigadores categorizados.");
        }

        if (formAEstimado <= 0) {
            bloqueos.push("Debe existir formación de recurso humano tipo A.");
        }

        let categoriaEstimada = "A (estimada)";
        if (bloqueos.length === 0 && indicadorEstimado >= CUARTILES.grupo.q2) {
            categoriaEstimada = "A1 (potencial)";
        }

        return {
            topEstimado,
            tipoAEstimado,
            ascEstimado,
            divEstimado,
            formAEstimado,
            formBEstimado,
            investigadoresCatEstimados,
            indicadorEstimado,
            brechaQ2: getBrecha(indicadorEstimado, CUARTILES.grupo.q2),
            categoriaEstimada,
            bloqueos,
        };
    }, [escenario, baseConvocatoria]);

    const brechasConvocatoria = useMemo(() => {
        return [
            {
                nombre: "Indicador de grupo",
                actual: safeNumber(baseConvocatoria.indicadorGrupo),
                requerido: CUARTILES.grupo.q2,
                brecha: getBrecha(baseConvocatoria.indicadorGrupo, CUARTILES.grupo.q2),
                cuartil: getCuartilLabel(baseConvocatoria.indicadorGrupo, CUARTILES.grupo),
            },
            {
                nombre: "Nuevo Conocimiento TOP",
                actual: safeNumber(baseConvocatoria.top),
                requerido: CUARTILES.top.q2,
                brecha: getBrecha(baseConvocatoria.top, CUARTILES.top.q2),
                cuartil: getCuartilLabel(baseConvocatoria.top, CUARTILES.top),
            },
            {
                nombre: "Nuevo Conocimiento Tipo A",
                actual: safeNumber(baseConvocatoria.tipoA),
                requerido: CUARTILES.tipoA.q2,
                brecha: getBrecha(baseConvocatoria.tipoA, CUARTILES.tipoA.q2),
                cuartil: getCuartilLabel(baseConvocatoria.tipoA, CUARTILES.tipoA),
            },
            {
                nombre: "Apropiación Social del Conocimiento",
                actual: safeNumber(baseConvocatoria.asc),
                requerido: CUARTILES.asc.q3,
                brecha: getBrecha(baseConvocatoria.asc, CUARTILES.asc.q3),
                cuartil: getCuartilLabel(baseConvocatoria.asc, CUARTILES.asc),
            },
            {
                nombre: "Divulgación Pública de la Ciencia",
                actual: safeNumber(baseConvocatoria.divulgacion),
                requerido: CUARTILES.divulgacion.q2,
                brecha: getBrecha(baseConvocatoria.divulgacion, CUARTILES.divulgacion.q2),
                cuartil: getCuartilLabel(baseConvocatoria.divulgacion, CUARTILES.divulgacion),
            },
            {
                nombre: "Formación de Recurso Humano Tipo A",
                actual: safeNumber(baseConvocatoria.formA),
                requerido: CUARTILES.formA.q2,
                brecha: getBrecha(baseConvocatoria.formA, CUARTILES.formA.q2),
                cuartil: getCuartilLabel(baseConvocatoria.formA, CUARTILES.formA),
            },
            {
                nombre: "Formación de Recurso Humano Tipo B",
                actual: safeNumber(baseConvocatoria.formB),
                requerido: CUARTILES.formB.q2,
                brecha: getBrecha(baseConvocatoria.formB, CUARTILES.formB.q2),
                cuartil: getCuartilLabel(baseConvocatoria.formB, CUARTILES.formB),
            },
        ];
    }, [baseConvocatoria]);

    const productosNecesariosA1 = useMemo(() => {
        const brechaTop = getBrecha(baseConvocatoria.top, CUARTILES.top.q2);
        const brechaTipoA = getBrecha(baseConvocatoria.tipoA, CUARTILES.tipoA.q2);
        const brechaAsc = safeNumber(baseConvocatoria.asc) <= 0
            ? CUARTILES.asc.q3
            : getBrecha(baseConvocatoria.asc, CUARTILES.asc.q3);
        const brechaFormA = getBrecha(baseConvocatoria.formA, CUARTILES.formA.q2);

        const faltanTOP = Math.ceil(brechaTop / FACTORES_PRODUCTO.top);
        const faltanTipoA = Math.ceil(brechaTipoA / FACTORES_PRODUCTO.tipoA);
        const faltanASC = Math.ceil(brechaAsc / FACTORES_PRODUCTO.asc);
        const faltanFormA = Math.ceil(brechaFormA / FACTORES_PRODUCTO.formA);

        const acciones = [];

        if (safeNumber(baseConvocatoria.asc) <= 0) {
            acciones.push({
                prioridad: "Alta",
                tipo: "ASC",
                faltan: Math.max(1, faltanASC),
                texto: `Faltan aproximadamente ${Math.max(1, faltanASC)} productos de Apropiación Social del Conocimiento.`,
            });
        }

        if (brechaTop > 0) {
            acciones.push({
                prioridad: "Alta",
                tipo: "TOP",
                faltan: Math.max(1, faltanTOP),
                texto: `Faltan aproximadamente ${Math.max(1, faltanTOP)} productos TOP.`,
            });
        }

        if (brechaFormA > 0) {
            acciones.push({
                prioridad: "Alta",
                tipo: "Formación A",
                faltan: Math.max(1, faltanFormA),
                texto: `Faltan aproximadamente ${Math.max(1, faltanFormA)} productos de Formación A.`,
            });
        }

        if (brechaTipoA > 0) {
            acciones.push({
                prioridad: "Media",
                tipo: "Tipo A",
                faltan: Math.max(1, faltanTipoA),
                texto: `Faltan aproximadamente ${Math.max(1, faltanTipoA)} productos de Nuevo Conocimiento Tipo A.`,
            });
        }

        return {
            brechaTop,
            brechaTipoA,
            brechaAsc,
            brechaFormA,
            faltanTOP,
            faltanTipoA,
            faltanASC,
            faltanFormA,
            acciones,
        };
    }, [baseConvocatoria]);

    const recomendaciones = useMemo(() => {
        const rec = [];

        const brechaTop = getBrecha(baseConvocatoria.top, CUARTILES.top.q2);
        const brechaTipoA = getBrecha(baseConvocatoria.tipoA, CUARTILES.tipoA.q2);
        const brechaAsc =
            safeNumber(baseConvocatoria.asc) <= 0
                ? CUARTILES.asc.q3
                : getBrecha(baseConvocatoria.asc, CUARTILES.asc.q3);
        const brechaFormA = getBrecha(baseConvocatoria.formA, CUARTILES.formA.q2);

        const faltanTOP = Math.ceil(brechaTop / FACTORES_PRODUCTO.top);
        const faltanTipoA = Math.ceil(brechaTipoA / FACTORES_PRODUCTO.tipoA);
        const faltanASC = Math.ceil(brechaAsc / FACTORES_PRODUCTO.asc);
        const faltanFormA = Math.ceil(brechaFormA / FACTORES_PRODUCTO.formA);

        if (analisisActual.ascCount <= 0) {
            rec.push({
                prioridad: "Alta",
                accion: `Generar y registrar aproximadamente ${Math.max(
                    1,
                    faltanASC
                )} productos de Apropiación Social del Conocimiento.`,
                impacto:
                    "Cierra una de las brechas más críticas observadas en la última convocatoria.",
                foco: "Apropiación social",
            });
        }

        if (safeNumber(baseConvocatoria.top) < CUARTILES.top.q2) {
            rec.push({
                prioridad: "Alta",
                accion: `Priorizar aproximadamente ${Math.max(
                    1,
                    faltanTOP
                )} productos TOP con alto potencial de impacto.`,
                impacto:
                    "Ayuda a cerrar la brecha histórica del componente TOP frente al umbral Q2.",
                foco: "Nuevo conocimiento TOP",
            });
        }

        if (analisisActual.formacionCount < 5 || brechaFormA > 0) {
            rec.push({
                prioridad: "Alta",
                accion: `Incrementar aproximadamente ${Math.max(
                    1,
                    faltanFormA
                )} productos de Formación de Recurso Humano Tipo A.`,
                impacto:
                    "Fortalece el componente de formación avanzada y mejora la proyección del grupo.",
                foco: "Formación RRHH",
            });
        }

        if (brechaTipoA > 0) {
            rec.push({
                prioridad: "Media",
                accion: `Fortalecer aproximadamente ${Math.max(
                    1,
                    faltanTipoA
                )} productos de Nuevo Conocimiento Tipo A.`,
                impacto:
                    "Mejora el balance de producción científica y acerca al grupo al cuartil objetivo.",
                foco: "Nuevo conocimiento Tipo A",
            });
        }

        if (analisisActual.proyectosActivos.length < 3) {
            rec.push({
                prioridad: "Alta",
                accion:
                    "Formular o reactivar proyectos con potencial real de producir artículos, formación y apropiación social.",
                impacto:
                    "Aumenta la base futura de producción científica y tecnológica del grupo.",
                foco: "Proyectos",
            });
        }

        if (
            analisisActual.productosSinProyecto >
            Math.floor(analisisActual.productosValidos.length * 0.3)
        ) {
            rec.push({
                prioridad: "Media",
                accion: "Depurar la trazabilidad entre productos y proyectos asociados.",
                impacto:
                    "Mejora la consistencia del reporte, la lectura estratégica y la calidad del dato.",
                foco: "Calidad del dato",
            });
        }

        if (
            analisisActual.seniorCount +
            analisisActual.asociadoCount +
            analisisActual.emeritoCount <
            3
        ) {
            rec.push({
                prioridad: "Media",
                accion:
                    "Fortalecer la participación de investigadores categorizados y acompañar procesos de categorización.",
                impacto:
                    "Mejora la masa crítica del grupo y su capacidad de sostener mejores resultados.",
                foco: "Investigadores",
            });
        }

        if (analisisActual.productosUltimos5.length < 20) {
            rec.push({
                prioridad: "Media",
                accion:
                    "Concentrar esfuerzos en productos con alta probabilidad de cierre y publicación en el corto plazo.",
                impacto:
                    "Eleva la producción reciente y mejora la evidencia de actividad del grupo.",
                foco: "Producción reciente",
            });
        }

        if (analisisActual.ncCount > 0 && analisisActual.ascCount <= 0) {
            rec.push({
                prioridad: "Media",
                accion:
                    "Transformar resultados de investigación ya existentes en productos de apropiación o divulgación.",
                impacto:
                    "Permite aprovechar capacidades instaladas sin iniciar procesos desde cero.",
                foco: "Transferencia de resultados",
            });
        }

        if (rec.length === 0) {
            rec.push({
                prioridad: "Baja",
                accion:
                    "Mantener la estrategia actual y fortalecer el registro fino de productos para una prospectiva más precisa.",
                impacto:
                    "Conserva estabilidad operativa y prepara mejor al grupo para la siguiente medición.",
                foco: "Sostenimiento",
            });
        }

        return rec;
    }, [analisisActual, baseConvocatoria]);

    const handleScenarioChange = (field, value) => {
        setEscenario((prev) => ({
            ...prev,
            [field]: safeNumber(value),
        }));
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>Prospectiva estratégica del grupo</h2>
                    <p style={styles.subtitle}>
                        Comparación entre la última convocatoria oficial y el estado operativo actual del grupo.
                    </p>
                </div>
            </div>

            <div style={styles.gridTop}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Línea base oficial de convocatoria</h3>
                    <div style={styles.kpiGrid}>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Categoría oficial</span>
                            <strong style={styles.kpiValue}>{baseConvocatoria.categoriaActual}</strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Indicador grupo</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(baseConvocatoria.indicadorGrupo, 4)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Cuartil grupo</span>
                            <strong style={styles.kpiValue}>
                                {getCuartilLabel(baseConvocatoria.indicadorGrupo, CUARTILES.grupo)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>TOP</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(baseConvocatoria.top, 2)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>ASC</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(baseConvocatoria.asc, 2)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Formación A</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(baseConvocatoria.formA, 2)}
                            </strong>
                        </div>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Estado actual del dashboard</h3>
                    <div style={styles.kpiGrid}>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Productos actuales</span>
                            <strong style={styles.kpiValue}>
                                {formatInt(analisisActual.productosValidos.length)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Productos publicados</span>
                            <strong style={styles.kpiValue}>
                                {formatInt(analisisActual.productosPublicados.length)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Últimos 5 años</span>
                            <strong style={styles.kpiValue}>
                                {formatInt(analisisActual.productosUltimos5.length)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Proyectos activos</span>
                            <strong style={styles.kpiValue}>
                                {formatInt(analisisActual.proyectosActivos.length)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Investigadores activos</span>
                            <strong style={styles.kpiValue}>
                                {formatInt(analisisActual.investigadoresActivos.length)}
                            </strong>
                        </div>
                        <div style={styles.kpiBox}>
                            <span style={styles.kpiLabel}>Probabilidad operativa A1</span>
                            <strong
                                style={{
                                    ...styles.kpiValue,
                                    color:
                                        analisisActual.probabilidadSubirA1 === "Alta"
                                            ? "#15803d"
                                            : analisisActual.probabilidadSubirA1 === "Media"
                                                ? "#b45309"
                                                : "#b91c1c",
                                }}
                            >
                                {analisisActual.probabilidadSubirA1}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Brechas históricas de convocatoria</h3>
                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Indicador</th>
                                <th style={styles.th}>Oficial</th>
                                <th style={styles.th}>Objetivo</th>
                                <th style={styles.th}>Brecha</th>
                                <th style={styles.th}>Cuartil</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brechasConvocatoria.map((item) => (
                                <tr key={item.nombre}>
                                    <td style={styles.tdLeft}>{item.nombre}</td>
                                    <td style={styles.td}>{formatNumber(item.actual, 2)}</td>
                                    <td style={styles.td}>{formatNumber(item.requerido, 2)}</td>
                                    <td
                                        style={{
                                            ...styles.td,
                                            color: item.brecha > 0 ? "#b91c1c" : "#15803d",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {formatNumber(item.brecha, 2)}
                                    </td>
                                    <td style={styles.td}>{item.cuartil}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.gridMid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Comparación convocatoria vs estado actual</h3>
                    <div style={styles.subBlock}>
                        <div style={styles.rowLine}>
                            <span>ASC actual vs ASC oficial</span>
                            <strong
                                style={{
                                    color: comparativo.ascActualVsConv >= 0 ? "#15803d" : "#b91c1c",
                                }}
                            >
                                {comparativo.ascActualVsConv >= 0 ? "+" : ""}
                                {formatInt(comparativo.ascActualVsConv)}
                            </strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Formación actual vs formación oficial A+B</span>
                            <strong
                                style={{
                                    color: comparativo.formacionActualVsConv >= 0 ? "#15803d" : "#b91c1c",
                                }}
                            >
                                {comparativo.formacionActualVsConv >= 0 ? "+" : ""}
                                {formatInt(comparativo.formacionActualVsConv)}
                            </strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Investigadores categorizados actuales vs oficiales</span>
                            <strong
                                style={{
                                    color:
                                        comparativo.investigadoresCatDelta >= 0 ? "#15803d" : "#b91c1c",
                                }}
                            >
                                {comparativo.investigadoresCatDelta >= 0 ? "+" : ""}
                                {formatInt(comparativo.investigadoresCatDelta)}
                            </strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Productos actuales sin proyecto asociado</span>
                            <strong>{formatInt(analisisActual.productosSinProyecto)}</strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Productividad por investigador activo</span>
                            <strong>{formatNumber(analisisActual.productividadPorInvestigador, 2)}</strong>
                        </div>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Resumen</h3>
                    <ul style={styles.summaryList}>
                        <li>
                            La última convocatoria dejó al grupo en categoría{" "}
                            <strong>{baseConvocatoria.categoriaActual}</strong> con indicador{" "}
                            <strong>{formatNumber(baseConvocatoria.indicadorGrupo, 4)}</strong>.
                        </li>
                        <li>
                            La principal brecha histórica sigue siendo <strong>ASC</strong>,
                            seguida de <strong>TOP</strong> y <strong>Formación A</strong>.
                        </li>
                        <li>
                            El estado actual muestra{" "}
                            <strong>{formatInt(analisisActual.proyectosActivos.length)}</strong>{" "}
                            proyectos activos y{" "}
                            <strong>{formatInt(analisisActual.investigadoresActivos.length)}</strong>{" "}
                            investigadores activos.
                        </li>
                        <li>
                            La lectura prospectiva actual es{" "}
                            <strong>{analisisActual.probabilidadSubirA1}</strong>.
                        </li>
                    </ul>
                </div>
            </div>

            <div style={styles.gridMid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Acciones recomendadas</h3>
                    <div style={styles.recoWrap}>
                        {recomendaciones.map((rec, idx) => (
                            <div key={`${rec.accion}-${idx}`} style={styles.recoCard}>
                                <div
                                    style={{
                                        ...styles.badge,
                                        background:
                                            rec.prioridad === "Alta"
                                                ? "#fee2e2"
                                                : rec.prioridad === "Media"
                                                    ? "#fef3c7"
                                                    : "#dcfce7",
                                        color:
                                            rec.prioridad === "Alta"
                                                ? "#b91c1c"
                                                : rec.prioridad === "Media"
                                                    ? "#92400e"
                                                    : "#166534",
                                    }}
                                >
                                    {rec.prioridad}
                                </div>

                                <div>
                                    <div style={styles.recoTitle}>{rec.accion}</div>
                                    <div style={styles.recoText}>
                                        <strong>Foco:</strong> {rec.foco}
                                    </div>
                                    <div style={styles.recoText}>
                                        <strong>Impacto esperado:</strong> {rec.impacto}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Fortalezas observadas</h3>
                    <div style={styles.checkList}>
                        {analisisActual.fortalezas.length === 0 ? (
                            <CheckItem
                                ok={false}
                                label="Aún no se identifican fortalezas estructurales claras."
                            />
                        ) : (
                            analisisActual.fortalezas.map((item, idx) => (
                                <CheckItem key={`${item}-${idx}`} ok={true} label={item} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div style={styles.gridMid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Distribución actual</h3>

                    <div style={styles.subBlock}>
                        <div style={styles.subTitle}>Productos por categoría</div>
                        {topEntries(analisisActual.productosPorCategoria, 6).map(([k, v]) => (
                            <div key={k} style={styles.rowLine}>
                                <span>{k}</span>
                                <strong>{formatInt(v)}</strong>
                            </div>
                        ))}
                    </div>

                    <div style={styles.subBlock}>
                        <div style={styles.subTitle}>Proyectos por línea</div>
                        {topEntries(analisisActual.proyectosPorLinea, 6).map(([k, v]) => (
                            <div key={k} style={styles.rowLine}>
                                <span>{k}</span>
                                <strong>{formatInt(v)}</strong>
                            </div>
                        ))}
                    </div>

                    <div style={styles.subBlock}>
                        <div style={styles.subTitle}>Investigadores activos por categoría</div>
                        {topEntries(analisisActual.categoriasInv, 6).map(([k, v]) => (
                            <div key={k} style={styles.rowLine}>
                                <span>{k}</span>
                                <strong>{formatInt(v)}</strong>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Simulador simple</h3>
                    <p style={styles.subtitle}>
                        Esta simulación es orientativa y no reemplaza la medición oficial.
                    </p>

                    <div style={styles.simGrid2}>
                        <ScenarioInput
                            label="Nuevos productos TOP"
                            value={escenario.nuevosTOP}
                            onChange={(v) => handleScenarioChange("nuevosTOP", v)}
                        />
                        <ScenarioInput
                            label="Nuevos productos Tipo A"
                            value={escenario.nuevosTipoA}
                            onChange={(v) => handleScenarioChange("nuevosTipoA", v)}
                        />
                        <ScenarioInput
                            label="Nuevos productos ASC"
                            value={escenario.nuevosASC}
                            onChange={(v) => handleScenarioChange("nuevosASC", v)}
                        />
                        <ScenarioInput
                            label="Nuevos productos Divulgación"
                            value={escenario.nuevosDIV}
                            onChange={(v) => handleScenarioChange("nuevosDIV", v)}
                        />
                        <ScenarioInput
                            label="Nuevos productos Formación A"
                            value={escenario.nuevosFormA}
                            onChange={(v) => handleScenarioChange("nuevosFormA", v)}
                        />
                        <ScenarioInput
                            label="Nuevos productos Formación B"
                            value={escenario.nuevosFormB}
                            onChange={(v) => handleScenarioChange("nuevosFormB", v)}
                        />
                        <ScenarioInput
                            label="Nuevos IS"
                            value={escenario.nuevosIS}
                            onChange={(v) => handleScenarioChange("nuevosIS", v)}
                        />
                        <ScenarioInput
                            label="Nuevos IA"
                            value={escenario.nuevosIA}
                            onChange={(v) => handleScenarioChange("nuevosIA", v)}
                        />
                    </div>

                    <div style={styles.resultBox}>
                        <div style={styles.resultItem}>
                            <span style={styles.kpiLabel}>Indicador estimado</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(escenarioCalculado.indicadorEstimado, 4)}
                            </strong>
                        </div>

                        <div style={styles.resultItem}>
                            <span style={styles.kpiLabel}>Brecha restante a Q2</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(escenarioCalculado.brechaQ2, 4)}
                            </strong>
                        </div>

                        <div style={styles.resultItem}>
                            <span style={styles.kpiLabel}>Categoría estimada</span>
                            <strong
                                style={{
                                    ...styles.kpiValue,
                                    color: escenarioCalculado.categoriaEstimada.includes("A1")
                                        ? "#15803d"
                                        : "#b45309",
                                }}
                            >
                                {escenarioCalculado.categoriaEstimada}
                            </strong>
                        </div>

                        <div style={styles.resultItem}>
                            <span style={styles.kpiLabel}>ASC estimado</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(escenarioCalculado.ascEstimado, 2)}
                            </strong>
                        </div>

                        <div style={styles.resultItem}>
                            <span style={styles.kpiLabel}>TOP estimado</span>
                            <strong style={styles.kpiValue}>
                                {formatNumber(escenarioCalculado.topEstimado, 2)}
                            </strong>
                        </div>

                        <div style={styles.resultItem}>
                            <span style={styles.kpiLabel}>Investigadores categorizados</span>
                            <strong style={styles.kpiValue}>
                                {formatInt(escenarioCalculado.investigadoresCatEstimados)}
                            </strong>
                        </div>
                    </div>

                    <div style={styles.card}>

                        <h3 style={styles.cardTitle}>Bloqueos críticos del escenario</h3>

                        {escenarioCalculado.bloqueos.length === 0 ? (
                            <div style={styles.recoCard}>
                                <div style={{ ...styles.badge, background: "#dcfce7", color: "#166534" }}>
                                    OK
                                </div>
                                <div>
                                    <div style={styles.recoTitle}>Sin bloqueos críticos detectados</div>
                                    <div style={styles.recoText}>
                                        El escenario propuesto cumple las condiciones mínimas consideradas en esta simulación.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.recoWrap}>
                                {escenarioCalculado.bloqueos.map((b, idx) => (
                                    <div key={`${b}-${idx}`} style={styles.recoCard}>
                                        <div style={{ ...styles.badge, background: "#fee2e2", color: "#b91c1c" }}>
                                            Crítico
                                        </div>
                                        <div>
                                            <div style={styles.recoTitle}>{b}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
}

function CheckItem({ ok, label }) {
    return (
        <div style={styles.checkItem}>
            <span
                style={{
                    ...styles.checkDot,
                    background: ok ? "#16a34a" : "#dc2626",
                }}
            />
            <span style={styles.checkText}>{label}</span>
        </div>
    );
}

function ScenarioInput({ label, value, onChange }) {
    return (
        <div style={styles.inputBox}>
            <label style={styles.inputLabel}>{label}</label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={styles.input}
            />
        </div>
    );
}

const styles = {
    wrapper: {
        width: "100%",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        margin: 0,
        fontSize: 24,
        fontWeight: 800,
        color: "#0f172a",
    },
    subtitle: {
        margin: "6px 0 0 0",
        color: "#475569",
        fontSize: 14,
        lineHeight: 1.5,
    },
    gridTop: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
    },
    gridMid: {
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: 16,
    },
    card: {
        background: "#ffffff",
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        padding: 16,
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)",
    },
    cardTitle: {
        margin: "0 0 14px 0",
        fontSize: 18,
        fontWeight: 700,
        color: "#0f172a",
    },
    kpiGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
    },
    kpiBox: {
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 12,
        background: "#f8fafc",
    },
    kpiLabel: {
        display: "block",
        fontSize: 12,
        color: "#64748b",
        marginBottom: 6,
    },
    kpiValue: {
        fontSize: 18,
        color: "#0f172a",
        fontWeight: 800,
    },
    summaryList: {
        margin: 0,
        paddingLeft: 18,
        color: "#334155",
        lineHeight: 1.7,
    },
    tableWrap: {
        width: "100%",
        overflowX: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14,
    },
    th: {
        textAlign: "center",
        padding: 10,
        background: "#e2e8f0",
        borderBottom: "1px solid #cbd5e1",
        color: "#0f172a",
        fontWeight: 700,
    },
    td: {
        textAlign: "center",
        padding: 10,
        borderBottom: "1px solid #e2e8f0",
        color: "#334155",
    },
    tdLeft: {
        textAlign: "left",
        padding: 10,
        borderBottom: "1px solid #e2e8f0",
        color: "#334155",
        fontWeight: 600,
    },
    recoWrap: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    recoCard: {
        display: "flex",
        gap: 12,
        padding: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        background: "#f8fafc",
        alignItems: "flex-start",
    },
    badge: {
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
    },
    recoTitle: {
        fontSize: 15,
        fontWeight: 700,
        color: "#0f172a",
        marginBottom: 4,
    },
    recoText: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 1.5,
    },
    checkList: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    checkItem: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid #f1f5f9",
    },
    checkDot: {
        width: 12,
        height: 12,
        borderRadius: "50%",
        flexShrink: 0,
    },
    checkText: {
        color: "#334155",
        fontSize: 14,
    },
    simGrid2: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
        marginTop: 12,
    },
    inputBox: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    inputLabel: {
        fontSize: 13,
        color: "#475569",
        fontWeight: 600,
    },
    input: {
        height: 40,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        padding: "0 12px",
        fontSize: 14,
        outline: "none",
        background: "#fff",
    },
    resultBox: {
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
    },
    resultItem: {
        border: "1px solid #dbeafe",
        background: "#eff6ff",
        borderRadius: 12,
        padding: 14,
    },
    subBlock: {
        marginBottom: 18,
    },
    subTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: "#334155",
        marginBottom: 8,
    },
    rowLine: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #f1f5f9",
        color: "#334155",
    },
};