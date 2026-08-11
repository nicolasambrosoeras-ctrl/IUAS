// Sección global de trazabilidad (Nivel 2): tabla completa de materiales
// derivada 100% de catalogoMaterialesTuberia, para que el usuario audite C,
// epsilon y sus fuentes aunque no esté ejecutando un cálculo puntual.
// Complementa a "Parámetros de cálculo" (Nivel 1, en
// ResultadoHidraulicoDeTramo.tsx), que muestra solo el parámetro relevante
// al método/material actualmente seleccionados -- esta sección no lo
// reemplaza ni lo duplica. Sin props: no depende del Proyecto ni de su
// validez, así que se renderiza siempre, incluso con un proyecto inválido.
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'

export function MetodologiaYFuentesTecnicas() {
  return (
    <section>
      <h2>Metodología y fuentes técnicas</h2>
      <p>
        Los valores de C (Hazen-Williams) y ε (Darcy-Weisbach) de la tabla son parámetros técnicos adoptados por el
        proyecto: cada material tiene un único valor operativo, sin modelar edad, corrosión, incrustación ni
        variación del estado superficial en esta primera versión.
      </p>
      <p>
        ERAS-2023 contempla el uso de un coeficiente C según el material adoptado (§2.12.1), pero los números de
        este catálogo no provienen de una tabla publicada por ERAS-2023; su origen se indica para cada material.
      </p>
      <p>Darcy-Weisbach es una metodología técnica adoptada por el proyecto, no una prescripción específica de ERAS-2023.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Material</th>
              <th>C (Hazen-Williams)</th>
              <th>ε [mm] (Darcy-Weisbach)</th>
              <th>Fuente C</th>
              <th>Fuente ε</th>
            </tr>
          </thead>
          <tbody>
            {catalogoMaterialesTuberia.map((material) => (
              <tr key={material.id}>
                <td>{material.nombre}</td>
                <td>{material.coeficienteC}</td>
                <td>{material.rugosidadAbsoluta_mm}</td>
                <td>
                  <small>{material.referenciaFuenteC}</small>
                </td>
                <td>
                  <small>{material.referenciaFuenteRugosidad}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
