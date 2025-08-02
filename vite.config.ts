import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '', '');

  return {
    plugins: [react()],
    define: {
      // Make API key available to the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});
