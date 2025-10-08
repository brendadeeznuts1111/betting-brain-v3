#!/usr/bin/env bun
// Test script to process live sports data from Fantasy402

const SPORTS_DATA = {
    "Scores": [
        {
            "LogoTeam1": "Seattle Mariners.png",
            "LogoTeam2": "Detroit-Tigers.png",
            "BroadcastInfo": "FS1                 ",
            "Record": "",
            "Rank": "",
            "Record2": "",
            "Rank2": "",
            "GameNum": 618853869,
            "Team1RotNum": 907,
            "Team2RotNum": 908,
            "STATUS": "O",
            "GameDateTime": "2025-10-08 15:08:00.000",
            "SportSubType": "MLB         ",
            "SportType": "Baseball            ",
            "DisplaySubType": "MLB",
            "PeriodNumber": 0,
            "PeriodDescription": "Game",
            "Team1ID": "Seattle Mariners",
            "Team2ID": "Detroit Tigers",
            "STeam1ID": "Mariners",
            "STeam2ID": "Tigers",
            "Team1Score": "",
            "Team2Score": "",
            "Final": "Not Final",
            "Spread": -1.5,
            "SpreadAdj1": -215,
            "SpreadAdj2": 180,
            "MoneyLine1": -103,
            "MoneyLine2": -107,
            "MoneyLineDraw": null,
            "Total": 8.5,
            "Favorito": "Detroit Tigers",
            "Grouping": "MLB         ",
            "StatusAway": "",
            "StatusHome": "",
            "CorrelationID": "907-g                                                                                               ",
            "DefaultMainLine": "Moneyline"
        },
        {
            "LogoTeam1": "Milwaukee-Brewers.png",
            "LogoTeam2": "Chicago-Cubs.png",
            "BroadcastInfo": "TBS                 ",
            "Record": "",
            "Rank": "",
            "Record2": "",
            "Rank2": "",
            "GameNum": 618853619,
            "Team1RotNum": 909,
            "Team2RotNum": 910,
            "STATUS": "O",
            "GameDateTime": "2025-10-08 17:08:00.000",
            "SportSubType": "MLB         ",
            "SportType": "Baseball            ",
            "DisplaySubType": "MLB",
            "PeriodNumber": 0,
            "PeriodDescription": "Game",
            "Team1ID": "Milwaukee Brewers",
            "Team2ID": "Chicago Cubs",
            "STeam1ID": "Brewers",
            "STeam2ID": "Cubs",
            "Team1Score": "",
            "Team2Score": "",
            "Final": "Not Final",
            "Spread": -1.5,
            "SpreadAdj1": -225,
            "SpreadAdj2": 185,
            "MoneyLine1": 107,
            "MoneyLine2": -117,
            "MoneyLineDraw": null,
            "Total": 6.5,
            "Favorito": "Chicago Cubs",
            "Grouping": "MLB         ",
            "StatusAway": "",
            "StatusHome": "",
            "CorrelationID": "909-g                                                                                               ",
            "DefaultMainLine": "Moneyline"
        }
    ]
};

async function testSportsData() {
    console.log('🏈 Testing Sports Data Processing');
    console.log('================================');

    try {
        // Test the sports data processing
        const response = await fetch('http://localhost:8787/api/sports/live', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(SPORTS_DATA)
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Sports data processed successfully!');
            console.log(`📊 Games processed: ${result.data.gamesProcessed}`);
            console.log(`🎯 Sharp indicators: ${result.data.sharpIndicators}`);
            console.log(`📈 Market analysis:`, result.data.marketAnalysis);
        } else {
            console.error('❌ Sports data processing failed:', result.error);
        }

    } catch (error) {
        console.error('❌ Error testing sports data:', error);
    }
}

// Run the test
testSportsData();
