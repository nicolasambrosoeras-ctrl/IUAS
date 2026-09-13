// Acciones GLOBALES de proyecto (PERSIST-01, §35-§39): exportar/importar
// un archivo .iuas. Deliberadamente fuera de M1/M2/M3/M4 -- viven en el
// header junto a "Reiniciar cálculo". Import es atómico (§23): el
// archivo se lee, parsea y valida ANTES de tocar cualquier estado; sólo
// al confirmar el diálogo se reemplaza el proyecto activo. Si algo falla
// en el camino, el proyecto actual queda exactamente igual.
import { useRef, useState } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import { descargarProyectoComoIuas } from '../../persistencia/exportarProyectoIuas'
import { mensajeHumanoDeErrorIuas, parsearArchivoIuas } from '../../persistencia/parsearArchivoIuas'
import { DialogoDeConfirmacion } from './DialogoDeConfirmacion'

export function AccionesDeProyecto({
  proyecto,
  onImportar,
}: {
  proyecto: Proyecto
  onImportar: (proyectoImportado: Proyecto) => void
}) {
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const botonImportarRef = useRef<HTMLButtonElement>(null)
  const [proyectoPendiente, setProyectoPendiente] = useState<Proyecto | null>(null)
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null)

  async function manejarArchivoSeleccionado(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    // Permite reimportar el mismo archivo dos veces seguidas (el navegador
    // no dispara `change` si el value no cambia).
    evento.target.value = ''
    if (archivo === undefined) return

    let texto: string
    try {
      texto = await archivo.text()
    } catch {
      setErrorImportacion('No se pudo leer el archivo seleccionado.')
      return
    }

    const resultado = parsearArchivoIuas(texto)
    if (!resultado.exito) {
      setErrorImportacion(mensajeHumanoDeErrorIuas(resultado.error))
      return
    }
    setErrorImportacion(null)
    setProyectoPendiente(resultado.proyecto)
  }

  function confirmarImportacion() {
    if (proyectoPendiente !== null) {
      onImportar(proyectoPendiente)
    }
    setProyectoPendiente(null)
    botonImportarRef.current?.focus()
  }

  function cancelarImportacion() {
    setProyectoPendiente(null)
    botonImportarRef.current?.focus()
  }

  return (
    <div className="app-header__acciones-proyecto">
      <button type="button" onClick={() => descargarProyectoComoIuas(proyecto)}>
        Exportar proyecto
      </button>
      <button type="button" ref={botonImportarRef} onClick={() => inputArchivoRef.current?.click()}>
        Importar proyecto
      </button>
      <input
        ref={inputArchivoRef}
        type="file"
        accept=".iuas,application/json"
        onChange={(evento) => {
          void manejarArchivoSeleccionado(evento)
        }}
        style={{ display: 'none' }}
      />
      {errorImportacion !== null ? (
        <p className="ui-callout ui-callout--error" role="alert">
          {errorImportacion}
        </p>
      ) : null}
      {proyectoPendiente !== null ? (
        <DialogoDeConfirmacion
          titulo="¿Importar proyecto?"
          descripcion="Importar este archivo reemplazará el proyecto actual en pantalla. ¿Continuar?"
          etiquetaConfirmar="Importar"
          onConfirmar={confirmarImportacion}
          onCancelar={cancelarImportacion}
        />
      ) : null}
    </div>
  )
}
