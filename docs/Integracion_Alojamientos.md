# Integración de proveedores de alojamientos

Cómo el sistema de Alojamientos de un proveedor (por ejemplo, otro grupo de la
asignatura) publica y mantiene su inventario en el Booking. El contrato completo
está en Swagger (`/api/docs`, sección *Alojamientos*).

## 1. Alta del proveedor (lo hace el administrador)

1. Elegir un `proveedorId` en minúsculas, por ejemplo `grupo3-alojamientos`.
2. Generar una clave aleatoria de al menos 16 caracteres.
3. Añadirla a la variable de entorno del backend, separando proveedores con comas:

   ```
   ALOJAMIENTOS_API_KEYS=grupo3-alojamientos:clave-larga-y-aleatoria,otro-proveedor:otra-clave
   ```

4. Entregar la clave al proveedor por un canal privado y reiniciar el backend.

> **Base de datos:** antes del primer despliegue hay que ejecutar en Supabase
> `database/migraciones/2026-10-12_alojamientos_integracion.sql`. Crea las columnas
> de proveedor (`proveedor_id`, `id_externo`, `estado`, `politicas`,
> `ultima_sincronizacion`) junto con sus restricciones e índices. El backend no
> cambia el esquema por su cuenta: si faltan columnas, solo lo avisa en el log al arrancar.

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
                     "cancelacion": "Gratis hasta 48 h antes", "mascotas": true }
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
| Eliminar | `DELETE /api/v1/alojamientos/{id}` (409 si tiene reservas confirmadas pendientes: desactivarlo en su lugar) |

Un proveedor **solo** puede ver y modificar sus propios alojamientos (403 en los demás).
Cada cambio queda registrado en la auditoría del panel como `proveedor:<proveedorId>`.

## 4. Códigos de respuesta

| Código | Significado |
|---|---|
| 200 / 201 / 204 | Correcto |
| 400 | Datos inválidos: `invalidParams` indica el campo exacto |
| 401 | Falta la API key o no es válida |
| 403 | El alojamiento pertenece a otro proveedor |
| 404 | El alojamiento no existe |
| 409 | `idExterno` ya existe (usar sincronizar) o hay reservas pendientes al borrar |
