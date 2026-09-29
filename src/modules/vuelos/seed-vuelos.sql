-- ============================================================================
-- SEED DE VUELOS - 100+ vuelos desde el 1 hasta el 10 de octubre de 2026
-- Varía aerolíneas, rutas, horarios, precios y estados
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AEROLÍNEAS (si no existen)
-- ============================================================================
INSERT INTO aerolinea (id_aerolinea, ael_nombre) VALUES
  ('LAT', 'LATAM Airlines'),
  ('AVA', 'Avianca'),
  ('DAL', 'Delta Air Lines'),
  ('AAL', 'American Airlines'),
  ('UAL', 'United Airlines'),
  ('BAW', 'British Airways'),
  ('AFR', 'Air France'),
  ('KLM', 'KLM Royal Dutch'),
  ('IBE', 'Iberia'),
  ('QFA', 'Qantas')
ON CONFLICT (id_aerolinea) DO NOTHING;

-- ============================================================================
-- 2. VUELOS (100+ vuelos, 10+ por día, del 1 al 10 de octubre de 2026)
-- ============================================================================

-- DÍA 1: 1 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1001', '2026-10-01', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-01 06:00:00+00', '2026-10-01 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2001', '2026-10-01', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-01 08:00:00+00', '2026-10-01 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3001', '2026-10-01', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-01 10:00:00+00', '2026-10-01 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4001', '2026-10-01', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-01 12:00:00+00', '2026-10-01 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5001', '2026-10-01', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-01 14:00:00+00', '2026-10-01 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6001', '2026-10-01', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-01 16:00:00+00', '2026-10-02 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7001', '2026-10-01', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-01 18:00:00+00', '2026-10-02 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8001', '2026-10-01', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-01 20:00:00+00', '2026-10-02 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9001', '2026-10-01', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-01 22:00:00+00', '2026-10-02 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1001', '2026-10-01', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-01 23:00:00+00', '2026-10-02 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 2: 2 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1002', '2026-10-02', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-02 06:00:00+00', '2026-10-02 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2002', '2026-10-02', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-02 08:00:00+00', '2026-10-02 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3002', '2026-10-02', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-02 10:00:00+00', '2026-10-02 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4002', '2026-10-02', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-02 12:00:00+00', '2026-10-02 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5002', '2026-10-02', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-02 14:00:00+00', '2026-10-02 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6002', '2026-10-02', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-02 16:00:00+00', '2026-10-03 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7002', '2026-10-02', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-02 18:00:00+00', '2026-10-03 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8002', '2026-10-02', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-02 20:00:00+00', '2026-10-03 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9002', '2026-10-02', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-02 22:00:00+00', '2026-10-03 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1002', '2026-10-02', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-02 23:00:00+00', '2026-10-03 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 3: 3 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1003', '2026-10-03', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-03 06:00:00+00', '2026-10-03 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2003', '2026-10-03', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-03 08:00:00+00', '2026-10-03 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3003', '2026-10-03', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-03 10:00:00+00', '2026-10-03 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4003', '2026-10-03', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-03 12:00:00+00', '2026-10-03 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5003', '2026-10-03', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-03 14:00:00+00', '2026-10-03 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6003', '2026-10-03', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-03 16:00:00+00', '2026-10-04 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7003', '2026-10-03', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-03 18:00:00+00', '2026-10-04 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8003', '2026-10-03', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-03 20:00:00+00', '2026-10-04 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9003', '2026-10-03', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-03 22:00:00+00', '2026-10-04 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1003', '2026-10-03', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-03 23:00:00+00', '2026-10-04 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 4: 4 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1004', '2026-10-04', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-04 06:00:00+00', '2026-10-04 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2004', '2026-10-04', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-04 08:00:00+00', '2026-10-04 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3004', '2026-10-04', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-04 10:00:00+00', '2026-10-04 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4004', '2026-10-04', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-04 12:00:00+00', '2026-10-04 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5004', '2026-10-04', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-04 14:00:00+00', '2026-10-04 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6004', '2026-10-04', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-04 16:00:00+00', '2026-10-05 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7004', '2026-10-04', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-04 18:00:00+00', '2026-10-05 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8004', '2026-10-04', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-04 20:00:00+00', '2026-10-05 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9004', '2026-10-04', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-04 22:00:00+00', '2026-10-05 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1004', '2026-10-04', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-04 23:00:00+00', '2026-10-05 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 5: 5 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1005', '2026-10-05', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-05 06:00:00+00', '2026-10-05 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2005', '2026-10-05', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-05 08:00:00+00', '2026-10-05 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3005', '2026-10-05', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-05 10:00:00+00', '2026-10-05 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4005', '2026-10-05', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-05 12:00:00+00', '2026-10-05 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5005', '2026-10-05', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-05 14:00:00+00', '2026-10-05 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6005', '2026-10-05', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-05 16:00:00+00', '2026-10-06 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7005', '2026-10-05', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-05 18:00:00+00', '2026-10-06 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8005', '2026-10-05', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-05 20:00:00+00', '2026-10-06 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9005', '2026-10-05', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-05 22:00:00+00', '2026-10-06 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1005', '2026-10-05', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-05 23:00:00+00', '2026-10-06 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 6: 6 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1006', '2026-10-06', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-06 06:00:00+00', '2026-10-06 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2006', '2026-10-06', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-06 08:00:00+00', '2026-10-06 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3006', '2026-10-06', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-06 10:00:00+00', '2026-10-06 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4006', '2026-10-06', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-06 12:00:00+00', '2026-10-06 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5006', '2026-10-06', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-06 14:00:00+00', '2026-10-06 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6006', '2026-10-06', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-06 16:00:00+00', '2026-10-07 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7006', '2026-10-06', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-06 18:00:00+00', '2026-10-07 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8006', '2026-10-06', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-06 20:00:00+00', '2026-10-07 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9006', '2026-10-06', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-06 22:00:00+00', '2026-10-07 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1006', '2026-10-06', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-06 23:00:00+00', '2026-10-07 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 7: 7 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1007', '2026-10-07', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-07 06:00:00+00', '2026-10-07 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2007', '2026-10-07', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-07 08:00:00+00', '2026-10-07 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3007', '2026-10-07', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-07 10:00:00+00', '2026-10-07 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4007', '2026-10-07', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-07 12:00:00+00', '2026-10-07 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5007', '2026-10-07', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-07 14:00:00+00', '2026-10-07 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6007', '2026-10-07', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-07 16:00:00+00', '2026-10-08 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7007', '2026-10-07', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-07 18:00:00+00', '2026-10-08 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8007', '2026-10-07', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-07 20:00:00+00', '2026-10-08 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9007', '2026-10-07', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-07 22:00:00+00', '2026-10-08 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1007', '2026-10-07', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-07 23:00:00+00', '2026-10-08 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 8: 8 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1008', '2026-10-08', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-08 06:00:00+00', '2026-10-08 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2008', '2026-10-08', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-08 08:00:00+00', '2026-10-08 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3008', '2026-10-08', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-08 10:00:00+00', '2026-10-08 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4008', '2026-10-08', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-08 12:00:00+00', '2026-10-08 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5008', '2026-10-08', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-08 14:00:00+00', '2026-10-08 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6008', '2026-10-08', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-08 16:00:00+00', '2026-10-09 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7008', '2026-10-08', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-08 18:00:00+00', '2026-10-09 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8008', '2026-10-08', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-08 20:00:00+00', '2026-10-09 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9008', '2026-10-08', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-08 22:00:00+00', '2026-10-09 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1008', '2026-10-08', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-08 23:00:00+00', '2026-10-09 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 9: 9 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1009', '2026-10-09', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-09 06:00:00+00', '2026-10-09 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2009', '2026-10-09', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-09 08:00:00+00', '2026-10-09 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3009', '2026-10-09', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-09 10:00:00+00', '2026-10-09 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4009', '2026-10-09', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-09 12:00:00+00', '2026-10-09 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5009', '2026-10-09', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-09 14:00:00+00', '2026-10-09 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6009', '2026-10-09', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-09 16:00:00+00', '2026-10-10 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7009', '2026-10-09', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-09 18:00:00+00', '2026-10-10 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8009', '2026-10-09', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-09 20:00:00+00', '2026-10-10 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9009', '2026-10-09', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-09 22:00:00+00', '2026-10-10 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1009', '2026-10-09', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-09 23:00:00+00', '2026-10-10 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- DÍA 10: 10 de octubre de 2026 (10 vuelos)
INSERT INTO vuelo (id_vuelo, vue_numeroVuelo, vue_fecha, vue_aerolineaMarketingId, vue_aerolineaOperadoraId, vue_aeropuertoOrigen, vue_aeropuertoDestino, vue_terminalOrigen, vue_terminalDestino, vue_horaSalidaProgramada, vue_horaLlegadaProgramada, vue_aeronave, vue_duracionMinutos, vue_estado) VALUES
  (gen_random_uuid(), 'LA1010', '2026-10-10', 'LAT', 'LAT', 'GYE', 'UIO', 'A', 'B', '2026-10-10 06:00:00+00', '2026-10-10 07:30:00+00', 'A320', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'AV2010', '2026-10-10', 'AVA', 'AVA', 'UIO', 'GYE', 'B', 'A', '2026-10-10 08:00:00+00', '2026-10-10 09:30:00+00', 'A321', 90, 'SCHEDULED'),
  (gen_random_uuid(), 'DL3010', '2026-10-10', 'DAL', 'DAL', 'GYE', 'MIA', 'A', 'C', '2026-10-10 10:00:00+00', '2026-10-10 14:00:00+00', 'B737', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'AA4010', '2026-10-10', 'AAL', 'AAL', 'UIO', 'MIA', 'B', 'C', '2026-10-10 12:00:00+00', '2026-10-10 16:00:00+00', 'B787', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'UA5010', '2026-10-10', 'UAL', 'UAL', 'GYE', 'IAH', 'A', 'D', '2026-10-10 14:00:00+00', '2026-10-10 18:00:00+00', 'B777', 240, 'SCHEDULED'),
  (gen_random_uuid(), 'BA6010', '2026-10-10', 'BAW', 'BAW', 'UIO', 'LHR', 'B', 'A', '2026-10-10 16:00:00+00', '2026-10-11 06:00:00+00', 'A380', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'AF7010', '2026-10-10', 'AFR', 'AFR', 'GYE', 'CDG', 'A', 'B', '2026-10-10 18:00:00+00', '2026-10-11 08:00:00+00', 'A350', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'KL8010', '2026-10-10', 'KLM', 'KLM', 'UIO', 'AMS', 'B', 'C', '2026-10-10 20:00:00+00', '2026-10-11 10:00:00+00', 'B747', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'IB9010', '2026-10-10', 'IBE', 'IBE', 'GYE', 'MAD', 'A', 'B', '2026-10-10 22:00:00+00', '2026-10-11 12:00:00+00', 'A330', 840, 'SCHEDULED'),
  (gen_random_uuid(), 'QF1010', '2026-10-10', 'QFA', 'QFA', 'UIO', 'SYD', 'B', 'A', '2026-10-10 23:00:00+00', '2026-10-11 18:00:00+00', 'A380', 1080, 'SCHEDULED');

-- ============================================================================
-- 3. ASIENTOS PARA CADA VUELO (asientos variados por cabina)
-- ============================================================================

-- Asientos para vuelos de corta distancia (GYE-UIO, UIO-GYE) - 30 asientos por vuelo
INSERT INTO asiento_vuelo (id_asiento_vuelo, asi_vueloId, asi_numeroAsiento, asi_fila, asi_claseCabina, asi_estaDisponible, asi_caracteristicas)
SELECT
  gen_random_uuid(),
  v.id_vuelo,
  (f.num || l.letra)::VARCHAR(5),
  f.num,
  'ECONOMY',
  true,
  CASE WHEN f.num <= 5 THEN '{exit_row}'::VARCHAR(20)[] ELSE '{}'::VARCHAR(20)[] END
FROM vuelo v
CROSS JOIN generate_series(1, 15) AS f(num)
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) AS l(letra)
WHERE v.vue_aeropuertoOrigen IN ('GYE', 'UIO') AND v.vue_aeropuertoDestino IN ('GYE', 'UIO')
  AND (v.vue_numeroVuelo LIKE 'LA%' OR v.vue_numeroVuelo LIKE 'AV%')
ON CONFLICT DO NOTHING;

-- Asientos para vuelos de larga distancia - 40 asientos por vuelo (ECONOMY + BUSINESS)
INSERT INTO asiento_vuelo (id_asiento_vuelo, asi_vueloId, asi_numeroAsiento, asi_fila, asi_claseCabina, asi_estaDisponible, asi_caracteristicas)
SELECT
  gen_random_uuid(),
  v.id_vuelo,
  (f.num || l.letra)::VARCHAR(5),
  f.num,
  CASE WHEN f.num <= 10 THEN 'BUSINESS' ELSE 'ECONOMY' END,
  true,
  CASE WHEN f.num <= 10 THEN '{extra_legroom}'::VARCHAR(20)[] ELSE '{}'::VARCHAR(20)[] END
FROM vuelo v
CROSS JOIN generate_series(1, 20) AS f(num)
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) AS l(letra)
WHERE v.vue_aeropuertoOrigen IN ('GYE', 'UIO') AND v.vue_aeropuertoDestino IN ('MIA', 'IAH', 'LHR', 'CDG', 'AMS', 'MAD', 'SYD')
  AND v.vue_numeroVuelo NOT LIKE 'LA%' AND v.vue_numeroVuelo NOT LIKE 'AV%'
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- RESUMEN
-- ============================================================================
-- 100 vuelos creados (10 por día, del 1 al 10 de octubre de 2026)
-- 10 aerolíneas diferentes
-- Rutas variadas: GYE-UIO, UIO-GYE, GYE-MIA, UIO-MIA, GYE-IAH, UIO-LHR, GYE-CDG, UIO-AMS, GYE-MAD, UIO-SYD
-- Horarios variados: 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00, 23:00
-- Aeronaves variadas: A320, A321, B737, B787, B777, A380, A350, B747, A330
-- Asientos generados automáticamente para cada vuelo
-- ============================================================================
