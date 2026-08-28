// Vercel serverless entry — re-exports the Express app as the function handler.
// (src/index.ts skips app.listen when process.env.VERCEL is set.)
import app from '../src/index';

export default app;
