# Integración de proveedores de alojamientos

Cómo el sistema de Alojamientos de un proveedor (por ejemplo, otro grupo de la
asignatura) publica y mantiene su inventario en el Booking. El contrato completo
está en Swagger (`/api/docs`, sección *Alojamientos*).

## 1. Alta del proveedor (lo hace el administrador)

1. En el panel: **Gestión → Catálogo de alojamientos → 🔑 Proveedores → Registrar proveedor**
   (o `POST /api/v1/alojamientos/gestion/proveedores` con token de administrador).
2. Elegir un `id` en minúsculas, por ejemplo `grupo3-alojamientos`, y un nombre.
3. Se genera su **API key**, que se muestra **una sola vez**: hay que copiarla y entregársela
   al proveedor por un canal privado. En la base de datos solo se guarda su hash SHA-256.
4. Desde la misma pantalla se puede **rotar** la clave (la anterior deja de funcionar al instante),
   **desactivar** al proveedor (su clave deja de funcionar, no se borra nada) o eliminarlo si no tiene alojamientos.

> Las claves de la variable `ALOJAMIENTOS_API_KEYS="id:clave,..."` siguen funcionando: al arrancar,
> el backend las registra en la tabla `proveedores_alojamiento`. Desde ese momento manda la tabla.

> **Base de datos:** antes del primer despliegue hay que ejecutar en Supabase, en orden,
> `database/migraciones/2026-10-12_alojamientos_integracion.sql` y
> `database/migraciones/2026-10-13_alojamientos_modelo_relacional.sql`.
> El backend no cambia el esquema por su cuenta: si falta algo, lo avisa en el log al arrancar.

## 2. Sincronizar el inventario (lo hace el sistema del proveedor)

```
POST /api/v1/alojamientos/sincronizar
X-Api-Key: <clave del proveedor>
Content-Type: application/json

{
  "alojamientos": [
    {
      "idExterno": "HTL-0042",
      "nombre": "Hostal Andino",
      "destino": "Otavalo",
      "precioPorNoche": 38.9,
      "moneda": "USD",
      "capacidadAdultos": 3,
      "capacidadNinos": 1,
      "habitaciones": 4,
      "tienePiscina": false,
      "descripcion": "Casa colonial junto a la Plaza de los Ponchos.",
      "photos": [{ "url": "https://cdn.proveedor.com/andino/1.jpg", "caption": "Fachada" }],
      "amenidades": ["WiFi gratis", "Desayuno"],
      "ubicacion": { "address": "Calle Sucre 10-12", "city": "Otavalo", "country": "EC",
                     "coordinates": { "latitude": 0.2343, "longitude": -78.2611 } },
      "politicas": { "checkin_desde": "14:00", "checkout_hasta": "11:00",
                     "cancelacion": "Gratis hasta 48 h antes", "mascotas": true },
      "tiposHabitacion": [
        { "codigo": "doble", "nombre": "Habitación doble", "capacidadAdultos": 2,
          "precioPorNoche": 38.9, "cantidad": 3, "regimen": "DESAYUNO", "cancelacionGratuitaHoras": 48,
          "descripcionCamas": "1 cama matrimonial", "tamanoM2": 18 },
        { "codigo": "familiar", "nombre": "Familiar", "capacidadAdultos": 4, "capacidadNinos": 2,
          "precioPorNoche": 62, "cantidad": 1, "cancelacionGratuitaHoras": null }
      ]
    }
  ]
}
```

- **Obligatorios:** `idExterno`, `nombre`, `destino`, `precioPorNoche`, `capacidadAdultos`,
  `capacidadNinos`, `habitaciones` y `tienePiscina`. El resto es opcional.
- **Idempotente:** la clave es `(proveedorId, idExterno)`. Reenviar un alojamiento lo
  **actualiza**, nunca lo duplica. Se puede enviar el inventario completo cada vez.
- **Retirar** un alojamiento: enviarlo con `"estado": "INACTIVO"`. Desaparece del
  catálogo público y no se puede reservar, pero sus reservas existentes se conservan.
- **Hasta 100** alojamientos por lote.
- **Tipos de habitación (opcional):** cada uno con su precio, cupo (`cantidad`), capacidad, régimen
  (`SOLO_ALOJAMIENTO`, `DESAYUNO`, `MEDIA_PENSION`, `PENSION_COMPLETA`, `TODO_INCLUIDO`) y
  `cancelacionGratuitaHoras` (`null` = no reembolsable). Se emparejan por `codigo`: los que ya no se
  envían se **desactivan** (nunca se borran, pueden tener reservas). Si no se envían, el alojamiento
  tiene un único tipo «estándar» con su `precioPorNoche`, `habitaciones` y capacidad.
  Con tipos, el precio «desde», las habitaciones y la capacidad del alojamiento se calculan a partir de ellos.
- **`null` no borra un campo obligatorio** (`moneda`, `photos`, `ubicacion`, `estado`, capacidades…):
  responde 400. Para no cambiar un campo, basta con no enviarlo. Solo `descripcion` y `politicas` se pueden vaciar con `null`.
- **Formatos:** fotos solo `https://`; `moneda` en ISO 4217 (`USD`);
  `country` en ISO 3166-1 alfa-2 (`EC`); horas `HH:MM`.

### Respuesta

Cada alojamiento se valida por separado: uno inválido no impide guardar los demás.

```json
{
  "proveedor_id": "grupo3-alojamientos",
  "resumen": { "recibidos": 2, "creados": 1, "actualizados": 0, "errores": 1 },
  "resultados": [
    { "indice": 0, "idExterno": "HTL-0042", "resultado": "CREADO", "id": "grupo3-alojamientos-HTL-0042", "estado": "ACTIVO" },
    { "indice": 1, "idExterno": "HTL-0043", "resultado": "ERROR",
      "errores": [{ "name": "precioPorNoche", "reason": "precioPorNoche must be a positive number" }] }
  ]
}
```

## 3. Otras operaciones con la misma API key

| Operación | Endpoint |
|---|---|
| Ver mi inventario (con estado y reservas pendientes) | `GET /api/v1/alojamientos/gestion/catalogo` |
| Cambiar un campo (precio, estado…) | `PATCH /api/v1/alojamientos/{id}` |
| Gestionar un tipo de habitación | `POST /api/v1/alojamientos/{id}/tipos-habitacion`, `PATCH`/`DELETE …/tipos-habitacion/{tipoId o codigo}` |
| Eliminar | `DELETE /api/v1/alojamientos/{id}` (409 si tiene reservas confirmadas pendientes: desactivarlo en su lugar) |

Un proveedor **solo** puede ver y modificar sus propios alojamientos (403 en los demás).
Cada cambio queda registrado en la auditoría del panel como `proveedor:<proveedorId>`.

## 4. Códigos de respuesta

| Código | Significado |
|---|---|
| 200 / 201 / 204 | Correcto |
| 400 | Datos inválidos: `invalidParams` indica el campo exacto |
| 401 | Falta la API key, no es válida, se rotó o el proveedor está desactivado |
| 403 | El alojamiento pertenece a otro proveedor |
| 404 | El alojamiento no existe |
| 409 | `idExterno` ya existe (usar sincronizar) o hay reservas pendientes al borrar |

## 5. Modelo de datos

```
proveedores_alojamiento 1 ── N alojamientos 1 ── N tipos_habitacion 1 ── N reservas_alojamiento 1 ── N huespedes_reserva
                                                         auth.users 1 ── N reservas_alojamiento
```

- **Reservas:** cada una es de un tipo de habitación, guarda la tarifa por noche contratada
  (`precio_noche`), adultos y niños, contacto, peticiones especiales, hora de llegada y,
  si se canceló, motivo y fecha.
- **Usuario:** con sesión iniciada, la reserva se vincula a `auth.users` (`usuario_id`) y aparece
  en «Mis reservas» aunque se use otro correo; sin sesión se reserva como invitado y se asocia por correo.
- **Huéspedes:** titular y acompañantes (con edad en el caso de los niños).
- **Bajas:** un alojamiento con reservas pasadas se da de baja lógica (`deleted_at`) para conservar
  el historial; reenviarlo por sincronización lo restaura con el mismo id.
