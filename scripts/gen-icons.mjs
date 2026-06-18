// Genera los íconos de la PWA desde brand/logo.png.
// Aplana sobre blanco, recorta el borde sobrante y centra el logo en cada cuadrado.
// Uso: node scripts/gen-icons.mjs   (requiere devDep `sharp`)
import sharp from 'sharp';

const SRC = 'brand/logo.png';
const OUT = 'public/icons';
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

const logo = await sharp(SRC).flatten({ background: BG }).trim().toBuffer();

for (const size of SIZES) {
  const inner = Math.round(size * 0.86); // margen ~7% por lado (safe zone)
  const fitted = await sharp(logo).resize(inner, inner, { fit: 'contain', background: BG }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: fitted, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/icon-${size}x${size}.png`);
}

// favicon PNG (los navegadores modernos lo aceptan)
const fav = await sharp(logo).resize(40, 40, { fit: 'contain', background: BG }).toBuffer();
await sharp({ create: { width: 48, height: 48, channels: 4, background: BG } })
  .composite([{ input: fav, gravity: 'center' }])
  .png()
  .toFile(`${OUT}/favicon-48.png`);

console.log('Íconos generados:', SIZES.map((s) => `${s}x${s}`).join(', '), '+ favicon-48');
