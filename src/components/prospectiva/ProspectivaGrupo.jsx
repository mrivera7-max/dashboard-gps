import React, { useMemo, useState } from "react";

/**
 * IMPORTANTE
 * 1) Para evaluar A1 de forma estricta, agregue q1 en grupo y top.
 * 2) Si q1 no existe, el componente mostrará "A1 no verificable con esta línea base".
 * 3) Este módulo entrega una lectura interna de preparación, NO una clasificación oficial.
 */

const CUARTILES = {
    grupo: {
        // q1: 2.45, // <-- agregar cuando tenga el umbral real del área OCDE
        q2: 1.8786025312610932,
        q3: 1.0751281522065663,
        q4: 0.5615702596158825,
        max: 6.142451056332907,
    },
    top: {
        // q1: 2600, // <-- agregar cuando tenga el umbral real
        q2: 2155.9811590330055,
        q3: 1138.67155313629,
        q4: 471.4881631826182,
        max: 7098.217270487773,
    },
    tipoA: {
        q2: 1049.0718015725406,
        q3: 535.9773493602333,
        q4: 257.4906625578987,
        max: 7103.926101967456,
    },
    tipoB: {
        q2: 420.02151644572933,
        q3: 159.9691282428318,
        q4: 51.017099779008745,
        max: 3539.9083840581,
    },
    asc: {
        q2: 1941.5578343164498,
        q3: 940.0072584914712,
        q4: 364.64311358790917,
        max: 8968.26371522207,
    },
    divulgacion: {
        q2: 1941.5578343164498,
        q3: 940.0072584914712,
        q4: 364.64311358790917,
        max: 15687.466660609422,
    },
    formA: {
        q2: 684.2128240291044,
        q3: 376.0029033965885,
        q4: 235.0018146228678,
        max: 2480.015448803621,
    },
    formB: {
        q2: 1272.5632001596543,
        q3: 769.8969742972657,
        q4: 435.33498303576266,
        max: 4065.3264212517906,
    },
};

const DEFAULT_CONVOCATORIA = {
    nombreGrupo: "Grupo GPS",
    categoriaActual: "A",
    areaOCDE: "Ingeniería eléctrica, electrónica e informática",
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

const FACTORES_SIMULACION = {
    top: 280,
    tipoA: 180,
    asc: 350,
    div: 140,
    formA: 180,
    formB: 90,
};

function labelCategoriaInvestigador(value) {
    const v = String(value || "").trim().toUpperCase();

    if (v === "IE") return "Investigador Emérito (IE)";
    if (v === "IS") return "Investigador Sénior (IS)";
    if (v === "IA") return "Investigador Asociado (IA)";
    if (v === "IJ") return "Investigador Junior (IJ)";
    if (v === "SC") return "Sin categoría (SC)";
    return value || "Sin dato";
}

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

function topEntries(obj, limit = 6) {
    return Object.entries(obj || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function getYearNow() {
    return new Date().getFullYear();
}

function contarPorCampo(lista, campo) {
    return (lista || []).reduce((acc, item) => {
        const key = item?.[campo] || "Sin dato";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function sumarCategorias(obj, keys = []) {
    return keys.reduce((acc, key) => acc + safeNumber(obj?.[key]), 0);
}

function getCuartilLabel(valor, rangos) {
    const v = safeNumber(valor);
    if (rangos?.q1 && v >= rangos.q1) return "Cuartil 1 (Q1)";
    if (v >= rangos.q2) return "Cuartil 2 (Q2)";
    if (v >= rangos.q3) return "Cuartil 3 (Q3)";
    if (v >= rangos.q4) return "Cuartil 4 (Q4)";
    if (v > 0) return "Por debajo del cuartil 4 (Q4)";
    return "Sin indicador";
}

function getSemaforoByThreshold(value, good, medium) {
    const v = safeNumber(value);
    if (v >= good) return { label: "Fuerte", color: "#15803d", bg: "#dcfce7" };
    if (v >= medium) return { label: "Medio", color: "#b45309", bg: "#fef3c7" };
    return { label: "Crítico", color: "#b91c1c", bg: "#fee2e2" };
}

function normalizarCategoriaProducto(value) {
    const t = normalizarTexto(value);
    if (t.includes("nuevo conocimiento")) return "NC";
    if (t.includes("desarrollo tecnolog")) return "DTI";
    if (t.includes("apropiacion social")) return "ASC";
    if (t.includes("divulgacion")) return "DIV";
    if (t.includes("formacion")) return "FRH";
    return "OTRO";
}

function mesesEntre(a, b) {
    const da = new Date(a);
    const db = new Date(b);
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;
    return Math.abs((db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()));
}

function calcularEstabilidadNC(productos = []) {
    const nc = (productos || [])
        .filter((p) => normalizarCategoriaProducto(p.categoria_minciencias_producto) === "NC")
        .filter((p) => safeNumber(p.anio) > 0)
        .map((p) => {
            const anio = safeNumber(p.anio);
            const mes = clamp(safeNumber(p.mes) || 1, 1, 12);
            return {
                ...p,
                _fecha: new Date(anio, mes - 1, 1),
            };
        })
        .sort((a, b) => a._fecha - b._fecha);

    if (nc.length < 2) return { maxGapMeses: null, estado: "Sin datos suficientes" };

    let maxGapMeses = 0;
    for (let i = 0; i < nc.length - 1; i++) {
        const gap = mesesEntre(nc[i]._fecha, nc[i + 1]._fecha);
        if (gap !== null) maxGapMeses = Math.max(maxGapMeses, gap);
    }

    let estado = "Crítico";
    if (maxGapMeses <= 12) estado = "Fuerte";
    else if (maxGapMeses <= 24) estado = "Medio";

    return { maxGapMeses, estado };
}

function construirChecklistCategoria(base, cuartiles) {
    const invCat =
        safeNumber(base.investigadoresSenior) +
        safeNumber(base.investigadoresAsociados) +
        safeNumber(base.investigadoresEmeritos);

    const checklistA = [
        {
            nombre: "Indicador de grupo en Q2 o superior",
            cumple: safeNumber(base.indicadorGrupo) >= safeNumber(cuartiles.grupo.q2),
        },
        {
            nombre: "TOP > 0 o Tipo A > 0",
            cumple: safeNumber(base.top) > 0 || safeNumber(base.tipoA) > 0,
        },
        {
            nombre: "ASC > 0 o Divulgación > 0",
            cumple: safeNumber(base.asc) > 0 || safeNumber(base.divulgacion) > 0,
        },
        {
            nombre: "Formación A > 0",
            cumple: safeNumber(base.formA) > 0,
        },
        {
            nombre: "Al menos un IE / IS / IA",
            cumple: invCat > 0,
        },
        {
            nombre: "Cohesión > 0",
            cumple: safeNumber(base.cohesion) > 0,
        },
        {
            nombre: "Existencia del grupo >= 5 años",
            cumple: safeNumber(base.aniosExistencia) >= 5,
        },
    ];

    const tieneQ1 = typeof cuartiles?.grupo?.q1 === "number" && typeof cuartiles?.top?.q1 === "number";

    const checklistA1 = [
        {
            nombre: "Indicador de grupo en Q1",
            cumple: tieneQ1 ? safeNumber(base.indicadorGrupo) >= safeNumber(cuartiles.grupo.q1) : null,
        },
        {
            nombre: "TOP en Q1",
            cumple: tieneQ1 ? safeNumber(base.top) >= safeNumber(cuartiles.top.q1) : null,
        },
        {
            nombre: "ASC > 0 o Divulgación > 0",
            cumple: safeNumber(base.asc) > 0 || safeNumber(base.divulgacion) > 0,
        },
        {
            nombre: "Formación A > 0",
            cumple: safeNumber(base.formA) > 0,
        },
        {
            nombre: "Al menos un IE / IS / IA",
            cumple: invCat > 0,
        },
        {
            nombre: "Cohesión > 0",
            cumple: safeNumber(base.cohesion) > 0,
        },
        {
            nombre: "Existencia del grupo >= 5 años",
            cumple: safeNumber(base.aniosExistencia) >= 5,
        },
    ];

    const cumpleTodoA = checklistA.every((x) => x.cumple === true);
    const verificablesA1 = checklistA1.filter((x) => x.cumple !== null);
    const cumpleTodoA1 = tieneQ1 && checklistA1.every((x) => x.cumple === true);

    return {
        invCat,
        tieneQ1,
        checklistA,
        checklistA1,
        cumpleTodoA,
        cumpleTodoA1,
        avanceA1:
            verificablesA1.length > 0
                ? verificablesA1.filter((x) => x.cumple === true).length / verificablesA1.length
                : 0,
    };
}

function construirPerfiles(base, analisis) {
    const perfilNC = getSemaforoByThreshold(base.top + base.tipoA + base.tipoB, CUARTILES.tipoA.q2, CUARTILES.tipoA.q3);
    const perfilASC = getSemaforoByThreshold(base.asc, CUARTILES.asc.q3, CUARTILES.asc.q4);
    const perfilDIV = getSemaforoByThreshold(base.divulgacion, CUARTILES.divulgacion.q2, CUARTILES.divulgacion.q3);
    const perfilFRH = getSemaforoByThreshold(base.formA + base.formB, CUARTILES.formB.q2, CUARTILES.formB.q3);
    const perfilColaboracion = getSemaforoByThreshold(base.colaboracion, 0.5, 0.2);
    const perfilCohesion = getSemaforoByThreshold(base.cohesion, 0.8, 0.3);

    let perfilEstabilidad;
    if (analisis.estabilidadNC.maxGapMeses === null) {
        perfilEstabilidad = { label: "Sin datos", color: "#475569", bg: "#e2e8f0" };
    } else if (analisis.estabilidadNC.maxGapMeses <= 12) {
        perfilEstabilidad = { label: "Fuerte", color: "#15803d", bg: "#dcfce7" };
    } else if (analisis.estabilidadNC.maxGapMeses <= 24) {
        perfilEstabilidad = { label: "Medio", color: "#b45309", bg: "#fef3c7" };
    } else {
        perfilEstabilidad = { label: "Crítico", color: "#b91c1c", bg: "#fee2e2" };
    }

    return [
        { nombre: "Nuevo conocimiento", valor: base.top + base.tipoA + base.tipoB, meta: "Q2 / Q3", ...perfilNC },
        { nombre: "Apropiación social", valor: base.asc, meta: "Q3 o superior", ...perfilASC },
        { nombre: "Divulgación pública", valor: base.divulgacion, meta: "Q2 / Q3", ...perfilDIV },
        { nombre: "Formación RH", valor: base.formA + base.formB, meta: "Q2 / Q3", ...perfilFRH },
        { nombre: "Cooperación", valor: base.colaboracion, meta: "Mejorar índice", ...perfilColaboracion },
        { nombre: "Cohesión", valor: base.cohesion, meta: "Mantener > 0", ...perfilCohesion },
        {
            nombre: "Estabilidad de NC",
            valor:
                analisis.estabilidadNC.maxGapMeses === null
                    ? "No Disponible"
                    : `${formatInt(analisis.estabilidadNC.maxGapMeses)} meses`,
            meta: "Gap máximo <= 12 meses",
            ...perfilEstabilidad,
        },
    ];
}

export default function ProspectivaGrupoCorregida({
    convocatoria = DEFAULT_CONVOCATORIA,
    productos = [],
    proyectos = [],
    investigadores = [],
}) {
    const base = { ...DEFAULT_CONVOCATORIA, ...convocatoria };

    const [escenario, setEscenario] = useState({
        nuevosTOP: 0,
        nuevosTipoA: 0,
        nuevosASC: 0,
        nuevosDIV: 0,
        nuevosFormA: 0,
        nuevosFormB: 0,
    });

    const analisis = useMemo(() => {
        const yearNow = getYearNow();
        const yearLimit5 = yearNow - 4;
        const yearLimit10 = yearNow - 9;

        const productosValidos = (productos || []).filter(Boolean);
        const proyectosValidos = (proyectos || []).filter(Boolean);
        const investigadoresValidos = (investigadores || []).filter(Boolean);

        const productosPublicados = productosValidos.filter(
            (p) => normalizarTexto(p.estado_producto) === "publicado"
        );

        const productosUltimos5 = productosValidos.filter((p) => safeNumber(p.anio) >= yearLimit5);
        const productosUltimos10 = productosValidos.filter((p) => safeNumber(p.anio) >= yearLimit10);

        const proyectosActivos = proyectosValidos.filter((p) => {
            const estado = normalizarTexto(p.estado_proyecto);
            return (
                estado.includes("ejec") ||
                estado.includes("activo") ||
                estado.includes("vigente") ||
                estado.includes("curso")
            );
        });

        const investigadoresActivos = investigadoresValidos.filter(
            (i) => i.activo === true || normalizarTexto(i.estado_investigador) === "activo"
        );

        const categoriasInv = contarPorCampo(investigadoresActivos, "categoria_minciencias_investigador");
        const productosPorCategoria = contarPorCampo(productosValidos, "categoria_minciencias_producto");
        const productosPorTipo = contarPorCampo(productosValidos, "tipo_producto");
        const proyectosPorLinea = contarPorCampo(proyectosValidos, "linea_investigacion");

        const productosSinProyecto = productosValidos.filter((p) => !p.proyecto_asociado_id).length;

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

        const productividadPorInvestigador = investigadoresActivos.length
            ? productosValidos.length / investigadoresActivos.length
            : 0;

        const estabilidadNC = calcularEstabilidadNC(productosUltimos10);

        const fortalezas = [];
        if (safeNumber(base.indicadorGrupo) >= safeNumber(CUARTILES.grupo.q2)) {
            fortalezas.push("El grupo ya se ubica en Q2 o superior para indicador de grupo.");
        }
        if (safeNumber(base.top) > 0 || safeNumber(base.tipoA) > 0) {
            fortalezas.push("Existe base de productos de alta calidad e impacto.");
        }
        if (safeNumber(base.divulgacion) > 0) {
            fortalezas.push("El componente de divulgación pública ya tiene evidencia oficial.");
        }
        if (safeNumber(base.formA) > 0) {
            fortalezas.push("Hay formación de recurso humano tipo A registrada en la línea base.");
        }
        if (seniorCount + asociadoCount + emeritoCount > 0) {
            fortalezas.push("El grupo mantiene investigadores categorizados por Minciencias.");
        }

        return {
            yearNow,
            productosValidos,
            productosPublicados,
            productosUltimos5,
            productosUltimos10,
            proyectosValidos,
            proyectosActivos,
            investigadoresValidos,
            investigadoresActivos,
            categoriasInv,
            productosPorCategoria,
            productosPorTipo,
            proyectosPorLinea,
            productosSinProyecto,
            productividadPorInvestigador,
            ascCount,
            divulgacionCount,
            formacionCount,
            ncCount,
            dtCount,
            seniorCount,
            asociadoCount,
            emeritoCount,
            estabilidadNC,
            fortalezas,
        };
    }, [productos, proyectos, investigadores, base.indicadorGrupo, base.top, base.tipoA, base.divulgacion, base.formA]);

    const checklist = useMemo(() => construirChecklistCategoria(base, CUARTILES), [base]);

    const perfiles = useMemo(() => construirPerfiles(base, analisis), [base, analisis]);

    const brechas = useMemo(() => {
        const items = [
            {
                nombre: "Indicador de grupo",
                actual: safeNumber(base.indicadorGrupo),
                objetivoA: safeNumber(CUARTILES.grupo.q2),
                objetivoA1: typeof CUARTILES.grupo.q1 === "number" ? safeNumber(CUARTILES.grupo.q1) : null,
                cuartil: getCuartilLabel(base.indicadorGrupo, CUARTILES.grupo),
            },
            {
                nombre: "TOP",
                actual: safeNumber(base.top),
                objetivoA: 0,
                objetivoA1: typeof CUARTILES.top.q1 === "number" ? safeNumber(CUARTILES.top.q1) : null,
                cuartil: getCuartilLabel(base.top, CUARTILES.top),
            },
            {
                nombre: "Tipo A",
                actual: safeNumber(base.tipoA),
                objetivoA: 0,
                objetivoA1: null,
                cuartil: getCuartilLabel(base.tipoA, CUARTILES.tipoA),
            },
            {
                nombre: "ASC",
                actual: safeNumber(base.asc),
                objetivoA: 1,
                objetivoA1: 1,
                cuartil: getCuartilLabel(base.asc, CUARTILES.asc),
            },
            {
                nombre: "Divulgación",
                actual: safeNumber(base.divulgacion),
                objetivoA: 1,
                objetivoA1: 1,
                cuartil: getCuartilLabel(base.divulgacion, CUARTILES.divulgacion),
            },
            {
                nombre: "Formación A",
                actual: safeNumber(base.formA),
                objetivoA: 1,
                objetivoA1: 1,
                cuartil: getCuartilLabel(base.formA, CUARTILES.formA),
            },
            {
                nombre: "Cohesión",
                actual: safeNumber(base.cohesion),
                objetivoA: 0.000001,
                objetivoA1: 0.000001,
                cuartil: safeNumber(base.cohesion) > 0 ? "Cumple mínimo" : "No cumple",
            },
            {
                nombre: "Cooperación",
                actual: safeNumber(base.colaboracion),
                objetivoA: null,
                objetivoA1: null,
                cuartil: "Informativo",
            },
        ];

        return items.map((item) => ({
            ...item,
            brechaA: item.objetivoA === null ? null : getBrecha(item.actual, item.objetivoA),
            brechaA1: item.objetivoA1 === null ? null : getBrecha(item.actual, item.objetivoA1),
        }));
    }, [base]);

    const recomendaciones = useMemo(() => {
        const rec = [];

        if (safeNumber(base.asc) <= 0 && safeNumber(base.divulgacion) <= 0) {
            rec.push({
                prioridad: "Alta",
                foco: "ASC / Divulgación",
                accion: "Agregar al menos un producto validado de Apropiación Social o de Divulgación Pública.",
                impacto: "Es una condición mínima para sostener la lectura favorable hacia categorías altas.",
            });
        }

        if (safeNumber(base.asc) <= 0) {
            rec.push({
                prioridad: "Alta",
                foco: "Apropiación social",
                accion: "Priorizar resultados de apropiación social con soporte verificable y registro completo.",
                impacto: "Cierra la brecha más visible de la línea base oficial.",
            });
        }

        if (typeof CUARTILES.top.q1 === "number" && safeNumber(base.top) < safeNumber(CUARTILES.top.q1)) {
            rec.push({
                prioridad: "Alta",
                foco: "TOP",
                accion: "Concentrar el portafolio en productos TOP de alta calidad e impacto.",
                impacto: "Es la brecha central para A1 junto con el indicador de grupo.",
            });
        } else if (typeof CUARTILES.top.q1 !== "number") {
            rec.push({
                prioridad: "Media",
                foco: "TOP",
                accion: "Cargar el umbral Q1 real del área OCDE para medir con precisión la brecha a A1 en TOP.",
                impacto: "Permite una prospectiva metodológicamente consistente.",
            });
        }

        if (safeNumber(base.formA) <= 0) {
            rec.push({
                prioridad: "Alta",
                foco: "Formación RH A",
                accion: "Fortalecer productos de formación de recurso humano tipo A.",
                impacto: "Es una condición mínima para categorías altas.",
            });
        }

        if (analisis.estabilidadNC.maxGapMeses !== null && analisis.estabilidadNC.maxGapMeses > 24) {
            rec.push({
                prioridad: "Media",
                foco: "Estabilidad",
                accion: "Reducir los vacíos de producción en nuevo conocimiento y sostener una cadencia anual.",
                impacto: "Mejora la estabilidad del portafolio de investigación.",
            });
        }

        if (analisis.productosSinProyecto > Math.floor(analisis.productosValidos.length * 0.3)) {
            rec.push({
                prioridad: "Media",
                foco: "Calidad del dato",
                accion: "Depurar la trazabilidad entre productos y proyectos asociados.",
                impacto: "Mejora consistencia, soporte y lectura estratégica.",
            });
        }

        if (safeNumber(base.colaboracion) < 0.2) {
            rec.push({
                prioridad: "Media",
                foco: "Cooperación",
                accion: "Incrementar coautoría y colaboración con otros grupos para fortalecer el índice de cooperación.",
                impacto: "Mejora el perfil de colaboración y la visibilidad externa.",
            });
        }

        if (rec.length === 0) {
            rec.push({
                prioridad: "Baja",
                foco: "Sostenimiento",
                accion: "Mantener la estrategia actual y afinar registro, soportes y continuidad de producción.",
                impacto: "Ayuda a sostener la categoría A y mejorar la preparación para A1.",
            });
        }

        return rec;
    }, [base, analisis]);

    const escenarioCalculado = useMemo(() => {
        const nuevosTOP = safeNumber(escenario.nuevosTOP);
        const nuevosTipoA = safeNumber(escenario.nuevosTipoA);
        const nuevosASC = safeNumber(escenario.nuevosASC);
        const nuevosDIV = safeNumber(escenario.nuevosDIV);
        const nuevosFormA = safeNumber(escenario.nuevosFormA);
        const nuevosFormB = safeNumber(escenario.nuevosFormB);

        const topEstimado = safeNumber(base.top) + nuevosTOP * FACTORES_SIMULACION.top;
        const tipoAEstimado = safeNumber(base.tipoA) + nuevosTipoA * FACTORES_SIMULACION.tipoA;
        const ascEstimado = safeNumber(base.asc) + nuevosASC * FACTORES_SIMULACION.asc;
        const divEstimado = safeNumber(base.divulgacion) + nuevosDIV * FACTORES_SIMULACION.div;
        const formAEstimado = safeNumber(base.formA) + nuevosFormA * FACTORES_SIMULACION.formA;
        const formBEstimado = safeNumber(base.formB) + nuevosFormB * FACTORES_SIMULACION.formB;

        const indiceTop = topEstimado / CUARTILES.top.max;
        const indiceTipoA = tipoAEstimado / CUARTILES.tipoA.max;
        const indiceTipoB = safeNumber(base.tipoB) / CUARTILES.tipoB.max;
        const indiceAsc = ascEstimado / CUARTILES.asc.max;
        const indiceDiv = divEstimado / CUARTILES.divulgacion.max;
        const indiceFormA = formAEstimado / CUARTILES.formA.max;
        const indiceFormB = formBEstimado / CUARTILES.formB.max;
        const indiceCoh = safeNumber(base.cohesion) / 4.791666667;
        const indiceCoop = safeNumber(base.colaboracion) / 6.0;

        const indicadorEstimado =
            indiceTop * 3.7 +
            indiceTipoA * 2.3 +
            indiceTipoB * 0.4 +
            indiceAsc * 1.5 +
            indiceDiv * 0.5 +
            indiceFormA * 1.0 +
            indiceFormB * 0.2 +
            indiceCoh * 0.1 +
            indiceCoop * 0.3;

        const bloqueosA = [];
        if (!(indicadorEstimado >= safeNumber(CUARTILES.grupo.q2))) bloqueosA.push("El indicador estimado aún no llega a Q2.");
        if (!(topEstimado > 0 || tipoAEstimado > 0)) bloqueosA.push("Debe existir TOP o Tipo A.");
        if (!(ascEstimado > 0 || divEstimado > 0)) bloqueosA.push("Debe existir ASC o Divulgación.");
        if (!(formAEstimado > 0)) bloqueosA.push("Debe existir Formación A.");
        if (!(safeNumber(base.cohesion) > 0)) bloqueosA.push("La cohesión debe ser mayor que cero.");
        if (!(checklist.invCat > 0)) bloqueosA.push("Debe existir al menos un IE, IS o IA.");

        const puedeSostenerA = bloqueosA.length === 0;

        const bloqueosA1 = [];
        if (typeof CUARTILES.grupo.q1 !== "number" || typeof CUARTILES.top.q1 !== "number") {
            bloqueosA1.push("No hay umbral Q1 cargado para validar A1 con precisión.");
        } else {
            if (!(indicadorEstimado >= safeNumber(CUARTILES.grupo.q1))) {
                bloqueosA1.push("El indicador estimado aún no llega a Q1.");
            }
            if (!(topEstimado >= safeNumber(CUARTILES.top.q1))) {
                bloqueosA1.push("El TOP estimado aún no llega a Q1.");
            }
        }
        if (!(ascEstimado > 0 || divEstimado > 0)) bloqueosA1.push("Debe existir ASC o Divulgación.");
        if (!(formAEstimado > 0)) bloqueosA1.push("Debe existir Formación A.");
        if (!(safeNumber(base.cohesion) > 0)) bloqueosA1.push("La cohesión debe ser mayor que cero.");
        if (!(checklist.invCat > 0)) bloqueosA1.push("Debe existir al menos un IE, IS o IA.");
        if (!(safeNumber(base.aniosExistencia) >= 5)) bloqueosA1.push("El grupo debe tener al menos 5 años.");

        const nivelPreparacionA1 =
            bloqueosA1.length <= 1 ? "Avanzada" : bloqueosA1.length <= 3 ? "Intermedia" : "Inicial";

        return {
            topEstimado,
            tipoAEstimado,
            ascEstimado,
            divEstimado,
            formAEstimado,
            formBEstimado,
            indicadorEstimado,
            puedeSostenerA,
            bloqueosA,
            bloqueosA1,
            nivelPreparacionA1,
            brechaGrupoQ2: getBrecha(indicadorEstimado, CUARTILES.grupo.q2),
            brechaGrupoQ1:
                typeof CUARTILES.grupo.q1 === "number"
                    ? getBrecha(indicadorEstimado, CUARTILES.grupo.q1)
                    : null,
        };
    }, [escenario, base, checklist.invCat]);

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
                        Lectura interna para sostener categoría A y medir la brecha hacia A1.
                    </p>
                    <p style={{ ...styles.subtitle, marginTop: 4 }}>
                        Área OCDE: <strong>{base.areaOCDE}</strong>
                    </p>
                </div>
            </div>

            <div style={styles.gridTop}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Línea base oficial</h3>
                    <div style={styles.kpiGrid}>
                        <KPI label="Categoría actual" value={base.categoriaActual} />
                        <KPI label="Indicador grupo" value={formatNumber(base.indicadorGrupo, 4)} />
                        <KPI label="Cuartil grupo" value={getCuartilLabel(base.indicadorGrupo, CUARTILES.grupo)} />
                        <KPI label="TOP" value={formatNumber(base.top, 2)} />
                        <KPI label="Tipo A" value={formatNumber(base.tipoA, 2)} />
                        <KPI label="ASC" value={formatNumber(base.asc, 2)} />
                        <KPI label="Divulgación" value={formatNumber(base.divulgacion, 2)} />
                        <KPI label="Formación A" value={formatNumber(base.formA, 2)} />
                        <KPI label="Formación B" value={formatNumber(base.formB, 2)} />
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Estado operativo del dashboard</h3>
                    <div style={styles.kpiGrid}>
                        <KPI label="Productos actuales" value={formatInt(analisis.productosValidos.length)} />
                        <KPI label="Publicados" value={formatInt(analisis.productosPublicados.length)} />
                        <KPI label="Últimos 5 años" value={formatInt(analisis.productosUltimos5.length)} />
                        <KPI label="Proyectos activos" value={formatInt(analisis.proyectosActivos.length)} />
                        <KPI label="Investigadores activos" value={formatInt(analisis.investigadoresActivos.length)} />
                        <KPI
                            label="Preparación hacia A1"
                            value={escenarioCalculado.nivelPreparacionA1}
                            valueStyle={{
                                color:
                                    escenarioCalculado.nivelPreparacionA1 === "Avanzada"
                                        ? "#15803d"
                                        : escenarioCalculado.nivelPreparacionA1 === "Intermedia"
                                            ? "#b45309"
                                            : "#b91c1c",
                            }}
                        />
                    </div>
                </div>
            </div>

            <div style={styles.gridMid}>
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Checklist formal de categoría A</h3>
                    <div style={styles.checkList}>
                        {checklist.checklistA.map((item) => (
                            <CheckItem key={item.nombre} ok={item.cumple} label={item.nombre} />
                        ))}
                    </div>
                    <div style={styles.alertBox(checklist.cumpleTodoA ? "ok" : "warn")}>
                        <strong>{checklist.cumpleTodoA ? "Cumple condiciones mínimas de A." : "Tiene alertas para sostener A."}</strong>
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Brecha formal hacia A1</h3>
                    <div style={styles.checkList}>
                        {checklist.checklistA1.map((item) => (
                            <CheckItem
                                key={item.nombre}
                                ok={item.cumple === null ? false : item.cumple}
                                neutral={item.cumple === null}
                                label={item.cumple === null ? `${item.nombre} (requiere umbral Q1)` : item.nombre}
                            />
                        ))}
                    </div>
                    <div style={styles.alertBox("info")}>
                        <strong>Avance verificable hacia A1:</strong> {formatNumber(checklist.avanceA1 * 100, 0)}%
                    </div>
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Perfiles estratégicos del grupo</h3>
                <div style={styles.profileGrid}>
                    {perfiles.map((p) => (
                        <div key={p.nombre} style={{ ...styles.profileCard, background: p.bg }}>
                            <div style={{ fontWeight: 800, color: "#0f172a" }}>{p.nombre}</div>
                            <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: p.color }}>
                                {typeof p.valor === "number" ? formatNumber(p.valor, 2) : p.valor}
                            </div>
                            <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
                                Estado: <strong style={{ color: p.color }}>{p.label}</strong>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                                Meta interna: {p.meta}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Brechas oficiales de línea base</h3>
                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Indicador</th>
                                <th style={styles.th}>Actual</th>
                                <th style={styles.th}>Brecha para A</th>
                                <th style={styles.th}>Brecha para A1</th>
                                <th style={styles.th}>Cuartil / estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brechas.map((item) => (
                                <tr key={item.nombre}>
                                    <td style={styles.tdLeft}>{item.nombre}</td>
                                    <td style={styles.td}>{formatNumber(item.actual, 2)}</td>
                                    <td style={styles.td}>
                                        {item.brechaA === null ? "No Disponible" : formatNumber(item.brechaA, 2)}
                                    </td>
                                    <td style={styles.td}>
                                        {item.brechaA1 === null ? "No Disponible" : formatNumber(item.brechaA1, 2)}
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
                    <h3 style={styles.cardTitle}>Fortalezas observadas</h3>
                    <div style={styles.checkList}>
                        {analisis.fortalezas.length === 0 ? (
                            <CheckItem ok={false} label="Aún no se identifican fortalezas estructurales claras." />
                        ) : (
                            analisis.fortalezas.map((item, idx) => (
                                <CheckItem key={`${item}-${idx}`} ok={true} label={item} />
                            ))
                        )}
                    </div>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Alertas de gestión</h3>
                    <div style={styles.subBlock}>
                        <div style={styles.rowLine}>
                            <span>Productos sin proyecto asociado</span>
                            <strong>{formatInt(analisis.productosSinProyecto)}</strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Productividad por investigador activo</span>
                            <strong>{formatNumber(analisis.productividadPorInvestigador, 2)}</strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Gap máximo entre productos NC</span>
                            <strong>
                                {analisis.estabilidadNC.maxGapMeses === null
                                    ? "No Disponible"
                                    : `${formatInt(analisis.estabilidadNC.maxGapMeses)} meses`}
                            </strong>
                        </div>
                        <div style={styles.rowLine}>
                            <span>Investigadores categorizados</span>
                            <strong>{formatInt(checklist.invCat)}</strong>
                        </div>
                    </div>
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
                    <h3 style={styles.cardTitle}>Distribución actual</h3>

                    <div style={styles.subBlock}>
                        <div style={styles.subTitle}>Productos por categoría</div>
                        {topEntries(analisis.productosPorCategoria, 6).map(([k, v]) => (
                            <div key={k} style={styles.rowLine}>
                                <span translate="no">{labelCategoriaInvestigador(k)}</span>
                                <strong>{formatInt(v)}</strong>
                            </div>
                        ))}
                    </div>

                    <div style={styles.subBlock}>
                        <div style={styles.subTitle}>Proyectos por línea</div>
                        {topEntries(analisis.proyectosPorLinea, 6).map(([k, v]) => (
                            <div key={k} style={styles.rowLine}>
                                <span translate="no">{labelCategoriaInvestigador(k)}</span>
                                <strong>{formatInt(v)}</strong>
                            </div>
                        ))}
                    </div>

                    <div style={styles.subBlock}>
                        <div style={styles.subTitle}>Investigadores activos por categoría</div>
                        {topEntries(analisis.categoriasInv, 6).map(([k, v]) => (
                            <div key={k} style={styles.rowLine}>
                                <span translate="no">{labelCategoriaInvestigador(k)}</span>
                                <strong>{formatInt(v)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Simulador orientativo</h3>
                <p style={styles.subtitle}>
                    Simula mejora del portafolio. No reemplaza la medición oficial.
                </p>

                <div style={styles.simGrid2}>
                    <ScenarioInput
                        label="Nuevos TOP"
                        value={escenario.nuevosTOP}
                        onChange={(v) => handleScenarioChange("nuevosTOP", v)}
                    />
                    <ScenarioInput
                        label="Nuevos Tipo A"
                        value={escenario.nuevosTipoA}
                        onChange={(v) => handleScenarioChange("nuevosTipoA", v)}
                    />
                    <ScenarioInput
                        label="Nuevos ASC"
                        value={escenario.nuevosASC}
                        onChange={(v) => handleScenarioChange("nuevosASC", v)}
                    />
                    <ScenarioInput
                        label="Nuevos Divulgación"
                        value={escenario.nuevosDIV}
                        onChange={(v) => handleScenarioChange("nuevosDIV", v)}
                    />
                    <ScenarioInput
                        label="Nuevos Formación A"
                        value={escenario.nuevosFormA}
                        onChange={(v) => handleScenarioChange("nuevosFormA", v)}
                    />
                    <ScenarioInput
                        label="Nuevos Formación B"
                        value={escenario.nuevosFormB}
                        onChange={(v) => handleScenarioChange("nuevosFormB", v)}
                    />
                </div>

                <div style={styles.resultBox}>
                    <KPIResult label="Indicador estimado" value={formatNumber(escenarioCalculado.indicadorEstimado, 4)} />
                    <KPIResult label="Brecha restante a Q2" value={formatNumber(escenarioCalculado.brechaGrupoQ2, 4)} />
                    <KPIResult
                        label="Brecha restante a Q1"
                        value={
                            escenarioCalculado.brechaGrupoQ1 === null
                                ? "No Disponible"
                                : formatNumber(escenarioCalculado.brechaGrupoQ1, 4)
                        }
                    />
                    <KPIResult label="ASC estimado" value={formatNumber(escenarioCalculado.ascEstimado, 2)} />
                    <KPIResult label="TOP estimado" value={formatNumber(escenarioCalculado.topEstimado, 2)} />
                    <KPIResult label="Preparación hacia A1" value={escenarioCalculado.nivelPreparacionA1} />
                </div>

                <div style={styles.gridMid}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Validación del escenario para sostener A</h3>
                        {escenarioCalculado.bloqueosA.length === 0 ? (
                            <div style={styles.recoCard}>
                                <div style={{ ...styles.badge, background: "#dcfce7", color: "#166534" }}>OK</div>
                                <div>
                                    <div style={styles.recoTitle}>El escenario sostiene condiciones mínimas de A</div>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.recoWrap}>
                                {escenarioCalculado.bloqueosA.map((b, idx) => (
                                    <div key={`${b}-${idx}`} style={styles.recoCard}>
                                        <div style={{ ...styles.badge, background: "#fee2e2", color: "#b91c1c" }}>
                                            Alerta
                                        </div>
                                        <div>
                                            <div style={styles.recoTitle}>{b}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Bloqueos del escenario hacia A1</h3>
                        {escenarioCalculado.bloqueosA1.length === 0 ? (
                            <div style={styles.recoCard}>
                                <div style={{ ...styles.badge, background: "#dcfce7", color: "#166534" }}>OK</div>
                                <div>
                                    <div style={styles.recoTitle}>Sin bloqueos críticos detectados</div>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.recoWrap}>
                                {escenarioCalculado.bloqueosA1.map((b, idx) => (
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

function KPI({ label, value, valueStyle = {} }) {
    return (
        <div style={styles.kpiBox}>
            <span style={styles.kpiLabel}>{label}</span>
            <strong style={{ ...styles.kpiValue, ...valueStyle }}>{value}</strong>
        </div>
    );
}

function KPIResult({ label, value }) {
    return (
        <div style={styles.resultItem}>
            <span style={styles.kpiLabel}>{label}</span>
            <strong style={styles.kpiValue}>{value}</strong>
        </div>
    );
}

function CheckItem({ ok, label, neutral = false }) {
    return (
        <div style={styles.checkItem}>
            <span
                style={{
                    ...styles.checkDot,
                    background: neutral ? "#64748b" : ok ? "#16a34a" : "#dc2626",
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
        gridTemplateColumns: "1fr 1fr",
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
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
    profileGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 12,
    },
    profileCard: {
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        padding: 14,
    },
    alertBox: (type) => ({
        marginTop: 14,
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        background:
            type === "ok" ? "#dcfce7" : type === "warn" ? "#fef3c7" : "#eff6ff",
        color:
            type === "ok" ? "#166534" : type === "warn" ? "#92400e" : "#1d4ed8",
        border:
            type === "ok"
                ? "1px solid #86efac"
                : type === "warn"
                    ? "1px solid #fcd34d"
                    : "1px solid #93c5fd",
    }),
};