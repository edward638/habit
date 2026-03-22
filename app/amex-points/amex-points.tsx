'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '../theme-provider';
import { getBalance, upsertBalance } from '@/lib/amex-points';
import {
  TRANSFER_PARTNERS,
  TRIP_MAP,
  VALUE_TIERS,
  DESTINATION_LABELS,
  CLASS_LABELS,
  type DestinationRegion,
  type TravelClass,
  type Recommendation,
  type TransferPartner,
} from '@/lib/amex-data';

interface AmexPointsProps {
  userId: string;
}

function formatPoints(n: number): string {
  return n.toLocaleString();
}

function formatDollars(cents: number): string {
  return '$' + Math.round(cents).toLocaleString();
}

function timeAgo(isoString: string): { label: string; stale: boolean } {
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = diff / (1000 * 60 * 60);
  const days = hours / 24;
  if (hours < 1) return { label: 'just now', stale: false };
  if (hours < 24) return { label: `${Math.floor(hours)}h ago`, stale: false };
  if (days < 7) return { label: `${Math.floor(days)}d ago`, stale: false };
  if (days < 30) return { label: `${Math.floor(days / 7)}w ago`, stale: true };
  return { label: `${Math.floor(days / 30)}mo ago`, stale: true };
}

const VERDICT_COLORS: Record<string, string> = {
  avoid: '#ef4444',
  ok: '#f59e0b',
  good: '#10b981',
  excellent: '#6366f1',
};

const VERDICT_LABELS: Record<string, string> = {
  avoid: 'Avoid',
  ok: 'Decent',
  good: 'Target',
  excellent: 'Best',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  advanced: 'Advanced',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981',
  moderate: '#f59e0b',
  advanced: '#6366f1',
};

const VALUE_TIER_BG: Record<string, string> = {
  avoid: '#fee2e2',
  ok: '#fef3c7',
  good: '#d1fae5',
  excellent: '#ede9fe',
};

export default function AmexPoints({ userId }: AmexPointsProps) {
  const supabase = createClient();
  const { theme } = useTheme();

  const [points, setPoints] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState<DestinationRegion | ''>('');
  const [selectedClass, setSelectedClass] = useState<TravelClass | ''>('');
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [noResults, setNoResults] = useState(false);

  const [partnerFilter, setPartnerFilter] = useState<'all' | 'airline' | 'hotel'>('all');
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getBalance(supabase, userId);
      if (data) {
        setPoints(data.points);
        setInputValue(formatPoints(data.points));
        setLastUpdated(data.updated_at);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const parsed = parseInt(inputValue.replace(/,/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    try {
      const data = await upsertBalance(supabase, userId, parsed);
      setPoints(data.points);
      setInputValue(formatPoints(data.points));
      setLastUpdated(data.updated_at);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFindBestUse = () => {
    if (!selectedRegion || !selectedClass) return;
    const result = TRIP_MAP[selectedRegion as DestinationRegion]?.[selectedClass as TravelClass];
    if (result && result.length > 0) {
      setRecommendations(result);
      setNoResults(false);
    } else {
      setRecommendations(null);
      setNoResults(true);
    }
  };

  const filteredPartners = TRANSFER_PARTNERS.filter(p =>
    partnerFilter === 'all' || p.type === partnerFilter
  );

  const staleInfo = lastUpdated ? timeAgo(lastUpdated) : null;

  const cardStyle = {
    backgroundColor: theme.colors.card,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 12,
    padding: '20px 24px',
  };

  const sectionTitle = {
    fontSize: 18,
    fontWeight: 700,
    color: theme.colors.text,
    marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.colors.text, margin: 0 }}>
          Amex Points Optimizer
        </h1>
        <p style={{ color: theme.colors.textMuted, marginTop: 4, fontSize: 14 }}>
          Membership Rewards — find your best redemption
        </p>
      </div>

      {/* Balance Card */}
      <div style={cardStyle}>
        <div style={{ ...sectionTitle, marginBottom: 12 }}>Your Balance</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. 75,000"
            style={{
              flex: '1 1 180px',
              maxWidth: 220,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontSize: 20,
              fontWeight: 700,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: theme.colors.primary,
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Update Balance'}
          </button>
        </div>
        {staleInfo && (
          <p style={{
            marginTop: 8,
            fontSize: 13,
            color: staleInfo.stale ? '#f59e0b' : theme.colors.textMuted,
          }}>
            {staleInfo.stale ? '⚠ ' : ''}Last updated {staleInfo.label}
            {staleInfo.stale && ' — consider refreshing your balance'}
          </p>
        )}
        {!lastUpdated && !loading && (
          <p style={{ marginTop: 8, fontSize: 13, color: theme.colors.textMuted }}>
            Enter your current Amex MR balance to get started
          </p>
        )}
      </div>

      {/* Value Overview */}
      {points !== null && (
        <div style={cardStyle}>
          <div style={sectionTitle}>Your Points Are Worth</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {VALUE_TIERS.map(tier => {
              const value = Math.round(points * tier.cpp);
              return (
                <div
                  key={tier.label}
                  style={{
                    borderRadius: 10,
                    padding: '14px 16px',
                    backgroundColor: VALUE_TIER_BG[tier.verdict] + '33',
                    border: `1px solid ${VERDICT_COLORS[tier.verdict]}30`,
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: VERDICT_COLORS[tier.verdict] }}>
                    {formatDollars(value)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text, marginTop: 2 }}>
                    {tier.label}
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>
                    {tier.cpp}¢ / point
                  </div>
                  <div style={{
                    marginTop: 6,
                    display: 'inline-block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: VERDICT_COLORS[tier.verdict],
                    backgroundColor: VERDICT_COLORS[tier.verdict] + '20',
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}>
                    {VERDICT_LABELS[tier.verdict]}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: theme.colors.textMuted }}>
            Values are estimates based on typical redemption rates. Your actual value will vary.
          </p>
        </div>
      )}

      {/* Trip Recommender */}
      <div style={cardStyle}>
        <div style={sectionTitle}>Plan a Trip</div>
        <p style={{ fontSize: 14, color: theme.colors.textMuted, marginBottom: 16, marginTop: -8 }}>
          Tell us where you want to go and we'll find the best transfer partner strategy.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select
            value={selectedRegion}
            onChange={e => { setSelectedRegion(e.target.value as DestinationRegion); setRecommendations(null); setNoResults(false); }}
            style={{
              flex: '1 1 200px',
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              color: selectedRegion ? theme.colors.text : theme.colors.textMuted,
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="">Select destination…</option>
            {(Object.keys(DESTINATION_LABELS) as DestinationRegion[]).map(r => (
              <option key={r} value={r}>{DESTINATION_LABELS[r]}</option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value as TravelClass); setRecommendations(null); setNoResults(false); }}
            style={{
              flex: '1 1 160px',
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              color: selectedClass ? theme.colors.text : theme.colors.textMuted,
              fontSize: 14,
              outline: 'none',
            }}
          >
            <option value="">Select class…</option>
            {(Object.keys(CLASS_LABELS) as TravelClass[]).map(c => (
              <option key={c} value={c}>{CLASS_LABELS[c]}</option>
            ))}
          </select>
          <button
            onClick={handleFindBestUse}
            disabled={!selectedRegion || !selectedClass}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: (!selectedRegion || !selectedClass) ? theme.colors.border : theme.colors.primary,
              color: (!selectedRegion || !selectedClass) ? theme.colors.textMuted : '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: (!selectedRegion || !selectedClass) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Find Best Use →
          </button>
        </div>

        {/* Results */}
        {recommendations && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendations.map((rec, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${theme.colors.border}`,
                  padding: '16px 18px',
                  backgroundColor: theme.colors.background,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: theme.colors.primary, padding: '2px 8px', borderRadius: 20 }}>
                        #{i + 1}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: theme.colors.text }}>
                        {rec.partner}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: theme.colors.textMuted, marginTop: 4 }}>
                      {rec.strategy}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: DIFFICULTY_COLORS[rec.difficulty],
                      backgroundColor: DIFFICULTY_COLORS[rec.difficulty] + '20',
                      padding: '3px 10px',
                      borderRadius: 20,
                    }}>
                      {DIFFICULTY_LABELS[rec.difficulty]}
                    </span>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#6366f1',
                      backgroundColor: '#6366f120',
                      padding: '3px 10px',
                      borderRadius: 20,
                    }}>
                      ~{rec.estimatedCpp}¢/pt
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Points Needed</div>
                    <div style={{ fontSize: 14, color: theme.colors.text, fontWeight: 600, marginTop: 2 }}>{rec.pointsRange}</div>
                  </div>
                  {points !== null && (
                    <div>
                      <div style={{ fontSize: 11, color: theme.colors.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Est. Cash Value</div>
                      <div style={{ fontSize: 14, color: '#10b981', fontWeight: 700, marginTop: 2 }}>
                        {formatDollars(Math.round(points * rec.estimatedCpp))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: theme.colors.primary + '10',
                  fontSize: 13,
                  color: theme.colors.text,
                  borderLeft: `3px solid ${theme.colors.primary}`,
                }}>
                  <strong>Tip:</strong> {rec.tip}
                </div>
              </div>
            ))}
          </div>
        )}

        {noResults && (
          <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 8, backgroundColor: theme.colors.background, color: theme.colors.textMuted, fontSize: 14 }}>
            No specific recommendations for that combination yet. Try business class or a different region for more options.
          </div>
        )}
      </div>

      {/* Transfer Partner Guide */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={sectionTitle as React.CSSProperties}>Transfer Partner Guide</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'airline', 'hotel'] as const).map(f => (
              <button
                key={f}
                onClick={() => setPartnerFilter(f)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: `1px solid ${partnerFilter === f ? theme.colors.primary : theme.colors.border}`,
                  backgroundColor: partnerFilter === f ? theme.colors.primary + '20' : 'transparent',
                  color: partnerFilter === f ? theme.colors.primary : theme.colors.textMuted,
                  fontSize: 13,
                  fontWeight: partnerFilter === f ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredPartners.map(partner => (
            <PartnerCard
              key={partner.name}
              partner={partner}
              isExpanded={expandedPartner === partner.name}
              onToggle={() => setExpandedPartner(expandedPartner === partner.name ? null : partner.name)}
              theme={theme}
            />
          ))}
        </div>
      </div>

      {/* Resources */}
      <div style={{ ...cardStyle, backgroundColor: theme.colors.primary + '08' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.text, marginBottom: 10 }}>
          Stay Current on Transfer Bonuses
        </div>
        <p style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 12 }}>
          Transfer bonuses (often 20–40% extra miles) can dramatically improve redemption value. Check these sources regularly — bonuses are time-sensitive and change monthly.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'The Points Guy', url: 'https://thepointsguy.com/news/amex-transfer-bonuses/' },
            { label: 'Doctor of Credit', url: 'https://www.doctorofcredit.com/amex-transfer-bonuses/' },
            { label: 'View from the Wing', url: 'https://viewfromthewing.com/category/frequent-flyer-miles/' },
          ].map(resource => (
            <a
              key={resource.label}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: `1px solid ${theme.colors.primary}40`,
                color: theme.colors.primary,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                backgroundColor: theme.colors.card,
              }}
            >
              {resource.label} →
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}

function PartnerCard({
  partner,
  isExpanded,
  onToggle,
  theme,
}: {
  partner: TransferPartner;
  isExpanded: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const tierColors: Record<string, string> = {
    excellent: '#6366f1',
    good: '#10b981',
    fair: '#f59e0b',
    poor: '#ef4444',
  };
  const tierLabels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };

  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${partner.avoid ? '#ef444430' : theme.colors.border}`,
        backgroundColor: partner.avoid ? '#fee2e208' : theme.colors.background,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 20,
            backgroundColor: partner.type === 'airline' ? '#3b82f620' : '#f59e0b20',
            color: partner.type === 'airline' ? '#3b82f6' : '#f59e0b',
          }}>
            {partner.type === 'airline' ? 'Airline' : 'Hotel'}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: theme.colors.text }}>
            {partner.name}
          </span>
          {partner.alliance && (
            <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
              {partner.alliance}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: theme.colors.textMuted }}>{partner.ratio}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: tierColors[partner.valueTier],
            backgroundColor: tierColors[partner.valueTier] + '20',
            padding: '2px 8px',
            borderRadius: 20,
          }}>
            {tierLabels[partner.valueTier]}
          </span>
          <span style={{ color: theme.colors.textMuted, fontSize: 16 }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${theme.colors.border}` }}>
          {partner.avoid && partner.avoidReason && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              fontSize: 13,
              borderLeft: '3px solid #ef4444',
            }}>
              <strong>Avoid:</strong> {partner.avoidReason}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 13, color: theme.colors.textMuted, lineHeight: 1.6 }}>
            {partner.notes}
          </div>
          {partner.bestFor.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Best For
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {partner.bestFor.map((use, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 12,
                      padding: '3px 10px',
                      borderRadius: 20,
                      backgroundColor: theme.colors.primary + '15',
                      color: theme.colors.primary,
                      fontWeight: 500,
                    }}
                  >
                    {use}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
