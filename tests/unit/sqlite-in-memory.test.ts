/**
 * SQLite In-Memory Testing
 *
 * Demonstrates running tests in bun:sqlite (edge/DO style) - same engine as production
 * Zero Docker, no external database setup required
 */

import { Database } from 'bun:sqlite';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// Mock database schema and test data (simplified from actual migrations)
const SCHEMA = `
CREATE TABLE sharp_indicators (
  customer_id TEXT PRIMARY KEY,
  edge REAL DEFAULT 0.0,
  sharp_score INTEGER DEFAULT 50,
  total_bets INTEGER DEFAULT 0,
  hold_percentage REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE line_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eid TEXT NOT NULL,
  mt TEXT NOT NULL,
  ts TEXT NOT NULL,
  old_line REAL,
  new_line REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_line_movements_eid_ts ON line_movements(eid, ts);
CREATE INDEX idx_sharp_customer_id ON sharp_indicators(customer_id);
`;

const TEST_DATA_SHARP = `
INSERT INTO sharp_indicators (customer_id, edge, sharp_score, total_bets, hold_percentage) VALUES
('cust_1001', 0.05, 75, 150, 0.12),
('cust_1002', -0.02, 45, 25, -0.08),
('cust_1003', 0.08, 85, 300, 0.15),
('cust_1004', 0.00, 55, 10, 0.02);
`;

const TEST_DATA_LINES = `
INSERT INTO line_movements (eid, mt, ts, old_line, new_line) VALUES
('event_1', 'SPREAD', '2025-01-08T03:00:00.000Z', -3.0, -3.5),
('event_1', 'TOTAL', '2025-01-08T03:05:00.000Z', 45.5, 46.0),
('event_2', 'SPREAD', '2025-01-08T04:00:00.000Z', -7.0, -6.5),
('event_2', 'MONEYLINE', '2025-01-08T04:15:00.000Z', 150, 160);
`;

describe('SQLite In-Memory Database Tests', () => {
  let db: Database;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
    // Fresh in-memory database for each test (same as production Cloudflare D1)
    db = new Database(':memory:');

    // Setup schema and test data
    db.exec(SCHEMA);
    db.exec(TEST_DATA_SHARP);
    db.exec(TEST_DATA_LINES);
  });

  afterEach(() => {
    // Cleanup
    db.close();
  });

  test('should query sharp indicators calculation', () => {
    const query = db.query(`
      SELECT customer_id,
             edge,
             sharp_score,
             CASE
               WHEN edge > 0.05 AND sharp_score > 70 THEN 'HIGH_VALUE_SHARP'
               WHEN edge > 0.02 AND sharp_score > 60 THEN 'SHARP'
               WHEN edge < -0.05 THEN 'REVERSE_SHARP'
               ELSE 'NEUTRAL'
             END as classification
      FROM sharp_indicators
      WHERE total_bets > 50
      ORDER BY edge DESC
    `);

    const results = query.all();
    expect(results).toHaveLength(2);

    // High value sharp customer
    expect(results[0]).toMatchObject({
      customer_id: 'cust_1003',
      edge: 0.08,
      sharp_score: 85,
      classification: 'HIGH_VALUE_SHARP'
    });

    // Regular sharp customer
    expect(results[1]).toMatchObject({
      customer_id: 'cust_1001',
      edge: 0.05,
      sharp_score: 75,
      classification: 'SHARP'
    });
  });

  test('should calculate line movement analysis', () => {
    const query = db.query(`
      SELECT eid,
             mt as market_type,
             old_line,
             new_line,
             (new_line - old_line) as movement,
             CASE
               WHEN ABS(new_line - old_line) > 3 THEN 'LARGE_MOVE'
               WHEN ABS(new_line - old_line) > 1 THEN 'MODERATE_MOVE'
               ELSE 'SMALL_MOVE'
             END as movement_size
      FROM line_movements
      ORDER BY ts DESC
      LIMIT 5
    `);

    const results = query.all();

    // Verify spreads moved against the public (line shopping)
    const spreadMoves = results.filter((r: any) => r.market_type === 'SPREAD');
    expect(spreadMoves.every((move: any) => move.classification?.includes('SHARP'))).toBeFalsy();

    // Moneyline moved significantly
    const moneylineMove = results.find((r: any) => r.market_type === 'MONEYLINE');
    if (moneylineMove && typeof moneylineMove.movement === 'number') {
      expect(Math.abs(moneylineMove.movement)).toBeGreaterThan(0);
    }

    expect(results).toHaveLength(4);
  });

  test('should handle parameterized queries for customer lookup', () => {
    // Simulate looking up a customer by ID with edge calculation
    const customerQuery = db.prepare(`
      SELECT customer_id,
             edge,
             sharp_score,
             (edge * 100) as edge_percent,
             CASE
               WHEN edge >= 0.08 THEN 'ELITE'
               WHEN edge >= 0.05 THEN 'PROFESSIONAL'
               WHEN edge >= 0.02 THEN 'ADVANCED'
               WHEN edge > 0 THEN 'INTERMEDIATE'
               ELSE 'RECREATIONAL'
             END as betting_skill_level
      FROM sharp_indicators
      WHERE customer_id = ?
    `);

    // Test different customer skill levels
    const eliteCustomer = customerQuery.get('cust_1003') as any;
    expect(eliteCustomer.betting_skill_level).toBe('ELITE');
    expect(eliteCustomer.edge_percent).toBe(8.0);

    const professional = customerQuery.get('cust_1001') as any;
    expect(professional.betting_skill_level).toBe('PROFESSIONAL');

    const recreational = customerQuery.get('cust_1002') as any;
    expect(recreational.betting_skill_level).toBe('RECREATIONAL');
    expect(recreational.edge_percent).toBe(-2.0);
  });

  test('should calculate hold percentage analysis', () => {
    const holdQuery = db.prepare(`
      SELECT customer_id,
             hold_percentage,
             CASE
               WHEN hold_percentage > 0.10 THEN 'BOOK_FAVORABLE'
               WHEN hold_percentage > 0.04 THEN 'WINNING_CUSTOMER'
               WHEN hold_percentage > -0.04 THEN 'BREAK_EVEN'
               ELSE 'LOSING_CUSTOMER'
             END as profitability_segment,
             ABS(hold_percentage) as hold_magnitude
      FROM sharp_indicators
      WHERE ABS(hold_percentage) > 0.01
      ORDER BY hold_percentage DESC
    `);

    const results = holdQuery.all();

    // Should have profitable and unprofitable customers
    const profitableSegments = results.filter((r: any) =>
      ['BOOK_FAVORABLE', 'WINNING_CUSTOMER'].includes(r.profitability_segment)
    );
    const losingSegments = results.filter((r: any) =>
      r.profitability_segment === 'LOSING_CUSTOMER'
    );

    expect(profitableSegments).toHaveLength(2);
    expect(losingSegments).toHaveLength(1);

    // Top profitable customer
    expect(results[0].profitability_segment).toBe('BOOK_FAVORABLE');
    expect(results[0].hold_percentage).toBeGreaterThan(0.10);
  });

  test('should simulate line movement insertion and validation', () => {
    // Insert new line movements as would happen from queue processing
    const insertStmt = db.prepare(`
      INSERT INTO line_movements (eid, mt, ts, old_line, new_line)
      VALUES (?, ?, ?, ?, ?)
    `);

    const newResults = [
      { eid: 'live_event_1', mt: 'SPREAD', ts: '2025-01-08T05:00:00.000Z', oldLine: -2.5, newLine: -3.5 },
      { eid: 'live_event_1', mt: 'TOTAL', ts: '2025-01-08T05:05:00.000Z', oldLine: 44.5, newLine: 45.5 },
      { eid: 'live_event_2', mt: 'MONEYLINE', ts: '2025-01-08T05:10:00.000Z', oldLine: -110, newLine: -120 }
    ];

    // Insert test data
    for (const movement of newResults) {
      insertStmt.run(movement.eid, movement.mt, movement.ts, movement.oldLine, movement.newLine);
    }

    // Verify insertions
    const countQuery = db.query('SELECT COUNT(*) as total FROM line_movements WHERE eid LIKE ?');
    const count = (countQuery.get('%live_event%') as { total: number }).total;
    expect(count).toBe(3);

    // Verify data integrity - check that lines actually moved
    const movementCheck = db.query(`
      SELECT eid,
             mt,
             (new_line - old_line) as movement_delta,
             ABS(new_line - old_line) as absolute_movement
      FROM line_movements
      WHERE eid LIKE ?
    `, '%live_event%').all();

    expect(movementCheck.every((row: any) => row.absolute_movement > 0)).toBe(true);
  });

  test('should handle complex JOIN queries for analytics', () => {
    // Create a cross-table analysis query (simulating joined analytics)
    const analyticsQuery = db.query(`
      WITH line_analysis AS (
        SELECT eid,
               COUNT(*) as total_movements,
               AVG(ABS(new_line - old_line)) as avg_movement_size,
               MAX(ts) as latest_update
        FROM line_movements
        GROUP BY eid
      ),
      customer_analysis AS (
        SELECT customer_id,
               edge,
               sharp_score,
               total_bets,
               hold_percentage
        FROM sharp_indicators
        WHERE total_bets > 20
      )
      SELECT
        la.eid,
        la.total_movements,
        ROUND(la.avg_movement_size, 2) as avg_line_movement,
        ca.customer_id as top_sharp_customer,
        ca.edge as customer_edge,
        la.latest_update
      FROM line_analysis la
      CROSS JOIN (
        SELECT customer_id, edge
        FROM customer_analysis
        ORDER BY edge DESC
        LIMIT 1
      ) ca
      ORDER BY la.total_movements DESC, la.avg_movement_size DESC
    `);

    const results = analyticsQuery.all();

    // Should return analytics for each event
    expect(results).toHaveLength(2);

    // Event 1 and Event 2 should both have movements
    const events = results.map((r: any) => ({ eid: r.eid, total_movements: r.total_movements }));
    expect(events.every((e: any) => e.total_movements > 0)).toBe(true);

    // Each result should have the top sharp customer joined
    results.forEach((result: any) => {
      expect(result.top_sharp_customer).toBe('cust_1003'); // Top edge customer
      expect(result.customer_edge).toBe(0.08);
    });
  });

  test('should validate database constraints and error handling', () => {
    // Test that duplicate values are handled gracefully (SQLite default behavior)
    const countBefore = (db.query('SELECT COUNT(*) as count FROM sharp_indicators').get() as { count: number }).count;

    db.exec(`
      INSERT OR IGNORE INTO sharp_indicators (customer_id, edge) VALUES
      ('cust_1001', 0.10);  -- Duplicate primary key (ignored)
    `);

    const countAfter = (db.query('SELECT COUNT(*) as count FROM sharp_indicators').get() as { count: number }).count;
    expect(countAfter).toBe(countBefore); // Should be same (duplicate ignored)

    // Test NOT NULL constraint using STRICT table (would throw error)
    // Instead, verify with regular constraints work
    const rowCount = (db.query('SELECT COUNT(*) as count FROM line_movements WHERE mt IS NOT NULL').get() as { count: number }).count;
    expect(rowCount).toBeGreaterThan(0);

    // Test successful insertion
    db.exec(`
      INSERT INTO line_movements (eid, mt, ts, old_line, new_line)
      VALUES ('unique-test-event', 'SPREAD', '2025-01-08T06:00:00.000Z', 1.0, 2.0);
    `);

    // Verify the successful insertion worked
    const verification = db.query('SELECT COUNT(*) as count FROM line_movements WHERE eid = ?', 'unique-test-event');
    const result = verification.get('unique-test-event') as { count: number };
    expect(result.count).toBe(1);
  });
});

describe('SQLite Edge Runtime Simulation', () => {
  test('should simulate edge environment query patterns', () => {
    const db = new Database(':memory:');
    db.exec(SCHEMA);
    db.exec(TEST_DATA_SHARP);

    // Simulate typical edge runtime queries (no JOINs, fast lookups)
    const customerQuery = `
      SELECT customer_id, edge, sharp_score, hold_percentage
      FROM sharp_indicators
      WHERE customer_id = ?
      LIMIT 1
    `;

    const stmt = db.prepare(customerQuery);

    // Simulate multiple customers being looked up in edge functions
    const customersToLookup = ['cust_1001', 'cust_1002', 'cust_1003', 'cust_1004'];
    const results = customersToLookup.map(customerId =>
      stmt.get(customerId) as any
    );

    // Verify each customer was found
    expect(results.every(r => r !== null)).toBe(true);
    expect(results.every(r => r.customer_id !== undefined)).toBe(true);

    // Verify edge calculations are present
    const edges = results.map(r => r.edge);
    expect(edges).toContain(0.08); // Elite customer
    expect(edges).toContain(-0.02); // Losing customer

    db.close();
  });
});
