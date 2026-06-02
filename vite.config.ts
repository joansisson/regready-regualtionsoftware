import react from '@vitejs/plugin-react';
import path from 'path';

export default ({
  // Build only the frontend. Prevent Vite from scanning electron/server code.
  root: path.resolve(__dirname, 'client'),
  // IMPORTANT for Electron `loadFile()` (file://). Ensures assets load via relative paths.
  base: "./",

  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@assets': path.resolve(__dirname, 'client/src/assets'),
    },
  },

  build: {
    // With `root: client`, use an absolute outDir so it always lands at project/dist/public
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
});
