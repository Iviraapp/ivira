import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const ACCENT = '#EF4444';
const MACRO_COLORS = { protein: '#3B82F6', carbs: '#F59E0B', fat: '#EF4444' };
const GREEN = '#22C55E';
const AMBER = '#F59E0B';
const RED = '#EF4444';

function getDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fmt = (d) => d.toISOString().split('T')[0];
  return { from: fmt(from), to: fmt(to) };
}

function stdDev(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function generateInsights(avg, dailyCals, weightKg) {
  const insights = [];
  const proteinTarget = weightKg ? weightKg * 1.2 : 80;
  if (avg.protein < proteinTarget) {
    insights.push({ color: RED, text: `Protein is low \u2014 aim for ${Math.round(proteinTarget)}g/day` });
  } else {
    insights.push({ color: GREEN, text: 'Protein intake is on track' });
  }
  if (dailyCals.length > 1) {
    const sd = stdDev(dailyCals);
    if (sd > 500) {
      insights.push({ color: AMBER, text: 'Calorie intake is inconsistent' });
    } else {
      insights.push({ color: GREEN, text: 'Great calorie consistency' });
    }
  }
  const total = avg.protein * 4 + avg.carbs * 4 + avg.fat * 9;
  if (total > 0) {
    const pPct = (avg.protein * 4 / total) * 100;
    const cPct = (avg.carbs * 4 / total) * 100;
    const fPct = (avg.fat * 9 / total) * 100;
    const heavy = [
      { name: 'protein', pct: pPct }, { name: 'carbs', pct: cPct }, { name: 'fat', pct: fPct },
    ].find((m) => m.pct > 60);
    if (heavy) {
      insights.push({ color: AMBER, text: `Heavy on ${heavy.name} \u2014 try balancing` });
    } else if (pPct >= 20 && pPct <= 40 && cPct >= 20 && cPct <= 40 && fPct >= 20 && fPct <= 40) {
      insights.push({ color: GREEN, text: 'Well-balanced macros' });
    }
  }
  return insights.slice(0, 3);
}

export default function NutritionInsights({ style }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user?.gymId || !user?.memberId) return;
    const { from, to } = getDateRange();
    api.get(`/gyms/${user.gymId}/members/${user.memberId}/nutrition/daily?from=${from}&to=${to}`)
      .then((res) => setData(res))
      .catch(() => setData(null));
  }, [user?.gymId, user?.memberId]);

  const parsed = useMemo(() => {
    if (!data) return null;
    const entries = data.meals || (data.days?.map((d) => ({ date: d.date, ...d.totals })));
    if (!entries?.length) return null;
    const sums = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dailyCals = [];
    entries.forEach((e) => {
      sums.calories += e.calories || 0;
      sums.protein += e.protein || 0;
      sums.carbs += e.carbs || 0;
      sums.fat += e.fat || 0;
      dailyCals.push(e.calories || 0);
    });
    const n = entries.length;
    const avg = {
      calories: Math.round(sums.calories / n),
      protein: Math.round(sums.protein / n),
      carbs: Math.round(sums.carbs / n),
      fat: Math.round(sums.fat / n),
    };
    const total = avg.protein * 4 + avg.carbs * 4 + avg.fat * 9;
    const pct = total > 0
      ? { protein: (avg.protein * 4 / total) * 100, carbs: (avg.carbs * 4 / total) * 100, fat: (avg.fat * 9 / total) * 100 }
      : { protein: 33, carbs: 34, fat: 33 };
    const insights = generateInsights(avg, dailyCals, user?.weightKg);
    return { avg, pct, insights };
  }, [data, user?.weightKg]);

  if (!parsed) return null;
  const { avg, pct, insights } = parsed;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Icon name="zap" size={16} color={ACCENT} />
        <Text style={styles.title}>Nutrition Insights</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>This Week</Text>
        </View>
      </View>

      <Text style={styles.calLabel}>Avg Daily Calories</Text>
      <Text style={styles.calValue}>{avg.calories.toLocaleString()}</Text>

      <View style={styles.bar}>
        <View style={[styles.barSeg, { flex: pct.protein, backgroundColor: MACRO_COLORS.protein, borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }]} />
        <View style={[styles.barSeg, { flex: pct.carbs, backgroundColor: MACRO_COLORS.carbs }]} />
        <View style={[styles.barSeg, { flex: pct.fat, backgroundColor: MACRO_COLORS.fat, borderTopRightRadius: 3, borderBottomRightRadius: 3 }]} />
      </View>
      <View style={styles.macroRow}>
        <Text style={styles.macroLabel}>P: {avg.protein}g</Text>
        <Text style={styles.macroDivider}>|</Text>
        <Text style={styles.macroLabel}>C: {avg.carbs}g</Text>
        <Text style={styles.macroDivider}>|</Text>
        <Text style={styles.macroLabel}>F: {avg.fat}g</Text>
      </View>

      <View style={styles.insightList}>
        {insights.map((item, i) => (
          <View key={i} style={styles.insightRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.insightText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...ELITE_CARD,
    borderTopWidth: 3,
    borderTopColor: ACCENT,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  pill: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: FONT.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  calLabel: {
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  calValue: {
    fontFamily: FONT.bold,
    fontSize: 28,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  barSeg: { height: 6 },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  macroLabel: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  macroDivider: {
    color: COLORS.textTertiary,
    marginHorizontal: SPACING.sm,
    fontSize: 12,
  },
  insightList: { gap: SPACING.xs },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  insightText: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
