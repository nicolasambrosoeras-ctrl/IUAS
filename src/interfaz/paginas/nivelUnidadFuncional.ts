// Convención IUAS (D-δ.46) para proponer, al asignar/cambiar el nivel de
// una Unidad Funcional en modo simplificado, una cota hidráulica de
// referencia por defecto -- NUNCA atribuible a ERAS-2023, es una
// facilidad de carga rápida de IUAS, siempre editable por el usuario
// (ver PENDIENTES-DE-ARQUITECTURA.md D-δ.46). Asume ~1 m de altura de
// conexión típica sobre el nivel de piso y 3 m de altura libre entre
// plantas -- ninguno de los dos valores tiene base normativa, son una
// aproximación deliberada para minimizar carga manual en el caso común.
export function calcularCotaHidraulicaDefaultDeNivel(nivel: number): number {
  return 1 + 3 * nivel
}

// Nombre humano de un nivel -- se deriva de `nivel` para cualquier
// entero, nunca hardcodea una enumeración finita de pisos (PB=0,
// Piso 1=1, Piso 2=2...). Subsuelos (nivel negativo) quedan fuera del
// alcance normativo/UX de esta corrida.
export function nombreDeNivel(nivel: number): string {
  return nivel === 0 ? 'PB' : `Piso ${nivel}`
}
