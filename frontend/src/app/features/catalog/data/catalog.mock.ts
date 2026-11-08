import { CatalogProduct } from '../interfaces/product.interface';
import { ProductVariant } from '../interfaces/product-variant.interface';
import { CATEGORIES } from './categories';

interface DemoProduct {
  id: number;
  slug: string;
  name: string;
  categorySlug: string;
  description: string;
  price: number;
  featured?: boolean;
  careInstructions: string;
  measurements: Record<string, string>;
  images: {
    fileName: string;
    alt: string;
  }[];
  variants: Array<{
    color: string;
    size: string;
    stock: number;
  }>;
}

function createVariants(
  productId: number,
  slug: string,
  variants: DemoProduct['variants'],
): ProductVariant[] {
  return variants.map((variant, index) => ({
    id: productId * 100 + index + 1,
    sku: `BOX-${slug
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase()}-${variant.color
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase()}-${variant.size
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase()}`,
    color: variant.color,
    size: variant.size,
    stock: variant.stock,
  }));
}

function createDemoProduct(item: DemoProduct): CatalogProduct {
  const category = CATEGORIES.find(
    (candidate) => candidate.slug === item.categorySlug,
  );

  if (!category) {
    throw new Error(`Unknown demo category: ${item.categorySlug}`);
  }

  const variants = createVariants(item.id, item.slug, item.variants);

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    category,
    price: item.price,
    promotional_price: 0, // Required by the shared admin model; unused by the storefront.

    images: item.images.map((image, index) => ({
      id: item.id * 10 + index,
      url: `/products/cama/${item.slug}/${image.fileName}`,
      alt: image.alt,
      position: index,
    })),

    variants,

    measurements: item.measurements,

    quantity: variants.reduce(
      (total, variant) => total + variant.stock,
      0,
    ),

    status: 'active',
    care_instructions: item.careInstructions,
    featured: item.featured ?? false,
    active: true,
  };
}

const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: 1,
    slug: 'jogo-de-cama-essencia-natural',
    name: 'Jogo de Cama Essência Natural',
    categorySlug: 'cama',
    description:
      'O Jogo de Cama Essência Natural foi pensado para criar um quarto sereno, acolhedor e sofisticado. A combinação de tons suaves com acabamento delicado valoriza a composição da cama e traz uma sensação de conforto leve para a rotina. Ideal para quem busca uma proposta elegante, natural e fácil de combinar com diferentes estilos de decoração.',
    price: 299.9,
    featured: true,
    measurements: {
      Composição: '100% algodão',
      'Quantidade de peças': '4 peças',
      Acabamento: 'Toque macio e acabamento delicado',
      'Lençol com elástico': 'Sim',
    },
    careInstructions:
      'Lavar em ciclo suave com cores semelhantes. Não utilizar alvejante. Secar à sombra e passar em temperatura baixa. Consulte sempre as orientações da etiqueta do produto.',
    images: [
      {
        fileName: 'img1.png',
        alt: 'Jogo de Cama Essência Natural em composição verde sálvia e off-white',
      },
      {
        fileName: 'img2.png',
        alt: 'Jogo de Cama Essência Natural em quarto aconchegante com decoração natural',
      },
      {
        fileName: 'img3.png',
        alt: 'Detalhe do tecido e acabamento do Jogo de Cama Essência Natural',
      },
    ],
    variants: [
      { color: 'Sálvia', size: 'Casal', stock: 8 },
      { color: 'Sálvia', size: 'Queen', stock: 10 },
      { color: 'Sálvia', size: 'King', stock: 5 },
      { color: 'Creme', size: 'Casal', stock: 6 },
      { color: 'Creme', size: 'Queen', stock: 7 },
      { color: 'Creme', size: 'King', stock: 4 },
      { color: 'Branco', size: 'Casal', stock: 9 },
      { color: 'Branco', size: 'Queen', stock: 8 },
      { color: 'Branco', size: 'King', stock: 3 },
    ],
  },

  {
    id: 2,
    slug: 'jogo-de-cama-aurora',
    name: 'Jogo de Cama Aurora',
    categorySlug: 'cama',
    description:
      'O Jogo de Cama Aurora combina leveza visual e conforto para criar uma atmosfera tranquila no quarto. Sua proposta valoriza tons neutros e delicados, com acabamento minimalista que facilita a composição com mantas, almofadas e elementos naturais. Uma escolha versátil para transformar o descanso em um momento ainda mais acolhedor.',
    price: 269.9,
    measurements: {
      Composição: '100% algodão',
      'Quantidade de peças': '4 peças',
      Acabamento: 'Acabamento liso com toque suave',
      'Lençol com elástico': 'Sim',
    },
    careInstructions:
      'Lavar separadamente nas primeiras lavagens. Utilizar sabão neutro e ciclo delicado. Não usar cloro. Secar em local arejado e evitar temperaturas elevadas.',
    images: [
      {
        fileName: '01-principal.webp',
        alt: 'Jogo de Cama Aurora em tons de bege e branco',
      },
      {
        fileName: '02-ambiente.webp',
        alt: 'Jogo de Cama Aurora em quarto iluminado e elegante',
      },
      {
        fileName: '03-detalhe.webp',
        alt: 'Detalhe do acabamento e textura do Jogo de Cama Aurora',
      },
    ],
    variants: [
      { color: 'Areia', size: 'Casal', stock: 7 },
      { color: 'Areia', size: 'Queen', stock: 8 },
      { color: 'Areia', size: 'King', stock: 4 },
      { color: 'Branco', size: 'Casal', stock: 10 },
      { color: 'Branco', size: 'Queen', stock: 9 },
      { color: 'Branco', size: 'King', stock: 6 },
      { color: 'Rosé Seco', size: 'Casal', stock: 5 },
      { color: 'Rosé Seco', size: 'Queen', stock: 6 },
      { color: 'Rosé Seco', size: 'King', stock: 2 },
    ],
  },

  {
    id: 3,
    slug: 'colcha-serena',
    name: 'Colcha Serena',
    categorySlug: 'cama',
    description:
      'A Colcha Serena traz textura e aconchego para composições leves e elegantes. Seu desenho discreto cria profundidade sem pesar no ambiente, enquanto a paleta de cores naturais permite combinar a peça com diferentes jogos de cama e almofadas. Ideal para uso diário e para finalizar a cama com um toque sofisticado.',
    price: 219.9,
    measurements: {
      Composição: 'Microfibra premium com enchimento leve',
      Acabamento: 'Matelassê delicado',
      'Quantidade de peças': '1 colcha',
      Indicação: 'Uso diário e meia-estação',
    },
    careInstructions:
      'Lavar em ciclo delicado e com água fria. Não utilizar alvejante. Evitar centrifugação intensa. Secar à sombra e não passar diretamente sobre o matelassê.',
    images: [
      {
        fileName: '01-principal.webp',
        alt: 'Colcha Serena em tom creme com acabamento matelassê',
      },
      {
        fileName: '02-ambiente.webp',
        alt: 'Colcha Serena compondo uma cama em quarto natural e acolhedor',
      },
      {
        fileName: '03-detalhe.webp',
        alt: 'Detalhe do matelassê e da textura da Colcha Serena',
      },
    ],
    variants: [
      { color: 'Creme', size: 'Casal', stock: 6 },
      { color: 'Creme', size: 'Queen', stock: 8 },
      { color: 'Creme', size: 'King', stock: 5 },
      { color: 'Sálvia', size: 'Casal', stock: 5 },
      { color: 'Sálvia', size: 'Queen', stock: 7 },
      { color: 'Sálvia', size: 'King', stock: 4 },
      { color: 'Fendi', size: 'Casal', stock: 4 },
      { color: 'Fendi', size: 'Queen', stock: 6 },
      { color: 'Fendi', size: 'King', stock: 3 },
    ],
  },

  {
    id: 4,
    slug: 'edredom-linho-salvia',
    name: 'Edredom Linho Sálvia',
    categorySlug: 'cama',
    description:
      'O Edredom Linho Sálvia foi desenvolvido para proporcionar uma sensação acolhedora sem abrir mão da leveza visual. A tonalidade verde sálvia cria uma atmosfera tranquila e contemporânea, enquanto o acabamento inspirado no linho adiciona textura e personalidade ao quarto. Uma peça marcante para noites confortáveis e composições sofisticadas.',
    price: 389.9,
    featured: true,
    measurements: {
      Revestimento: 'Tecido com aspecto de linho',
      Enchimento: 'Fibra siliconada',
      Acabamento: 'Costura reforçada e toque macio',
      Indicação: 'Outono e inverno',
    },
    careInstructions:
      'Lavar em máquina de grande capacidade no ciclo delicado. Utilizar sabão neutro. Não usar alvejante. Secar completamente antes de guardar. Não passar.',
    images: [
      {
        fileName: '01-principal.webp',
        alt: 'Edredom Linho Sálvia dobrado em composição elegante',
      },
      {
        fileName: '02-ambiente.webp',
        alt: 'Edredom Linho Sálvia em cama de quarto sofisticado',
      },
      {
        fileName: '03-detalhe.webp',
        alt: 'Detalhe da textura inspirada em linho do Edredom Linho Sálvia',
      },
    ],
    variants: [
      { color: 'Sálvia', size: 'Casal', stock: 5 },
      { color: 'Sálvia', size: 'Queen', stock: 8 },
      { color: 'Sálvia', size: 'King', stock: 5 },
      { color: 'Bege Natural', size: 'Casal', stock: 4 },
      { color: 'Bege Natural', size: 'Queen', stock: 6 },
      { color: 'Bege Natural', size: 'King', stock: 4 },
      { color: 'Grafite Suave', size: 'Casal', stock: 3 },
      { color: 'Grafite Suave', size: 'Queen', stock: 5 },
      { color: 'Grafite Suave', size: 'King', stock: 2 },
    ],
  },

  {
    id: 5,
    slug: 'kit-cobre-leito-harmonia',
    name: 'Kit Cobre-Leito Harmonia',
    categorySlug: 'cama',
    description:
      'O Kit Cobre-Leito Harmonia foi criado para quem gosta de uma cama bem composta e pronta para receber. O conjunto combina textura delicada, acabamento elegante e cores fáceis de harmonizar com diferentes estilos. Uma opção prática para renovar o quarto com equilíbrio, conforto e uma estética acolhedora.',
    price: 349.9,
    measurements: {
      Composição: 'Poliéster premium com toque macio',
      'Quantidade de peças': '3 peças',
      Acabamento: 'Matelassê geométrico delicado',
      Conteúdo: '1 cobre-leito + 2 porta-travesseiros',
    },
    careInstructions:
      'Lavar com peças de cores semelhantes em ciclo suave. Não utilizar produtos à base de cloro. Secar à sombra e evitar ferro em temperatura alta.',
    images: [
      {
        fileName: '01-principal.webp',
        alt: 'Kit Cobre-Leito Harmonia em composição bege natural',
      },
      {
        fileName: '02-ambiente.webp',
        alt: 'Kit Cobre-Leito Harmonia em quarto elegante com tons naturais',
      },
      {
        fileName: '03-detalhe.webp',
        alt: 'Detalhe do acabamento matelassê do Kit Cobre-Leito Harmonia',
      },
    ],
    variants: [
      { color: 'Bege Natural', size: 'Casal', stock: 7 },
      { color: 'Bege Natural', size: 'Queen', stock: 9 },
      { color: 'Bege Natural', size: 'King', stock: 5 },
      { color: 'Sálvia', size: 'Casal', stock: 6 },
      { color: 'Sálvia', size: 'Queen', stock: 8 },
      { color: 'Sálvia', size: 'King', stock: 4 },
      { color: 'Off-white', size: 'Casal', stock: 8 },
      { color: 'Off-white', size: 'Queen', stock: 7 },
      { color: 'Off-white', size: 'King', stock: 4 },
    ],
  },
];

export const CATALOG_MOCK: readonly CatalogProduct[] =
  DEMO_PRODUCTS.map(createDemoProduct);
