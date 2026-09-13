// Hook de autosave con debounce (PERSIST-01, §27). Programa un guardado
// en localStorage `DEBOUNCE_MS` después del último cambio de `proyecto`;
// una ráfaga de cambios (p. ej. tipear en un input controlado) sólo
// produce UN write al asentarse. No guarda en cada render: el efecto sólo
// depende de la identidad de `proyecto` (que sólo cambia con una edición
// real, ver comentario de PERF-SCALE-01C en MotorDemandaPantalla.tsx).
import { useEffect, useRef, useState } from 'react';
import type { Proyecto } from '../../modelo/proyecto';
import { guardarAutosaveDeProyecto } from '../../persistencia/autosave';

const DEBOUNCE_MS = 500;

export function useAutosaveDeProyecto(proyecto: Proyecto): { readonly errorDeGuardado: string | null } {
  const [errorDeGuardado, setErrorDeGuardado] = useState<string | null>(null);

  // Evita el guardado del primer render (el proyecto recién montado ya
  // viene, o bien del autosave leído al bootstrapear, o bien del demo/
  // proyecto vacío -- no hace falta reescribirlo de inmediato).
  const esPrimerRender = useRef(true);

  useEffect(() => {
    if (esPrimerRender.current) {
      esPrimerRender.current = false;
      return;
    }
    const temporizador = window.setTimeout(() => {
      const resultado = guardarAutosaveDeProyecto(proyecto);
      setErrorDeGuardado(resultado.ok ? null : resultado.detalle);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(temporizador);
  }, [proyecto]);

  return { errorDeGuardado };
}
