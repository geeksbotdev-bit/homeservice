// Vercel serverless entry — loads the Express app lazily and surfaces any
// import-time error in the response (so we never get an opaque crash).
let app: any = null;
let importErr: any = null;
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (!loading) {
    loading = import('../src/index')
      .then((m) => { app = m.default; })
      .catch((e) => { importErr = e; });
  }
  return loading;
}

export default async function handler(req: any, res: any) {
  await load();
  if (importErr) {
    res.statusCode = 500;
    res.setHeader('content-type', 'text/plain');
    res.end('IMPORT_ERROR: ' + (importErr?.stack || importErr?.message || String(importErr)));
    return;
  }
  return app(req, res);
}
