// HYD-OVERPASS-01: catálogo de coeficientes de resistencia (K) publicado
// por el FABRICANTE (Grupo Dema / Acqua System®) para su propia línea de
// accesorios PPR -- "Coeficiente de resistencia de carga para accesorios
// Acqua System®" (Manual Técnico Acqua System, pág. 34: tabla numerada
// 1/2/2a/3/4/5/5a/6/6a/7/7a/8/8a/9/10/11). Fuente:
// https://www.grupodema.com.ar/bundles/app/front/images/Manual-Acqua-System-03-03-2026.pdf
//
// Deliberadamente DISTINTO de `tabla-07-perdidas-localizadas` (ERAS-2023
// §2.12.1, transcripción normativa que sigue firme, sin cambios, para
// cualquier sistema/material que NO sea Acqua System -- hierro, cobre,
// PVC genérico, etc.). No son el mismo catálogo con otro nombre: éste es
// un dato de FABRICANTE, aplicable únicamente cuando el sistema comercial
// adoptado del proyecto (`configuracionHidraulica.sistemaDeTuberiaId`) es
// `acquaSystemMagnumPn20` -- ver `resolverKsDeAccesorioDeTramo.ts` para la
// selección de catálogo (ocurre en el dominio hidráulico, nunca en el PDF
// ni sólo en Materials).
//
// Cobertura parcial, a propósito: el manual sólo publica coeficientes para
// las piezas que aparecen abajo. `llaveDePaso` y `valvulaEsclusa` (ambas
// parte de `IdAccesorioDeTramo`) NO tienen coeficiente propio publicado
// por Acqua System -- se conserva el valor de Tabla N°7 (ERAS-2023)
// también bajo este sistema, en vez de inventar un valor (ver
// `resolverKsDeAccesorioDeTramo.ts`). Tampoco se transcriben las 8 filas
// de "Te" (5/5a/6/6a/7/7a/8/8a): sus valores dependen de la combinación
// específica de diámetros de cada rama (gráfico de la tabla, no
// disponible como texto), y el modelo de dominio actual no representa Tee
// sobre `Tramo.accesorios` (viven en `Nodo.tee`, fuera de este catálogo,
// CRIT-A28) -- no se fuerza una equivalencia sin base documentada.
//
// Correspondencia física adoptada para las dos piezas que Acqua System
// fabrica como una sola familia (codo moldeado, sin variante de "curva"
// de radio distinto -- a diferencia de ERAS-2023, que sí distingue
// curva/codo para materiales que admiten curvado, como cobre o acero):
// `curva45`→ítem 4 "Codo a 45º" y `curva90`→ítem 3 "Codo a 90º". No es un
// valor inventado: es el único producto de esa función angular que Acqua
// System comercializa, con su coeficiente publicado.
//
// `reducciones`: el manual publica DOS valores distintos según el salto
// de diámetro (ítem 2 "diámetros inmediatos" / ítem 2a "diámetros
// mediatos", sin definir el límite exacto entre ambos categorías en el
// texto disponible). Se adopta el ítem 2 (0,55 -- diámmetros inmediatos,
// un único escalón de diámetro comercial contiguo) por ser el caso más
// frecuente en una reducción declarada sobre un Tramo; queda documentado
// como decisión de ingeniería de este slice, revisable si se necesita
// distinguir el salto de diámetro en un incremento futuro.
export type IdAccesorioConKAcquaSystem = 'uniones' | 'codo90' | 'curva45' | 'curva90' | 'reducciones' | 'sobrepaso'

export type FilaKAcquaSystem = {
  readonly id: IdAccesorioConKAcquaSystem
  readonly nombreAcqua: string
  readonly ks: number
  readonly itemManual: string
  readonly esValorPublicado: boolean
  readonly fundamento: string
}

export const catalogoKAccesoriosAcquaSystem: readonly FilaKAcquaSystem[] = [
  {
    id: 'uniones',
    nombreAcqua: 'Unión normal',
    ks: 0.25,
    itemManual: '1',
    esValorPublicado: true,
    fundamento: 'Manual Técnico Acqua System, pág. 34, ítem 1 (verificado también contra el ejemplo resuelto de pág. 33: "10 uniones normales ... r=0,25").',
  },
  {
    id: 'reducciones',
    nombreAcqua: 'Buje reducción de diámetros inmediatos',
    ks: 0.55,
    itemManual: '2',
    esValorPublicado: true,
    fundamento:
      'Manual Técnico Acqua System, pág. 34, ítem 2. El manual publica un segundo valor (ítem 2a, "diámetros mediatos", Ks=0,85) para reducciones de más de un escalón comercial; se adopta el ítem 2 (un único escalón, el caso más frecuente) como valor de proyecto para este slice.',
  },
  {
    id: 'codo90',
    nombreAcqua: 'Codo a 90º',
    ks: 2.0,
    itemManual: '3',
    esValorPublicado: true,
    fundamento: 'Manual Técnico Acqua System, pág. 34, ítem 3 (verificado también contra el ejemplo resuelto de pág. 33: "10 codos a 90º ... r=2").',
  },
  {
    id: 'curva90',
    nombreAcqua: 'Codo a 90º',
    ks: 2.0,
    itemManual: '3',
    esValorPublicado: true,
    fundamento:
      'Acqua System no fabrica una pieza de "curva" de radio distinto del codo moldeado a 90º (a diferencia de materiales curvables como cobre/acero, que sí la justifican en Tabla N°7 ERAS-2023) -- se adopta el mismo producto/coeficiente publicado que `codo90` bajo este catálogo.',
  },
  {
    id: 'curva45',
    nombreAcqua: 'Codo a 45º',
    ks: 0.6,
    itemManual: '4',
    esValorPublicado: true,
    fundamento: 'Manual Técnico Acqua System, pág. 34, ítem 4. Mismo criterio que `curva90`: única pieza de 45º que Acqua System fabrica.',
  },
  {
    id: 'sobrepaso',
    nombreAcqua: 'Sobrepaso fusión',
    ks: 1.2,
    itemManual: 'n/a',
    esValorPublicado: false,
    fundamento:
      'El manual no publica un coeficiente propio para "Sobrepaso fusión" (DN 20/25/32, código 08-0840*). Valor ADOPTADO por decisión de ingeniería del proyecto (usuario, HYD-OVERPASS-01): el sobrepaso produce dos cambios sucesivos de dirección, modelado como dos codos a 45º del propio catálogo Acqua System (ítem 4, Ks=0,60 cada uno) -- K_sobrepaso = 2 × 0,60 = 1,20. No es un valor publicado específicamente por el fabricante para este producto, y es revisable si Acqua System publica en el futuro un ensayo o coeficiente propio.',
  },
] as const

export function obtenerKsAcquaSystem(id: IdAccesorioConKAcquaSystem): FilaKAcquaSystem {
  const fila = catalogoKAccesoriosAcquaSystem.find((candidata) => candidata.id === id)
  if (fila === undefined) {
    throw new Error(`obtenerKsAcquaSystem: no existe ningún accesorio con id "${id}" en el catálogo Acqua System`)
  }
  return fila
}

export function tieneKAcquaSystem(id: string): id is IdAccesorioConKAcquaSystem {
  return catalogoKAccesoriosAcquaSystem.some((fila) => fila.id === id)
}
