/* eslint-disable */
const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

admin.initializeApp();
const db = admin.firestore();

exports.recalcularKPIsManual = onCall({region: "us-central1"}, async (request) => {
  // Auth
  if (!request.auth || !request.auth.token || !request.auth.token.email) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const email = request.auth.token.email;
  if (!email.endsWith("@udi.edu.co")) {
    throw new HttpsError("permission-denied", "Solo correo institucional.");
  }

  // Rol real en Firestore: usuarios/<email>.rol == "admin"
  const userDoc = await db.collection("usuarios").doc(email).get();
  const rol = userDoc.exists ? userDoc.data().rol : null;

  if (rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo admin puede recalcular KPIs.");
  }

  const [prodSnap, invSnap, proySnap] = await Promise.all([
    db.collection("productos").get(),
    db.collection("investigadores").get(),
    db.collection("proyectos").get(),
  ]);

  const kpis = {
    total_productos: prodSnap.size,
    total_investigadores: invSnap.size,
    total_proyectos: proySnap.size,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("kpis").doc("global").set(kpis, {merge: true});

  return {status: "ok", ...kpis};
});
