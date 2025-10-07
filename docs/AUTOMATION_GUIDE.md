# 🤖 Automation & Testing Guide

This guide covers the automated testing and build pipeline for the Betting Brain v3 project.

## 🚀 Quick Start

### Run All Tests
```bash
bun run test:automation
```

### Run Extension Tests Only
```bash
bun run test:extension
```

### Monitor Logs
```bash
bun run monitor:logs
```

### Open Testing Dashboard
```bash
bun run test:injection
```

## 📋 Available Scripts

### Core Scripts
- `bun run dev` - Start development server
- `bun run build` - Build project
- `bun run test` - Run unit tests
- `bun run lint` - Lint code
- `bun run format` - Format code

### Testing Scripts
- `bun run test:extension` - Test extension functionality
- `bun run test:automation` - Run full automation pipeline
- `bun run test:injection` - Open injection testing dashboard
- `bun run test:coverage` - Generate test coverage report

### Monitoring Scripts
- `bun run monitor:logs` - Monitor extension logs in real-time
- `bun run health:check` - Check worker health status

### Deployment Scripts
- `bun run deploy` - Deploy to default environment
- `bun run deploy:staging` - Deploy to staging
- `bun run deploy:production` - Deploy to production

## 🔧 Automated Testing Suite

### Extension Test Runner (`scripts/testing/extension-test-runner.ts`)

Comprehensive testing suite that validates:

1. **Extension Structure** - Verifies all required files exist
2. **Manifest Validation** - Checks manifest.json compliance
3. **Content Script Injection** - Tests script loading
4. **Log Forwarding** - Validates log transmission
5. **Worker Connectivity** - Tests worker health
6. **Authentication Flow** - Validates auth requirements

#### Usage
```bash
bun run scripts/testing/extension-test-runner.ts
```

#### Output
- Detailed test results
- Performance metrics
- Error reporting
- JSON report file (`test-results.json`)

### Build and Test Automation (`scripts/automation/build-and-test.ts`)

Complete CI/CD pipeline that:

1. **Cleans** build directory
2. **Installs** dependencies
3. **Lints** code
4. **Formats** code
5. **Runs** unit tests
6. **Builds** worker
7. **Tests** extension
8. **Packages** extension
9. **Generates** documentation

#### Usage
```bash
bun run scripts/automation/build-and-test.ts
```

#### Output
- Step-by-step progress
- Success/failure status
- Performance metrics
- Build report (`dist/build-report.json`)

## 🧪 Testing Tools

### Extension Injection Tester (`tools/testing/extension-injection-tester.html`)

Interactive web-based testing dashboard that provides:

- **Real-time Status** - Extension, worker, and injection status
- **Automated Tests** - Extension functionality validation
- **Worker Connectivity** - Health check and endpoint testing
- **Log Forwarding** - Log transmission testing
- **Live Monitoring** - Real-time log streaming
- **Manual Tests** - Step-by-step testing instructions

#### Features
- Visual status indicators
- Real-time log monitoring
- Test result visualization
- Error reporting
- Performance metrics

### Log Monitor (`tools/logging/log-monitor.js`)

Enhanced real-time log monitoring with:

- **Real-time Streaming** - Live log updates
- **Statistics** - Log counts and metrics
- **Error Tracking** - Error detection and reporting
- **Performance Monitoring** - Response times and uptime
- **Graceful Shutdown** - Clean exit handling

#### Usage
```bash
bun run tools/logging/log-monitor.js
```

#### Features
- Color-coded log levels
- Timestamp formatting
- Error highlighting
- Statistics summary
- Session tracking

## 📊 Testing Workflow

### 1. Development Testing
```bash
# Start development
bun run dev

# In another terminal, monitor logs
bun run monitor:logs

# Test extension
bun run test:extension
```

### 2. Pre-deployment Testing
```bash
# Run full automation pipeline
bun run test:automation

# Check results
cat test-results.json
cat dist/build-report.json
```

### 3. Production Deployment
```bash
# Deploy to production
bun run deploy:production

# Verify deployment
bun run health:check
```

## 🔍 Debugging

### Extension Not Injecting
1. Check extension loading in Chrome
2. Verify manifest.json permissions
3. Test on simple page first
4. Check browser console for errors
5. Use injection tester dashboard

### Worker Connectivity Issues
1. Check worker health endpoint
2. Verify network connectivity
3. Check CORS headers
4. Validate authentication

### Log Forwarding Problems
1. Check extension injection
2. Verify worker logs endpoint
3. Test with manual log generation
4. Check network requests

## 📈 Performance Monitoring

### Key Metrics
- **Response Time** - Worker response latency
- **Success Rate** - Request success percentage
- **Error Rate** - Error frequency
- **Log Volume** - Logs per minute
- **Uptime** - Service availability

### Monitoring Tools
- Log monitor for real-time metrics
- Health check for status validation
- Test automation for performance validation
- Extension tester for functionality verification

## 🚨 Troubleshooting

### Common Issues

#### Extension Not Loading
- Check Chrome extension permissions
- Verify manifest.json syntax
- Check for JavaScript errors
- Test on different domains

#### Worker Not Responding
- Check Cloudflare Worker status
- Verify deployment
- Check network connectivity
- Validate authentication

#### Logs Not Forwarding
- Check extension injection
- Verify worker endpoint
- Test network connectivity
- Check CORS configuration

### Debug Commands
```bash
# Check worker health
curl -s https://betting-brain-v3.nolarose1968-806.workers.dev/health

# Test log endpoint
curl -X POST https://betting-brain-v3.nolarose1968-806.workers.dev/logs \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"timestamp":"2025-01-01T00:00:00Z","level":"info","message":"test"}]}'

# Check extension files
ls -la browser-extension/
```

## 📚 Additional Resources

- [Worker Deployment Guide](DEPLOYMENT.md)
- [Testing Best Practices](testing/TESTING_GUIDE.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [MCP Testing Guide](MCP_TESTING_GUIDE.md)

## 🤝 Contributing

When adding new tests or automation:

1. Follow existing patterns
2. Add comprehensive error handling
3. Include performance metrics
4. Document new features
5. Update this guide

## 📞 Support

For issues with automation or testing:

1. Check the troubleshooting section
2. Review test reports
3. Check worker logs
4. Verify extension status
5. Contact the development team
