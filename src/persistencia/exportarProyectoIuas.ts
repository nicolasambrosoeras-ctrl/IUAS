// Descarga de un Proyecto como archivo .iuas (PERSIST-01, §16, §35, §39).
// Deliberadamente separado del serializador puro (§17): acá sí se toca el
// navegador (Blob, <a download>), pero no se modifica el proyecto ni
// ningún estado -- exportar es de sólo lectura.
import type { Proyecto } from '../modelo/proyecto';
import { serializarProyecto } from './serializarProyecto';

const CARACTERES_ILEGALES_EN_NOMBRE_DE_ARCHIVO = /[\\/:*?"<>|]+/g;

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

export function nombreDeArchivoIuas(proyecto: Proyecto, ahora: () => Date = () => new Date()): string {
  const nombre = proyecto.metadatos.nombre.trim();
  if (nombre.length > 0) {
    const sanitizado = nombre.replace(CARACTERES_ILEGALES_EN_NOMBRE_DE_ARCHIVO, '-').trim();
    if (sanitizado.length > 0) return `${sanitizado}.iuas`;
  }
  const fecha = ahora();
  const marca = `${fecha.getFullYear()}${dosDigitos(fecha.getMonth() + 1)}${dosDigitos(fecha.getDate())}-${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}`;
  return `proyecto-iuas-${marca}.iuas`;
}

export function descargarProyectoComoIuas(proyecto: Proyecto): void {
  const archivo = serializarProyecto(proyecto);
  const blob = new Blob([JSON.stringify(archivo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreDeArchivoIuas(proyecto);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  } finally {
    URL.revokeObjectURL(url);
  }
}
