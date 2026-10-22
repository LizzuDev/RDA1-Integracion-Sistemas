import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { ConfigProveedor } from './entities';
import { WinstonPhysicalLoggerService } from '../../core/logger/winston-logger.service';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConfigProveedor]),
  ],
  controllers: [NodesController],
  providers: [NodesService, WinstonPhysicalLoggerService, SupabaseAuthGuard, RolesGuard],
  exports: [NodesService],
})
export class NodesModule {}
