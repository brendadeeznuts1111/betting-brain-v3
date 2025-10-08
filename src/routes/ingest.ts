/**
 * Data Ingestion Endpoint
 *
 * Accepts betting intelligence data from MCP tools and writes to Analytics Engine
 *
 * Usage:
 *   POST /ingest
 *   Body: Array of data points
 *
 * Example:
 *   {
 *     "eventId": "nba-lal-gsw-20251008",
 *     "timestamp": "2025-10-08T10:00:00Z",
 *     "metric": "live_odds",
 *     "value": 1.85,
 *     "metadata": { "market": "moneyline", "source": "pinnacle" }
 *   }
 */

import type { Env } from '../types/api';

interface IngestDataPoint {
  eventId: string;
  timestamp: string;
  metric: string;
  value: number;
  metadata?: Record<string, any>;
}

export async function handleIngest(
  req: Request,
  env: Env
): Promise<Response> {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();

    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({
          error: 'Bad request',
          message: 'Body must be an array of data points',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate and write each data point
    let written = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.length; i++) {
      const dataPoint = body[i] as IngestDataPoint;

      // Validate required fields
      if (
        !dataPoint.eventId ||
        !dataPoint.timestamp ||
        !dataPoint.metric ||
        typeof dataPoint.value !== 'number'
      ) {
        errors.push(`Invalid data point at index ${i}`);
        continue;
      }

      try {
        // Write to Analytics Engine
        env.ANALYTICS_ENGINE.writeDataPoint({
          blobs: [
            dataPoint.eventId,
            dataPoint.metric,
            dataPoint.metadata?.market || 'unknown',
            dataPoint.metadata?.source || 'mcp',
          ],
          doubles: [dataPoint.value, dataPoint.metadata?.volume || 0],
          indexes: [dataPoint.timestamp],
        });

        written++;
      } catch (error) {
        errors.push(
          `Failed to write data point ${i}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Return results
    return new Response(
      JSON.stringify({
        received: body.length,
        written,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      }),
      {
        status: written > 0 ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
