/* eslint-disable */
const { defineString, defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { google } = require("googleapis");
const crypto = require("crypto");


admin.initializeApp();
const db = admin.firestore();
const SHEET_ID = defineString("SHEET_ID");


function norm(s = "") {
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function sha1(obj) {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex");
}
function makeId(prefix, key) {
  return `${prefix}_${crypto.createHash("sha1").update(key).digest("hex")}`;
}

async function syncTabToCollection({
  sheets,
  spreadsheetId,
  tabName,          // ej: "PRODUCTOS"
  collectionName,   // ej: "productos"
  buildDoc,         // (obj, rowIndex) => ({ docId, data })
}) {
  const range = `'${tabName}'!A1:Z`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });

  const rows = resp.data.values || [];
  if (rows.length < 2) return { created: 0, updated: 0, skipped: 0, totalRows: rows.length - 1 };

  const headers = rows.shift().map((h) => norm(h));

  let created = 0, updated = 0, skipped = 0;
  let batch = db.batch();
  let ops = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i] ?? ""));

    const rowIndex = idx + 2; // porque datos empiezan en fila 2
    const { docId, data } = buildDoc(obj, rowIndex);

    const ref = db.collection(collectionName).doc(docId);
    const newHash = sha1(data);

    const prev = await ref.get();
    if (!prev.exists) created++;
    else if ((prev.data().hash || null) !== newHash) updated++;
    else { skipped++; continue; }

    batch.set(ref, {
      ...data,
      hash: newHash,
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      source: { type: "sheets", sheet: tabName, row: rowIndex },
    }, { merge: true });

    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return { created, updated, skipped, totalRows: rows.length };
}

exports.syncSheets = onCall({ region: "us-central1" },async (request) => {
  try {
  
  
  // ===== AUTH + PERMISOS =====
  if (!request.auth?.token?.email) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  
  const emailLower = String(request.auth.token.email).toLowerCase().trim();

  if (!emailLower.endsWith("@udi.edu.co")) {
    throw new HttpsError("permission-denied", "Solo correo institucional.");
  }

  // Líder (fuente de verdad)
  const cfgSnap = await db.collection("config").doc("grupoGPS").get();
  const liderEmail = String(cfgSnap.data()?.liderEmail || "").toLowerCase().trim();

  if (!liderEmail) {
    throw new HttpsError("failed-precondition", "No hay líder configurado en config/grupoGPS.");
  }

  const isLeader = emailLower === liderEmail;

  if (!isLeader) {
    throw new HttpsError("permission-denied", "Solo el líder del grupo puede sincronizar.");
  }

   console.log("SA running, project:", process.env.GCLOUD_PROJECT);

  console.log("1) leyendo usuarios...");
  const uid = request.auth?.uid;   // <-- obtener UID del usuario autenticado
  const testUser = await db.collection("usuarios").doc(uid).get();
  console.log("1) ok usuarios read, exists:", testUser.exists);

  console.log("2) escribiendo test...");
  await db.collection("_debug").doc("ping").set({
    t: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log("2) ok write test");

 const sheetId = SHEET_ID.value();

 const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

// 1) PRODUCTOS -> productos
const productosRes = await syncTabToCollection({
  sheets,
  spreadsheetId: sheetId,
  tabName: "PRODUCTOS",
  collectionName: "productos",
  buildDoc: (obj, rowIndex) => {
  const idProducto = String(obj["id_producto"] || "").trim();
  if (!idProducto) {
    throw new Error(`Fila sin id_producto (row ${rowIndex}) en PRODUCTOS`);
  }

  const docId = idProducto;           // ID estable
  const sourceKey = `id_producto:${idProducto}`;

  const data = {
    id_producto: idProducto,                          // ✅ GUARDA EL ID
    titulo: obj["titulo"] || "",
    tipo_producto: obj["tipo_producto"] || obj["tipo"] || "",
    anio: Number(obj["anio"] || 0),
    doi: obj["doi"] || null,
    isbn: obj["isbn"] || null,
    categoria_minciencias_producto: obj["categoria_minciencias_producto"] || obj["categoria_minciencias"] || "N/A",
    sourceKey,
  };
  return { docId, data };
},
});

// 2) INVESTIGADORES -> investigadores
const investigadoresRes = await syncTabToCollection({
  sheets,
  spreadsheetId: sheetId,
  tabName: "INVESTIGADORES",
  collectionName: "investigadores",
  buildDoc: (obj, rowIndex) => {
    // helper: tomar valor aunque el header varíe
    const pick = (o, candidates) => {
      for (const k of candidates) {
        const v = o[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
      for (const [k, v] of Object.entries(o)) {
        if (k.includes("categoria") && k.includes("investig")) {
          if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
        if (k.includes("estado") && k.includes("investig")) {
          if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
      }
      return "";
    };

    // helper: mapear a IE/IS/IA/IJ/SC
    const mapCategoriaInv = (v) => {
      const s = (v ?? "").toString().trim().toUpperCase();
      if (["IE", "IS", "IA", "IJ", "SC"].includes(s)) return s;

      const t = (v ?? "").toString().trim().toLowerCase();
      if (t.includes("emérit") || t.includes("emerit")) return "IE";
      if (t.includes("senior")) return "IS";
      if (t.includes("asociad")) return "IA";
      if (t.includes("junior")) return "IJ";
      return "SC";
    };

    const emailInv = (obj["email"] || "").trim().toLowerCase();
    const idInv = (obj["id_investigador"] || "").trim();
    if (!idInv) {
      throw new Error(`Fila sin id_investigador (row ${rowIndex}) en INVESTIGADORES`);
    }
    const docId = idInv; // 👈 estable y legible (mejor que hash)
    const ident = (obj["identificacion"] || obj["id"] || "").trim();

    // ID estable
        
    const estadoRaw = pick(obj, ["estado_investigador"]);
    const estado = (estadoRaw || "pendiente").toString().trim().toLowerCase();

    const catRaw = pick(obj, ["categoria_minciencias_investigador"]);
    const cat = mapCategoriaInv(catRaw);

    console.log("INV row", rowIndex, "catRaw=", catRaw, "->", cat, "estadoRaw=", estadoRaw, "->", estado);

    const data = {
      id_investigador: (idInv || ident || emailInv || "").trim(),
      email: emailInv || null,
      identificacion: ident || null,
      nombres: obj["nombres"] || "",
      apellidos: obj["apellidos"] || "",
      estado_investigador: estado,                 // activo|inactivo|pendiente
      activo: estado === "activo",                 // boolean
      categoria_minciencias_investigador: cat,     // IE|IS|IA|IJ|SC
      synced_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    return { docId, data };
  },
});

// 3) PROYECTOS -> proyectos
const proyectosRes = await syncTabToCollection({
  sheets,
  spreadsheetId: sheetId,
  tabName: "PROYECTOS",
  collectionName: "proyectos",
 buildDoc: (obj, rowIndex) => {
  const idProy = (obj["id_proyecto"] || "").trim();
  const codigo = (obj["codigo"] || idProy || "").trim();
  const nombre = obj["nombre_proyecto"] || obj["titulo"] || "";

  const key = idProy || codigo || `row:${rowIndex}|${norm(nombre)}`;
  const docId = idProy || codigo;

  const linea = (obj["linea_investigacion"] || obj["linea_investigación"] || "N/A").toString().trim();

  const data = {
    id_proyecto: idProy || (codigo || "").trim() || null,
    codigo: codigo || null,
    nombre_proyecto: nombre,
    anio_inicio: Number(obj["anio_inicio"] || obj["año_de_inicio"] || 0),
    estado_proyecto: (obj["estado_proyecto"] || obj["estado"] || "N/A").toString().trim(),
    linea_investigacion: linea || "N/A",
    investigador_principal: obj["investigador_principal"] || null,
    synced_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  return { docId, data };
},
});

return {
  ok: true,
  productos: productosRes,
  investigadores: investigadoresRes,
  proyectos: proyectosRes,
};
} catch (err) {
    console.error("syncSheets ERROR:", err);
    throw new HttpsError("internal", err?.message || "syncSheets failed");
  }
});
