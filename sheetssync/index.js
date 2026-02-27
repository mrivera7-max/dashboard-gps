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



exports.syncSheets = onCall({ region: "us-central1" },async (request) => {
  // Auth
  if (!request.auth || !request.auth.token || !request.auth.token.email) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const email = request.auth.token.email;
  if (!email.endsWith("@udi.edu.co")) {
    throw new HttpsError("permission-denied", "Solo correo institucional.");
  }

  // Rol
  const userDoc = await db.collection("usuarios").doc(email).get();
  const rol = userDoc.exists ? userDoc.data().rol : null;
  if (rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo admin puede sincronizar.");
  }

   console.log("SA running, project:", process.env.GCLOUD_PROJECT);

  console.log("1) leyendo usuarios...");
  const testUser = await db.collection("usuarios").doc(email).get();
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

  // Cambia el nombre EXACTO de la pestaña si no es este:
  const range = "'PRODUCTOS'!A1:Z";

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = resp.data.values || [];
  if (rows.length < 2) return { ok: true, created: 0, updated: 0, skipped: 0 };

  const headers = rows.shift().map((h) => norm(h));

  let created = 0, updated = 0, skipped = 0;

  let batch = db.batch();
  let ops = 0;

  for (const r of rows) {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = r[i] ?? ""));

    const sourceKey = obj["id_gruplact"]
      ? `gruplact:${obj["id_gruplact"]}`
      : `prod:${norm(obj["tipo"])}|${norm(obj["titulo"])}|${norm(obj["anio"])}|${norm(obj["doi"] || obj["isbn"] || "")}`;

    const docId = makeId("prod", sourceKey);
    const ref = db.collection("productos").doc(docId);

    const normalized = {
      titulo: obj["titulo"] || "",
      tipo: obj["tipo"] || "",
      anio: Number(obj["anio"] || 0),
      doi: obj["doi"] || null,
      isbn: obj["isbn"] || null,
      categoria_minciencias: obj["categoria_minciencias"] || null,
      sourceKey,
      source: { type: "sheets", sheet: "PRODUCTOS" },
    };

    const newHash = sha1(normalized);

    // MVP: lee el doc para decidir update/skip
    const prev = await ref.get();
    if (!prev.exists) created++;
    else if ((prev.data().hash || null) !== newHash) updated++;
    else { skipped++; continue; }

    batch.set(ref, {
      ...normalized,
      hash: newHash,
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    ops++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
  return { ok: true, created, updated, skipped };
});
