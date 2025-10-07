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
    if (!response) return;
    
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
  chrome.tabs.create({
    url: 'http://localhost:8888/dashboard-enhanced.html'
  });
}

