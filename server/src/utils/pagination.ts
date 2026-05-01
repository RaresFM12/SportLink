import type { PaginatedResponse, PaginationParams } from '../types/event.js';

export function parsePagination(page?: string, limit?: string): PaginationParams {
  const parsedPage = Number(page ?? 1);
  const parsedLimit = Number(limit ?? 5);

  return {
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    limit: Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5
  };
}

export function paginate<T>(items: T[], params: PaginationParams): PaginatedResponse<T> {
  const { page, limit } = params;
  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const startIndex = (page - 1) * limit;
  const paginatedItems = items.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    page,
    limit,
    totalItems,
    totalPages
  };
}
