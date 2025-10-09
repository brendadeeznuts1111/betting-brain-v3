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
import { formatCurrency, formatLargeNumber, formatTimeAgo } from './utils.js';

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

/**
 * Shared Chart Utility Functions for BetTicker Dashboards
 *
 * Centralizes Chart.js initialization and update logic.
 *
 * @version 1.0.0
 * @date 2025-10-09
 */

/**
 * Initializes all charts for the enhanced dashboard.
 * @param {object} charts - An object to store chart instances.
 */
export function initEnhancedDashboardCharts(charts) {
  // Wager Type Chart
  charts.wagerType = new Chart(document.getElementById('wagerTypeChart'), {
    type: 'doughnut',
    data: {
      labels: Object.values(WAGER_TYPES),
      datasets: [{
        data: [],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: 'white', font: { size: 10 } } }
      }
    }
  });

  // Agent Chart
  charts.agent = new Chart(document.getElementById('agentChart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Volume',
        data: [],
        backgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: 'white', font: { size: 10 } }, grid: { display: false } }
      }
    }
  });

  // Timeline Chart
  charts.timeline = new Chart(document.getElementById('timelineChart'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Wagers',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: 'white' } }
      },
      scales: {
        x: { ticks: { color: 'white', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });

  // Customer Segment Chart
  charts.segment = new Chart(document.getElementById('segmentChart'), {
    type: 'pie',
    data: {
      labels: ['Whales (>$1000)', 'High Rollers ($500-$1000)', 'Regular ($100-$500)', 'Small (<$100)'],
      datasets: [{
        data: [],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: 'white', font: { size: 10 } } }
      }
    }
  });

  // Hourly Pattern Chart
  charts.hourly = new Chart(document.getElementById('hourlyChart'), {
    type: 'bar',
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Wagers',
        data: [],
        backgroundColor: '#8b5cf6'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: 'white' } }
      },
      scales: {
        x: { ticks: { color: 'white', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: 'white' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

/**
 * Updates all charts for the enhanced dashboard.
 * @param {object} charts - Chart instances.
 * @param {Array} allWagers - Array of all wagers.
 */
export function updateEnhancedDashboardCharts(charts, allWagers) {
  // Wager types
  const typeCounts = {};
  allWagers.forEach(w => {
    const type = WAGER_TYPES[w.WagerType] || w.WagerType;
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  charts.wagerType.data.labels = Object.keys(typeCounts);
  charts.wagerType.data.datasets[0].data = Object.values(typeCounts);
  charts.wagerType.update();

  // Top 5 agents by volume
  const agentVol = {};
  allWagers.forEach(w => {
    const aid = (w.AgentID || '').toString().trim();
    agentVol[aid] = (agentVol[aid] || 0) + (Number(w.AmountWagered) || 0);
  });
  const topAgents = Object.entries(agentVol)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  charts.agent.data.labels = topAgents.map(a => a[0]);
  charts.agent.data.datasets[0].data = topAgents.map(a => a[1] / 100);
  charts.agent.update();

  // Timeline (group by minute)
  const timeline = {};
  allWagers.forEach(w => {
    const minute = new Date(w.InsertDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    timeline[minute] = (timeline[minute] || 0) + 1;
  });
  const sortedTimes = Object.keys(timeline).sort().slice(-20); // Last 20 minutes
  charts.timeline.data.labels = sortedTimes;
  charts.timeline.data.datasets[0].data = sortedTimes.map(t => timeline[t]);
  charts.timeline.update();

  // Customer segments
  const segments = { whales: 0, highRollers: 0, regular: 0, small: 0 };
  allWagers.forEach(w => {
    const amount = (Number(w.AmountWagered) || 0) / 100;
    if (amount > 1000) segments.whales++;
    else if (amount > 500) segments.highRollers++;
    else if (amount > 100) segments.regular++;
    else segments.small++;
  });
  charts.segment.data.datasets[0].data = [segments.whales, segments.highRollers, segments.regular, segments.small];
  charts.segment.update();

  // Hourly patterns
  const hourly = Array(24).fill(0);
  allWagers.forEach(w => {
    const hour = new Date(w.InsertDateTime).getHours();
    hourly[hour]++;
  });
  charts.hourly.data.datasets[0].data = hourly;
  charts.hourly.update();
}

/**
 * Initializes charts for the Analytics Live dashboard.
 * @param {object} charts - An object to store chart instances.
 * @param {object} ctx - Canvas contexts for charts.
 */
export function initAnalyticsLiveCharts(charts) {
  // Volume Chart
  charts.volume = createLineChart('volumeChart', {
    labels: [],
    datasets: [{
      label: 'Bet Volume ($)',
      data: [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  }, {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  });

  // Sports Chart
  charts.sports = createDoughnutChart('sportsChart', {
    labels: ['Football', 'Baseball', 'Basketball', 'Tennis', 'Hockey', 'Soccer'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0],
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b',
        '#ef4444', '#8b5cf6', '#06b6d4'
      ]
    }]
  }, {
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  });
}

/**
 * Updates charts for the Analytics Live dashboard.
 * @param {object} charts - Chart instances.
 * @param {object} data - Data for updating charts.
 */
export function updateAnalyticsLiveCharts(charts, data) {
  // Update volume chart
  if (charts.volume && data.volumeHistory) {
    const labels = data.volumeHistory.map(item => item.time);
    const values = data.volumeHistory.map(item => item.volume);
    updateChartData(charts.volume, { labels, datasets: [{ data: values }] });
  }

  // Update sports chart
  if (charts.sports && data.sportsBreakdown) {
    const sportsData = [
      data.sportsBreakdown.football || 0,
      data.sportsBreakdown.baseball || 0,
      data.sportsBreakdown.basketball || 0,
      data.sportsBreakdown.tennis || 0,
      data.sportsBreakdown.hockey || 0,
      data.sportsBreakdown.soccer || 0
    ];
    updateChartData(charts.sports, { datasets: [{ data: sportsData }] });
  }
}

/**
 * Initializes charts for the Floor Control dashboard.
 * @param {object} charts - Object to store chart instances.
 * @param {object} ctx - Canvas contexts for charts.
 */
export function initFloorControlCharts(charts, ctx) {
  // Odds Chart
  charts.odds = new Chart(ctx.odds, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: -300,
          max: 300,
          ticks: { color: '#c9d1d9' }
        },
        x: {
          ticks: { color: '#c9d1d9' }
        }
      }
    }
  });

  // Performance Chart
  charts.perf = new Chart(ctx.perf, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Response Time (ms)',
        data: [],
        borderColor: '#238636',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#c9d1d9' } } },
      scales: {
        y: { ticks: { color: '#c9d1d9' } },
        x: { ticks: { color: '#c9d1d9' } }
      }
    }
  });

  // Live Bets Chart
  charts.bets = new Chart(ctx.bets, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#c9d1d9' }
        },
        x: {
          ticks: { color: '#c9d1d9' }
        }
      }
    }
  });

  // Pending Wagers Chart
  charts.pending = new Chart(ctx.pending, {
    type: 'doughnut',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#c9d1d9' }
        }
      }
    }
  });

  // Player Analysis Chart
  charts.analysis = new Chart(ctx.analysis, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#c9d1d9' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#c9d1d9' }
        },
        x: {
          ticks: { color: '#c9d1d9' }
        }
      }
    }
  });

  // Level Chart for Agent Hierarchy
  charts.level = new Chart(ctx.level.getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#c9d1d9' }
        },
        x: {
          ticks: { color: '#c9d1d9' }
        }
      }
    }
  });
}

/**
 * Updates charts for the Floor Control dashboard.
 * @param {object} charts - Object with chart instances.
 * @param {object} data - Data for updating charts.
 */
export function updateFloorControlCharts(charts, data) {
  // Odds Chart Update
  if (data.odds) {
    const books = [...new Set(data.odds.map(o => o.book))].slice(0, 5);
    const homeOdds = books.map(book => {
      const odd = data.odds.find(o => o.book === book && o.side === 'home');
      return odd ? odd.odds : 0;
    });

    charts.odds.data.labels = books;
    charts.odds.data.datasets = [{
      label: 'Home Odds',
      data: homeOdds,
      backgroundColor: '#238636',
      borderColor: '#2ea043',
      borderWidth: 1
    }];
    charts.odds.update();
  }

  // Performance Chart Update is handled by addChartDataPoint in getJSON

  // Live Bets Chart Update
  if (data.liveBets?.buckets) {
    const vol = data.liveBets.buckets.map(b => b.volume) ?? [];
    charts.bets.data.labels = data.liveBets.buckets.map(b => b.minute) ?? [];
    charts.bets.data.datasets = [{
      label: 'Volume ($)',
      data: vol,
      backgroundColor: '#238636',
      borderColor: '#2ea043',
      borderWidth: 1
    }];
    charts.bets.update();
  }

  // Pending Wagers Chart Update
  if (data.pending?.sportBreakdown) {
    const sports = Object.keys(data.pending.sportBreakdown);
    const risks = sports.map(sport => data.pending.sportBreakdown[sport]);

    charts.pending.data.labels = sports;
    charts.pending.data.datasets = [{
      label: 'Risk by Sport',
      data: risks,
      backgroundColor: [
        '#238636', '#2ea043', '#3fb950', '#56d364', '#7ee787'
      ],
      borderColor: '#161b22',
      borderWidth: 1
    }];
    charts.pending.update();
  }

  // Player Analysis Chart Update
  if (data.analysis?.players) {
    const topPlayers = data.analysis.players
      .sort((a, b) => b.netIncome - a.netIncome)
      .slice(0, 5);
    const names = topPlayers.map(p => p.playerName || p.customerId);
    const incomes = topPlayers.map(p => p.netIncome);

    charts.analysis.data.labels = names;
    charts.analysis.data.datasets = [{
      label: 'Net Income',
      data: incomes,
      backgroundColor: incomes.map(i => i >= 0 ? '#238636' : '#da3633'),
      borderColor: incomes.map(i => i >= 0 ? '#2ea043' : '#f85149'),
      borderWidth: 1
    }];
    charts.analysis.update();
  }

  // Level Chart for Agent Hierarchy Update
  if (data.hierarchy?.levelCounts) {
    const levels = Object.keys(data.hierarchy.levelCounts).sort((a, b) => a - b);
    const counts = levels.map(l => data.hierarchy.levelCounts[l]);

    charts.level.data.labels = levels.map(l => `Level ${l}`);
    charts.level.data.datasets = [{
      label: 'Agents',
      data: counts,
      backgroundColor: '#238636',
      borderColor: '#2ea043',
      borderWidth: 1
    }];
    charts.level.update();
  }
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
  createExposureChart,
  initEnhancedDashboardCharts,
  updateEnhancedDashboardCharts,
  initAnalyticsLiveCharts,
  updateAnalyticsLiveCharts,
  initFloorControlCharts,
  updateFloorControlCharts
};

