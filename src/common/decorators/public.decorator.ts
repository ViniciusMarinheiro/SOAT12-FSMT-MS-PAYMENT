import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Rotas com este decorator nao passam pelo JWT guard (ex.: health check). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
