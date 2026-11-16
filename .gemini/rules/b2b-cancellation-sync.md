---
description: Regla de ventanas de cancelación y sincronización atómica B2B
globs: ["frontend/src/pages/MisReservasPage.jsx", "src/modules/**/*.service.ts", "src/modules/**/acl/*.ts"]
---

# Regla de Ventanas de Cancelación y Sincronización B2B

1. **Protección Preventiva en UI:**
   - En el frontend de reservas, la acción de cancelar debe condicionarse al cálculo de horas restantes antes del servicio:
     - Alojamientos: Mínimo 48 horas.
     - Atracciones, Autos y Vuelos: Mínimo 24 horas.
   - Si `horasRestantes < limite`, el botón de cancelar **NO debe renderizarse**; en su lugar debe desplegarse un mensaje claro informando que la ventana de cancelación gratuita ha expirado.

2. **Invariante Transaccional en Backend:**
   - El estado local de una reserva **SOLO** debe pasar a `CANCELLED` si el socio externo retorna un código HTTP 2xx exitoso.
   - Queda prohibido silenciar excepciones HTTP 409/400 de socios. Se debe propagar el error y mantener la reserva confirmada en Booking Central.

