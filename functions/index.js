/* eslint-disable */
const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

admin.initializeApp();

const db = admin.firestore();

exports.recalcularKPIsManual = onCall({region: "us-central1"}, async (request) => {
// Auth
if (!request.auth?.uid || !request.auth?.token?.email) {
  throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
}

const emailLower = String(request.auth.token.email).toLowerCase().trim();
if (!emailLower.endsWith("@udi.edu.co")) {
  throw new HttpsError("permission-denied", "Solo correo institucional.");
}

// Fuente de verdad: líder
const cfgSnap = await db.collection("config").doc("grupoGPS").get();
const liderEmail = String(cfgSnap.data()?.liderEmail || "").toLowerCase().trim();
if (!liderEmail) throw new HttpsError("failed-precondition", "No hay líder configurado.");

const isLeader = emailLower === liderEmail;

// Opcional: permitir también rol admin si quieres (si no, elimina esto)
const uid = request.auth.uid;
const userSnap = await db.collection("usuarios").doc(uid).get();
const rol = userSnap.exists ? String(userSnap.data()?.rol || "").toLowerCase() : "";

if (!isLeader) {
  throw new HttpsError("permission-denied", "Solo líder/admin puede recalcular KPIs.");
}

   // Si quieres KPIs globales, ok así. Si quieres solo GPS, luego filtramos.
  const [prodSnap, invSnap, proySnap] = await Promise.all([
    db.collection("productos").get(),
    db.collection("investigadores").get(),
    db.collection("proyectos").get(),
  ]);

  const kpis = {
    total_productos: prodSnap.size,
    total_investigadores: invSnap.size,
    total_proyectos: proySnap.size,
    updated_at: admin.firestore.FieldValue.serverTimestamp(), // ✅ solo para Firestore
  };

  await db.collection("kpis").doc("global").set(kpis, {merge: true});

   return {
    status: "ok",
    total_productos: prodSnap.size,
    total_investigadores: invSnap.size,
    total_proyectos: proySnap.size,
    updatedAtMs: Date.now(), // ✅ esto sí se devuelve bien
  };
});
