// Vercel serverless entry — STATIC import so @vercel/node bundles the whole
// src/ tree into the function (a dynamic import leaves it out → module-not-found).
// src/index.ts skips app.listen when process.env.VERCEL is set and exports the app.
import app from '../src/index';

export default app;
