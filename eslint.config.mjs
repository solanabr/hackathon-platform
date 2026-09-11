import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: [".next/**", ".next-build/**", "node_modules/**", "supabase/functions/**", ".claude/**", "public/**"] },
]);
