// Genera los íconos de la PWA desde public/logo-mark.svg (el símbolo sin fondo,
// transparente). Solo redimensiona a cada tamaño. Uso: node scripts/gen-icons.mjs
import sharp from 'sharp';

const SRC = 'public/logo-mark.svg';
const OUT = 'public/icons';
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  await sharp(SRC, { density: 512 }).resize(size, size).png().toFile(`${OUT}/icon-${size}x${size}.png`);
}
await sharp(SRC, { density: 512 }).resize(48, 48).png().toFile(`${OUT}/favicon-48.png`);

console.log('Íconos generados desde', SRC, '→', SIZES.join(', '), '+ favicon-48');
