import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Exercise 4: requests to /api are proxied to the Flask API in ../02-python-api
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:5000" } },
});
