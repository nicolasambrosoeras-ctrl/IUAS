// Prototipo de riesgo del Paso 5 (ROADMAP Fase 0, R5). Verifica que
// pdfmake produce un PDF de calidad aceptable: encabezado, tabla,
// formula, pasos, resultado y una no conformidad. No pasa por
// validacion/: no hay un Proyecto real que validar, solo un n=4
// inyectado a mano. Se borra cuando exista la interfaz real del
// Modulo 1 en Fase 1 -- no debe extenderse.
import { calcularCoeficienteDeSimultaneidad } from '../../motor/demanda/simultaneidad/calcularCoeficienteDeSimultaneidad'
import { generarDocumentoPdf } from '../../exportadores/pdf/generarDocumentoPdf'
import type { ResultadoDeCalculo } from '../../modelo/resultado'

function construirResultadoDePrueba(): ResultadoDeCalculo {
  const { resultado, paso } = calcularCoeficienteDeSimultaneidad(4)

  return {
    resultados: { kc: resultado },
    pasos: [paso],
    verificaciones: [
      {
        id: 'velocidad-ejemplo',
        concepto: 'Velocidad en tramo',
        valorObtenido: { valor: 2.8, unidad: 'm/s' },
        valorLimite: { valor: 2.0, unidad: 'm/s' },
        estado: 'no_conforme',
        referenciaNormativa: 'ERAS-2023 §6.6.1, Tabla N° 9',
      },
    ],
    advertencias: [
      {
        id: 'doc-prueba',
        mensaje:
          'Documento de prueba (Fase 0, Paso 5). No representa un proyecto real: ' +
          'combina un cálculo real (Kc) con un ejemplo de verificación tomado ' +
          'de la documentación (ADR-011, Arquitectura Sec.12.4).',
      },
    ],
    referencias: ['ERAS-2023 §2.9.2.2', 'ERAS-2023 §6.6.1, Tabla N° 9'],
    metadatos: {
      versionApp: '0.1.0',
      versionNormativa: 'eras-2023',
      moduloId: 'prototipo-pdf-fase-0',
    },
  }
}

export function PrototipoPdfFase0() {
  return (
    <div>
      <h1>IUAS -- Prototipo de PDF (Fase 0, Paso 5)</h1>
      <button onClick={() => generarDocumentoPdf(construirResultadoDePrueba())}>
        Generar PDF de prueba
      </button>
    </div>
  )
}
