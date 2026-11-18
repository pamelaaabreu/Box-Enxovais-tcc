export interface ProductImage {
  id: number;
  url: string;
  srcset?: string;
  fit?: 'contain';
  alt: string;
  position: number;
}
