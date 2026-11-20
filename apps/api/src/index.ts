import './load-env.js'; // must be first: later imports read process.env at load time
import { env } from './config/env.js';
import { createApp } from './app.js';
import { ensureFirstAdmin } from './lib/bootstrap.js';
import { runMigrations } from './lib/migrate.js';

const { PORT } = env();
await runMigrations();   // create/update tables first
await ensureFirstAdmin(); // then the first admin, if there are no users yet
createApp().listen(PORT, () => {
  console.log(`MSL API listening on port ${PORT}`);
});
