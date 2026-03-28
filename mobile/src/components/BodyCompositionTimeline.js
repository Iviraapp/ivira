import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

let Svg, Polyline, Line, SvgText, SvgCircle;
try {
  const svg = require('react-native-svg');
  Svg = svg.Svg;
  Polyline = svg.Polyline;
  Line = svg.Line;
  SvgText = svg.Text;
  SvgCircle = svg.Circle;
} catch { Svg = null; }

const ACCENT = '#8B5CF6';
const GREEN = '#22C55E';
const ORANGE = '#F97316';
const BLUE = '#38BDF8';

function getTrend(first, last) {
  const diff = last - first;
  if (Math.abs(diff) < 0.3) return { dir: 'flat', color: BLUE, label: 'Maintaining', icon: 'minus' };
  if (diff < 0) return { dir: 'down', color: GREEN, label: 'Losing steadily', icon: 'trending-down' };
  return { dir: 'up', color: ORANGE, label: 'Gaining', icon: 'trending-up' };
}

function formatChange(diff) {
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}kg`;
}

export default function BodyCompositionTimeline({ style }) {
  const { colors } = useTheme();
  const { gymId, memberId } = useAuth();
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gymId || !memberId) { setLoading(false); return; }
    api.get(`/gyms/${gymId}/members/${memberId}/health/weight?limit=30`)
      .then(res => setEntries(res.data || res))
      .catch(() => setEntries(null))
      .finally(() => setLoading(false));
  }, [gymId, memberId]);

  if (loading) return null;
  if (!entries || entries.length < 2) return null;

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const weights = sorted.map(e => e.weight);
  const first = weights[0];
  const last = weights[weights.length - 1];
  const change = last - first;
  const trend = getTrend(first, last);

  // Chart dimensions
  const W = 300;
  const H = 120;
  const PAD = { top: 12, bottom: 24, left: 8, right: 8 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  const points = sorted.map((e, i) => {
    const x = PAD.left + (i / (sorted.length - 1)) * cW;
    const y = PAD.top + cH - ((e.weight - minW) / range) * cH;
    return { x, y, weight: e.weight };
  });
  const polyStr = points.map(p => `${p.x},${p.y}`).join(' ');

  // Milestone markers — crossing a round 5kg boundary
  const milestones = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = Math.ceil(weights[i - 1] / 5) * 5;
    const curr = Math.ceil(weights[i] / 5) * 5;
    if (prev !== curr) milestones.push(i);
  }

  // Date labels: first, middle, last
  const fmt = d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; };
  const midIdx = Math.floor(sorted.length / 2);
  const dateLabels = [
    { idx: 0, label: fmt(sorted[0].date) },
    { idx: midIdx, label: fmt(sorted[midIdx].date) },
    { idx: sorted.length - 1, label: fmt(sorted[sorted.length - 1].date) },
  ];

  const renderChart = () => {
    if (!Svg) return null;
    return (
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <Line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={COLORS.border} strokeWidth={1} />
        <Polyline points={polyStr} fill="none" stroke={trend.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {milestones.map(i => (
          <SvgCircle key={i} cx={points[i].x} cy={points[i].y} r={4} fill={ACCENT} stroke={COLORS.bg} strokeWidth={2} />
        ))}
        <SvgCircle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4.5} fill={trend.color} stroke={COLORS.bg} strokeWidth={2} />
        {dateLabels.map(({ idx, label }) => (
          <SvgText key={idx} x={points[idx].x} y={H - 4} fill={COLORS.textSec} fontSize={9} textAnchor="middle" fontFamily={FONT.numRegular}>
            {label}
          </SvgText>
        ))}
      </Svg>
    );
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topBorder} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>Body Composition</Text>
          <View style={[styles.badge, { backgroundColor: trend.color + '18' }]}>
            <Feather name={trend.icon} size={13} color={trend.color} />
          </View>
        </View>

        {renderChart()}

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>{last.toFixed(1)}<Text style={styles.statUnit}> kg</Text></Text>
          </View>
          <View style={styles.changeBadge}>
            <Feather name={change <= 0 ? 'arrow-down' : 'arrow-up'} size={13} color={trend.color} />
            <Text style={[styles.changeText, { color: trend.color }]}>{formatChange(change)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statLabel}>Trend</Text>
            <Text style={[styles.trendText, { color: trend.color }]}>{trend.label}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    overflow: 'hidden',
  },
  topBorder: {
    height: 3,
    backgroundColor: ACCENT,
    borderTopLeftRadius: ELITE_CARD.borderRadius,
    borderTopRightRadius: ELITE_CARD.borderRadius,
  },
  inner: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 4,
  },
  title: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    color: COLORS.text,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: SPACING.sm + 4,
  },
  statLabel: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textSec,
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FONT.numBold,
    fontSize: 22,
    color: COLORS.text,
  },
  statUnit: {
    fontFamily: FONT.numRegular,
    fontSize: 13,
    color: COLORS.textSec,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  changeText: {
    fontFamily: FONT.numSemibold,
    fontSize: 13,
  },
  trendText: {
    fontFamily: FONT.semibold,
    fontSize: 13,
  },
});
