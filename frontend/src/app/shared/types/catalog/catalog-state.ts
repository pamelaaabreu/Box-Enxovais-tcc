export type CatalogState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; data: T }
  | { status: 'error' };
