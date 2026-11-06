import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildExtensionZip } from './scripts/build_extension_zip.mjs';

// Arma public/downloads/bloomshire-companion.zip al arrancar dev o build, sin depender del
// comando de build configurado en Vercel.
const extensionZip = () => ({
  name: 'bloomshire-extension-zip',
  buildStart() {
    const r = buildExtensionZip();
    this.info?.(`extension v${r.version} empaquetada (${r.files} archivos)`);
  }
});

export default defineConfig({
  plugins: [react(), extensionZip()],
  server: {
    port: 5174
  }
});
