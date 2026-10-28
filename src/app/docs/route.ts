// API reference page: Scalar renders the OpenAPI document and lets visitors try the endpoints.
const SCALAR = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.72.2';

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Astrolabio API</title>
<link rel="icon" href="/icon.svg">
</head>
<body>
<div id="app"></div>
<script src="${SCALAR}"></script>
<script>
Scalar.createApiReference('#app', {
  url: '/api/v1/openapi.json',
  theme: 'default',
  hideDownloadButton: false,
  metaData: { title: 'Astrolabio API' },
  authentication: { preferredSecurityScheme: 'bearer' },
  customCss: ':root { --scalar-color-accent: #8c5d12; }',
});
</script>
</body>
</html>`;

export function GET() {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
