/**
 * Fantasy402 HTML Scraper
 *
 * Parses the Fantasy402 Manager HTML page to extract:
 * - Live bets from Bet Ticker
 * - Agent performance from dashboard
 * - Customer activity
 * - Transaction history
 */

import { Env } from '../../types/api';

const FANTASY402_BASE_URL = 'https://fantasy402.com';
const MANAGER_PAGE = '/cloud/Manager.aspx';

interface ScrapedBetTickerData {
  liveBets: {
    count: number;
    buckets: Array<{ minute: string; volume: number }>;
  };
  recentTransactions: Array<{
    type: 'BET' | 'PAYOUT';
    customerId: string;
    amount: number;
    status: 'PENDING' | 'SETTLED';
    timestamp: string;
  }>;
}

interface ScrapedAgentData {
  totalPnl: number;
  top: Array<{
    id: string;
    pnl: number;
  }>;
}

interface ScrapedCustomerData {
  activeCount: number;
  totalStaked: number;
}

/**
 * Scrape Bet Ticker section from Manager page
 * Looks for: <span class="menu-title" data-language="L-545">Bet Ticker</span>
 */
export async function scrapeBetTicker(
  cookies: string,
  requestId: string
): Promise<ScrapedBetTickerData> {
  console.log(`[${requestId}] 🕷️  Scraping Bet Ticker from ${FANTASY402_BASE_URL}${MANAGER_PAGE}`);

  try {
    const response = await fetch(`${FANTASY402_BASE_URL}${MANAGER_PAGE}`, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (compatible; Betting-Brain-Scraper/3.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[${requestId}] 📄 Received ${html.length} bytes of HTML`);

    // Parse Bet Ticker data
    const betTickerData = parseBetTickerHTML(html, requestId);

    return betTickerData;
  } catch (error) {
    console.error(`[${requestId}] ❌ Scraping error:`, error);
    throw error;
  }
}

/**
 * Parse Bet Ticker HTML to extract live bets
 */
function parseBetTickerHTML(html: string, requestId: string): ScrapedBetTickerData {
  console.log(`[${requestId}] 🔍 Parsing Bet Ticker HTML`);

  // Look for bet ticker data table
  // Fantasy402 uses: <div id="betTickerPanel">...</div>
  const betTickerMatch = html.match(/<div[^>]*id=["']betTickerPanel["'][^>]*>([\s\S]*?)<\/div>/i);

  if (!betTickerMatch) {
    console.warn(`[${requestId}] ⚠️  No bet ticker panel found`);
    return {
      liveBets: { count: 0, buckets: [] },
      recentTransactions: [],
    };
  }

  const betTickerHTML = betTickerMatch[1];
  console.log(`[${requestId}] ✅ Found bet ticker panel (${betTickerHTML.length} chars)`);

  // Extract in-flight bets count
  // Look for: <span id="liveBetsCount">12</span>
  const liveBetsMatch = betTickerHTML.match(/<span[^>]*id=["']liveBetsCount["'][^>]*>(\d+)<\/span>/i);
  const liveBetsCount = liveBetsMatch ? parseInt(liveBetsMatch[1], 10) : 0;

  console.log(`[${requestId}] 📊 In-flight bets: ${liveBetsCount}`);

  // Extract bet rows from table
  // Look for: <tr class="bet-row" data-timestamp="..." data-stake="...">
  const betRows = Array.from(betTickerHTML.matchAll(/<tr[^>]*class=["'][^"']*bet-row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi));

  console.log(`[${requestId}] 📋 Found ${betRows.length} bet rows`);

  const transactions: ScrapedBetTickerData['recentTransactions'] = [];
  const volumeByMinute = new Map<string, number>();

  for (const betRowMatch of betRows) {
    const rowHTML = betRowMatch[1];

    // Extract data attributes
    const timestampMatch = betRowMatch[0].match(/data-timestamp=["']([^"']+)["']/);
    const stakeMatch = betRowMatch[0].match(/data-stake=["']([^"']+)["']/);
    const customerMatch = betRowMatch[0].match(/data-customer=["']([^"']+)["']/);
    const statusMatch = betRowMatch[0].match(/data-status=["']([^"']+)["']/);

    if (timestampMatch && stakeMatch) {
      const timestamp = timestampMatch[1];
      const stake = parseFloat(stakeMatch[1]);
      const customerId = customerMatch ? customerMatch[1] : 'unknown';
      const status = statusMatch?.[1]?.toUpperCase() === 'PENDING' ? 'PENDING' : 'SETTLED';

      // Add to transactions
      transactions.push({
        type: 'BET',
        customerId,
        amount: stake,
        status: status as 'PENDING' | 'SETTLED',
        timestamp,
      });

      // Aggregate volume by minute
      const minute = timestamp.substring(0, 16); // YYYY-MM-DDTHH:MM
      volumeByMinute.set(minute, (volumeByMinute.get(minute) || 0) + stake);
    }
  }

  // Convert volume map to buckets array (last 5 minutes)
  const now = new Date();
  const buckets = Array.from({ length: 5 }, (_, i) => {
    const minuteTime = new Date(now.getTime() - i * 60000);
    const minuteKey = minuteTime.toISOString().substring(0, 16);
    const minuteLabel = minuteTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return {
      minute: minuteLabel,
      volume: volumeByMinute.get(minuteKey) || 0,
    };
  }).reverse();

  console.log(`[${requestId}] ✅ Parsed ${transactions.length} transactions, ${buckets.length} volume buckets`);

  return {
    liveBets: {
      count: liveBetsCount,
      buckets,
    },
    recentTransactions: transactions.slice(0, 10), // Last 10
  };
}

/**
 * Scrape agent performance from Manager dashboard
 * Looks for: <div class="agent-performance">...</div>
 */
export async function scrapeAgentPerformance(
  cookies: string,
  requestId: string
): Promise<ScrapedAgentData> {
  console.log(`[${requestId}] 🕷️  Scraping agent performance`);

  try {
    const response = await fetch(`${FANTASY402_BASE_URL}${MANAGER_PAGE}`, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (compatible; Betting-Brain-Scraper/3.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Look for agent performance panel
    const agentPanelMatch = html.match(/<div[^>]*class=["'][^"']*agent-performance[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    if (!agentPanelMatch) {
      console.warn(`[${requestId}] ⚠️  No agent performance panel found`);
      return { totalPnl: 0, top: [] };
    }

    const panelHTML = agentPanelMatch[1];

    // Extract total PNL
    // Look for: <span id="totalPnl">1247.50</span>
    const pnlMatch = panelHTML.match(/<span[^>]*id=["']totalPnl["'][^>]*>([^<]+)<\/span>/i);
    const totalPnl = pnlMatch ? parseFloat(pnlMatch[1].replace(/[^0-9.-]/g, '')) : 0;

    // Extract top agents from table
    const agentRows = Array.from(panelHTML.matchAll(/<tr[^>]*class=["'][^"']*agent-row[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi));

    const top = agentRows.slice(0, 3).map((rowMatch) => {
      const row = rowMatch[1];
      const idMatch = row.match(/data-agent-id=["']([^"']+)["']/);
      const pnlMatch = row.match(/data-pnl=["']([^"']+)["']/);

      return {
        id: idMatch ? idMatch[1] : 'unknown',
        pnl: pnlMatch ? parseFloat(pnlMatch[1]) : 0,
      };
    });

    console.log(`[${requestId}] ✅ Total PNL: ${totalPnl}, Top ${top.length} agents`);

    return { totalPnl, top };
  } catch (error) {
    console.error(`[${requestId}] ❌ Agent scraping error:`, error);
    throw error;
  }
}

/**
 * Scrape customer activity statistics
 */
export async function scrapeCustomerStats(
  cookies: string,
  requestId: string
): Promise<ScrapedCustomerData> {
  console.log(`[${requestId}] 🕷️  Scraping customer stats`);

  try {
    const response = await fetch(`${FANTASY402_BASE_URL}${MANAGER_PAGE}`, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (compatible; Betting-Brain-Scraper/3.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Look for customer stats panel
    // <span id="activeCustomers30">47</span>
    const activeMatch = html.match(/<span[^>]*id=["']activeCustomers\d+["'][^>]*>(\d+)<\/span>/i);
    const activeCount = activeMatch ? parseInt(activeMatch[1], 10) : 0;

    // <span id="totalStakedToday">12450.00</span>
    const stakedMatch = html.match(/<span[^>]*id=["']totalStakedToday["'][^>]*>([^<]+)<\/span>/i);
    const totalStaked = stakedMatch ? parseFloat(stakedMatch[1].replace(/[^0-9.]/g, '')) : 0;

    console.log(`[${requestId}] ✅ Active customers: ${activeCount}, Total staked: ${totalStaked}`);

    return { activeCount, totalStaked };
  } catch (error) {
    console.error(`[${requestId}] ❌ Customer stats scraping error:`, error);
    throw error;
  }
}

/**
 * Get cookies from request headers or KV store
 */
export async function getFantasy402Cookies(
  request: Request,
  env: Env,
  requestId: string
): Promise<string | null> {
  // Option 1: From request header (if browser extension forwards them)
  const cookieHeader = request.headers.get('X-Fantasy402-Cookies');
  if (cookieHeader) {
    console.log(`[${requestId}] 🍪 Using cookies from request header`);
    return cookieHeader;
  }

  // Option 2: From KV store (stored by extension)
  if (env.SESSION_STORE) {
    try {
      const storedCookies = await env.SESSION_STORE.get('fantasy402:cookies');
      if (storedCookies) {
        console.log(`[${requestId}] 🍪 Using cookies from KV store`);
        return storedCookies;
      }
    } catch (error) {
      console.warn(`[${requestId}] ⚠️  Failed to get cookies from KV:`, error);
    }
  }

  // Option 3: From BET_TICKER_RAW metadata (last successful request)
  if (env.BET_TICKER_RAW) {
    try {
      const { getBetTickerHistory } = await import('../../interceptors/bet-ticker-sniffer');
      const history = await getBetTickerHistory(env as any, { limit: 1 });

      if (history.length > 0) {
        // Extract cookies from user agent or stored metadata
        console.log(`[${requestId}] 🍪 Could extract from BetTicker history metadata`);
      }
    } catch (error) {
      console.warn(`[${requestId}] ⚠️  Failed to get cookies from history:`, error);
    }
  }

  console.warn(`[${requestId}] ⚠️  No Fantasy402 cookies available`);
  return null;
}
