// Define os diferentes tipos de operações.
export type FavoriteRequest = { session: number; token: string } & (
  | { kind: 'sync' }
  | { kind: 'page'; offset: number }
  | { kind: 'mutation'; productId: number; favorited: boolean }
);
