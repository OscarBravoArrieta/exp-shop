import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { Category, PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

const CATEGORY_NAMES = [
  'Electrónica',
  'Ropa',
  'Hogar',
  'Deportes',
  'Juguetes',
  'Libros',
  'Belleza',
  'Alimentos',
  'Mascotas',
  'Automotriz',
];

const PRODUCTS_COUNT = 200;
const IMAGES_PER_PRODUCT = 4;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes (é -> e)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function picsumUrl(seed: string, width: number, height: number): string {
  // seed determinístico: la misma URL sale siempre para el mismo seed, no cambia entre reseeds.
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function main() {
  console.log('Borrando productos y categorías existentes...');
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log(`Creando ${CATEGORY_NAMES.length} categorías...`);
  const categories: Category[] = [];
  for (const name of CATEGORY_NAMES) {
    const slug = slugify(name);
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        image: picsumUrl(slug, 600, 400),
      },
    });
    categories.push(category);
  }

  console.log(`Creando ${PRODUCTS_COUNT} productos...`);
  const products = Array.from({ length: PRODUCTS_COUNT }, (_, index) => {
    const title = faker.commerce.productName();
    // el índice va en el slug para garantizar unicidad aunque faker repita un título
    const slug = `${slugify(title)}-${index}`;
    const category = faker.helpers.arrayElement(categories);

    return {
      title,
      slug,
      description: faker.commerce.productDescription(),
      price: Number(faker.commerce.price({ min: 5, max: 500 })),
      quantity: faker.number.int({ min: 0, max: 200 }),
      images: Array.from({ length: IMAGES_PER_PRODUCT }, (_, imageIndex) =>
        picsumUrl(`${slug}-${imageIndex}`, 800, 800),
      ),
      categoryId: category.id,
    };
  });

  await prisma.product.createMany({ data: products });

  console.log(`Listo: ${categories.length} categorías, ${products.length} productos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
