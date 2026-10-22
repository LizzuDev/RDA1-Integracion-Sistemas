# ADR-004: Máquina de Estados Finita y Enfriamiento de 2 Horas en la Flota de Autos

## Estado
Aceptado (Accepted)

## Contexto
En un negocio de renta de vehículos real, un automóvil devuelto por un cliente no puede ponerse a disposición de otro arrendatario de forma instantánea. Debe someterse a inspección física, reposición de combustible y un proceso exhaustivo de limpieza y desinfección.

La directriz del docente requiere explícitamente:
> *"Manejar estados (listo, reservado, limpieza)... tiempo de 2 horas para poner nuevamente al auto... control de mantenimiento (kilometraje, características, alerta de mantenimiento)."*

Si el sistema permitiera transiciones arbitrarias sin validación de reglas de negocio, se podrían generar condiciones de carrera, sobreventa o entregas de vehículos en mal estado.

## Decisión
Se implementa una **Máquina de Estados Finita (FSM)** estricta para la entidad `Auto`:
1. **Estados del Ciclo de Vida:**
   - `DISPONIBLE`: Auto listo en catálogo para ser seleccionado y reservado.
   - `RESERVADO`: Bloqueado temporalmente por una orden de compra confirmada.
   - `LISTO_PARA_ENTREGAR`: Preparado físicamente en patio a la espera del cliente.
   - `ENTREGADO`: El cliente completó el check-in y se encuentra conduciendo el vehículo.
   - `EN_LIMPIEZA`: Estado obligatorio inmediatamente posterior a la devolución.
   - `EN_MANTENIMIENTO`: Vehículo retenido por alerta de kilometraje o daño reportado.
2. **Regla de Enfriamiento de 2 Horas:**
   - Al registrarse la devolución, el campo `limpieza_inicio` se marca con el timestamp actual y el auto transita a `EN_LIMPIEZA`.
   - Se programa un temporizador asíncrono o cron job (`@nestjs/schedule`) que evalúa los vehículos en limpieza.
   - **Solo cuando hayan transcurrido al menos 120 minutos (2 horas)** y no existan alertas mecánicas pendientes, el auto transita automáticamente a `DISPONIBLE`.
3. **Rol de Mantenimiento y Alertas Preventivas:**
   - Se crea el rol `mantenimiento` para operarios de patio.
   - Al devolver el auto, el operario registra el kilometraje de llegada y observaciones físicas mediante `POST /api/v1/autos/{id}/mantenimiento/registro`.
   - Si `kilometraje_llegada >= km_proxima_revision`, el sistema activa automáticamente la bandera `alerta_mantenimiento = true` y fuerza la transición a `EN_MANTENIMIENTO`.

## Consecuencias
### Positivas
- Se garantiza la consistencia del inventario de flota vehicular y la adherencia estricta a reglas de negocio de la industria del alquiler.
- Evita que un auto devuelto sea arrendado de inmediato sin pasar por el período reglamentario de 2 horas.
- Separa las responsabilidades entre el cliente (renta), el administrador (gestión global) y el operario de mantenimiento (inspección física).

### Desafíos Aceptados
- Durante las pruebas y demostraciones en vivo de la defensa, esperar 2 horas reales puede resultar inviable; por ello, se debe prever una variable de entorno `CLEANING_COOLDOWN_MINUTES` que por defecto sea `120` pero permita configurarse en `1` o `2` minutos para facilitar la demostración de la transición automática al docente evaluador.
