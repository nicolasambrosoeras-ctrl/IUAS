// UI-01B (D-δ.73) — patrón visual único de encabezado de etapa (sección 13
// del brief). Las cinco etapas del flujo (Demanda, Tuberías, Medidores,
// Abastecimiento, Verificación) comparten esta cabecera:
//
//   [02]  Tuberías
//         Dimensionamiento hidráulico de la red        [ estado ]
//
// Elimina la redundancia visual "Módulo 2 — Tuberías" / "Módulo 2 ·
// Tuberías": el número de etapa y el nombre corto son la presentación
// principal (sección 14). La traza técnica "Módulo 2" sigue disponible en
// las ayudas de cada panel, sin cambiar el ownership técnico.
//
// PRESENTACIÓN pura: no ejecuta resolvers ni participa de ningún cálculo.
// El `<h2>` real se conserva (accesibilidad + tests de estructura del
// flujo 1→5); lo que cambia es el copy y el tratamiento visual.
//
// Se monta como hijos DIRECTOS de un `<summary className="etapa-cabecera">`
// (o de un contenedor con esa clase para la etapa 5, que no es
// colapsable): número + <h2> + descripción + estado son hermanos, para no
// anidar un bloque dentro de una fase de <summary> (modelo de contenido
// "phrasing + un heading").
import type { ReactNode } from 'react'
import './encabezadoDeEtapa.css'

// "1" -> "01": el número de etapa se alinea como metadato tabular, igual
// que en el índice lateral.
function numeroDeEtapa(numero: number): string {
  return String(numero).padStart(2, '0')
}

export function EncabezadoDeEtapa({
  numero,
  titulo,
  descripcion,
  estado,
}: {
  numero: number
  titulo: string
  descripcion?: string | undefined
  // Badge de estado de la etapa (sección 13). Opcional: sólo cuando el
  // panel ya tiene un estado real que mostrar, nunca inventado.
  estado?: ReactNode | undefined
}) {
  return (
    <>
      <span className="etapa-cabecera__num" aria-hidden="true">
        {numeroDeEtapa(numero)}
      </span>
      <h2 className="etapa-cabecera__titulo">{titulo}</h2>
      {descripcion !== undefined ? (
        <span className="etapa-cabecera__descripcion">{descripcion}</span>
      ) : null}
      {estado !== undefined ? <span className="etapa-cabecera__estado">{estado}</span> : null}
    </>
  )
}
