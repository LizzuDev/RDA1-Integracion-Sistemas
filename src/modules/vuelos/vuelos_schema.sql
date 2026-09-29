-- ============================================================================
-- MÓDULO VUELOS — DDL PostgreSQL 15+
-- Generado desde DB_IMPLEMENTATION_PLAN.md (Borrador 4)
-- Alineado al 100 % con vuelos-openapi.yaml v1.5.0.0
-- ============================================================================

BEGIN;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 0. EXTENSIONES Y ESQUEMA
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- gen_random_uuid() es nativo desde PG13, no requiere extensión.
-- pgcrypto se habilita para cifrado de PII (§6.6).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 1. ROLES (§6.2)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flights_app') THEN
    CREATE ROLE flights_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flights_public') THEN
    CREATE ROLE flights_public NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flights_worker') THEN
    CREATE ROLE flights_worker NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'flights_auditor') THEN
    CREATE ROLE flights_auditor NOLOGIN;
  END IF;
END $$;

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 2. TABLAS
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- ========== 2.1 Catálogo e Inventario =======================================

CREATE TABLE aerolinea (
    id_aerolinea  VARCHAR(3)   PRIMARY KEY
                               CHECK (id_aerolinea ~ '^[A-Z]{3}$'),
    ael_nombre    VARCHAR(100) NOT NULL
                               CHECK (length(btrim(ael_nombre)) > 0)
);

CREATE TABLE vuelo (
    id_vuelo                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vue_numeroVuelo           VARCHAR(10)   NOT NULL
                                            CHECK (length(btrim(vue_numeroVuelo)) > 0),
    vue_fecha                 DATE          NOT NULL,
    vue_aerolineaMarketingId  VARCHAR(3)    NOT NULL
                                            REFERENCES aerolinea(id_aerolinea),
    vue_aerolineaOperadoraId  VARCHAR(3)    NOT NULL
                                            REFERENCES aerolinea(id_aerolinea),
    vue_aeropuertoOrigen      VARCHAR(3)    NOT NULL
                                            CHECK (vue_aeropuertoOrigen ~ '^[A-Z]{3}$'),
    vue_aeropuertoDestino     VARCHAR(3)    NOT NULL
                                            CHECK (vue_aeropuertoDestino ~ '^[A-Z]{3}$'),
    vue_terminalOrigen        VARCHAR(3),
    vue_terminalDestino       VARCHAR(3),
    vue_horaSalidaProgramada  TIMESTAMPTZ   NOT NULL,
    vue_horaSalidaEstimada    TIMESTAMPTZ,
    vue_horaSalidaReal        TIMESTAMPTZ,
    vue_horaLlegadaProgramada TIMESTAMPTZ   NOT NULL,
    vue_horaLlegadaEstimada   TIMESTAMPTZ,
    vue_horaLlegadaReal       TIMESTAMPTZ,
    vue_aeronave              VARCHAR(40),
    vue_duracionMinutos       INTEGER       CHECK (vue_duracionMinutos > 0),
    vue_estado                VARCHAR(20)   NOT NULL DEFAULT 'SCHEDULED'
                                            CHECK (vue_estado IN (
                                              'SCHEDULED','BOARDING','DEPARTED',
                                              'DELAYED','ARRIVED','CANCELLED','DIVERTED'
                                            )),

    UNIQUE (vue_numeroVuelo, vue_fecha),
    CHECK  (vue_horaLlegadaProgramada > vue_horaSalidaProgramada),
    CHECK  (vue_aeropuertoOrigen <> vue_aeropuertoDestino),
    CHECK  (vue_horaSalidaReal IS NULL
            OR vue_horaSalidaReal >= vue_horaSalidaProgramada - INTERVAL '12 hours')
);

CREATE TABLE asiento_vuelo (
    id_asiento_vuelo    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    asi_vueloId         UUID         NOT NULL
                                     REFERENCES vuelo(id_vuelo) ON DELETE CASCADE,
    asi_numeroAsiento   VARCHAR(5)   NOT NULL
                                     CHECK (asi_numeroAsiento ~ '^[0-9]{1,2}[A-K]$'),
    asi_fila            SMALLINT     NOT NULL CHECK (asi_fila > 0),
    asi_claseCabina     VARCHAR(20)  NOT NULL
                                     CHECK (asi_claseCabina IN (
                                       'ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'
                                     )),
    asi_estaDisponible  BOOLEAN      NOT NULL DEFAULT true,
    asi_caracteristicas VARCHAR(20)[] NOT NULL DEFAULT '{}',

    UNIQUE (asi_vueloId, asi_numeroAsiento)
);


-- ========== 2.2 Ofertas y Tarifas (/search) =================================

CREATE TABLE oferta (
    id_oferta         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    ofe_offerId       VARCHAR(64)   NOT NULL UNIQUE,
    ofe_aerolineaId   VARCHAR(3)    NOT NULL
                                    REFERENCES aerolinea(id_aerolinea),
    ofe_fechaCreacion TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ofe_expiraEn      TIMESTAMPTZ   NOT NULL,
    ofe_moneda        VARCHAR(3)    NOT NULL
                                    CHECK (ofe_moneda ~ '^[A-Z]{3}$'),
    ofe_tarifaBase    NUMERIC(12,2) NOT NULL CHECK (ofe_tarifaBase >= 0),
    ofe_impuestos     NUMERIC(12,2) NOT NULL CHECK (ofe_impuestos  >= 0),
    ofe_total         NUMERIC(12,2) NOT NULL CHECK (ofe_total      >= 0),
    ofe_huellaCatalogo CHAR(64)     CHECK (ofe_huellaCatalogo ~ '^[a-f0-9]{64}$'),

    CHECK (ofe_total = ofe_tarifaBase + ofe_impuestos)
);

CREATE TABLE oferta_itinerario (
    id_oferta_itinerario    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    oit_ofertaId            UUID         NOT NULL
                                         REFERENCES oferta(id_oferta) ON DELETE CASCADE,
    oit_itineraryId         VARCHAR(64)  NOT NULL,
    oit_orden               SMALLINT     NOT NULL CHECK (oit_orden >= 1),
    oit_duracionTotalMinutos INTEGER     NOT NULL CHECK (oit_duracionTotalMinutos >= 0),
    oit_escalas             SMALLINT     NOT NULL CHECK (oit_escalas >= 0),

    UNIQUE (oit_ofertaId, oit_itineraryId),
    UNIQUE (oit_ofertaId, oit_orden)
);

CREATE TABLE oferta_segmento (
    id_oferta_segmento UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    osg_itinerarioId   UUID         NOT NULL
                                    REFERENCES oferta_itinerario(id_oferta_itinerario)
                                    ON DELETE CASCADE,
    osg_vueloId        UUID         NOT NULL
                                    REFERENCES vuelo(id_vuelo) ON DELETE RESTRICT,
    osg_segmentId      VARCHAR(64)  NOT NULL,
    osg_orden          SMALLINT     NOT NULL CHECK (osg_orden >= 1),
    osg_escalaMinutos  INTEGER      CHECK (osg_escalaMinutos >= 0),
    osg_estado         VARCHAR(20)  CHECK (osg_estado IN (
                                      'SCHEDULED','BOARDING','DEPARTED',
                                      'DELAYED','ARRIVED','CANCELLED','DIVERTED'
                                    )),

    UNIQUE (osg_itinerarioId, osg_segmentId)
);

-- Declaración adelantada: reserva se crea más abajo; tarifa_cabina necesita
-- ambas FKs (oferta y reserva). Se añade la FK a reserva con ALTER TABLE.
CREATE TABLE tarifa_cabina (
    id_tarifa_cabina     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tca_ofertaId         UUID          REFERENCES oferta(id_oferta) ON DELETE CASCADE,
    tca_reservaId        UUID,  -- FK añadida después de CREATE TABLE reserva
    tca_itinerarioId     UUID          NOT NULL,
    tca_claseCabina      VARCHAR(20)   NOT NULL
                                       CHECK (tca_claseCabina IN (
                                         'ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'
                                       )),
    tca_marcaTarifa      VARCHAR(50)   NOT NULL,
    tca_asientosDisponibles SMALLINT   NOT NULL CHECK (tca_asientosDisponibles >= 0),
    tca_esReembolsable   BOOLEAN       NOT NULL,
    tca_esModificable    BOOLEAN       NOT NULL,
    tca_moneda           VARCHAR(3)    NOT NULL
                                       CHECK (tca_moneda ~ '^[A-Z]{3}$'),
    tca_tarifaBase       NUMERIC(12,2) NOT NULL CHECK (tca_tarifaBase >= 0),
    tca_impuestos        NUMERIC(12,2) NOT NULL CHECK (tca_impuestos  >= 0),
    tca_total            NUMERIC(12,2) NOT NULL CHECK (tca_total      >= 0),
    tca_precioEquipajeExtra NUMERIC(12,2) NOT NULL DEFAULT 0
                                       CHECK (tca_precioEquipajeExtra >= 0),

    CHECK (num_nonnulls(tca_ofertaId, tca_reservaId) = 1),
    CHECK (tca_total = tca_tarifaBase + tca_impuestos),
    UNIQUE (tca_itinerarioId, tca_claseCabina, tca_marcaTarifa)
);

CREATE TABLE tarifa_equipaje (
    teq_tarifaCabinaId  UUID     PRIMARY KEY
                                 REFERENCES tarifa_cabina(id_tarifa_cabina)
                                 ON DELETE CASCADE,
    teq_incluyePersonal BOOLEAN  NOT NULL DEFAULT false,
    teq_incluyeMano     SMALLINT NOT NULL DEFAULT 0 CHECK (teq_incluyeMano   >= 0),
    teq_incluyeBodega   SMALLINT NOT NULL DEFAULT 0 CHECK (teq_incluyeBodega >= 0)
);

CREATE TABLE tarifa_precio_pasajero (
    tpp_tarifaCabinaId UUID          NOT NULL
                                     REFERENCES tarifa_cabina(id_tarifa_cabina)
                                     ON DELETE CASCADE,
    tpp_tipoPasajero   VARCHAR(10)   NOT NULL
                                     CHECK (tpp_tipoPasajero IN (
                                       'ADULT','YOUTH','CHILD','INFANT'
                                     )),
    tpp_moneda         VARCHAR(3)    NOT NULL
                                     CHECK (tpp_moneda ~ '^[A-Z]{3}$'),
    tpp_tarifaBase     NUMERIC(12,2) NOT NULL CHECK (tpp_tarifaBase >= 0),
    tpp_impuestos      NUMERIC(12,2) NOT NULL CHECK (tpp_impuestos  >= 0),
    tpp_total          NUMERIC(12,2) NOT NULL CHECK (tpp_total      >= 0),

    PRIMARY KEY (tpp_tarifaCabinaId, tpp_tipoPasajero),
    CHECK (tpp_total = tpp_tarifaBase + tpp_impuestos)
);


-- ========== 2.3 Bloqueo de Cupos (Hold) =====================================

CREATE TABLE bloqueo_cupo (
    id_bloqueo_cupo     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    blo_ofertaId        UUID          NOT NULL
                                      REFERENCES oferta(id_oferta) ON DELETE RESTRICT,
    blo_propietarioId   UUID          NOT NULL,
    blo_fechaCreacion   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    blo_fechaExpiracion TIMESTAMPTZ   NOT NULL,
    blo_ttlMinutos      SMALLINT      NOT NULL DEFAULT 15
                                      CHECK (blo_ttlMinutos IN (15, 30)),
    blo_estado          VARCHAR(20)   NOT NULL DEFAULT 'HELD'
                                      CHECK (blo_estado IN (
                                        'HELD','RELEASED','EXPIRED','CONSUMED'
                                      )),
    blo_moneda          VARCHAR(3)    NOT NULL
                                      CHECK (blo_moneda ~ '^[A-Z]{3}$'),
    blo_precioCongelado NUMERIC(12,2) NOT NULL CHECK (blo_precioCongelado >= 0),
    blo_adultos         SMALLINT      NOT NULL DEFAULT 0 CHECK (blo_adultos  >= 0),
    blo_jovenes         SMALLINT      NOT NULL DEFAULT 0 CHECK (blo_jovenes  >= 0),
    blo_ninos           SMALLINT      NOT NULL DEFAULT 0 CHECK (blo_ninos    >= 0),
    blo_infants         SMALLINT      NOT NULL DEFAULT 0 CHECK (blo_infants  >= 0),
    blo_totalPasajeros  SMALLINT      GENERATED ALWAYS AS
                                      (blo_adultos + blo_jovenes + blo_ninos + blo_infants)
                                      STORED,
    blo_version         BIGINT        NOT NULL DEFAULT 0,

    CHECK (blo_adultos >= 1),
    CHECK (blo_fechaExpiracion > blo_fechaCreacion)
);

CREATE TABLE bloqueo_itinerario (
    id_bloqueo_itinerario UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bli_bloqueoCupoId     UUID        NOT NULL
                                      REFERENCES bloqueo_cupo(id_bloqueo_cupo)
                                      ON DELETE CASCADE,
    bli_itineraryId       VARCHAR(64) NOT NULL,
    bli_claseCabina       VARCHAR(20) NOT NULL
                                      CHECK (bli_claseCabina IN (
                                        'ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'
                                      )),
    bli_marcaTarifa       VARCHAR(50) NOT NULL,
    bli_orden             SMALLINT    NOT NULL CHECK (bli_orden >= 1),

    UNIQUE (bli_bloqueoCupoId, bli_itineraryId)
);


-- ========== 2.4 Reservas y Emisión ==========================================

CREATE TABLE reserva (
    id_reserva            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    res_pnr               VARCHAR(6)    UNIQUE,
    res_propietarioId     UUID          NOT NULL,
    res_estado            VARCHAR(30)   NOT NULL DEFAULT 'PENDING'
                                        CHECK (res_estado IN (
                                          'PENDING','PENDING_PAYMENT','TICKET_ISSUING',
                                          'CONFIRMED','FAILED','CHANGE_PENDING',
                                          'CANCELLATION_PENDING','CANCELLED'
                                        )),
    res_bloqueoCupoId     UUID          REFERENCES bloqueo_cupo(id_bloqueo_cupo)
                                        ON DELETE SET NULL,
    res_moneda            VARCHAR(3)    NOT NULL
                                        CHECK (res_moneda ~ '^[A-Z]{3}$'),
    res_tarifaBase        NUMERIC(12,2) NOT NULL CHECK (res_tarifaBase >= 0),
    res_impuestos         NUMERIC(12,2) NOT NULL CHECK (res_impuestos  >= 0),
    res_total             NUMERIC(12,2) NOT NULL CHECK (res_total      >= 0),
    res_referenciaPago    VARCHAR(100),
    res_fechaCreacion     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    res_fechaActualizacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
    res_corteCheckIn      TIMESTAMPTZ,
    res_version           BIGINT        NOT NULL DEFAULT 0,

    CHECK (res_total = res_tarifaBase + res_impuestos),
    CHECK (res_pnr IS NULL OR res_pnr ~ '^[A-Z0-9]{6}$')
);

-- FK diferida de tarifa_cabina → reserva
ALTER TABLE tarifa_cabina
  ADD CONSTRAINT fk_tarifa_cabina_reserva
  FOREIGN KEY (tca_reservaId) REFERENCES reserva(id_reserva) ON DELETE CASCADE;

CREATE TABLE reserva_itinerario (
    id_reserva_itinerario UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rit_reservaId         UUID         NOT NULL
                                       REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    rit_itineraryId       VARCHAR(64)  NOT NULL,
    rit_orden             SMALLINT     NOT NULL CHECK (rit_orden >= 1),
    rit_duracionTotalMinutos INTEGER   NOT NULL CHECK (rit_duracionTotalMinutos >= 0),
    rit_escalas           SMALLINT     NOT NULL CHECK (rit_escalas >= 0),

    UNIQUE (rit_reservaId, rit_itineraryId),
    UNIQUE (rit_reservaId, rit_orden)
);

CREATE TABLE reserva_segmento (
    id_reserva_segmento UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rsg_itinerarioId    UUID         NOT NULL
                                     REFERENCES reserva_itinerario(id_reserva_itinerario)
                                     ON DELETE CASCADE,
    rsg_vueloId         UUID         NOT NULL
                                     REFERENCES vuelo(id_vuelo) ON DELETE RESTRICT,
    rsg_segmentId       VARCHAR(64)  NOT NULL,
    rsg_orden           SMALLINT     NOT NULL CHECK (rsg_orden >= 1),
    rsg_escalaMinutos   INTEGER      CHECK (rsg_escalaMinutos >= 0),
    rsg_estado          VARCHAR(20)  CHECK (rsg_estado IN (
                                      'SCHEDULED','BOARDING','DEPARTED',
                                      'DELAYED','ARRIVED','CANCELLED','DIVERTED'
                                    )),
    rsg_tarifaCabinaId  UUID         REFERENCES tarifa_cabina(id_tarifa_cabina)
                                     ON DELETE SET NULL,

    UNIQUE (rsg_itinerarioId, rsg_segmentId)
);

CREATE TABLE pasajero (
    id_pasajero                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    pas_reservaId               UUID         NOT NULL
                                             REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    pas_pasengerId              VARCHAR(64)  NOT NULL,
    pas_tipo                    VARCHAR(10)  NOT NULL
                                             CHECK (pas_tipo IN (
                                               'ADULT','YOUTH','CHILD','INFANT'
                                             )),
    pas_adultoAsociadoId        VARCHAR(64),
    pas_nombre                  VARCHAR(100) NOT NULL
                                             CHECK (length(btrim(pas_nombre)) > 0),
    pas_apellido                VARCHAR(100) NOT NULL
                                             CHECK (length(btrim(pas_apellido)) > 0),
    pas_tipoDocumento           VARCHAR(15)  NOT NULL
                                             CHECK (pas_tipoDocumento IN (
                                               'PASSPORT','NATIONAL_ID'
                                             )),
    pas_numeroDocumento         VARCHAR(50)  NOT NULL
                                             CHECK (length(btrim(pas_numeroDocumento)) > 0),
    pas_nacionalidad            VARCHAR(3)   NOT NULL
                                             CHECK (pas_nacionalidad ~ '^[A-Z]{3}$'),
    pas_fechaExpiracionDocumento DATE,
    pas_fechaNacimiento         DATE         NOT NULL
                                             CHECK (pas_fechaNacimiento <= CURRENT_DATE),
    pas_genero                  VARCHAR(1)   NOT NULL
                                             CHECK (pas_genero IN ('M','F','X')),
    pas_email                   VARCHAR(254) NOT NULL
                                             CHECK (pas_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    pas_telefono                VARCHAR(32)  NOT NULL
                                             CHECK (length(btrim(pas_telefono)) > 0),
    pas_orden                   SMALLINT     NOT NULL CHECK (pas_orden >= 1),
    pas_creadoEn                TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (pas_reservaId, pas_pasengerId),
    CHECK ((pas_tipo = 'INFANT') = (pas_adultoAsociadoId IS NOT NULL))
);

CREATE TABLE asiento_asignado (
    id_asiento_asignado UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asa_pasajeroId      UUID        NOT NULL
                                    REFERENCES pasajero(id_pasajero) ON DELETE CASCADE,
    asa_segmentId       VARCHAR(64) NOT NULL,
    asa_numeroAsiento   VARCHAR(5)  NOT NULL,

    UNIQUE (asa_segmentId, asa_numeroAsiento),
    UNIQUE (asa_pasajeroId, asa_segmentId)
);


-- ========== 2.5 Boletos, Check-in, Pases de Abordar ========================

CREATE TABLE boleto (
    id_boleto        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    bol_ticketId     VARCHAR(64)  NOT NULL UNIQUE,
    bol_reservaId    UUID         NOT NULL
                                  REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    bol_pasajeroId   UUID         NOT NULL
                                  REFERENCES pasajero(id_pasajero) ON DELETE CASCADE,
    bol_numeroBoleto VARCHAR(15),
    bol_estado       VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
                                  CHECK (bol_estado IN (
                                    'PENDING','ISSUING','ISSUED',
                                    'FAILED','VOIDED','REFUNDED'
                                  )),
    bol_fechaEmision TIMESTAMPTZ,
    bol_motivoFallo  VARCHAR(500),

    UNIQUE (bol_reservaId, bol_pasajeroId),
    CHECK ((bol_estado = 'ISSUED') = (bol_numeroBoleto IS NOT NULL
                                      AND bol_fechaEmision IS NOT NULL))
);

CREATE TABLE boleto_segmento (
    id_boleto_segmento UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    bse_boletoId       UUID        NOT NULL
                                   REFERENCES boleto(id_boleto) ON DELETE CASCADE,
    bse_segmentId      VARCHAR(64) NOT NULL,
    bse_estado         VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                                   CHECK (bse_estado IN ('PENDING','ISSUED','FAILED')),
    bse_numeroCupon    VARCHAR(15),

    UNIQUE (bse_boletoId, bse_segmentId)
);

CREATE TABLE checkin (
    id_checkin     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    chi_reservaId  UUID         NOT NULL UNIQUE
                                REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    chi_estado     VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE'
                                CHECK (chi_estado IN (
                                  'NOT_ELIGIBLE','AVAILABLE','IN_PROGRESS',
                                  'COMPLETED','FAILED'
                                )),
    chi_fechaHora  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    chi_motivoFallo VARCHAR(500)
);

CREATE TABLE checkin_pasajero (
    cpa_checkinId  UUID        NOT NULL
                               REFERENCES checkin(id_checkin) ON DELETE CASCADE,
    cpa_pasajeroId UUID        NOT NULL
                               REFERENCES pasajero(id_pasajero) ON DELETE CASCADE,
    cpa_estado     VARCHAR(20) NOT NULL
                               CHECK (cpa_estado IN (
                                 'CHECKED_IN','NOT_CHECKED_IN','FAILED'
                               )),

    PRIMARY KEY (cpa_checkinId, cpa_pasajeroId)
);

CREATE TABLE checkin_segmento (
    cse_checkinId  UUID        NOT NULL,
    cse_pasajeroId UUID        NOT NULL,
    cse_segmentId  VARCHAR(64) NOT NULL,
    cse_asiento    VARCHAR(5),
    cse_estado     VARCHAR(20) NOT NULL
                               CHECK (cse_estado IN (
                                 'CHECKED_IN','NOT_CHECKED_IN','FAILED'
                               )),

    PRIMARY KEY (cse_checkinId, cse_pasajeroId, cse_segmentId),
    FOREIGN KEY (cse_checkinId, cse_pasajeroId)
      REFERENCES checkin_pasajero(cpa_checkinId, cpa_pasajeroId)
      ON DELETE CASCADE
);

CREATE TABLE pase_abordar (
    id_pase_abordar       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pab_boletoId          UUID        NOT NULL
                                      REFERENCES boleto(id_boleto) ON DELETE CASCADE,
    pab_pasajeroId        UUID        NOT NULL
                                      REFERENCES pasajero(id_pasajero) ON DELETE CASCADE,
    pab_segmentId         VARCHAR(64) NOT NULL,
    pab_asiento           VARCHAR(5)  NOT NULL,
    pab_grupoAbordaje     VARCHAR(10),
    pab_posicionAbordaje  VARCHAR(10),
    pab_codigoBarras      TEXT        NOT NULL,
    pab_tipoCodigoBarras  VARCHAR(10) NOT NULL
                                      CHECK (pab_tipoCodigoBarras IN (
                                        'AZTEC','PDF417','QR'
                                      )),

    UNIQUE (pab_pasajeroId, pab_segmentId),
    CHECK (
      (pab_tipoCodigoBarras = 'AZTEC'
         AND length(pab_codigoBarras) BETWEEN 60 AND 700)
      OR
      (pab_tipoCodigoBarras IN ('PDF417','QR')
         AND length(pab_codigoBarras) BETWEEN 50 AND 5000)
    )
);


-- ========== 2.6 Postventa (Equipaje, Cambio de Fecha, Cancelación) ==========

CREATE TABLE equipaje_pasajero (
    id_equipaje_pasajero UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    eqp_pasajeroId       UUID          NOT NULL
                                       REFERENCES pasajero(id_pasajero) ON DELETE CASCADE,
    eqp_itineraryId      VARCHAR(64)   NOT NULL,
    eqp_cantidad         SMALLINT      NOT NULL CHECK (eqp_cantidad >= 1),
    eqp_maximoPermitido  SMALLINT      NOT NULL CHECK (eqp_maximoPermitido >= 0),
    eqp_moneda           VARCHAR(3)    NOT NULL
                                       CHECK (eqp_moneda ~ '^[A-Z]{3}$'),
    eqp_precio           NUMERIC(12,2) NOT NULL CHECK (eqp_precio >= 0),
    eqp_referenciaPago   VARCHAR(100),
    eqp_fechaCompra      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    UNIQUE (eqp_pasajeroId, eqp_itineraryId, eqp_fechaCompra),
    CHECK  (eqp_cantidad <= eqp_maximoPermitido)
);

CREATE TABLE oferta_cambio_fecha (
    id_oferta_cambio_fecha UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    ocf_reservaId          UUID          NOT NULL
                                         REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    ocf_fechaCreacion      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ocf_fechaExpiracion    TIMESTAMPTZ   NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
    ocf_estado             VARCHAR(20)   NOT NULL DEFAULT 'VALID'
                                         CHECK (ocf_estado IN (
                                           'VALID','ACCEPTED','EXPIRED','REJECTED'
                                         )),
    ocf_moneda             VARCHAR(3)    NOT NULL
                                         CHECK (ocf_moneda ~ '^[A-Z]{3}$'),
    ocf_diferenciaTarifa   NUMERIC(12,2) NOT NULL CHECK (ocf_diferenciaTarifa   >= 0),
    ocf_diferenciaImpuestos NUMERIC(12,2) NOT NULL CHECK (ocf_diferenciaImpuestos >= 0),
    ocf_cambioTotalAPagar  NUMERIC(12,2) NOT NULL CHECK (ocf_cambioTotalAPagar  >= 0),
    ocf_motivoRechazo      VARCHAR(500),

    CHECK (ocf_cambioTotalAPagar = ocf_diferenciaTarifa + ocf_diferenciaImpuestos)
);

CREATE TABLE oferta_cambio_segmento (
    ocs_ofertaCambioFechaId UUID        NOT NULL
                                        REFERENCES oferta_cambio_fecha(id_oferta_cambio_fecha)
                                        ON DELETE CASCADE,
    ocs_segmentId           VARCHAR(64) NOT NULL,
    ocs_vueloId             UUID        NOT NULL
                                        REFERENCES vuelo(id_vuelo) ON DELETE RESTRICT,
    ocs_itineraryId         VARCHAR(64) NOT NULL,

    PRIMARY KEY (ocs_ofertaCambioFechaId, ocs_segmentId)
);

CREATE TABLE cotizacion_cancelacion (
    id_cotizacion_cancelacion UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    cco_reservaId             UUID          NOT NULL
                                            REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    cco_esReembolsable        BOOLEAN       NOT NULL,
    cco_montoReembolso        NUMERIC(12,2) NOT NULL CHECK (cco_montoReembolso    >= 0),
    cco_montoPenalizacion     NUMERIC(12,2) NOT NULL CHECK (cco_montoPenalizacion >= 0),
    cco_moneda                VARCHAR(3)    NOT NULL
                                            CHECK (cco_moneda ~ '^[A-Z]{3}$'),
    cco_fechaExpiracion       TIMESTAMPTZ   NOT NULL,
    cco_estado                VARCHAR(20)   NOT NULL DEFAULT 'VALID'
                                            CHECK (cco_estado IN ('VALID','CONSUMED','EXPIRED')),
    cco_motivo                VARCHAR(500),
    cco_fechaCancelacion      TIMESTAMPTZ,

    UNIQUE (cco_reservaId, cco_fechaExpiracion)
);

CREATE TABLE historial_cambio (
    id_historial_cambio UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    hca_reservaId       UUID         NOT NULL
                                     REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    hca_fechaCambio     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    hca_descripcion     VARCHAR(500) NOT NULL
);


-- ========== 2.7 Webhooks, Idempotencia, Rate Limit, Errores =================

CREATE TABLE suscripcion_webhook (
    id_suscripcion_webhook UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    swb_propietarioId      UUID          NOT NULL,
    swb_url                VARCHAR(2048) NOT NULL
                                         CHECK (swb_url ~ '^https://'),
    swb_eventos            VARCHAR(50)[] NOT NULL
                                         CHECK (cardinality(swb_eventos) BETWEEN 1 AND 12),
    swb_secretCifrado      BYTEA         NOT NULL,
    swb_fechaCreacion      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    swb_activo             BOOLEAN       NOT NULL DEFAULT true
);

CREATE TABLE evento_webhook (
    id_evento_webhook UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    evw_tipoEvento    VARCHAR(50) NOT NULL,
    evw_ocurridoEn    TIMESTAMPTZ NOT NULL DEFAULT now(),
    evw_versionApi    VARCHAR(20) NOT NULL DEFAULT '1.5.0.0',
    evw_datos         JSONB       NOT NULL,
    evw_entidadOrigen VARCHAR(30),
    evw_entidadId     UUID,
    evw_procesado     BOOLEAN     NOT NULL DEFAULT false,
    evw_procesadoEn   TIMESTAMPTZ
);

CREATE TABLE entrega_webhook (
    id_entrega_webhook   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    enw_eventoId         UUID        NOT NULL
                                     REFERENCES evento_webhook(id_evento_webhook)
                                     ON DELETE CASCADE,
    enw_suscripcionId    UUID        NOT NULL
                                     REFERENCES suscripcion_webhook(id_suscripcion_webhook)
                                     ON DELETE CASCADE,
    enw_intentos         SMALLINT    NOT NULL DEFAULT 0
                                     CHECK (enw_intentos >= 0 AND enw_intentos <= 10),
    enw_ultimoIntentoEn  TIMESTAMPTZ,
    enw_ultimoCodigoHttp SMALLINT    CHECK (enw_ultimoCodigoHttp BETWEEN 100 AND 599),
    enw_ultimoError      TEXT,
    enw_proximaReintentoEn TIMESTAMPTZ,
    enw_completada       BOOLEAN     NOT NULL DEFAULT false,

    UNIQUE (enw_eventoId, enw_suscripcionId)
);

CREATE TABLE idempotencia (
    idm_clave         UUID         PRIMARY KEY,
    idm_propietarioId UUID         NOT NULL,
    idm_endpoint      VARCHAR(128) NOT NULL,
    idm_cuerpoHash    CHAR(64)     NOT NULL,
    idm_estado        VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS'
                                   CHECK (idm_estado IN ('IN_PROGRESS','COMPLETED','FAILED')),
    idm_codigoHttp    SMALLINT,
    idm_respuesta     JSONB,
    idm_creadoEn      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    idm_expiracionEn  TIMESTAMPTZ  NOT NULL DEFAULT (now() + INTERVAL '24 hours'),

    UNIQUE (idm_clave, idm_propietarioId, idm_endpoint)
);

CREATE TABLE limite_dispositivo (
    lim_huella         VARCHAR(128) PRIMARY KEY,
    lim_ventanaInicio  TIMESTAMPTZ  NOT NULL,
    lim_contador       INTEGER      NOT NULL DEFAULT 0 CHECK (lim_contador >= 0),
    lim_bloqueadoHasta TIMESTAMPTZ
);

CREATE TABLE codigo_error (
    cer_codigo     VARCHAR(40)  PRIMARY KEY
                                CHECK (cer_codigo ~ '^[A-Z_]+$'),
    cer_httpStatus SMALLINT     NOT NULL,
    cer_titulo     VARCHAR(100) NOT NULL,
    cer_tipoUri    VARCHAR(255) NOT NULL
);

CREATE TABLE evento_error (
    eve_id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    eve_codigoErrorId         VARCHAR(40)  NOT NULL
                                           REFERENCES codigo_error(cer_codigo),
    eve_tipo                  VARCHAR(255) NOT NULL,
    eve_detalle               TEXT,
    eve_parametrosInvalidos   JSONB,
    eve_retryAfterSegundos    INTEGER      CHECK (eve_retryAfterSegundos >= 0),
    eve_ocurridoEn            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    eve_correo                UUID
);

-- Auditoría
CREATE TABLE log_auditoria_vuelos (
    id_log_auditoria_vuelos UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    log_tipoEntidad         VARCHAR(30) NOT NULL,
    log_entidadId           UUID        NOT NULL,
    log_accion              VARCHAR(30) NOT NULL
                                        CHECK (log_accion IN (
                                          'CREATED','UPDATED','STATUS_CHANGED',
                                          'DELETED','ACCESS'
                                        )),
    log_datosAntiguos       JSONB,
    log_datosNuevos         JSONB,
    log_realizadoPor        UUID,
    log_fechaHora           TIMESTAMPTZ NOT NULL DEFAULT now(),
    log_ip                  INET,
    log_idempotencyKey      UUID
);


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 3. ÍNDICES (§3)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Búsqueda /search
CREATE INDEX ix_vuelo_busqueda
  ON vuelo (vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_fecha, vue_horaSalidaProgramada);

-- Estado de vuelo
-- (ya cubierto por UNIQUE (vue_numeroVuelo, vue_fecha) arriba)

-- Inventario por vuelo y cabina (solo disponibles)
CREATE INDEX ix_asiento_vuelo_cabina
  ON asiento_vuelo (asi_vueloId, asi_claseCabina) WHERE asi_estaDisponible;

-- Listado de reservas del usuario (cursor + estado)
CREATE INDEX ix_reserva_owner_cursor
  ON reserva (res_propietarioId, res_fechaCreacion DESC, id_reserva DESC);

CREATE INDEX ix_reserva_owner_estado
  ON reserva (res_propietarioId, res_estado);

CREATE INDEX ix_reserva_pnr
  ON reserva (res_pnr) WHERE res_pnr IS NOT NULL;

-- Barrido de expiración de holds
CREATE INDEX ix_hold_vencimiento
  ON bloqueo_cupo (blo_fechaExpiracion) WHERE blo_estado = 'HELD';

-- Pasajeros y asientos por reserva
CREATE INDEX ix_pasajero_reserva
  ON pasajero (pas_reservaId, pas_orden);

CREATE INDEX ix_asiento_asignado_pasajero
  ON asiento_asignado (asa_pasajeroId);

-- Postventa
CREATE INDEX ix_equipaje_pasajero
  ON equipaje_pasajero (eqp_pasajeroId, eqp_itineraryId);

CREATE INDEX ix_ocf_reserva
  ON oferta_cambio_fecha (ocf_reservaId, ocf_fechaExpiracion DESC);

CREATE INDEX ix_cotizacion_reserva
  ON cotizacion_cancelacion (cco_reservaId, cco_fechaExpiracion DESC);

-- Outbox: webhooks pendientes
CREATE INDEX ix_evento_pendiente
  ON evento_webhook (evw_procesado, evw_ocurridoEn) WHERE evw_procesado = false;

CREATE INDEX ix_entrega_reintento
  ON entrega_webhook (enw_proximaReintentoEn) WHERE enw_completada = false;

-- Idempotencia: limpieza por expiración
CREATE INDEX ix_idm_expiracion
  ON idempotencia (idm_expiracionEn);

-- Rate limit: dispositivos bloqueados
CREATE INDEX ix_limite_bloqueado
  ON limite_dispositivo (lim_bloqueadoHasta) WHERE lim_bloqueadoHasta IS NOT NULL;

-- Boleto: unicidad parcial (numeroBoleto puede ser NULL)
CREATE UNIQUE INDEX uq_boleto_numero
  ON boleto (bol_numeroBoleto) WHERE bol_numeroBoleto IS NOT NULL;

-- Reserva segmentos
CREATE INDEX ix_reserva_segmento_reserva
  ON reserva_segmento (rsg_itinerarioId, rsg_orden);

-- Historial de cambios
CREATE INDEX ix_hca_reserva_fecha
  ON historial_cambio (hca_reservaId, hca_fechaCambio DESC);

-- Auditoría
CREATE INDEX ix_log_entidad
  ON log_auditoria_vuelos (log_tipoEntidad, log_entidadId, log_fechaHora DESC);


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 4. FUNCIONES Y TRIGGERS (§4)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- 4.3 Máquina de estados de la reserva
CREATE OR REPLACE FUNCTION trg_reserva_transicion()
RETURNS trigger AS $$
DECLARE permitidas text[];
BEGIN
  IF NEW.res_estado = OLD.res_estado THEN RETURN NEW; END IF;

  permitidas := CASE OLD.res_estado
    WHEN 'PENDING'              THEN ARRAY['PENDING_PAYMENT','TICKET_ISSUING','FAILED','CANCELLED']
    WHEN 'PENDING_PAYMENT'      THEN ARRAY['TICKET_ISSUING','CONFIRMED','FAILED','CANCELLED']
    WHEN 'TICKET_ISSUING'       THEN ARRAY['CONFIRMED','FAILED','CANCELLED']
    WHEN 'CONFIRMED'            THEN ARRAY['CHANGE_PENDING','CANCELLATION_PENDING','CANCELLED']
    WHEN 'FAILED'               THEN ARRAY['CANCELLED']
    WHEN 'CHANGE_PENDING'       THEN ARRAY['CONFIRMED','FAILED','CANCELLATION_PENDING','CANCELLED']
    WHEN 'CANCELLATION_PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
    WHEN 'CANCELLED'            THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;

  IF NOT (NEW.res_estado = ANY(permitidas)) THEN
    RAISE EXCEPTION 'Transición de reserva no permitida: % -> %',
      OLD.res_estado, NEW.res_estado
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_reserva_transicion
  BEFORE UPDATE ON reserva
  FOR EACH ROW
  WHEN (OLD.res_estado IS DISTINCT FROM NEW.res_estado)
  EXECUTE FUNCTION trg_reserva_transicion();


-- 4.4 Actualización automática de res_fechaActualizacion
CREATE OR REPLACE FUNCTION trg_touch_reserva()
RETURNS trigger AS $$
BEGIN
  NEW.res_fechaActualizacion := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_touch_reserva
  BEFORE UPDATE ON reserva
  FOR EACH ROW
  EXECUTE FUNCTION trg_touch_reserva();


-- 4.6 Inmutabilidad de campos críticos del hold
CREATE OR REPLACE FUNCTION trg_hold_inmutable()
RETURNS trigger AS $$
BEGIN
  IF NEW.blo_precioCongelado IS DISTINCT FROM OLD.blo_precioCongelado
     OR NEW.blo_ofertaId      IS DISTINCT FROM OLD.blo_ofertaId
     OR NEW.blo_propietarioId IS DISTINCT FROM OLD.blo_propietarioId
     OR NEW.blo_fechaCreacion IS DISTINCT FROM OLD.blo_fechaCreacion THEN
    RAISE EXCEPTION 'Campos de bloqueo inmutables tras la creación'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_hold_inmutable
  BEFORE UPDATE ON bloqueo_cupo
  FOR EACH ROW
  EXECUTE FUNCTION trg_hold_inmutable();


-- 6.3 Auditoría append-only
CREATE OR REPLACE FUNCTION trg_auditoria_no_borrar()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'log_auditoria_vuelos es append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_auditoria_no_borrar
  BEFORE DELETE OR UPDATE OR TRUNCATE
  ON log_auditoria_vuelos
  FOR EACH STATEMENT
  EXECUTE FUNCTION trg_auditoria_no_borrar();


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 5. VISTAS (§5)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- 5.1 POST /search
CREATE VIEW vista_busqueda_vuelos AS
SELECT
    vue.vue_numeroVuelo,
    vue.vue_aeropuertoOrigen,
    vue.vue_aeropuertoDestino,
    vue.vue_fecha,
    vue.vue_horaSalidaProgramada                      AS at,
    vue.vue_horaLlegadaProgramada,
    vue.vue_duracionMinutos,
    amc.id_aerolinea                                  AS marketingCarrier,
    aoc.id_aerolinea                                  AS operatingCarrier,
    vue.vue_aeronave                                  AS aircraft,
    vue.vue_estado                                    AS status,
    vue.vue_terminalOrigen                            AS departureTerminal,
    vue.vue_terminalDestino                           AS arrivalTerminal
FROM vuelo vue
JOIN aerolinea amc ON amc.id_aerolinea = vue.vue_aerolineaMarketingId
JOIN aerolinea aoc ON aoc.id_aerolinea = vue.vue_aerolineaOperadoraId
WHERE vue.vue_estado NOT IN ('CANCELLED');

-- 5.2 FlightSegment exacto
CREATE VIEW vista_oferta_segmento_api AS
SELECT
    osg.osg_segmentId                                AS segmentId,
    vue.vue_numeroVuelo                              AS flightNumber,
    vue.vue_aeropuertoOrigen                         AS departureIataCode,
    vue.vue_horaSalidaProgramada                     AS departureAt,
    vue.vue_terminalOrigen                           AS departureTerminal,
    vue.vue_aeropuertoDestino                        AS arrivalIataCode,
    vue.vue_horaLlegadaProgramada                    AS arrivalAt,
    vue.vue_terminalDestino                          AS arrivalTerminal,
    osg.osg_escalaMinutos                            AS layoverMinutes,
    amc.id_aerolinea                                 AS marketingCarrier,
    aoc.id_aerolinea                                 AS operatingCarrier,
    vue.vue_aeronave                                 AS aircraft,
    vue.vue_duracionMinutos                          AS durationMinutes,
    osg.osg_estado                                   AS status
FROM oferta_segmento osg
JOIN vuelo     vue ON vue.id_vuelo     = osg.osg_vueloId
JOIN aerolinea amc ON amc.id_aerolinea = vue.vue_aerolineaMarketingId
JOIN aerolinea aoc ON aoc.id_aerolinea = vue.vue_aerolineaOperadoraId;

-- 5.3 GET /offers/{offerId}/seatmap
CREATE VIEW vista_mapa_asientos AS
SELECT
    ose.osg_segmentId,
    asi.asi_claseCabina                              AS cabinClass,
    asi.asi_fila                                     AS rowNumber,
    json_agg(json_build_object(
        'seatNumber',      asi.asi_numeroAsiento,
        'isAvailable',     asi.asi_estaDisponible,
        'characteristics', to_json(asi.asi_caracteristicas)
    ) ORDER BY asi.asi_numeroAsiento)                AS seats
FROM asiento_vuelo asi
JOIN oferta_segmento ose ON ose.osg_vueloId = asi.asi_vueloId
GROUP BY ose.osg_segmentId, asi.asi_claseCabina, asi.asi_fila;

-- 5.4 GET /offers/hold/{holdId}
CREATE VIEW vista_hold_estado AS
SELECT
    blo.id_bloqueo_cupo                              AS holdId,
    blo.blo_estado                                   AS status,
    blo.blo_fechaExpiracion                          AS expiresAt,
    GREATEST(0, EXTRACT(EPOCH FROM (blo.blo_fechaExpiracion - now()))::int)
                                                     AS remainingSeconds,
    blo.blo_ttlMinutos                               AS ttlMinutes,
    blo.blo_moneda                                   AS currency,
    blo.blo_precioCongelado                          AS total
FROM bloqueo_cupo blo
WHERE blo.blo_estado = 'HELD';

-- 5.5 GET /bookings/{bookingId}/baggage-options
CREATE VIEW vista_equipaje_pasajero AS
SELECT
    eqp.eqp_pasajeroId                               AS passengerId,
    eqp.eqp_itineraryId                              AS itineraryId,
    eqp.eqp_moneda                                   AS currency,
    MAX(eqp.eqp_precio)                              AS price,
    MAX(eqp.eqp_maximoPermitido)                     AS maxAllowed,
    COALESCE(SUM(eqp.eqp_cantidad), 0)::int          AS alreadyPurchased
FROM equipaje_pasajero eqp
GROUP BY eqp.eqp_pasajeroId, eqp.eqp_itineraryId, eqp.eqp_moneda;

-- 5.6 GET /bookings (paginación por cursor)
CREATE VIEW vista_listado_reservas AS
SELECT
    r.id_reserva                                     AS bookingId,
    r.res_pnr                                        AS pnr,
    r.res_estado                                     AS status,
    (SELECT vue.vue_aeropuertoOrigen
       FROM reserva_segmento rsg
       JOIN reserva_itinerario ri ON ri.id_reserva_itinerario = rsg.rsg_itinerarioId
       JOIN vuelo vue ON vue.id_vuelo = rsg.rsg_vueloId
      WHERE ri.rit_reservaId = r.id_reserva
      ORDER BY ri.rit_orden, rsg.rsg_orden
      LIMIT 1)                                       AS origin,
    (SELECT vue.vue_aeropuertoDestino
       FROM reserva_segmento rsg
       JOIN reserva_itinerario ri ON ri.id_reserva_itinerario = rsg.rsg_itinerarioId
       JOIN vuelo vue ON vue.id_vuelo = rsg.rsg_vueloId
      WHERE ri.rit_reservaId = r.id_reserva
      ORDER BY ri.rit_orden DESC, rsg.rsg_orden DESC
      LIMIT 1)                                       AS destination,
    (SELECT min(vue.vue_fecha)
       FROM reserva_segmento rsg
       JOIN reserva_itinerario ri ON ri.id_reserva_itinerario = rsg.rsg_itinerarioId
       JOIN vuelo vue ON vue.id_vuelo = rsg.rsg_vueloId
      WHERE ri.rit_reservaId = r.id_reserva)         AS departureDate,
    r.res_moneda                                     AS currency,
    r.res_total                                      AS grandTotal,
    r.res_fechaCreacion                              AS createdAt
FROM reserva r;

-- 5.7 Ocupación por vuelo (dashboard)
CREATE VIEW vista_ocupacion_vuelo AS
SELECT
    vue.id_vuelo,
    vue.vue_numeroVuelo,
    vue.vue_fecha,
    vue.vue_aeropuertoOrigen,
    vue.vue_aeropuertoDestino,
    asi.asi_claseCabina,
    COUNT(*)::int                                     AS asientosTotales,
    COUNT(*) FILTER (WHERE asi.asi_estaDisponible)::int
                                                      AS asientosLibres,
    COUNT(*) FILTER (WHERE NOT asi.asi_estaDisponible)::int
                                                      AS asientosOcupados,
    COUNT(*) FILTER (WHERE NOT asi.asi_estaDisponible)::numeric
      / NULLIF(COUNT(*), 0)                           AS ocupacionPct
FROM vuelo vue
JOIN asiento_vuelo asi ON asi.asi_vueloId = vue.id_vuelo
GROUP BY vue.id_vuelo, vue.vue_numeroVuelo, vue.vue_fecha,
         vue.vue_aeropuertoOrigen, vue.vue_aeropuertoDestino, asi.asi_claseCabina;

-- 5.8 Reembolsos financieros (dashboard)
CREATE VIEW vista_reembolsos_financieros AS
SELECT
    cco.cco_moneda                                   AS currency,
    date_trunc('month', cco.cco_fechaCancelacion)::date AS period,
    COUNT(DISTINCT cco.cco_reservaId)::int           AS cancelaciones,
    COALESCE(SUM(cco.cco_montoReembolso), 0)         AS totalReembolsado,
    COALESCE(SUM(cco.cco_montoPenalizacion), 0)      AS totalPenalizaciones,
    COALESCE(SUM(cco.cco_montoReembolso + cco.cco_montoPenalizacion), 0)
                                                      AS netoRetenido
FROM cotizacion_cancelacion cco
WHERE cco.cco_estado = 'CONSUMED' AND cco.cco_fechaCancelacion IS NOT NULL
GROUP BY cco.cco_moneda, date_trunc('month', cco.cco_fechaCancelacion);

-- 5.9 GET /flights/{flightNumber}/status (público)
CREATE VIEW vista_estado_vuelo_publico AS
SELECT
    vue.vue_numeroVuelo                              AS "flightNumber",
    vue.vue_fecha                                    AS "date",
    amc.id_aerolinea                                 AS "marketingCarrier",
    aoc.id_aerolinea                                 AS "operatingCarrier",
    vue.vue_aeropuertoOrigen                         AS "departure.iataCode",
    vue.vue_terminalOrigen                           AS "departure.terminal",
    vue.vue_horaSalidaProgramada                     AS "departure.scheduledAt",
    vue.vue_horaSalidaEstimada                       AS "departure.estimatedAt",
    vue.vue_horaSalidaReal                           AS "departure.actualAt",
    vue.vue_aeropuertoDestino                        AS "arrival.iataCode",
    vue.vue_terminalDestino                          AS "arrival.terminal",
    vue.vue_horaLlegadaProgramada                    AS "arrival.scheduledAt",
    vue.vue_horaLlegadaEstimada                      AS "arrival.estimatedAt",
    vue.vue_horaLlegadaReal                          AS "arrival.actualAt",
    vue.vue_aeronave                                 AS "aircraft",
    vue.vue_estado                                   AS "status"
FROM vuelo vue
JOIN aerolinea amc ON amc.id_aerolinea = vue.vue_aerolineaMarketingId
JOIN aerolinea aoc ON aoc.id_aerolinea = vue.vue_aerolineaOperadoraId;

-- 5.10 GET /bookings/{bookingId}/boarding-passes
CREATE VIEW vista_pases_abordar AS
SELECT
    res.id_reserva                                   AS bookingId,
    json_agg(json_build_object(
        'passengerId',      pab.pab_pasajeroId,
        'segmentId',        pab.pab_segmentId,
        'seat',             pab.pab_asiento,
        'boardingGroup',    pab.pab_grupoAbordaje,
        'boardingPosition', pab.pab_posicionAbordaje,
        'barcode',          pab.pab_codigoBarras,
        'barcodeType',      pab.pab_tipoCodigoBarras
    ) ORDER BY pab.pab_pasajeroId, pab.pab_segmentId)
                                                     AS boardingPasses
FROM pase_abordar pab
JOIN boleto  bol ON bol.id_boleto  = pab.pab_boletoId
JOIN reserva res ON res.id_reserva = bol.bol_reservaId
WHERE bol.bol_estado = 'ISSUED'
GROUP BY res.id_reserva;


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 6. CATÁLOGO SEMILLA DE CÓDIGOS DE ERROR (§2.7)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

INSERT INTO codigo_error (cer_codigo, cer_httpStatus, cer_titulo, cer_tipoUri) VALUES
  ('VALIDATION_FAILED',            400, 'Validation Failed',             'urn:gds:error:validation-failed'),
  ('RATE_LIMIT_EXCEEDED',          429, 'Rate Limit Exceeded',           'urn:gds:error:rate-limit-exceeded'),
  ('SEAT_TAKEN',                   409, 'Seat Already Taken',            'urn:gds:error:seat-taken'),
  ('AMOUNT_MISMATCH',              409, 'Amount Mismatch',               'urn:gds:error:amount-mismatch'),
  ('BOOKING_NOT_CONFIRMED',        409, 'Booking Not Confirmed',         'urn:gds:error:booking-not-confirmed'),
  ('BAGGAGE_LIMIT_EXCEEDED',       409, 'Baggage Limit Exceeded',        'urn:gds:error:baggage-limit-exceeded'),
  ('CUTOFF_PASSED',                409, 'Check-in Cutoff Passed',        'urn:gds:error:cutoff-passed'),
  ('FARE_NOT_CHANGEABLE',          409, 'Fare Not Changeable',           'urn:gds:error:fare-not-changeable'),
  ('FLIGHT_ALREADY_DEPARTED',      409, 'Flight Already Departed',       'urn:gds:error:flight-already-departed'),
  ('CHANGE_OFFER_EXPIRED',         410, 'Change Offer Expired',          'urn:gds:error:change-offer-expired'),
  ('QUOTE_EXPIRED',                410, 'Cancellation Quote Expired',    'urn:gds:error:quote-expired'),
  ('INFANT_SEAT_NOT_ALLOWED',      422, 'Infant Seat Not Allowed',       'urn:gds:error:infant-seat-not-allowed'),
  ('PNR_CREATION_FAILED',          422, 'PNR Creation Failed',           'urn:gds:error:pnr-creation-failed'),
  ('TICKET_ISSUANCE_FAILED',       422, 'Ticket Issuance Failed',        'urn:gds:error:ticket-issuance-failed'),
  ('TICKET_ALREADY_ISSUED',        409, 'Ticket Already Issued',         'urn:gds:error:ticket-already-issued'),
  ('CHECK_IN_NOT_AVAILABLE',       409, 'Check-in Not Available',        'urn:gds:error:checkin-not-available'),
  ('CHECK_IN_FAILED',              422, 'Check-in Failed',               'urn:gds:error:checkin-failed'),
  ('BOARDING_PASS_NOT_AVAILABLE',  409, 'Boarding Pass Not Available',   'urn:gds:error:boarding-pass-not-available'),
  ('SEAT_CABIN_MISMATCH',          422, 'Seat Cabin Mismatch',           'urn:gds:error:seat-cabin-mismatch'),
  ('FLIGHT_STATUS_NOT_AVAILABLE',  404, 'Flight Status Not Available',   'urn:gds:error:flight-status-not-available'),
  ('OFFER_NO_LONGER_AVAILABLE',    410, 'Offer No Longer Available',     'urn:gds:error:offer-no-longer-available'),
  ('PAYMENT_REFERENCE_INVALID',    422, 'Payment Reference Invalid',     'urn:gds:error:payment-reference-invalid'),
  ('PAYMENT_NOT_AUTHORIZED',       422, 'Payment Not Authorized',        'urn:gds:error:payment-not-authorized'),
  ('ALREADY_CANCELLED',            409, 'Booking Already Cancelled',     'urn:gds:error:already-cancelled')
ON CONFLICT (cer_codigo) DO NOTHING;


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 7. ROW LEVEL SECURITY (§6.1)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

ALTER TABLE reserva              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueo_cupo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripcion_webhook  ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotencia         ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_reserva_owner ON reserva
  USING (res_propietarioId = current_setting('app.owner_id', true)::uuid);

CREATE POLICY p_hold_owner ON bloqueo_cupo
  USING (blo_propietarioId = current_setting('app.owner_id', true)::uuid);

CREATE POLICY p_webhook_owner ON suscripcion_webhook
  USING (swb_propietarioId = current_setting('app.owner_id', true)::uuid);

CREATE POLICY p_idempotencia_owner ON idempotencia
  USING (idm_propietarioId = current_setting('app.owner_id', true)::uuid);


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- 8. PRIVILEGIOS (§6.2)
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- flights_app: operaciones normales, sin DELETE
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO flights_app;
REVOKE DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM flights_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO flights_app;

-- flights_public: solo vistas públicas
GRANT SELECT ON vista_busqueda_vuelos      TO flights_public;
GRANT SELECT ON vista_estado_vuelo_publico TO flights_public;

-- flights_worker: outbox de webhooks e idempotencia
GRANT SELECT, UPDATE ON evento_webhook, entrega_webhook, idempotencia TO flights_worker;
GRANT INSERT ON log_auditoria_vuelos TO flights_worker;

-- flights_auditor: solo lectura de auditoría
GRANT SELECT ON log_auditoria_vuelos, evento_error, idempotencia TO flights_auditor;


COMMIT;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
