/**
 * Test Fantasy402 Scores Ingest
 * Simulates extension sending intercepted getScoresLiveDynamic data to worker
 */

const WORKER_URL = 'http://localhost:8787';

// Sample Fantasy402 Scores response (from user's provided data)
const fantasy402ScoresResponse = {
  "Scores": [
    {
      "LogoTeam1": "Seattle Mariners.png",
      "LogoTeam2": "Detroit Tigers.png",
      "Team1ID": "Seattle Mariners",
      "Team2ID": "Detroit Tigers",
      "STeam1ID": "Mariners",
      "STeam2ID": "Tigers",
      "Team1RotNum": 957,
      "Team2RotNum": 958,
      "GameNum": 618853869,
      "CorrelationID": "618853869",
      "Team1Score": "",
      "Team2Score": "",
      "Record": "85-76",
      "Record2": "86-75",
      "Rank": "",
      "Rank2": "",
      "StatusAway": "",
      "StatusHome": "",
      "DisplaySubType": "MLB",
      "SportSubType": "MLB",
      "SportType": "Baseball",
      "Grouping": "Other",
      "STATUS": "upcoming",
      "Final": "Not Final",
      "GameDateTime": "2025-10-08 15:08:00.000",
      "BroadcastInfo": "FS1",
      "PeriodNumber": 0,
      "PeriodDescription": "",
      "Spread": -1.5,
      "SpreadAdj1": -110,
      "SpreadAdj2": -110,
      "MoneyLine1": -103,
      "MoneyLine2": -107,
      "MoneyLineDraw": 0,
      "Total": 8.5,
      "Favorito": "Tigers",
      "DefaultMainLine": true
    },
    {
      "LogoTeam1": "Chicago Cubs.png",
      "LogoTeam2": "Washington Nationals.png",
      "Team1ID": "Chicago Cubs",
      "Team2ID": "Washington Nationals",
      "STeam1ID": "Cubs",
      "STeam2ID": "Nationals",
      "Team1RotNum": 959,
      "Team2RotNum": 960,
      "GameNum": 618853870,
      "CorrelationID": "618853870",
      "Team1Score": "5",
      "Team2Score": "3",
      "Record": "83-78",
      "Record2": "71-90",
      "Rank": "",
      "Rank2": "",
      "StatusAway": "",
      "StatusHome": "",
      "DisplaySubType": "MLB",
      "SportSubType": "MLB",
      "SportType": "Baseball",
      "Grouping": "Other",
      "STATUS": "live",
      "Final": "Not Final",
      "GameDateTime": "2025-10-08 13:05:00.000",
      "BroadcastInfo": "MASN",
      "PeriodNumber": 7,
      "PeriodDescription": "Top 7th",
      "Spread": -1.5,
      "SpreadAdj1": 115,
      "SpreadAdj2": -135,
      "MoneyLine1": -140,
      "MoneyLine2": 120,
      "MoneyLineDraw": 0,
      "Total": 9.0,
      "Favorito": "Cubs",
      "DefaultMainLine": true
    }
  ]
};

async function testScoresIngest() {
  console.log('🧪 Testing Fantasy402 Scores Ingest\n');

  // Step 1: Send ingest packet (simulating browser extension)
  const ingestPacket = {
    endpoint: 'getScoresLiveDynamic',
    operation: 'getScoresLiveDynamic',
    timestamp: new Date().toISOString(),
    response: {
      status: 200,
      body: fantasy402ScoresResponse,
    },
    metadata: {
      url: 'https://fantasy402.com/cloud/api/Report/getScoresLiveDynamic',
      method: 'POST',
      token: 'Bearer test-token-12345',
    }
  };

  console.log('📤 1. Sending ingest packet to worker...');
  const ingestResponse = await fetch(`${WORKER_URL}/api/fantasy402/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ingestPacket),
  });

  if (!ingestResponse.ok) {
    console.error('❌ Ingest failed:', ingestResponse.status, await ingestResponse.text());
    process.exit(1);
  }

  const ingestResult = await ingestResponse.json();
  console.log('✅ Ingest successful:', ingestResult);

  // Step 2: Wait for KV write propagation (local mode)
  console.log('\n⏳ 2. Waiting 2s for KV write...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Query live-scores endpoint
  console.log('📥 3. Fetching live scores from API...');
  const scoresResponse = await fetch(`${WORKER_URL}/api/live-scores?sport=nba`);

  if (!scoresResponse.ok) {
    console.error('❌ Scores fetch failed:', scoresResponse.status);
    process.exit(1);
  }

  const scoresData = await scoresResponse.json();
  console.log('✅ Scores retrieved:', {
    count: scoresData.count,
    cached: scoresData.cached,
    cacheAge: scoresData.cacheAge,
    isLive: scoresData.isLive,
  });

  // Step 4: Verify complete data capture
  console.log('\n🔍 4. Verifying complete data capture...');

  if (scoresData.games && scoresData.games.length > 0) {
    const firstGame = scoresData.games[0];
    const requiredFields = [
      'gameId', 'correlationId', 'team1', 'team2', 'sport', 'sportType',
      'grouping', 'status', 'final', 'gameDateTime', 'broadcast', 'period',
      'spread', 'moneyline', 'total', 'favorito', 'defaultMainLine'
    ];

    const missingFields = requiredFields.filter(field => !(field in firstGame));

    if (missingFields.length > 0) {
      console.error('❌ Missing fields:', missingFields);
      process.exit(1);
    }

    // Check nested structures
    const team1Fields = ['id', 'shortName', 'logo', 'rotNum', 'score', 'record', 'rank', 'status'];
    const missingTeam1 = team1Fields.filter(field => !(field in firstGame.team1));

    if (missingTeam1.length > 0) {
      console.error('❌ Missing team1 fields:', missingTeam1);
      process.exit(1);
    }

    console.log('✅ All required fields present!');
    console.log('\n📊 Sample Game Data:');
    console.log(JSON.stringify(firstGame, null, 2));
  } else {
    console.warn('⚠️ No games in response (may be using mock data)');
    console.log('Response:', JSON.stringify(scoresData, null, 2));
  }

  console.log('\n✅ Test complete!');
}

// Run test
testScoresIngest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
