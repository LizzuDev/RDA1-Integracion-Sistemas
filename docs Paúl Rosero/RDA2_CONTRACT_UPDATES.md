# RDA2 Contract Updates Required

Al analizar los contratos actuales (`autos-openapi.yaml` y `atracciones-openapi.yaml`) y contrastarlos con las interfaces gráficas creadas para la aplicación en el Frontend (Booking Prototipo), se ha determinado que existe información que actualmente el frontend espera mostrar pero que los contratos en su versión inicial (RDA1) no envían. 

Por lo tanto, se ha procedido a **comentar (ocultar) estas secciones en el Frontend** temporalmente para que no se muestren vacías al integrarse con los backends.

Para la **RDA2**, se debe solicitar la actualización de ambos contratos para incluir los siguientes campos:

## 1. Contrato de Autos (`autos-openapi.yaml`)

El componente `AutoDetail.jsx` incluye múltiples detalles visuales que no se devuelven en la respuesta de detalles del vehículo ni del catálogo.

**Campos que se deben añadir al esquema `CarDetailsResponse` o `CarSearchResponse`:**
- **Transmisión (`transmission`):** Si bien existe como filtro, no se devuelve en la respuesta del detalle del vehículo (Ej. Automática o Manual).
- **Imágenes (`images` o `photos`):** Un array con las URL de las fotografías del auto. Actualmente el contrato no provee imágenes del vehículo.
- **Detalles del Proveedor (`supplierInfo` extendido):** El contrato retorna la calificación general (`score`), pero el Frontend también despliega el texto equivalente (Ej. "Muy buena elección") y la cantidad total de reseñas o comentarios recibidos (`reviews_count`).
- **Inclusiones de la Tarifa (`included_in_price`):** Elementos que están incluidos en el costo, como "Cancelación gratuita", "Kilometraje ilimitado" o "Cobertura parcial por colisión".
- **Instrucciones para la Recogida (`pickup_instructions`):** Información clave para el usuario como documentos a llevar (pasaporte, licencia), puntualidad, políticas del depósito reembolsable (cantidad en USD) e información sobre franquicias por daños.

## 2. Contrato de Atracciones (`atracciones-openapi.yaml`)

El componente `AtraccionDetail.jsx` muestra el desglose de las reseñas y los comentarios individuales de clientes, los cuales no están disponibles en la API actual.

**Campos que se deben añadir al esquema `AtraccionResponse` o en un nuevo endpoint `/atracciones/{id}/reviews`:**
- **Desglose de Calificaciones (`ratings_breakdown`):** Detalles específicos de la calificación, tales como "Limpieza", "Servicio y Atención", y "Calidad General". Actualmente solo se envía la calificación global (`score`) y número de opiniones.
- **Comentarios de Clientes (`reviews`):** Un listado o arreglo de las reseñas de clientes, con atributos como nombre del usuario, nacionalidad (país del que provienen) y el texto del comentario.

---

> **Acción realizada en el Frontend:**
> Las secciones del HTML/React correspondientes a estos campos han sido envueltas en comentarios de JSX (`{/* ... */}`) para evitar inconsistencias de diseño. Una vez que el contrato para la RDA2 se oficialice, estas secciones se podrán descomentar y enlazar con la nueva data enviada desde el Backend.
