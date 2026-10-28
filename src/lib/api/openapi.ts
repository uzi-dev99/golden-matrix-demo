import { z } from 'zod';
import { allowedModels, defaultModel } from '@/lib/config';
import { birthInputSchema } from '@/lib/schemas';
import { apiReportRequestSchema, tokenRequestSchema } from './v1-schemas';

// Request bodies come from the same zod schemas the API validates with, so the docs cannot drift.
const body = (schema: z.ZodType, example: unknown) => ({
  required: true,
  content: { 'application/json': { schema: z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }), example } },
});

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          ok: { const: false },
          error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } },
        },
      },
    },
  },
});

const ok = (description: string, data: Record<string, unknown>) => ({
  description,
  content: { 'application/json': { schema: { type: 'object', properties: { ok: { const: true }, data } } } },
});

const birthExample = {
  name: 'Ana Prueba',
  date: '1990-05-14',
  time: '10:30',
  place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
};

export function openApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Astrolabio API',
      version: '1.0.0',
      description:
        'Carta natal calculada en el servidor e informe escrito por un modelo gratuito de OpenRouter. ' +
        'Pide un token con las credenciales de la demo (usuario `demo`) y úsalo como `Authorization: Bearer <token>`. ' +
        'Los informes comparten el límite de 20 por hora y por IP. [Abrir la demo web](/).',
    },
    servers: [{ url: '/' }],
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
    paths: {
      '/api/v1/auth/token': {
        post: {
          tags: ['Auth'],
          summary: 'Obtener un token',
          description: 'Cambia las credenciales de la demo por un token firmado (HMAC) válido 8 horas.',
          requestBody: body(tokenRequestSchema, { user: 'demo', password: 'astrolabio-demo' }),
          responses: {
            200: ok('Token emitido', {
              type: 'object',
              properties: { access_token: { type: 'string' }, token_type: { const: 'Bearer' }, expires_in: { type: 'integer' } },
            }),
            401: errorResponse('Credenciales incorrectas'),
          },
        },
      },
      '/api/v1/chart': {
        post: {
          tags: ['Carta natal'],
          summary: 'Calcular la carta natal',
          description: 'Planetas, casas Placidus, aspectos y nodos para una fecha, hora y lugar (zona horaria IANA).',
          security: [{ bearer: [] }],
          requestBody: body(birthInputSchema, birthExample),
          responses: {
            200: ok('Carta natal', { type: 'object', description: 'sun, moon, ascendant, midheaven, planets[], houses[], aspects[], nodes' }),
            400: errorResponse('Datos inválidos'),
            401: errorResponse('Falta el token o venció'),
          },
        },
      },
      '/api/v1/report': {
        post: {
          tags: ['Informe con IA'],
          summary: 'Generar el informe',
          description:
            `Calcula la carta, arma el prompt y pide el informe al modelo (por defecto \`${defaultModel()}\`; permitidos: ${allowedModels()
              .map((m) => `\`${m}\``)
              .join(', ')}). ` +
            'Responde JSON al terminar (30–70 s con modelos gratuitos); con `Accept: text/event-stream` devuelve el streaming SSE.',
          security: [{ bearer: [] }],
          requestBody: body(apiReportRequestSchema, { input: birthExample, options: { tone: 'neutral', length: 'short' } }),
          responses: {
            200: ok('Informe', {
              type: 'object',
              properties: {
                report: { type: 'string', description: 'Markdown con secciones "## "' },
                sections: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } } } },
                meta: { type: 'object', description: 'model, servedModel, latencyMs, firstTokenMs, tokens, costUsd, promptVersion' },
              },
            }),
            400: errorResponse('Datos inválidos'),
            401: errorResponse('Falta el token o venció'),
            403: errorResponse('Modelo no permitido'),
            429: errorResponse('Límite de informes alcanzado'),
            502: errorResponse('El proveedor del modelo falló'),
          },
        },
      },
    },
  };
}
