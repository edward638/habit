// Riot Games API wrapper with rate limiting
// Rate limits: 20 requests/1s, 100 requests/2min

const RIOT_API_KEY = process.env.RIOT_API_KEY!;
const NA_REGION = 'na1';
const AMERICAS_REGION = 'americas';

// Simple rate limiter
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      // Wait until the oldest request falls outside the window
      const waitTime = this.timestamps[0] + this.windowMs - now + 10;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.timestamps.push(now);
  }
}

// Use the more restrictive limit (20/1s is usually the bottleneck)
const rateLimiter = new RateLimiter(18, 1000); // 18/s to stay safe

async function riotFetch<T>(url: string): Promise<T> {
  await rateLimiter.acquire();

  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': RIOT_API_KEY,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return riotFetch(url);
    }
    throw new Error(`Riot API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Types for Riot API responses
export interface LeagueEntry {
  puuid: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface LeagueList {
  tier: string;
  leagueId: string;
  entries: LeagueEntry[];
}

export interface AccountDTO {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDTO {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface MatchDTO {
  metadata: {
    match_id: string;
    participants: string[];
  };
  info: {
    game_datetime: number;
    game_length: number;
    game_version: string;
    queue_id: number;
    tft_set_number: number;
    participants: ParticipantDTO[];
  };
}

export interface ParticipantDTO {
  puuid: string;
  placement: number;
  level: number;
  gold_left: number;
  players_eliminated: number;
  total_damage_to_players: number;
  time_eliminated: number;
  units: UnitDTO[];
  traits: TraitDTO[];
}

export interface UnitDTO {
  character_id: string;
  tier: number;
  rarity: number;
  itemNames: string[];
}

export interface TraitDTO {
  name: string;
  num_units: number;
  style: number;
  tier_current: number;
  tier_total: number;
}

// API Functions

export async function getChallengerLeague(): Promise<LeagueList> {
  const url = `https://${NA_REGION}.api.riotgames.com/tft/league/v1/challenger`;
  return riotFetch<LeagueList>(url);
}

export async function getGrandmasterLeague(): Promise<LeagueList> {
  const url = `https://${NA_REGION}.api.riotgames.com/tft/league/v1/grandmaster`;
  return riotFetch<LeagueList>(url);
}

export async function getSummonerById(summonerId: string): Promise<SummonerDTO> {
  const url = `https://${NA_REGION}.api.riotgames.com/tft/summoner/v1/summoners/${summonerId}`;
  return riotFetch<SummonerDTO>(url);
}

export async function getSummonerByPuuid(puuid: string): Promise<SummonerDTO> {
  const url = `https://${NA_REGION}.api.riotgames.com/tft/summoner/v1/summoners/by-puuid/${puuid}`;
  return riotFetch<SummonerDTO>(url);
}

export async function getMatchIdsByPuuid(
  puuid: string,
  count: number = 20,
  startTime?: number
): Promise<string[]> {
  let url = `https://${AMERICAS_REGION}.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?count=${count}`;
  if (startTime) {
    url += `&startTime=${startTime}`;
  }
  return riotFetch<string[]>(url);
}

export async function getMatch(matchId: string): Promise<MatchDTO> {
  const url = `https://${AMERICAS_REGION}.api.riotgames.com/tft/match/v1/matches/${matchId}`;
  return riotFetch<MatchDTO>(url);
}

// Get account info (gameName + tagLine) by PUUID
export async function getAccountByPuuid(puuid: string): Promise<AccountDTO> {
  const url = `https://${AMERICAS_REGION}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}`;
  return riotFetch<AccountDTO>(url);
}
