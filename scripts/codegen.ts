/**
 * MCP Tools Code Generator
 * Auto-generates OpenAPI spec and Redoc UI from TypeScript types
 */

/// <reference types="bun" />
// Using Bun native file operations (no Node.js fs module)

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
  };
}

// Generate OpenAPI specification
const openAPISpec: OpenAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'Betting-Brain v3 Intelligence API',
    version: '3.1.0',
    description: 'Edge-native betting intelligence layer with zero-downtime deployment'
  },
  servers: [
    {
      url: 'https://betting-brain-v3.your-domain.workers.dev',
      description: 'Production'
    },
    {
      url: 'http://localhost:8787',
      description: 'Development'
    }
  ],
  paths: {
    '/tools/getBettingExposure': {
      get: {
        summary: 'Get Betting Exposure',
        description: 'Returns current exposure metrics for a given event',
        parameters: [
          {
            name: 'eid',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID'
          },
          {
            name: 'includeHistory',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Include historical data'
          },
          {
            name: 'timeWindow',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 24, default: 1 },
            description: 'Time window in hours'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BettingExposureResponse' }
              }
            }
          },
          '404': {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/tools/getSharpScore': {
      get: {
        summary: 'Get Sharp Score',
        description: 'Returns sharp score and performance metrics for a customer',
        parameters: [
          {
            name: 'cid',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Customer ID'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SharpScoreResponse' }
              }
            }
          }
        }
      }
    },
    '/tools/getHoldPercentage': {
      get: {
        summary: 'Get Hold Percentage',
        description: 'Returns hold percentage and volume metrics for an event',
        parameters: [
          {
            name: 'eid',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID'
          },
          {
            name: 'mt',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['SPREAD', 'MONEYLINE', 'TOTAL', 'PROP'] },
            description: 'Market Type'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HoldPercentageResponse' }
              }
            }
          }
        }
      }
    },
    '/tools/getCLV': {
      get: {
        summary: 'Get CLV',
        description: 'Returns CLV metrics and betting performance for a customer',
        parameters: [
          {
            name: 'cid',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Customer ID'
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CLVResponse' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      BettingExposureResponse: {
        type: 'object',
        properties: {
          eid: { type: 'string' },
          sides: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                side: { type: 'string', enum: ['HOME', 'AWAY'] },
                risk: { type: 'number' },
                net: { type: 'number' },
                percentage: { type: 'number' }
              }
            }
          },
          totalRisk: { type: 'number' },
          maxExposure: { type: 'number' },
          lastUpdated: { type: 'string', format: 'date-time' },
          alertThreshold: {
            type: 'object',
            properties: {
              maxAmount: { type: 'number' },
              maxPercentage: { type: 'number' }
            }
          }
        }
      },
      SharpScoreResponse: {
        type: 'object',
        properties: {
          cid: { type: 'string' },
          sharpScore: { type: 'number' },
          clv: { type: 'number' },
          winRate: { type: 'number' },
          actionCount: { type: 'integer' },
          lastUpdated: { type: 'string', format: 'date-time' },
          alertThreshold: { type: 'number' }
        }
      },
      HoldPercentageResponse: {
        type: 'object',
        properties: {
          eid: { type: 'string' },
          mt: { type: 'string' },
          holdPercentage: { type: 'number' },
          totalVolume: { type: 'number' },
          totalRisk: { type: 'number' },
          lastUpdated: { type: 'string', format: 'date-time' },
          alertThreshold: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' }
            }
          }
        }
      },
      CLVResponse: {
        type: 'object',
        properties: {
          cid: { type: 'string' },
          lifetimeValue: { type: 'number' },
          winRate: { type: 'number' },
          actionCount: { type: 'integer' },
          netBet: { type: 'number' },
          lastUpdated: { type: 'string', format: 'date-time' },
          alertThreshold: { type: 'number' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          details: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

async function main() {
  console.log('🔧 Generating MCP tools...');
  
  // Create dist directory if it doesn't exist
  await Bun.write('dist/.keep', '');
  
  // Write OpenAPI spec using Bun
  await Bun.write('dist/openapi.json', JSON.stringify(openAPISpec, null, 2));
  console.log('✅ Generated dist/openapi.json');
  
  // Generate Redoc HTML
  const redocHTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Betting-Brain v3 API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url='./openapi.json'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>
`;
  
  await Bun.write('dist/redoc.html', redocHTML);
  console.log('✅ Generated dist/redoc.html');
  
  console.log('\n✨ Code generation complete!');
  console.log('📚 View API docs: open dist/redoc.html');
}

main().catch(console.error);
