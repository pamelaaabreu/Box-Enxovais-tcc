import { Category } from '../interfaces/category.interface';

export const CAMA_GROUP = {
  slug: 'cama',
  types: [
    'Cama / Jogos de cama',
    'Cama / Edredons',
    'Cama / Colchas e cobre-leitos',
    'Cama / Mantas e peseiras',
    'Cama / Protetores de colchão',
  ],
};

/** Single category taxonomy shared by navigation and catalog. */
export const CATEGORIES: readonly Category[] = [
  { id: 1, name: 'Cama', slug: 'cama', description: 'Conforto que transforma seu descanso.' },
  { id: 2, name: 'Travesseiros', slug: 'travesseiros', description: 'Apoio e aconchego para suas noites.' },
  { id: 3, name: 'Toalhas', slug: 'toalhas', description: 'Maciez para os pequenos rituais do dia.' },
  { id: 4, name: 'Almofadas', slug: 'almofadas', description: 'Texturas que deixam a casa mais sua.' },
  { id: 5, name: 'Mesa', slug: 'mesa', description: 'Cuidado em cada encontro à mesa.' },
  { id: 6, name: 'Decoração', slug: 'decoracao', description: 'Detalhes naturais para acolher.' },
];
