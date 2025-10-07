// Popup script for BetTicker Interceptor

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  
  document.getElementById('toggleBtn').addEventListener('click', toggle);
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
  
  // Auto-refresh stats every 2 seconds
  setInterval(loadStats, 2000);
});

function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    // Check for errors
    if (chrome.runtime.lastError) {
      console.error('Error loading stats:', chrome.runtime.lastError);
      showError('Connection error');
      return;
    }
    
    if (!response) {
      console.warn('No response from background script');
      showError('No response');
      return;
    }
    
    // Update status badge
    const statusBadge = document.getElementById('statusBadge');
    const toggleBtn = document.getElementById('toggleBtn');
    
    if (response.enabled) {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'badge success';
      toggleBtn.textContent = '⏸️ Disable Interceptor';
      toggleBtn.className = 'btn-primary';
    } else {
      statusBadge.textContent = 'Disabled';
      statusBadge.className = 'badge error';
      toggleBtn.textContent = '▶️ Enable Interceptor';
      toggleBtn.className = 'btn-primary disabled';
    }
    
    // Update stats
    document.getElementById('interceptCount').textContent = response.interceptCount || 0;
    document.getElementById('successCount').textContent = response.successCount || 0;
    document.getElementById('failureCount').textContent = response.failureCount || 0;
    document.getElementById('fallbackCount').textContent = response.fallbackCount || 0;
    document.getElementById('successRate').textContent = response.successRate + '%' || '0%';
    
    if (response.lastIntercept) {
      const lastTime = new Date(response.lastIntercept);
      const now = new Date();
      const diffMs = now - lastTime;
      const diffSecs = Math.floor(diffMs / 1000);
      
      if (diffSecs < 60) {
        document.getElementById('lastIntercept').textContent = `${diffSecs}s ago`;
      } else if (diffSecs < 3600) {
        document.getElementById('lastIntercept').textContent = `${Math.floor(diffSecs / 60)}m ago`;
      } else {
        document.getElementById('lastIntercept').textContent = lastTime.toLocaleTimeString();
      }
    } else {
      document.getElementById('lastIntercept').textContent = 'Never';
    }
  });
}

function showError(message) {
  const statusBadge = document.getElementById('statusBadge');
  const toggleBtn = document.getElementById('toggleBtn');
  
  statusBadge.textContent = message;
  statusBadge.className = 'badge error';
  toggleBtn.textContent = '⚠️ Error';
  toggleBtn.className = 'btn-primary disabled';
  toggleBtn.disabled = true;
}

function toggle() {
  chrome.runtime.sendMessage({ action: 'toggle' }, (response) => {
    loadStats();
    
    // Show notification
    const message = response.enabled 
      ? '✅ Interceptor enabled! All requests will be captured.'
      : '❌ Interceptor disabled. Requests go directly to origin.';
    
    // Flash the button
    const btn = document.getElementById('toggleBtn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 100);
  });
}

function reset() {
  if (confirm('Reset intercept counter?')) {
    chrome.runtime.sendMessage({ action: 'reset' }, () => {
      loadStats();
      
      // Flash the button
      const btn = document.getElementById('resetBtn');
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 100);
    });
  }
}

function openDashboard() {
  // Open the local dashboard file directly
  chrome.tabs.create({
    url: 'file:///Users/nolarose/ffffff/dashboards/dashboard-enhanced.html'
  });
}

