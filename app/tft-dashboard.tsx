'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchLatestAggregates, TopGainer, UnitAggregate, ItemAggregate } from '@/lib/tft';
import { useTheme } from './theme-provider';

export default function TftDashboard() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topUnits, setTopUnits] = useState<UnitAggregate[]>([]);
  const [topItems, setTopItems] = useState<ItemAggregate[]>([]);
  const [gainers, setGainers] = useState<TopGainer[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const data = await fetchLatestAggregates(supabase);
        setTopUnits(data.topUnits);
        setTopItems(data.topItems);
        setGainers(data.gainers);
      } catch (err) {
        setError('Failed to load TFT data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Format character ID to readable name (e.g., TFT9_Ahri -> Ahri)
  function formatCharName(charId: string): string {
    const parts = charId.split('_');
    return parts.length > 1 ? parts[parts.length - 1] : charId;
  }

  // Format item ID to readable name
  function formatItemName(itemId: string): string {
    return itemId
      .replace(/^TFT_Item_/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  if (loading) {
    return (
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
          TFT Analytics
        </h2>
        <p style={{ color: theme.colors.textMuted }}>Loading TFT data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
          TFT Analytics
        </h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const hasData = topUnits.length > 0 || topItems.length > 0 || gainers.length > 0;

  return (
    <div
      className="rounded-lg p-6 border"
      style={{ backgroundColor: theme.colors.card, borderColor: theme.colors.border }}
    >
      <h2 className="text-xl font-bold mb-4" style={{ color: theme.colors.text }}>
        TFT Analytics (NA Challenger/GM)
      </h2>

      {!hasData ? (
        <p style={{ color: theme.colors.textMuted }}>
          No data yet. Analytics will populate after the first cron jobs run.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top LP Gainers */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: theme.colors.text }}>
              Top LP Gainers (24h)
            </h3>
            {gainers.length === 0 ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                No data yet
              </p>
            ) : (
              <ul className="space-y-2">
                {gainers.map((gainer, idx) => (
                  <li
                    key={gainer.puuid}
                    className="flex items-center justify-between text-sm"
                  >
                    <span style={{ color: theme.colors.text }}>
                      {idx + 1}. {gainer.summoner_name}
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: theme.colors.streak }}
                    >
                      +{gainer.lp_gain} LP
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Most Played Units */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: theme.colors.text }}>
              Most Played Units
            </h3>
            {topUnits.length === 0 ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                No data yet
              </p>
            ) : (
              <ul className="space-y-2">
                {topUnits.slice(0, 5).map((unit, idx) => (
                  <li
                    key={unit.character_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span style={{ color: theme.colors.text }}>
                      {idx + 1}. {formatCharName(unit.character_id)}
                    </span>
                    <span style={{ color: theme.colors.textMuted }}>
                      {unit.play_rate.toFixed(1)}% | Avg {unit.avg_placement.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Most Used Items */}
          <div>
            <h3 className="font-semibold mb-3" style={{ color: theme.colors.text }}>
              Most Used Items
            </h3>
            {topItems.length === 0 ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                No data yet
              </p>
            ) : (
              <ul className="space-y-2">
                {topItems.slice(0, 5).map((item, idx) => (
                  <li
                    key={item.item_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span
                      style={{ color: theme.colors.text }}
                      className="truncate max-w-[120px]"
                      title={formatItemName(item.item_id)}
                    >
                      {idx + 1}. {formatItemName(item.item_id)}
                    </span>
                    <span style={{ color: theme.colors.textMuted }}>
                      {item.play_rate.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs" style={{ color: theme.colors.textMuted }}>
        Data updates daily at 6 AM UTC (snapshot) and 7 AM UTC (analysis)
      </p>
    </div>
  );
}
