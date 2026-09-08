// UI-01C (D-δ.74) — resumen compacto del proyecto bajo la navegación
// lateral (brief §23). PRESENTACIÓN pura: recibe un view-model ya resuelto
// (`resolverResumenDeProyecto`) y sólo lo formatea. No ejecuta resolvers,
// no calcula, no persiste. Tres métricas: Qc, Reserva, Margen crítico.
// "Pendiente" / "No aplica" nunca se muestran como 0 (§24-§25).
import type { CampoResumen, ResumenDeProyecto } from './resolverResumenDeProyecto'
import './resumenDeProyecto.css'

function TextoCampo({ campo }: { campo: CampoResumen }) {
  if (campo.tipo === 'pendiente') {
    return <span className="resumen-proyecto__pendiente">Pendiente</span>
  }
  if (campo.tipo === 'noAplica') {
    return <span className="resumen-proyecto__pendiente">No aplica</span>
  }
  return <>{campo.texto}</>
}

export function ResumenDeProyectoPanel({ resumen }: { resumen: ResumenDeProyecto }) {
  const claseMargen =
    resumen.margenCritico.tipo === 'valor' && resumen.margenCumple === false
      ? 'resumen-proyecto__valor resumen-proyecto__valor--negativo'
      : resumen.margenCritico.tipo === 'valor' && resumen.margenCumple === true
        ? 'resumen-proyecto__valor resumen-proyecto__valor--positivo'
        : 'resumen-proyecto__valor'

  return (
    <div className="resumen-proyecto" aria-label="Resumen del proyecto">
      <p className="resumen-proyecto__titulo">Proyecto</p>

      <div className="resumen-proyecto__fila">
        <span className="resumen-proyecto__etiqueta">Qc</span>
        <span className="resumen-proyecto__valor">
          <TextoCampo campo={resumen.qc} />
        </span>
      </div>

      <div className="resumen-proyecto__fila">
        <span className="resumen-proyecto__etiqueta">Reserva</span>
        <span className="resumen-proyecto__valor">
          <TextoCampo campo={resumen.reserva} />
        </span>
      </div>

      <div className="resumen-proyecto__fila">
        <span className="resumen-proyecto__etiqueta">Margen crítico</span>
        <span className={claseMargen}>
          <TextoCampo campo={resumen.margenCritico} />
        </span>
      </div>
    </div>
  )
}
