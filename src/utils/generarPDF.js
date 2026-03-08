import jsPDF from "jspdf";

export const generarPDF = (form) => {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Ficha Desafío - Proyecto de Investigación", 20, 20);

  doc.setFontSize(11);

  doc.text(`Nombre: ${form.datos_generales.nombre_investigador}`, 20, 40);
  doc.text(`Cédula: ${form.datos_generales.cedula}`, 20, 50);
  doc.text(`Programa: ${form.datos_generales.programa}`, 20, 60);

  doc.text("Título del proyecto:", 20, 80);
  doc.text(form.identificacion_proyecto.titulo_proyecto, 20, 90);

  doc.text("Problema de investigación:", 20, 110);
  doc.text(form.formulacion.problema, 20, 120, { maxWidth: 170 });

  doc.text("Justificación:", 20, 160);
  doc.text(form.formulacion.justificacion_viabilidad, 20, 170, { maxWidth: 170 });

  doc.save("Ficha_Desafio_UDI.pdf");
};