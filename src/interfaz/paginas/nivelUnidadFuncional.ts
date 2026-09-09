// Convención IUAS (D-δ.46, reencuadrada por GEOM-UX-01 / D-δ.86) para
// proponer, al asignar/cambiar el nivel de una Unidad Funcional, una cota
// de PISO por defecto -- NUNCA atribuible a ERAS-2023, es una facilidad
// de carga rápida de IUAS, siempre editable por el usuario. Asume 3 m de
// altura libre entre plantas (PB = 0). Ya NO incluye el +1 m de "altura
// de conexión típica": esa altura sobre el piso la aporta ahora la Tabla
// IUAS por tipo de artefacto (alturasHidraulicasIuas), no un término fijo
// horneado en la cota de la UF -- así la cota hidráulica efectiva de cada
// terminal es piso + altura del artefacto, sin doble conteo.
export function calcularCotaHidraulicaDefaultDeNivel(nivel: number): number {
  return 3 * nivel
}

// Nombre humano de un nivel -- se deriva de `nivel` para cualquier
// entero, nunca hardcodea una enumeración finita de pisos (PB=0,
// Piso 1=1, Piso 2=2...). Subsuelos (nivel negativo) quedan fuera del
// alcance normativo/UX de esta corrida.
export function nombreDeNivel(nivel: number): string {
  return nivel === 0 ? 'PB' : `Piso ${nivel}`
}
