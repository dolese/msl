import './load-env.js'; // must be first: later imports read process.env at load time
import { env } from './config/env.js';
import { createApp } from './app.js';
import { ensureFirstAdmin } from './lib/bootstrap.js';

const { PORT } = env();
await ensureFirstAdmin();
createApp().listen(PORT, () => {
  console.log(`MSL API listening on port ${PORT}`);
});
