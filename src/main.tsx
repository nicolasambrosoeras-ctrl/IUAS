import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrototipoPdfFase0 } from './interfaz/paginas/PrototipoPdfFase0'

const contenedor = document.getElementById('root')
if (!contenedor) {
  throw new Error('No se encontro el elemento #root en index.html')
}

createRoot(contenedor).render(
  <StrictMode>
    <PrototipoPdfFase0 />
  </StrictMode>,
)
