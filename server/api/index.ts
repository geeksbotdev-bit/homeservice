// Diagnostic serverless entry — dynamic import WITH .js extension so Node's ESM
// resolver finds the compiled module, and any load-time error is surfaced in
// the response instead of an opaque crash.
let app: any = null;
let importErr: any = null;
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (!loading) {
    loading = import('../src/index.js')
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
  if (!app) {
    res.statusCode = 500;
    res.end('APP_NOT_LOADED');
    return;
  }
  return app(req, res);
}
