-- Columnas que la entidad ConfigProveedor (src/modules/nodes) ya usa para el
-- panel de nodos y que no estaban en 01_master_migration_12_schemas.sql.
ALTER TABLE schema_proveedores.config_proveedor
  ADD COLUMN IF NOT EXISTS equipo varchar(100),
  ADD COLUMN IF NOT EXISTS contacto varchar(120),
  ADD COLUMN IF NOT EXISTS emoji varchar(20) DEFAULT '🔗',
  ADD COLUMN IF NOT EXISTS descripcion text;
