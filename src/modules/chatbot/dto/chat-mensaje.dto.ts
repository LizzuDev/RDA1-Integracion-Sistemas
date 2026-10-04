/**
 * DTOs del endpoint de chat.
 *
 * El `ValidationPipe` global corre con `whitelist: true` y
 * `forbidNonWhitelisted: true` (ver `main.ts`), asi que TODO lo que entre por
 * aqui tiene que estar declarado o la peticion muere con 400. Es lo que impide
 * que un cliente mande campos tipo `systemPrompt` o `toolChoice` para suplantar al
 * servidor: no tienen donde aterrizar.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Un turno previo, enviado por el cliente como respaldo.
 *
 * ── Por que existe si el servidor ya guarda el historial ────────────────────
 * El historial se conserva en memoria en el servidor (ver
 * `chatbot.conversation.store.ts`), indexado por `sessionId`. Eso es la fuente
 * de verdad. Este campo existe para el caso de que el cliente se reconecte con
 * una sesion nueva: si envia sus propios turnos, el servidor los adopta en vez de
 * empezar de cero y el bot no pierde el contexto de lo que ya se habia dicho.
 *
 * Cuando el cliente NO lo envia (que es lo normal, porque el componente flotante
 * no tiene por que hacerlo) el servidor usa su propio registro.
 */
export class TurnoHistorialDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'], {
    message: "El rol del historial solo puede ser 'user' o 'assistant'.",
  })
  rol: 'user' | 'assistant';

  @ApiProperty({ example: '¿Hay vuelos a Cuenca?' })
  @IsString()
  @MaxLength(2000, { message: 'Un mensaje del historial no puede exceder 2000 caracteres.' })
  contenido: string;
}

export class MensajeChatDto {
  @ApiProperty({
    example: '¿Hay autos disponibles en Quito del 12 al 16 de diciembre?',
    maxLength: 1000,
    description: 'Mensaje del usuario en lenguaje natural.',
  })
  @IsString()
  @MaxLength(1000, { message: 'El mensaje no puede exceder 1000 caracteres.' })
  mensaje: string;

  @ApiPropertyOptional({
    example: '3f1c9a52-6d0b-4f7e-9a10-2b8c4d5e6f70',
    description:
      'Identificador de la conversacion. Lo genera el cliente una vez y lo conserva ' +
      '(localStorage) para que el historial sobreviva a un refresh. Si no llega, el ' +
      'servidor crea una sesion efimera y la devuelve en la respuesta.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]{8,64}$/, {
    message:
      'sessionId debe tener entre 8 y 64 caracteres y solo letras, digitos, guion o guion bajo.',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    type: [TurnoHistorialDto],
    description:
      'Turnos anteriores, por si el cliente quiere(stateless) o si la sesion del ' +
      'servidor se perdio. Si se omite, se usa el historial guardado en el servidor.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoHistorialDto)
  historial?: TurnoHistorialDto[];

  @ApiPropertyOptional({
    enum: ['es', 'en'],
    default: 'es',
    description:
      'Idioma de la respuesta. El frontend lo manda desde el LanguageContext para ' +
      'que el bot hable el mismo idioma que el resto de la interfaz.',
  })
  @IsOptional()
  @IsIn(['es', 'en'])
  idioma?: 'es' | 'en';

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    maximum: 20,
    description: 'Pagina del historial que se quiere recuperar. Solo lectura.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  paginaHistorial?: number;
}

/** Herramienta que el modelo pidio ejecutar en una iteracion del bucle. */
export class TrazaToolDto {
  @ApiProperty({ example: 'consultar_vuelos' })
  @IsString()
  herramienta: string;

  @ApiProperty({ example: { origen: 'UIO', destino: 'CUE', fecha: '2026-12-12' } })
  argumentos: Record<string, unknown>;
}

export class RespuestaChatDto {
  @ApiProperty({ example: '3f1c9a52-6d0b-4f7e-9a10-2b8c4d5e6f70' })
  sessionId: string;

  @ApiProperty({ example: 'Hay 3 vuelos de Quito a Cuenca el 12 de diciembre...' })
  respuesta: string;

  @ApiPropertyOptional({
    type: [TrazaToolDto],
    description:
      'Que herramientas se ejecutaron. Es la evidencia de que la respuesta viene ' +
      'de los datos y no del modelo. El frontend puede usarla para depurar.',
  })
  herramientas?: TrazaToolDto[];

  @ApiPropertyOptional({
    enum: ['ok', 'degradado', 'sin_llm'],
    description:
      '`ok`: respuesta normal. `degradado`: la de datos fallo y se respondio con ' +
      'honestidad. `sin_llm`: falta GROQ_API_KEY y no se pudo responder.',
  })
  estado?: 'ok' | 'degradado' | 'sin_llm';

  @ApiPropertyOptional({ description: 'Historial completo de la conversacion.' })
  historial?: { rol: 'user' | 'assistant'; contenido: string }[];

  @ApiProperty({ description: 'Sugerencias de la siguiente pregunta.' })
  sugerencias?: string[];
}