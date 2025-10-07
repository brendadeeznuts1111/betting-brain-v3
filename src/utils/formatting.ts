/**
 * Data Formatting Utilities
 * Consistent formatting for API responses and logging
 */

import { ExposureMetrics, SharpScoreMetrics, HoldMetrics, CLVMetrics, SteamMoveMetrics } from '../types/metrics';

// Currency formatting
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Percentage formatting
export function formatPercentage(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'NaN%';
  }
  return `${value.toFixed(decimals)}%`;
}

// Number formatting
export function formatNumber(value: number, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '0.00';
  }
  if (isNaN(value)) {
    return 'NaN';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Timestamp formatting
export function formatTimestamp(timestamp: string | Date, includeTime: boolean = true): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  if (includeTime) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Relative time formatting
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const now = Date.now();
  const diff = now - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'just now';
}

// Format exposure metrics for display
export function formatExposureMetrics(metrics: ExposureMetrics): string {
  const lines = [
    `Event: ${metrics.eventId}`,
    `Total Risk: ${formatCurrency(metrics.totalRisk)}`,
    `Max Exposure: ${formatCurrency(metrics.maxExposure)}`,
    `Last Updated: ${formatRelativeTime(metrics.lastUpdated)}`,
    `\nSides:`
  ];
  
  for (const side of metrics.sides) {
    lines.push(
      `  ${side.side}: ${formatCurrency(side.risk)} risk, ${formatCurrency(side.net)} net (${formatPercentage(side.percentage)})`
    );
  }
  
  return lines.join('\n');
}

// Format sharp score metrics for display
export function formatSharpScoreMetrics(metrics: SharpScoreMetrics): string {
  return [
    `Customer: ${metrics.customerId}`,
    `Sharp Score: ${formatNumber(metrics.sharpScore, 1)}/100`,
    `CLV: ${formatCurrency(metrics.clv)}`,
    `Win Rate: ${formatPercentage(metrics.winRate)}`,
    `Actions: ${formatNumber(metrics.actionCount, 0)}`,
    `Last Updated: ${formatRelativeTime(metrics.lastUpdated)}`
  ].join('\n');
}

// Format hold metrics for display
export function formatHoldMetrics(metrics: HoldMetrics): string {
  return [
    `Event: ${metrics.eventId}`,
    `Market: ${metrics.marketType}`,
    `Hold %: ${formatPercentage(metrics.holdPercentage)}`,
    `Total Volume: ${formatCurrency(metrics.totalVolume)}`,
    `Total Risk: ${formatCurrency(metrics.totalRisk)}`,
    `Threshold: ${formatPercentage(metrics.alertThreshold.min)} - ${formatPercentage(metrics.alertThreshold.max)}`,
    `Last Updated: ${formatRelativeTime(metrics.lastUpdated)}`
  ].join('\n');
}

// Format CLV metrics for display
export function formatCLVMetrics(metrics: CLVMetrics): string {
  return [
    `Customer: ${metrics.customerId}`,
    `Lifetime Value: ${formatCurrency(metrics.lifetimeValue)}`,
    `Win Rate: ${formatPercentage(metrics.winRate)}`,
    `Actions: ${formatNumber(metrics.actionCount, 0)}`,
    `Net Bet: ${formatCurrency(metrics.netBet)}`,
    `Alert Threshold: ${formatPercentage(metrics.alertThreshold)}`,
    `Last Updated: ${formatRelativeTime(metrics.lastUpdated)}`
  ].join('\n');
}

// Format steam move metrics for display
export function formatSteamMoveMetrics(metrics: SteamMoveMetrics): string {
  return [
    `Event: ${metrics.eventId}`,
    `Market: ${metrics.marketType}`,
    `Line Change: ${metrics.lineChange > 0 ? '+' : ''}${metrics.lineChange}`,
    `Volume Change: ${metrics.volumeChange > 0 ? '+' : ''}${formatNumber(metrics.volumeChange, 0)}`,
    `Sigma: ${formatNumber(metrics.sigma, 2)}σ`,
    `Is Steam Move: ${metrics.isSteamMove ? '🔥 YES' : 'No'}`,
    `Time: ${formatRelativeTime(metrics.timestamp)}`
  ].join('\n');
}

// Format table data for console output
export function formatTable(data: any[], columns: string[]): string {
  if (data.length === 0) return 'No data';
  
  const rows = data.map(row => columns.map(col => String(row[col] ?? '')));
  const colWidths = columns.map((col, i) => 
    Math.max(col.length, ...rows.map(row => row[i].length))
  );
  
  const headerRow = columns.map((col, i) => col.padEnd(colWidths[i])).join(' | ');
  const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');
  const dataRows = rows.map(row => 
    row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ')
  );
  
  return [headerRow, separator, ...dataRows].join('\n');
}

// Format JSON for pretty printing
export function formatJSON(data: any, indent: number = 2): string {
  return JSON.stringify(data, null, indent);
}

// Format bytes to human-readable size
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Format duration in milliseconds
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}
