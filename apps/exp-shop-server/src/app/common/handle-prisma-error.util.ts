import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@org/prisma';

/**
 * Traduce códigos de error de Prisma a excepciones HTTP/GraphQL legibles.
 * Extraído de UsersService (donde vivía como `handleDbErrors`) al agregar
 * Categories/Products, que necesitaban exactamente la misma lógica.
 */
export function handlePrismaError(error: unknown, logger: Logger, entityLabel: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.['target'] as string[] | undefined)?.join(', ');
      throw new BadRequestException(`Ya existe ${entityLabel} con ese ${target ?? 'valor único'}`);
    }

    if (error.code === 'P2025') {
      throw new NotFoundException(`No se encontró ${entityLabel}`);
    }
  }

  logger.error(error);
  throw new InternalServerErrorException('Revisa los logs del servidor');
}
