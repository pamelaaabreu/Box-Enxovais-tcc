export interface Page<T> {
  items: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
export interface PageOptions {
  offset?: number;
  limit?: number;
  filters?: Record<string, string | number>;
}
