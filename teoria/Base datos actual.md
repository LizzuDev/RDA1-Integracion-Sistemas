## Table `carrito_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tipo_producto` | `text` |  |
| `producto_id_externo` | `uuid` |  |
| `nombre_producto` | `varchar` |  |
| `precio_unitario` | `numeric` |  |
| `cantidad` | `int4` |  |
| `fecha_inicio` | `date` |  Nullable |
| `fecha_fin` | `date` |  Nullable |
| `notas` | `text` |  Nullable |
| `api_origen_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `carrito_id` | `uuid` |  Nullable |

## Table `carritos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `estado` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `usuario_id` | `uuid` |  Nullable |

## Table `factura_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tipo_producto` | `text` |  |
| `producto_id_externo` | `uuid` |  |
| `nombre_producto` | `varchar` |  |
| `descripcion_producto` | `text` |  Nullable |
| `cantidad` | `int4` |  |
| `precio_unitario` | `numeric` |  |
| `subtotal` | `numeric` |  |
| `fecha_inicio` | `date` |  Nullable |
| `fecha_fin` | `date` |  Nullable |
| `created_at` | `timestamptz` |  |
| `factura_id` | `uuid` |  Nullable |

## Table `facturas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `numero_factura` | `varchar` |  Unique |
| `nombre_cliente` | `varchar` |  |
| `cedula_ruc_cliente` | `varchar` |  |
| `email_cliente` | `varchar` |  |
| `direccion_cliente` | `text` |  Nullable |
| `subtotal` | `numeric` |  |
| `iva_porcentaje` | `numeric` |  |
| `iva_valor` | `numeric` |  |
| `total` | `numeric` |  |
| `metodo_pago` | `text` |  |
| `referencia_pago` | `varchar` |  Nullable |
| `estado` | `text` |  |
| `notas` | `text` |  Nullable |
| `emitida_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `carrito_id` | `uuid` |  Nullable Unique |
| `usuario_id` | `uuid` |  Nullable |

## Table `usuarios`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre` | `varchar` |  Nullable |
| `email` | `varchar` |  Unique |
| `password_hash` | `text` |  Nullable |
| `cedula_ruc` | `varchar` |  Nullable |
| `telefono` | `varchar` |  Nullable |
| `direccion` | `text` |  Nullable |
| `rol` | `text` |  |
| `estado` | `text` |  |
| `refresh_token_hash` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `api_request_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `metodo` | `varchar` |  |
| `ruta` | `text` |  |
| `status_code` | `int4` |  |
| `duracion_ms` | `int4` |  |
| `ip_cliente` | `varchar` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `usuario_id` | `uuid` |  Nullable |

## Table `estado_servicios`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `nombre_servicio` | `varchar` |  |
| `url_healthcheck` | `text` |  |
| `estado` | `text` |  |
| `tiempo_respuesta_ms` | `int4` |  Nullable |
| `ultimo_error` | `text` |  Nullable |
| `verificado_at` | `timestamptz` |  |

## Table `configuraciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `clave` | `varchar` |  Unique |
| `valor` | `text` |  |
| `descripcion` | `text` |  Nullable |
| `tipo_dato` | `text` |  |
| `updated_at` | `timestamptz` |  |
| `updated_by` | `uuid` |  Nullable |

## Table `atracciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `long_description` | `text` |  |
| `duration` | `varchar` |  Nullable |
| `price` | `jsonb` |  Nullable |
| `categories` | `jsonb` |  Nullable |
| `badges` | `jsonb` |  Nullable |
| `locations` | `jsonb` |  Nullable |
| `photos` | `jsonb` |  Nullable |
| `operator` | `jsonb` |  Nullable |
| `product_type` | `varchar` |  |
| `includes` | `jsonb` |  Nullable |
| `supported_languages` | `jsonb` |  Nullable |
| `free_cancellation` | `bool` |  |
| `ratings` | `jsonb` |  Nullable |
| `createdAt` | `timestamp` |  |
| `updatedAt` | `timestamp` |  |
| `deletedAt` | `timestamp` |  Nullable |

## Table `reservas_atraccion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `atraccionId` | `varchar` |  |
| `idempotencyKey` | `uuid` |  Unique |
| `status` | `varchar` |  |
| `ticketCount` | `int4` |  |
| `totalPrice` | `jsonb` |  |
| `customerName` | `varchar` |  |
| `customerEmail` | `varchar` |  Nullable |
| `date` | `date` |  |
| `time` | `varchar` |  Nullable |
| `createdAt` | `timestamp` |  |
| `updatedAt` | `timestamp` |  |

## Table `aerolinea`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_aerolinea` | `varchar` | Primary |
| `ael_nombre` | `varchar` |  |

## Table `vuelo`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_vuelo` | `uuid` | Primary |
| `vue_numerovuelo` | `varchar` |  |
| `vue_fecha` | `date` |  |
| `vue_aerolineamarketingid` | `varchar` |  |
| `vue_aerolineaoperadoraid` | `varchar` |  |
| `vue_aeropuertoorigen` | `varchar` |  |
| `vue_aeropuertodestino` | `varchar` |  |
| `vue_terminalorigen` | `varchar` |  Nullable |
| `vue_terminaldestino` | `varchar` |  Nullable |
| `vue_horasalidaprogramada` | `timestamptz` |  |
| `vue_horasalidaestimada` | `timestamptz` |  Nullable |
| `vue_horasalidareal` | `timestamptz` |  Nullable |
| `vue_horallegadaprogramada` | `timestamptz` |  |
| `vue_horallegadaestimada` | `timestamptz` |  Nullable |
| `vue_horallegadareal` | `timestamptz` |  Nullable |
| `vue_aeronave` | `varchar` |  Nullable |
| `vue_duracionminutos` | `int4` |  Nullable |
| `vue_estado` | `varchar` |  |

## Table `asiento_vuelo`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_asiento_vuelo` | `uuid` | Primary |
| `asi_vueloid` | `uuid` |  |
| `asi_numeroasiento` | `varchar` |  |
| `asi_fila` | `int2` |  |
| `asi_clasecabina` | `varchar` |  |
| `asi_estadisponible` | `bool` |  |
| `asi_caracteristicas` | `_varchar` |  |

## Table `oferta`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_oferta` | `uuid` | Primary |
| `ofe_offerid` | `varchar` |  Unique |
| `ofe_aerolineaid` | `varchar` |  |
| `ofe_fechacreacion` | `timestamptz` |  |
| `ofe_expiraen` | `timestamptz` |  |
| `ofe_moneda` | `varchar` |  |
| `ofe_tarifabase` | `numeric` |  |
| `ofe_impuestos` | `numeric` |  |
| `ofe_total` | `numeric` |  |
| `ofe_huellacatalogo` | `bpchar` |  Nullable |

## Table `oferta_itinerario`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_oferta_itinerario` | `uuid` | Primary |
| `oit_ofertaid` | `uuid` |  |
| `oit_itineraryid` | `varchar` |  |
| `oit_orden` | `int2` |  |
| `oit_duraciontotalminutos` | `int4` |  |
| `oit_escalas` | `int2` |  |

## Table `oferta_segmento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_oferta_segmento` | `uuid` | Primary |
| `osg_itinerarioid` | `uuid` |  |
| `osg_vueloid` | `uuid` |  |
| `osg_segmentid` | `varchar` |  |
| `osg_orden` | `int2` |  |
| `osg_escalaminutos` | `int4` |  Nullable |
| `osg_estado` | `varchar` |  Nullable |

## Table `tarifa_cabina`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_tarifa_cabina` | `uuid` | Primary |
| `tca_ofertaid` | `uuid` |  Nullable |
| `tca_reservaid` | `uuid` |  Nullable |
| `tca_itinerarioid` | `uuid` |  |
| `tca_clasecabina` | `varchar` |  |
| `tca_marcatarifa` | `varchar` |  |
| `tca_asientosdisponibles` | `int2` |  |
| `tca_esreembolsable` | `bool` |  |
| `tca_esmodificable` | `bool` |  |
| `tca_moneda` | `varchar` |  |
| `tca_tarifabase` | `numeric` |  |
| `tca_impuestos` | `numeric` |  |
| `tca_total` | `numeric` |  |
| `tca_precioequipajeextra` | `numeric` |  |

## Table `tarifa_equipaje`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `teq_tarifacabinaid` | `uuid` | Primary |
| `teq_incluyepersonal` | `bool` |  |
| `teq_incluyemano` | `int2` |  |
| `teq_incluyebodega` | `int2` |  |

## Table `tarifa_precio_pasajero`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `tpp_tarifacabinaid` | `uuid` | Primary |
| `tpp_tipopasajero` | `varchar` | Primary |
| `tpp_moneda` | `varchar` |  |
| `tpp_tarifabase` | `numeric` |  |
| `tpp_impuestos` | `numeric` |  |
| `tpp_total` | `numeric` |  |

## Table `bloqueo_cupo`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_bloqueo_cupo` | `uuid` | Primary |
| `blo_ofertaid` | `uuid` |  |
| `blo_propietarioid` | `uuid` |  |
| `blo_fechacreacion` | `timestamptz` |  |
| `blo_fechaexpiracion` | `timestamptz` |  |
| `blo_ttlminutos` | `int2` |  |
| `blo_estado` | `varchar` |  |
| `blo_moneda` | `varchar` |  |
| `blo_preciocongelado` | `numeric` |  |
| `blo_adultos` | `int2` |  |
| `blo_jovenes` | `int2` |  |
| `blo_ninos` | `int2` |  |
| `blo_infants` | `int2` |  |
| `blo_totalpasajeros` | `int2` |  Nullable |
| `blo_version` | `int8` |  |

## Table `bloqueo_itinerario`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_bloqueo_itinerario` | `uuid` | Primary |
| `bli_bloqueocupoid` | `uuid` |  |
| `bli_itineraryid` | `varchar` |  |
| `bli_clasecabina` | `varchar` |  |
| `bli_marcatarifa` | `varchar` |  |
| `bli_orden` | `int2` |  |

## Table `reserva`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_reserva` | `uuid` | Primary |
| `res_pnr` | `varchar` |  Nullable Unique |
| `res_propietarioid` | `uuid` |  |
| `res_estado` | `varchar` |  |
| `res_bloqueocupoid` | `uuid` |  Nullable |
| `res_moneda` | `varchar` |  |
| `res_tarifabase` | `numeric` |  |
| `res_impuestos` | `numeric` |  |
| `res_total` | `numeric` |  |
| `res_referenciapago` | `varchar` |  Nullable |
| `res_fechacreacion` | `timestamptz` |  |
| `res_fechaactualizacion` | `timestamptz` |  |
| `res_cortecheckin` | `timestamptz` |  Nullable |
| `res_version` | `int8` |  |

## Table `reserva_itinerario`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_reserva_itinerario` | `uuid` | Primary |
| `rit_reservaid` | `uuid` |  |
| `rit_itineraryid` | `varchar` |  |
| `rit_orden` | `int2` |  |
| `rit_duraciontotalminutos` | `int4` |  |
| `rit_escalas` | `int2` |  |

## Table `reserva_segmento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_reserva_segmento` | `uuid` | Primary |
| `rsg_itinerarioid` | `uuid` |  |
| `rsg_vueloid` | `uuid` |  |
| `rsg_segmentid` | `varchar` |  |
| `rsg_orden` | `int2` |  |
| `rsg_escalaminutos` | `int4` |  Nullable |
| `rsg_estado` | `varchar` |  Nullable |
| `rsg_tarifacabinaid` | `uuid` |  Nullable |

## Table `pasajero`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pasajero` | `uuid` | Primary |
| `pas_reservaid` | `uuid` |  |
| `pas_pasengerid` | `varchar` |  |
| `pas_tipo` | `varchar` |  |
| `pas_adultoasociadoid` | `varchar` |  Nullable |
| `pas_nombre` | `varchar` |  |
| `pas_apellido` | `varchar` |  |
| `pas_tipodocumento` | `varchar` |  |
| `pas_numerodocumento` | `varchar` |  |
| `pas_nacionalidad` | `varchar` |  |
| `pas_fechaexpiraciondocumento` | `date` |  Nullable |
| `pas_fechanacimiento` | `date` |  |
| `pas_genero` | `varchar` |  |
| `pas_email` | `varchar` |  |
| `pas_telefono` | `varchar` |  |
| `pas_orden` | `int2` |  |
| `pas_creadoen` | `timestamptz` |  |

## Table `asiento_asignado`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_asiento_asignado` | `uuid` | Primary |
| `asa_pasajeroid` | `uuid` |  |
| `asa_segmentid` | `varchar` |  |
| `asa_numeroasiento` | `varchar` |  |

## Table `boleto`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_boleto` | `uuid` | Primary |
| `bol_ticketid` | `varchar` |  Unique |
| `bol_reservaid` | `uuid` |  |
| `bol_pasajeroid` | `uuid` |  |
| `bol_numeroboleto` | `varchar` |  Nullable |
| `bol_estado` | `varchar` |  |
| `bol_fechaemision` | `timestamptz` |  Nullable |
| `bol_motivofallo` | `varchar` |  Nullable |

## Table `boleto_segmento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_boleto_segmento` | `uuid` | Primary |
| `bse_boletoid` | `uuid` |  |
| `bse_segmentid` | `varchar` |  |
| `bse_estado` | `varchar` |  |
| `bse_numerocupon` | `varchar` |  Nullable |

## Table `checkin`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_checkin` | `uuid` | Primary |
| `chi_reservaid` | `uuid` |  Unique |
| `chi_estado` | `varchar` |  |
| `chi_fechahora` | `timestamptz` |  |
| `chi_motivofallo` | `varchar` |  Nullable |

## Table `checkin_pasajero`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `cpa_checkinid` | `uuid` | Primary |
| `cpa_pasajeroid` | `uuid` | Primary |
| `cpa_estado` | `varchar` |  |

## Table `checkin_segmento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `cse_checkinid` | `uuid` | Primary |
| `cse_pasajeroid` | `uuid` | Primary |
| `cse_segmentid` | `varchar` | Primary |
| `cse_asiento` | `varchar` |  Nullable |
| `cse_estado` | `varchar` |  |

## Table `pase_abordar`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_pase_abordar` | `uuid` | Primary |
| `pab_boletoid` | `uuid` |  |
| `pab_pasajeroid` | `uuid` |  |
| `pab_segmentid` | `varchar` |  |
| `pab_asiento` | `varchar` |  |
| `pab_grupoabordaje` | `varchar` |  Nullable |
| `pab_posicionabordaje` | `varchar` |  Nullable |
| `pab_codigobarras` | `text` |  |
| `pab_tipocodigobarras` | `varchar` |  |

## Table `equipaje_pasajero`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_equipaje_pasajero` | `uuid` | Primary |
| `eqp_pasajeroid` | `uuid` |  |
| `eqp_itineraryid` | `varchar` |  |
| `eqp_cantidad` | `int2` |  |
| `eqp_maximopermitido` | `int2` |  |
| `eqp_moneda` | `varchar` |  |
| `eqp_precio` | `numeric` |  |
| `eqp_referenciapago` | `varchar` |  Nullable |
| `eqp_fechacompra` | `timestamptz` |  |

## Table `oferta_cambio_fecha`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_oferta_cambio_fecha` | `uuid` | Primary |
| `ocf_reservaid` | `uuid` |  |
| `ocf_fechacreacion` | `timestamptz` |  |
| `ocf_fechaexpiracion` | `timestamptz` |  |
| `ocf_estado` | `varchar` |  |
| `ocf_moneda` | `varchar` |  |
| `ocf_diferenciatarifa` | `numeric` |  |
| `ocf_diferenciaimpuestos` | `numeric` |  |
| `ocf_cambiototalapagar` | `numeric` |  |
| `ocf_motivorechazo` | `varchar` |  Nullable |

## Table `oferta_cambio_segmento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `ocs_ofertacambiofechaid` | `uuid` | Primary |
| `ocs_segmentid` | `varchar` | Primary |
| `ocs_vueloid` | `uuid` |  |
| `ocs_itineraryid` | `varchar` |  |

## Table `cotizacion_cancelacion`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_cotizacion_cancelacion` | `uuid` | Primary |
| `cco_reservaid` | `uuid` |  |
| `cco_esreembolsable` | `bool` |  |
| `cco_montoreembolso` | `numeric` |  |
| `cco_montopenalizacion` | `numeric` |  |
| `cco_moneda` | `varchar` |  |
| `cco_fechaexpiracion` | `timestamptz` |  |
| `cco_estado` | `varchar` |  |
| `cco_motivo` | `varchar` |  Nullable |
| `cco_fechacancelacion` | `timestamptz` |  Nullable |

## Table `historial_cambio`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_historial_cambio` | `uuid` | Primary |
| `hca_reservaid` | `uuid` |  |
| `hca_fechacambio` | `timestamptz` |  |
| `hca_descripcion` | `varchar` |  |

## Table `suscripcion_webhook`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_suscripcion_webhook` | `uuid` | Primary |
| `swb_propietarioid` | `uuid` |  |
| `swb_url` | `varchar` |  |
| `swb_eventos` | `_varchar` |  |
| `swb_secretcifrado` | `bytea` |  |
| `swb_fechacreacion` | `timestamptz` |  |
| `swb_activo` | `bool` |  |

## Table `evento_webhook`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_evento_webhook` | `uuid` | Primary |
| `evw_tipoevento` | `varchar` |  |
| `evw_ocurridoen` | `timestamptz` |  |
| `evw_versionapi` | `varchar` |  |
| `evw_datos` | `jsonb` |  |
| `evw_entidadorigen` | `varchar` |  Nullable |
| `evw_entidadid` | `uuid` |  Nullable |
| `evw_procesado` | `bool` |  |
| `evw_procesadoen` | `timestamptz` |  Nullable |

## Table `entrega_webhook`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_entrega_webhook` | `uuid` | Primary |
| `enw_eventoid` | `uuid` |  |
| `enw_suscripcionid` | `uuid` |  |
| `enw_intentos` | `int2` |  |
| `enw_ultimointentoen` | `timestamptz` |  Nullable |
| `enw_ultimocodigohttp` | `int2` |  Nullable |
| `enw_ultimoerror` | `text` |  Nullable |
| `enw_proximareintentoen` | `timestamptz` |  Nullable |
| `enw_completada` | `bool` |  |

## Table `idempotencia`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `idm_clave` | `uuid` | Primary |
| `idm_propietarioid` | `uuid` |  |
| `idm_endpoint` | `varchar` |  |
| `idm_cuerpohash` | `bpchar` |  |
| `idm_estado` | `varchar` |  |
| `idm_codigohttp` | `int2` |  Nullable |
| `idm_respuesta` | `jsonb` |  Nullable |
| `idm_creadoen` | `timestamptz` |  |
| `idm_expiracionen` | `timestamptz` |  |

## Table `limite_dispositivo`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `lim_huella` | `varchar` | Primary |
| `lim_ventanainicio` | `timestamptz` |  |
| `lim_contador` | `int4` |  |
| `lim_bloqueadohasta` | `timestamptz` |  Nullable |

## Table `codigo_error`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `cer_codigo` | `varchar` | Primary |
| `cer_httpstatus` | `int2` |  |
| `cer_titulo` | `varchar` |  |
| `cer_tipouri` | `varchar` |  |

## Table `evento_error`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `eve_id` | `uuid` | Primary |
| `eve_codigoerrorid` | `varchar` |  |
| `eve_tipo` | `varchar` |  |
| `eve_detalle` | `text` |  Nullable |
| `eve_parametrosinvalidos` | `jsonb` |  Nullable |
| `eve_retryaftersegundos` | `int4` |  Nullable |
| `eve_ocurridoen` | `timestamptz` |  |
| `eve_correo` | `uuid` |  Nullable |

## Table `log_auditoria_vuelos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_log_auditoria_vuelos` | `uuid` | Primary |
| `log_tipoentidad` | `varchar` |  |
| `log_entidadid` | `uuid` |  |
| `log_accion` | `varchar` |  |
| `log_datosantiguos` | `jsonb` |  Nullable |
| `log_datosnuevos` | `jsonb` |  Nullable |
| `log_realizadopor` | `uuid` |  Nullable |
| `log_fechahora` | `timestamptz` |  |
| `log_ip` | `inet` |  Nullable |
| `log_idempotencykey` | `uuid` |  Nullable |

## Table `resenas_atracciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `usuario_id` | `varchar` |  |
| `usuario_nombre` | `varchar` |  |
| `usuario_pais` | `varchar` |  |
| `atraccion_id` | `varchar` |  |
| `comentario` | `text` |  |
| `limpieza` | `float8` |  |
| `servicio` | `float8` |  |
| `calidad` | `float8` |  |
| `created_at` | `timestamp` |  |

## Table `telemetry_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `event_id` | `uuid` | Primary |
| `occurred_at` | `timestamptz` |  |
| `event_name` | `text` |  |
| `session_id` | `text` |  |
| `user_id` | `text` |  Nullable |
| `vertical` | `text` |  Nullable |
| `device` | `text` |  Nullable |
| `properties` | `jsonb` |  Nullable |

## Table `provider_api_calls`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `occurred_at` | `timestamptz` |  |
| `provider` | `text` |  |
| `vertical` | `text` |  |
| `operation` | `text` |  |
| `status_code` | `int4` |  Nullable |
| `latency_ms` | `int4` |  |
| `success` | `bool` |  |
| `error_type` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `session_id` | `text` |  Nullable |

## Table `payment_attempts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `session_id` | `text` |  Nullable |
| `vertical` | `text` |  Nullable |
| `amount` | `numeric` |  Nullable |
| `currency` | `text` |  Nullable |
| `status` | `text` |  |
| `gateway_latency_ms` | `int4` |  Nullable |

## Table `autos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `supplier_name` | `varchar` |  |
| `price` | `numeric` |  |
| `vehicle_info` | `jsonb` |  |
| `images` | `jsonb` |  |
| `available` | `bool` |  |

## Table `orders_autos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `idempotencyKey` | `varchar` |  |
| `status` | `varchar` |  |
| `autoId` | `varchar` |  |
| `totalPrice` | `jsonb` |  |
| `diasRenta` | `int4` |  |
| `booker` | `jsonb` |  |
| `driver` | `jsonb` |  Nullable |
| `route` | `jsonb` |  Nullable |
| `createdAt` | `timestamp` |  |

## Table `alojamientos`

Catálogo de alojamientos: altas manuales del panel y datos sincronizados por proveedores.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `nombre` | `varchar` |  |
| `descripcion` | `text` |  Nullable |
| `tipo_propiedad` | `varchar` |  |
| `tipo_alojamiento` | `varchar` |  |
| `destino` | `varchar` |  |
| `precio_noche` | `numeric` |  |
| `moneda` | `varchar` |  |
| `capacidad_adultos` | `int4` |  |
| `capacidad_ninos` | `int4` |  |
| `habitaciones` | `int4` |  |
| `camas` | `int4` |  |
| `banos` | `numeric` |  |
| `tiene_piscina` | `bool` |  |
| `photos` | `jsonb` |  |
| `amenidades` | `jsonb` |  |
| `host` | `jsonb` |  Nullable |
| `ratings` | `jsonb` |  |
| `ubicacion` | `jsonb` |  |
| `creado_en` | `timestamp` |  |
| `actualizado_en` | `timestamp` |  |
| `deleted_at` | `timestamp` |  Nullable |
| `proveedor_id` | `varchar` |  Nullable |
| `id_externo` | `varchar` |  Nullable |
| `ultima_sincronizacion` | `timestamp` |  Nullable |
| `estado` | `varchar` |  |
| `politicas` | `jsonb` |  Nullable |

## Table `reservas_alojamiento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `codigo_reserva` | `varchar` |  Unique |
| `alojamiento_id` | `varchar` |  |
| `cliente_nombre` | `varchar` |  |
| `cliente_email` | `varchar` |  Nullable |
| `fecha_inicio` | `date` |  |
| `fecha_fin` | `date` |  |
| `noches` | `int4` |  |
| `huespedes` | `int4` |  |
| `habitaciones_count` | `int4` |  |
| `total` | `numeric` |  |
| `total_price` | `jsonb` |  Nullable |
| `estado` | `varchar` |  |
| `idempotency_key` | `varchar` |  Nullable Unique |
| `creado_en` | `timestamp` |  |
| `actualizado_en` | `timestamp` |  |
| `usuario_id` | `uuid` |  Nullable |
| `tipo_habitacion_id` | `uuid` |  |
| `adultos` | `int2` |  |
| `ninos` | `int2` |  |
| `precio_noche` | `numeric` |  |
| `moneda` | `varchar` |  |
| `cliente_telefono` | `varchar` |  Nullable |
| `peticiones_especiales` | `text` |  Nullable |
| `hora_llegada` | `varchar` |  Nullable |
| `motivo_cancelacion` | `varchar` |  Nullable |
| `cancelada_en` | `timestamp` |  Nullable |

## Table `resenas_alojamiento`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `alojamiento_id` | `varchar` |  |
| `usuario_id` | `varchar` |  |
| `usuario_nombre` | `varchar` |  Nullable |
| `usuario_pais` | `varchar` |  Nullable |
| `comentario` | `text` |  |
| `puntuacion` | `float8` |  Nullable |
| `limpieza` | `float8` |  Nullable |
| `servicio` | `float8` |  Nullable |
| `calidad` | `float8` |  Nullable |
| `creado_en` | `timestamp` |  Nullable |

## Table `admin_audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `time` | `timestamp` |  Nullable |
| `admin` | `varchar` |  Nullable |
| `action` | `varchar` |  Nullable |
| `target` | `varchar` |  Nullable |
| `ip` | `varchar` |  Nullable |

## Table `admin_liquidaciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `proveedor` | `varchar` |  Nullable |
| `periodo` | `varchar` |  Nullable |
| `total_reservas` | `numeric` |  Nullable |
| `comision` | `numeric` |  Nullable |
| `a_pagar` | `numeric` |  Nullable |
| `estado` | `varchar` |  Nullable |
| `fecha` | `timestamp` |  Nullable |

## Table `support_tickets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `client_name` | `varchar` |  Nullable |
| `email` | `varchar` |  Nullable |
| `entity_name` | `varchar` |  Nullable |
| `pnr_or_id` | `varchar` |  Nullable |
| `type` | `varchar` |  Nullable |
| `subject` | `varchar` |  Nullable |
| `priority` | `varchar` |  Nullable |
| `description` | `text` |  Nullable |
| `status` | `varchar` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `resolution` | `text` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `varchar` |  Nullable |

## Table `admin_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `clave` | `varchar` | Primary |
| `valor` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |
| `updated_by` | `varchar` |  Nullable |

## Table `liquidaciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `vertical` | `varchar` |  |
| `periodo` | `bpchar` |  |
| `reservas` | `int4` |  |
| `monto_bruto` | `numeric` |  |
| `comision_pct` | `numeric` |  |
| `comision` | `numeric` |  |
| `monto_pagado` | `numeric` |  |
| `referencia` | `varchar` |  Nullable |
| `aprobado_por` | `varchar` |  Nullable |
| `aprobado_en` | `timestamptz` |  |

## Table `panel_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `clave` | `varchar` | Primary |
| `valor` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |
| `updated_by` | `varchar` |  Nullable |

## Table `panel_audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `created_at` | `timestamptz` |  |
| `actor_id` | `varchar` |  Nullable |
| `actor_email` | `varchar` |  Nullable |
| `accion` | `varchar` |  |
| `entidad_tipo` | `varchar` |  Nullable |
| `entidad_id` | `varchar` |  Nullable |
| `detalle` | `jsonb` |  Nullable |
| `ip` | `varchar` |  Nullable |
| `user_agent` | `text` |  Nullable |

## Table `panel_liquidaciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `vertical` | `varchar` |  |
| `periodo` | `bpchar` |  |
| `reservas` | `int4` |  |
| `monto_bruto` | `numeric` |  |
| `comision_pct` | `numeric` |  |
| `comision` | `numeric` |  |
| `monto_pagado` | `numeric` |  |
| `referencia` | `varchar` |  Nullable |
| `aprobado_por` | `varchar` |  Nullable |
| `aprobado_en` | `timestamptz` |  |

## Table `panel_solicitudes_proveedor`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `created_at` | `timestamptz` |  |
| `empresa` | `varchar` |  |
| `ruc` | `varchar` |  |
| `tipo` | `varchar` |  |
| `contacto_nombre` | `varchar` |  |
| `email` | `varchar` |  |
| `telefono` | `varchar` |  |
| `ciudad` | `varchar` |  Nullable |
| `sitio_web` | `varchar` |  Nullable |
| `descripcion` | `text` |  Nullable |
| `estado` | `varchar` |  |
| `nota_admin` | `text` |  Nullable |
| `revisado_por` | `varchar` |  Nullable |
| `revisado_en` | `timestamptz` |  Nullable |
| `ip` | `varchar` |  Nullable |

## Table `proveedores_alojamiento`

Sistemas externos que sincronizan alojamientos con una API key.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `nombre` | `varchar` |  |
| `email_contacto` | `varchar` |  Nullable |
| `api_key_hash` | `bpchar` |  Nullable |
| `api_key_prefijo` | `varchar` |  Nullable |
| `activo` | `bool` |  |
| `ultimo_uso` | `timestamp` |  Nullable |
| `creado_en` | `timestamp` |  |
| `actualizado_en` | `timestamp` |  |

## Table `tipos_habitacion`

Tipos de habitación de cada alojamiento: precio, capacidad, régimen y cupo propios.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `alojamiento_id` | `varchar` |  |
| `codigo` | `varchar` |  |
| `nombre` | `varchar` |  |
| `descripcion` | `text` |  Nullable |
| `capacidad_adultos` | `int2` |  |
| `capacidad_ninos` | `int2` |  |
| `camas` | `int2` |  |
| `descripcion_camas` | `varchar` |  Nullable |
| `tamano_m2` | `numeric` |  Nullable |
| `precio_noche` | `numeric` |  |
| `cantidad` | `int2` |  |
| `regimen` | `varchar` |  |
| `cancelacion_gratuita_horas` | `int2` |  Nullable |
| `amenidades` | `jsonb` |  |
| `photos` | `jsonb` |  |
| `activo` | `bool` |  |
| `orden` | `int2` |  |
| `creado_en` | `timestamp` |  |
| `actualizado_en` | `timestamp` |  |

## Table `huespedes_reserva`

Personas que se alojan en cada reserva (titular y acompañantes).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `reserva_id` | `uuid` |  |
| `orden` | `int2` |  |
| `es_titular` | `bool` |  |
| `tipo` | `varchar` |  |
| `nombre` | `varchar` |  |
| `apellido` | `varchar` |  |
| `edad` | `int2` |  Nullable |
| `documento_tipo` | `varchar` |  Nullable |
| `documento_numero` | `varchar` |  Nullable |
| `nacionalidad` | `varchar` |  Nullable |
| `email` | `varchar` |  Nullable |
| `telefono` | `varchar` |  Nullable |
| `creado_en` | `timestamp` |  |

## RLS Policies

### `reserva`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `p_reserva_owner` | ALL | public | PERMISSIVE | `(res_propietarioid = (current_setting('app.owner_id'::text, true))::uuid)` | — |

### `bloqueo_cupo`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `p_hold_owner` | ALL | public | PERMISSIVE | `(blo_propietarioid = (current_setting('app.owner_id'::text, true))::uuid)` | — |

### `suscripcion_webhook`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `p_webhook_owner` | ALL | public | PERMISSIVE | `(swb_propietarioid = (current_setting('app.owner_id'::text, true))::uuid)` | — |

### `idempotencia`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `p_idempotencia_owner` | ALL | public | PERMISSIVE | `(idm_propietarioid = (current_setting('app.owner_id'::text, true))::uuid)` | — |

