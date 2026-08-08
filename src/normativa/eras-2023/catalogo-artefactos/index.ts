// Catálogo de artefactos, paquete eras-2023, v1.0.
// Fuente: ERAS-2023 §2.9.1.2, §2.9.1.3 y §2.9.1.4.

export type RegimenCatalogo = 'domiciliario' | 'noDomiciliario';

export type ArtefactoNormativo = {
  id: string;
  nombre: string;
  regimen: RegimenCatalogo;
  quTotal_lps: number;
  quFria_lps: number | null;
  quCaliente_lps: number | null;
  presionMinima_kgcm2: number | null;
  limpiezaConValvulaAutomatica: boolean;
  origen: 'normativo';
  referenciaArticulo: string;
};

export const catalogoArtefactos: readonly ArtefactoNormativo[] = [
  {
    id: 'inodoroValvula',
    nombre: 'Inodoro con válvula automática',
    regimen: 'domiciliario',
    quTotal_lps: 1.5,
    quFria_lps: 1.5,
    quCaliente_lps: 0,
    presionMinima_kgcm2: 1.5,
    limpiezaConValvulaAutomatica: true,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'banera',
    nombre: 'Bañera',
    regimen: 'domiciliario',
    quTotal_lps: 0.3,
    quFria_lps: 0.12,
    quCaliente_lps: 0.18,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'receptaculoDucha',
    nombre: 'Receptáculo de ducha',
    regimen: 'domiciliario',
    quTotal_lps: 0.3,
    quFria_lps: 0.12,
    quCaliente_lps: 0.18,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'bidet',
    nombre: 'Bidet',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.08,
    quCaliente_lps: 0.12,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'lavatorio',
    nombre: 'Lavatorio',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.08,
    quCaliente_lps: 0.12,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'inodoroDeposito',
    nombre: 'Inodoro a depósito',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.08,
    quCaliente_lps: 0.12,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'piletaDeCocina',
    nombre: 'Pileta de cocina',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.08,
    quCaliente_lps: 0.12,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'maquinaLavavajillas',
    nombre: 'Máquina lavavajillas',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.2,
    quCaliente_lps: 0,
    presionMinima_kgcm2: null,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'piletaDeLavar',
    nombre: 'Pileta de lavar',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.08,
    quCaliente_lps: 0.12,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'maquinaLavarropas',
    nombre: 'Máquina lavarropas',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.2,
    quCaliente_lps: 0,
    presionMinima_kgcm2: 0.3,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.2',
  },
  {
    id: 'valvulaMingitorio',
    nombre: 'Válvula de mingitorio',
    regimen: 'noDomiciliario',
    quTotal_lps: 0.15,
    quFria_lps: null,
    quCaliente_lps: null,
    presionMinima_kgcm2: 0.9,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.3',
  },
  {
    id: 'piletaDeCocinaIndustrial',
    nombre: 'Pileta de cocina industrial',
    regimen: 'noDomiciliario',
    quTotal_lps: 0.5,
    quFria_lps: null,
    quCaliente_lps: null,
    presionMinima_kgcm2: null,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.3',
  },
  {
    id: 'lavavajillasIndustrial',
    nombre: 'Lavavajillas industrial',
    regimen: 'noDomiciliario',
    quTotal_lps: 0.4,
    quFria_lps: null,
    quCaliente_lps: null,
    presionMinima_kgcm2: 0.9,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.3',
  },
  {
    id: 'lavarropasIndustrial',
    nombre: 'Lavarropas industrial',
    regimen: 'noDomiciliario',
    quTotal_lps: 0.5,
    quFria_lps: null,
    quCaliente_lps: null,
    presionMinima_kgcm2: 0.9,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.3',
  },
  {
    id: 'lavachatas',
    nombre: 'Lavachatas',
    regimen: 'noDomiciliario',
    quTotal_lps: 1.2,
    quFria_lps: null,
    quCaliente_lps: null,
    presionMinima_kgcm2: 1.5,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'ERAS-2023 §2.9.1.3',
  },
  // Artefacto incorporado por inferencia de diseño. No figura explícitamente
  // en la Guía de Instalaciones Internas ERAS-2023: no hay canilla de
  // jardín, de riego, exterior ni de servicio en ningún artículo del
  // catálogo transcripto. Se adopta quTotal_lps = 0,20 y
  // presionMinima_kgcm2 = 0,6 por analogía con los picos de agua
  // domiciliarios simples ya normados (pileta de cocina, pileta de lavar),
  // que comparten ambos valores -- no son un dato normativo. quFria_lps
  // = quTotal_lps y quCaliente_lps = 0 porque es un punto de agua fría, sin
  // alimentación de agua caliente. Revisar si una futura edición de la
  // norma incorpora una canilla de servicio específica y reemplazar estos
  // valores por los normativos en ese caso.
  {
    id: 'canillaDeServicio',
    nombre: 'Canilla de servicio',
    regimen: 'domiciliario',
    quTotal_lps: 0.2,
    quFria_lps: 0.2,
    quCaliente_lps: 0,
    presionMinima_kgcm2: 0.6,
    limpiezaConValvulaAutomatica: false,
    origen: 'normativo',
    referenciaArticulo: 'No normativo -- inferencia de diseño (ver comentario)',
  },
] as const;
