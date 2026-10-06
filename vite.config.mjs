import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    rollupOptions: {
      input: ['index.html', 'student.html', 'instructor.html', 'student-cs.html', 'student-non-cs.html'],
    },
  },
  plugins: [tailwindcss()],
});