export interface ProductImage {
  id: number;
  url: string;
  cardUrl?: string;
  srcset?: string;
  fit?: 'contain';
  alt: string;
  position: number;
}
