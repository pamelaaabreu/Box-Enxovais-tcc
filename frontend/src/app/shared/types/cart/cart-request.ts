// Estrutura de uma operação enfileirada.
export type CartRequest = {
  onAdded?: () => void;
  onAddError?: (message: string, status: number) => void;
  method: string;
  path: string;
  body?: unknown;
  key: number;
  productId?: number;
  session: number;
};
