/**
 * Wallet Balance Widget — shows credit balance with last transaction.
 * Fetches from wallet API and displays a compact card.
 */
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { COLORS, SPACING, RADIUS, FONT, ELITE_CARD } from '../lib/theme'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function WalletWidget({ style, onPress }) {
  const { colors } = useTheme()
  const { gymId, member } = useAuth()
  const [wallet, setWallet] = useState(null)

  useEffect(() => {
    if (!gymId || !member?.id) return
    api.get(`/gyms/${gymId}/members/${member.id}/wallet`)
      .then(res => {
        const w = res.data?.wallet || res.data
        if (w) setWallet(w)
      })
      .catch(() => {})
  }, [gymId, member?.id])

  if (!wallet) return null

  const balance = (wallet.balance_paise || 0) / 100
  const lastTx = wallet.transactions?.[0]
  const lastTxDesc = lastTx?.description || null

  return (
    <TouchableOpacity
      style={[styles.container, ELITE_CARD, { borderTopWidth: 3, borderTopColor: '#F59E0B' }, style]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Feather name="credit-card" size={16} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.textSec }]}>Wallet Balance</Text>
        <Feather name="chevron-right" size={16} color={colors.textTer} />
      </View>
      <Text style={[styles.balance, { color: colors.text }]}>
        {'\u20B9'}{balance.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
      </Text>
      {lastTxDesc && (
        <Text style={[styles.lastTx, { color: colors.textTer }]} numberOfLines={1}>
          Last: {lastTxDesc}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT.semibold,
    flex: 1,
  },
  balance: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT.numExtraBold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  lastTx: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 4,
  },
})
