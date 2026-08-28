// Vercel serverless entry — re-exports the Express app. Native ESM on Vercel
// needs the explicit .js extension; src/index skips app.listen under VERCEL.
import app from '../src/index.js';

export default app;
