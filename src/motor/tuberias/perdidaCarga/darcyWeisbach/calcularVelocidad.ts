// Velocidad media a partir de Qc y diametro interior (CRIT-A18). Primer
// eslabon del pipeline Darcy-Weisbach: Qc+Di -> V -> Re -> f -> hf. Primitiva
// pura, sin conocimiento de Proyecto, Tramo ni ninguna otra etapa.
export function calcularVelocidad(qc_lps: number, diametroInterior_mm: number): number {
  if (qc_lps <= 0) {
    throw new Error(`calcularVelocidad: qc_lps debe ser mayor a 0 (recibido: ${qc_lps})`)
  }
  if (diametroInterior_mm <= 0) {
    throw new Error(`calcularVelocidad: diametroInterior_mm debe ser mayor a 0 (recibido: ${diametroInterior_mm})`)
  }

  // CRIT-A18: conversion explicita a las unidades de la formula (m3/s, m).
  const Q_m3s = qc_lps / 1000
  const D_m = diametroInterior_mm / 1000
  const A_m2 = (Math.PI * D_m ** 2) / 4

  return Q_m3s / A_m2
}
