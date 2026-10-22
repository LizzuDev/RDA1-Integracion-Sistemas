import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaquetesService } from './paquetes.service';

@ApiTags('Paquetes Dinámicos (MS_PKG)')
@Controller('paquetes')
export class PaquetesController {
  constructor(private readonly paquetesService: PaquetesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar paquetes y combos turísticos activos (Multivertical)' })
  @ApiResponse({ status: 200, description: 'Catálogo de paquetes disponibles con descuentos comerciales.' })
  async findAll() {
    return this.paquetesService.findAll();
  }

  @Get('contratos')
  @ApiOperation({ summary: 'Consultar acuerdos y topes de descuento B2B acordados con socios (Cátedra §9)' })
  @ApiResponse({ status: 200, description: 'Listado de contratos comerciales y porcentajes de descuento máximo.' })
  async getContratos() {
    return this.paquetesService.getContratosPromociones();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un paquete turístico por ID o Código' })
  @ApiParam({ name: 'id', description: 'UUID o Código del paquete' })
  @ApiResponse({ status: 200, description: 'Detalle del combo y desglose de ítems incluidos.' })
  async findById(@Param('id') id: string) {
    return this.paquetesService.findById(id);
  }

  @Post('dinamico')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear paquete turístico dinámico validando acuerdos comerciales de socios (RDA2)' })
  @ApiResponse({ status: 201, description: 'Paquete dinámico creado con snapshot inmutable de precios.' })
  @ApiResponse({ status: 409, description: 'Conflicto: Un socio no acepta promociones o supera el descuento máximo.' })
  async crearPaqueteDinamico(@Body() dto: any) {
    return this.paquetesService.crearPaqueteDinamico(dto);
  }
}
