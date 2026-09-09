// Diálogo de confirmación modal accesible (GEOM-UX-01 §13/§27). Usa el
// elemento nativo <dialog> con showModal(): trae de fábrica la trampa de
// foco, el cierre con Escape y el backdrop -- sin dependencias y sin
// reimplementar gestión de foco a mano. Se monta sólo cuando hay algo que
// confirmar (el padre deja de renderizarlo al resolver), así que
// showModal() se dispara una vez al montar.
import { useEffect, useRef } from 'react'

export function DialogoDeConfirmacion({
  titulo,
  descripcion,
  etiquetaConfirmar,
  etiquetaCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  descripcion: string
  etiquetaConfirmar: string
  etiquetaCancelar?: string
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const dialogoRef = useRef<HTMLDialogElement>(null)
  const confirmarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialogo = dialogoRef.current
    if (dialogo !== null && !dialogo.open) {
      dialogo.showModal()
      // Foco inicial en la acción primaria; Escape / Tab los maneja el
      // <dialog> nativo. Al cerrar, el padre devuelve el foco al disparador.
      confirmarRef.current?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogoRef}
      className="ui-dialogo"
      aria-labelledby="ui-dialogo-titulo"
      aria-describedby="ui-dialogo-descripcion"
      // Escape dispara el evento `cancel` (cancelable) antes de cerrar: se
      // trata igual que pulsar "Cancelar".
      onCancel={(evento) => {
        evento.preventDefault()
        onCancelar()
      }}
    >
      <h2 id="ui-dialogo-titulo" className="ui-dialogo__titulo">
        {titulo}
      </h2>
      <p id="ui-dialogo-descripcion" className="ui-dialogo__descripcion">
        {descripcion}
      </p>
      <div className="ui-dialogo__acciones">
        <button type="button" onClick={onCancelar}>
          {etiquetaCancelar}
        </button>
        <button type="button" ref={confirmarRef} className="ui-btn--primario" onClick={onConfirmar}>
          {etiquetaConfirmar}
        </button>
      </div>
    </dialog>
  )
}
