-- Tickets de soporte que el frontend lee/escribe con supabase.from('support_tickets')
-- (ReportModal, MisReservasPage, AdminDashboard). Misma definición que
-- scripts/create-tickets-table.js.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id VARCHAR(50) PRIMARY KEY,
  client_name VARCHAR(255),
  email VARCHAR(255),
  entity_name VARCHAR(255),
  pnr_or_id VARCHAR(100),
  type VARCHAR(50),
  subject VARCHAR(255),
  priority VARCHAR(20),
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- En Supabase el frontend entra como anon/authenticated vía PostgREST.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO anon, authenticated, service_role;
  END IF;
END $$;
