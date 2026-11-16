import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const result = spawnSync(
  resolve("node_modules/.bin/supabase"),
  process.argv.slice(2),
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SUPABASE_HOME: process.env.SUPABASE_HOME ?? resolve("work/supabase-home"),
      SUPABASE_INTERNAL_IMAGE_REGISTRY:
        process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY ?? "docker.io",
    },
  },
);
process.exit(result.status ?? 1);
