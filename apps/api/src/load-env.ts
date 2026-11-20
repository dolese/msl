import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Local development reads the repo-root .env. On Railway there is no file —
// variables come from the service settings — so a missing file is not an error.
for (const file of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}
