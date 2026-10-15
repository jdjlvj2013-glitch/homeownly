import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({ base: command === 'build' ? '/homeownly/' : '/', plugins:[react()], server:{host:true,port:5173} }));
