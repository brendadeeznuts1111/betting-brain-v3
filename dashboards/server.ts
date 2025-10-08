#!/usr/bin/env bun
/**
 * Bun static file server for dashboards
 * Using Bun's built-in file serving capabilities
 */

const PORT = 8081;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default route
    if (path === '/') {
      path = '/floor-control.html';
    }

    // Serve static files with proper MIME types
    const filePath = import.meta.dir + path;
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // 404 fallback
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🌲 Dashboard server running at http://localhost:${PORT}`);
console.log(`   - Floor Control: http://localhost:${PORT}/floor-control.html`);
console.log(`   - Hierarchy Enhanced: http://localhost:${PORT}/hierarchy-enhanced.html`);
