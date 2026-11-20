import './load-env.js'; // must be first: later imports read process.env at load time
import { env } from './config/env.js';
import { createApp } from './app.js';

const { PORT } = env();
createApp().listen(PORT, () => {
  console.log(`MSL API listening on port ${PORT}`);
});
