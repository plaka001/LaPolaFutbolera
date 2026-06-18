// Genera los íconos de la PWA desde brand/logo.svg (ícono cuadrado ya terminado,
// con su propio fondo). Solo redimensiona a cada tamaño. Uso: node scripts/gen-icons.mjs
import sharp from 'sharp';

const SRC = 'brand/logo.svg';
const OUT = 'public/icons';
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  await sharp(SRC, { density: 512 }).resize(size, size).png().toFile(`${OUT}/icon-${size}x${size}.png`);
}
await sharp(SRC, { density: 512 }).resize(48, 48).png().toFile(`${OUT}/favicon-48.png`);

console.log('Íconos generados desde', SRC, '→', SIZES.join(', '), '+ favicon-48');
