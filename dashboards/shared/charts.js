/**
 * Shared Chart Utilities for BetTicker Dashboards
 * 
 * Chart.js configuration and helper functions.
 * Reduces duplication and provides consistent chart styling.
 * 
 * @version 1.0.0
 * @date 2025-10-07
 * @requires chart.js
 */

import { CHART_COLORS, DEFAULT_CHART_CONFIG } from './config.js';

/**
 * Create a line chart
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Chart data {labels: [], datasets: []}
 * @param {object} options - Additional options
 * @returns {Chart} Chart instance
 */
export function createLineChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas element not found: ${canvasId}`);
    return null;
  }
  
  return new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      ...DEFAULT_CHART_CONFIG,
      ...options,
      plugins: {
        ...DEFAULT_CHART_CONFIG.plugins,
        ...(options.plugins || {})
      }
    }
  });
}

/**
 * Create a bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Chart data
 * @param {object} options - Additional options
 * @returns {Chart} Chart instance
 */
export function createBarChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas element not found: ${canvasId}`);
    return null;
  }
  
  return new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      ...DEFAULT_CHART_CONFIG,
      ...options
    }
  });
}

/**
 * Create a doughnut chart
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Chart data
 * @param {object} options - Additional options
 * @returns {Chart} Chart instance
 */
export function createDoughnutChart(canvasId, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas element not found: ${canvasId}`);
    return null;
  }
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      ...DEFAULT_CHART_CONFIG,
      ...options,
      scales: undefined // Doughnut charts don't use scales
    }
  });
}

/**
 * Update chart data
 * @param {Chart} chart - Chart instance
 * @param {object} newData - New data object
 */
export function updateChartData(chart, newData) {
  if (!chart) return;
  
  chart.data = newData;
  chart.update('none'); // Update without animation
}

/**
 * Add data point to chart
 * @param {Chart} chart - Chart instance
 * @param {string} label - X-axis label
 * @param {array} dataPoints - Array of data points (one per dataset)
 * @param {number} maxPoints - Maximum points to keep
 */
export function addChartDataPoint(chart, label, dataPoints, maxPoints = 50) {
  if (!chart) return;
  
  chart.data.labels.push(label);
  
  chart.data.datasets.forEach((dataset, index) => {
    dataset.data.push(dataPoints[index] || 0);
  });
  
  // Remove oldest points if exceeding max
  if (chart.data.labels.length > maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(dataset => {
      dataset.data.shift();
    });
  }
  
  chart.update('none');
}

/**
 * Create time series chart (line chart with time formatting)
 * @param {string} canvasId - Canvas element ID
 * @param {array} timeSeriesData - Array of {timestamp, value} objects
 * @param {string} label - Dataset label
 * @param {object} options - Additional options
 * @returns {Chart} Chart instance
 */
export function createTimeSeriesChart(canvasId, timeSeriesData, label = 'Value', options = {}) {
  const labels = timeSeriesData.map(d => new Date(d.timestamp).toLocaleTimeString());
  const values = timeSeriesData.map(d => d.value);
  
  return createLineChart(canvasId, {
    labels: labels,
    datasets: [{
      label: label,
      data: values,
      borderColor: CHART_COLORS.primary,
      backgroundColor: `${CHART_COLORS.primary}20`,
      tension: 0.4,
      fill: true
    }]
  }, options);
}

/**
 * Create multi-line chart
 * @param {string} canvasId - Canvas element ID
 * @param {object} multiSeriesData - {labels: [], series: [{name, data, color}]}
 * @param {object} options - Additional options
 * @returns {Chart} Chart instance
 */
export function createMultiLineChart(canvasId, multiSeriesData, options = {}) {
  const datasets = multiSeriesData.series.map(s => ({
    label: s.name,
    data: s.data,
    borderColor: s.color || CHART_COLORS.primary,
    backgroundColor: `${s.color || CHART_COLORS.primary}20`,
    tension: 0.4,
    fill: false
  }));
  
  return createLineChart(canvasId, {
    labels: multiSeriesData.labels,
    datasets: datasets
  }, options);
}

/**
 * Create stacked bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {object} data - Chart data
 * @param {object} options - Additional options
 * @returns {Chart} Chart instance
 */
export function createStackedBarChart(canvasId, data, options = {}) {
  return createBarChart(canvasId, data, {
    ...options,
    scales: {
      x: {
        stacked: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#ffffff' }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#ffffff' }
      }
    }
  });
}

/**
 * Destroy chart instance
 * @param {Chart} chart - Chart instance to destroy
 */
export function destroyChart(chart) {
  if (chart && typeof chart.destroy === 'function') {
    chart.destroy();
  }
}

/**
 * Create exposure chart (dual bar chart for home/away)
 * @param {string} canvasId - Canvas element ID
 * @param {array} exposureData - Array of {event, home, away} objects
 * @returns {Chart} Chart instance
 */
export function createExposureChart(canvasId, exposureData) {
  const labels = exposureData.map(d => d.event);
  const homeData = exposureData.map(d => d.home);
  const awayData = exposureData.map(d => d.away);
  
  return createStackedBarChart(canvasId, {
    labels: labels,
    datasets: [
      {
        label: 'Home',
        data: homeData,
        backgroundColor: CHART_COLORS.info
      },
      {
        label: 'Away',
        data: awayData,
        backgroundColor: CHART_COLORS.danger
      }
    ]
  });
}

// Default export
export default {
  createLineChart,
  createBarChart,
  createDoughnutChart,
  updateChartData,
  addChartDataPoint,
  createTimeSeriesChart,
  createMultiLineChart,
  createStackedBarChart,
  destroyChart,
  createExposureChart
};

