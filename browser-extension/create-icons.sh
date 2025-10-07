#!/bin/bash
# Create PNG icons from SVG using ImageMagick or just create simple base64 PNGs

# For now, let's use a simple approach - convert SVG to PNG using built-in tools
# If this fails, we'll use a different approach

# Create a simple 48x48 PNG with Canvas API via Node
node << 'NODEEOF'
const fs = require('fs');
const { createCanvas } = require('canvas');

// Helper to create icon
function createIcon(size, enabled) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = enabled ? '#4A90E2' : '#6B7280';
  ctx.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x+r, y);
    this.arcTo(x+w, y,   x+w, y+h, r);
    this.arcTo(x+w, y+h, x,   y+h, r);
    this.arcTo(x,   y+h, x,   y,   r);
    this.arcTo(x,   y,   x+w, y,   r);
    this.closePath();
    return this;
  }
  ctx.roundRect(0, 0, size, size, size * 0.15);
  ctx.fill();
  
  // Text "BT"
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BT', size / 2, size / 2 + size * 0.05);
  
  // Status indicator dot
  if (enabled) {
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath();
    ctx.arc(size * 0.78, size * 0.22, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/png');
}

// Create icons
try {
  const sizes = [16, 48, 128];
  sizes.forEach(size => {
    fs.writeFileSync(`icon${size}.png`, createIcon(size, true));
    fs.writeFileSync(`icon${size}-disabled.png`, createIcon(size, false));
  });
  console.log('✅ Icons created successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
NODEEOF
