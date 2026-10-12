import { PartialType } from '@nestjs/swagger';
import { CreateAlojamientoDto } from './create-alojamiento.dto';

// skipNullProperties:false → en un PATCH los campos obligatorios pueden omitirse,
// pero enviarlos como null es un 400 (antes se guardaba null en una columna NOT NULL).
export class UpdateAlojamientoDto extends PartialType(CreateAlojamientoDto, { skipNullProperties: false }) {}
