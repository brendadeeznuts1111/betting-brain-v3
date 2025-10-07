/**
 * D1 Database Helper Utilities
 * Type-safe database operations with error handling
 */

import { Env } from '../types/api';

export class DatabaseHelper {
  constructor(private env: Env) {}

  /**
   * Execute a query with automatic retry logic
   */
  async executeQuery<T = any>(
    query: string,
    params: any[] = [],
    options: { retry?: number; timeout?: number } = {}
  ): Promise<T[]> {
    const { retry = 3, timeout = 5000 } = options;
    
    // Handle null/undefined params
    const safeParams = params || [];
    
    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const stmt = this.env.ANALYTICS.prepare(query);
        const bound = safeParams.length > 0 ? stmt.bind(...safeParams) : stmt;
        
        // Add timeout handling
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeout);
        });
        
        const result = await Promise.race([
          bound.all(),
          timeoutPromise
        ]);
        
        return result as T[];
      } catch (error) {
        if (attempt === retry - 1) {
          console.error(`Query failed after ${retry} attempts:`, error);
          throw error;
        }
        await this.sleep(Math.pow(2, attempt) * 100); // Exponential backoff
      }
    }
    
    throw new Error('Query failed after all retry attempts');
  }

  /**
   * Execute a single query and return first result
   */
  async executeQueryFirst<T = any>(
    query: string,
    params: any[] = [],
    options: { retry?: number; timeout?: number } = {}
  ): Promise<T | null> {
    const { retry = 3, timeout = 5000 } = options;
    
    // Handle null/undefined params
    const safeParams = params || [];
    
    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const stmt = this.env.ANALYTICS.prepare(query);
        const bound = safeParams.length > 0 ? stmt.bind(...safeParams) : stmt;
        
        // Add timeout handling
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeout);
        });
        
        const result = await Promise.race([
          bound.first(),
          timeoutPromise
        ]);
        
        return result as T | null;
      } catch (error) {
        if (attempt === retry - 1) {
          console.error('Query first failed:', error);
          return null;
        }
        await this.sleep(Math.pow(2, attempt) * 100); // Exponential backoff
      }
    }
    
    return null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async executeWrite(
    query: string,
    params: any[] = []
  ): Promise<{ success: boolean; rowsAffected: number }> {
    try {
      const stmt = this.env.ANALYTICS.prepare(query);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.run();
      return {
        success: result.success || false,
        rowsAffected: result.meta?.changes || 0
      };
    } catch (error) {
      console.error('Write operation failed:', error);
      return { success: false, rowsAffected: 0 };
    }
  }

  /**
   * Execute a batch of write operations in a transaction
   */
  async executeBatch(
    operations: Array<{ query: string; params: any[] }>
  ): Promise<{ success: boolean; rowsAffected: number }> {
    try {
      // Handle empty operations array
      if (operations.length === 0) {
        return { success: true, rowsAffected: 0 };
      }
      
      const statements = operations.map(op => {
        const stmt = this.env.ANALYTICS.prepare(op.query);
        return op.params.length > 0 ? stmt.bind(...op.params) : stmt;
      });
      
      const results = await this.env.ANALYTICS.batch(statements);
      const totalRows = results.reduce((sum, r) => sum + (r.meta?.changes || 0), 0);
      
      return {
        success: results.every(r => r.success),
        rowsAffected: totalRows
      };
    } catch (error) {
      console.error('Batch operation failed:', error);
      return { success: false, rowsAffected: 0 };
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.executeQueryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return (result?.count || 0) > 0;
  }

  /**
   * Get table row count
   */
  async getRowCount(tableName: string): Promise<number> {
    const result = await this.executeQueryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result?.count || 0;
  }

  /**
   * Get database size
   */
  async getDatabaseSize(): Promise<{ size: number; pages: number }> {
    const result = await this.executeQueryFirst<{ size: number; pages: number }>(
      `SELECT page_count * page_size as size, page_count as pages FROM pragma_page_count(), pragma_page_size()`
    );
    return result || { size: 0, pages: 0 };
  }

  /**
   * Vacuum database to reclaim space
   */
  async vacuum(): Promise<void> {
    try {
      const stmt = this.env.ANALYTICS.prepare('VACUUM');
      await stmt.run();
    } catch (error) {
      console.error('Write operation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze database for query optimization
   */
  async analyze(): Promise<void> {
    try {
      const stmt = this.env.ANALYTICS.prepare('ANALYZE');
      await stmt.run();
    } catch (error) {
      console.error('Write operation failed:', error);
      throw error;
    }
  }

  /**
   * Sleep utility for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton factory
export function createDatabaseHelper(env: Env): DatabaseHelper {
  return new DatabaseHelper(env);
}
