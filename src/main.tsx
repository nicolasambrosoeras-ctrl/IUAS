import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotorDemandaPantalla } from './interfaz/paginas/MotorDemandaPantalla'

const contenedor = document.getElementById('root')
if (!contenedor) {
  throw new Error('No se encontro el elemento #root en index.html')
}

createRoot(contenedor).render(
  <StrictMode>
    <MotorDemandaPantalla />
  </StrictMode>,
)
