// DEPLOY-01 (preflight A): badge PRESENTACIONAL del nivel de exigencia de
// la velocidad real de un tramo en M2. No colorea la fila entera: sólo
// acompaña al valor de V en su celda. El color no es el único canal --
// cada nivel lleva etiqueta de texto y un `title` accesible.
//
// Semántica (umbrales de comunicación IUAS, NO límites normativos nuevos):
//   elevada     2,0 ≤ V < 2,5 m/s          ámbar   (ui-badge--warn)
//   muyAlta     2,5 ≤ V ≤ Vmax aplicable   naranja (ui-badge--alto)
//   noAdmisible V > Vmax real aplicable    rojo    (ui-badge--error)
//   normal      V < 2,0 m/s                sin badge
import type { ClasificacionVelocidad } from './clasificarVelocidadParaUi'

const PRESENTACION: Readonly<
  Record<Exclude<ClasificacionVelocidad, 'normal'>, { clase: string; etiqueta: string; ayuda: string }>
> = {
  elevada: {
    clase: 'ui-badge ui-badge--warn',
    etiqueta: 'Elevada',
    ayuda: 'Velocidad de 2,0 a 2,5 m/s. Informativo: no supera la velocidad máxima admisible.',
  },
  muyAlta: {
    clase: 'ui-badge ui-badge--alto',
    etiqueta: 'Muy alta',
    ayuda: 'Velocidad de 2,5 m/s o más, todavía dentro de la máxima admisible. Conviene revisar el diámetro.',
  },
  noAdmisible: {
    clase: 'ui-badge ui-badge--error',
    etiqueta: 'No admisible',
    ayuda: 'La velocidad real supera la máxima admisible para este diámetro (CRIT-A19).',
  },
}

export function BadgeVelocidad({ clasificacion }: { clasificacion: ClasificacionVelocidad }) {
  if (clasificacion === 'normal') {
    return null
  }
  const { clase, etiqueta, ayuda } = PRESENTACION[clasificacion]
  return (
    <span className={clase} title={ayuda}>
      {etiqueta}
    </span>
  )
}
