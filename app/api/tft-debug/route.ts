import { NextResponse } from 'next/server';

// Debug endpoint to check API endpoints
// DELETE THIS AFTER DEBUGGING

export async function GET() {
  const apiKey = process.env.RIOT_API_KEY!;

  // Test 1: Get challenger league
  const challengerRes = await fetch(
    'https://na1.api.riotgames.com/tft/league/v1/challenger',
    { headers: { 'X-Riot-Token': apiKey } }
  );
  const challengerData = challengerRes.ok ? await challengerRes.json() : null;
  const firstEntry = challengerData?.entries?.[0];

  // Test 2: Get summoner by ID (this is what's failing)
  let summonerResult = 'Not tested';
  if (firstEntry?.summonerId) {
    const summonerRes = await fetch(
      `https://na1.api.riotgames.com/tft/summoner/v1/summoners/${firstEntry.summonerId}`,
      { headers: { 'X-Riot-Token': apiKey } }
    );
    summonerResult = summonerRes.ok
      ? `Success: ${JSON.stringify(await summonerRes.json())}`
      : `Error ${summonerRes.status}: ${summonerRes.statusText}`;
  }

  // Test 3: Alternative - get summoner by PUUID (if we had one)
  // Some newer endpoints might work differently

  return NextResponse.json({
    challenger: {
      status: challengerRes.status,
      entryCount: challengerData?.entries?.length ?? 0,
      sampleEntry: firstEntry ? {
        summonerId: firstEntry.summonerId,
        summonerName: firstEntry.summonerName,
        leaguePoints: firstEntry.leaguePoints,
        // Show all fields to see what's available
        allFields: Object.keys(firstEntry),
      } : null,
    },
    summonerLookup: summonerResult,
  });
}

export const dynamic = 'force-dynamic';
