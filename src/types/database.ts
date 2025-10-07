/**
 * Database schema types for D1 SQLite
 * Optimized for edge performance with ROWID and LZ4 compression
 */

export interface LineMovement {
  eid: string;        // Event ID
  mt: string;         // Market Type
  lb: number | null;  // Line Before
  la: number | null;  // Line After
  vb: number | null;  // Volume Before
  va: number | null;  // Volume After
  ts: string;         // Timestamp
  ing: string;        // Ingestion timestamp
}

export interface SharpIndicator {
  cid: string;        // Customer ID
  clv: number;        // Customer Lifetime Value
  wr: number;         // Win Rate
  ao: number;         // Action Count
  nb: number;         // Net Bet
  upd: string;        // Update timestamp
}

export interface ExposureTracking {
  eid: string;        // Event ID
  side: string;       // Side (HOME/AWAY)
  risk: number;       // Risk Amount
  net: number;        // Net Exposure
  upd: string;        // Update timestamp
}

export interface SteamDedupe {
  eid: string;        // Event ID
  mt: string;         // Market Type
  ts: string;         // Timestamp
}

export interface DatabaseTables {
  line_movements: LineMovement;
  sharp_indicators: SharpIndicator;
  exposure_tracking: ExposureTracking;
  steam_dedupe: SteamDedupe;
}

// Database query result types
export type LineMovementInsert = Omit<LineMovement, 'ing'>;
export type SharpIndicatorInsert = Omit<SharpIndicator, 'upd'>;
export type ExposureTrackingInsert = Omit<ExposureTracking, 'upd'>;
export type SteamDedupeInsert = SteamDedupe;

// Index types for performance
export interface LineMovementIndex {
  eid_mt: string;     // Composite index on (eid, mt)
  ts: string;         // Timestamp index for TTL
}

export interface SharpIndicatorIndex {
  cid: string;        // Primary key
  clv: number;        // Index for sorting
}

export interface ExposureTrackingIndex {
  eid_side: string;   // Composite primary key
  risk: number;       // Index for risk calculations
}

export interface SteamDedupeIndex {
  eid_mt: string;     // Composite primary key
  ts: string;         // TTL index
}
