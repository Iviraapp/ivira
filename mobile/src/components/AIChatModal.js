import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { FONT, SPACING, RADIUS } from '../lib/theme'
import api from '../lib/api'

// ── Typing indicator with bouncing dots ──────────────────────────

function TypingIndicator({ colors }) {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animate = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    const a1 = animate(dot1, 0)
    const a2 = animate(dot2, 150)
    const a3 = animate(dot3, 300)
    a1.start()
    a2.start()
    a3.start()
    return () => { a1.stop(); a2.stop(); a3.stop() }
  }, [])

  return (
    <View style={[styles.aiBubble, { backgroundColor: colors.bgTer, borderColor: colors.border }]}>
      <View style={styles.typingRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { backgroundColor: colors.textSec, transform: [{ translateY: dot }] },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

// ── AI avatar ────────────────────────────────────────────────────

function AIAvatar({ colors }) {
  return (
    <View style={[styles.aiAvatar, { backgroundColor: colors.accent }]}>
      <Text style={styles.aiAvatarIcon}>✨</Text>
    </View>
  )
}

// ── Main modal component ─────────────────────────────────────────

export default function AIChatModal({ visible, onClose }) {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'ai',
      text: "Hey! I'm your AI fitness coach. Ask me anything about workouts, nutrition, recovery, or your fitness goals. 🙌",
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const userMsg = { id: Date.now().toString(), role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)
    scrollToBottom()
    Keyboard.dismiss()

    try {
      // Build conversation history for context (last 16 messages)
      const history = messages
        .filter(m => m.id !== '1') // skip welcome message
        .slice(-16)
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        }))

      const res = await api.post('/ai/coach', {
        message: trimmed,
        history,
      })

      const aiText = res.data?.reply || 'Sorry, I could not generate a response. Please try again.'
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'ai', text: aiText }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const errorText = err.response?.data?.message
        || 'AI Coach is temporarily unavailable. Please check your connection and try again.'
      const aiMsg = { id: (Date.now() + 1).toString(), role: 'ai', text: errorText }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsTyping(false)
      scrollToBottom()
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kvWrapper}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIcon, { backgroundColor: colors.accentSoft }]}>
                  <Text style={styles.headerIconText}>✨</Text>
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>IVIRA AI Coach</Text>
                  <Text style={[styles.headerSub, { color: colors.textSec }]}>Always ready to help</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.bgTer }]}>
                <Feather name="x" size={20} color={colors.textSec} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={scrollToBottom}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.role === 'user' ? styles.messageRowUser : styles.messageRowAI,
                  ]}
                >
                  {msg.role === 'ai' && <AIAvatar colors={colors} />}
                  <View
                    style={
                      msg.role === 'ai'
                        ? [styles.aiBubble, { backgroundColor: colors.bgTer, borderColor: colors.border }]
                        : [styles.userBubble, { backgroundColor: colors.accent }]
                    }
                  >
                    <Text
                      style={[
                        styles.messageText,
                        { color: msg.role === 'ai' ? colors.text : '#FFFFFF' },
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}
              {isTyping && (
                <View style={[styles.messageRow, styles.messageRowAI]}>
                  <AIAvatar colors={colors} />
                  <TypingIndicator colors={colors} />
                </View>
              )}
            </ScrollView>

            {/* Disclaimer */}
            <View style={styles.disclaimerRow}>
              <Feather name="info" size={10} color={colors.textTer} />
              <Text style={[styles.disclaimerText, { color: colors.textTer }]}>
                Not medical advice. Consult a doctor for health concerns.
              </Text>
            </View>

            {/* Input bar */}
            <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.bg, paddingBottom: Math.max(insets.bottom, 14) }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgTer,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Ask about workouts, diet, recovery..."
                placeholderTextColor={colors.textTer}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                onPress={handleSend}
                style={[
                  styles.sendBtn,
                  { backgroundColor: input.trim() ? colors.accent : colors.bgTer },
                ]}
                disabled={!input.trim() || isTyping}
                activeOpacity={0.7}
              >
                <Feather name="send" size={18} color={input.trim() ? '#FFFFFF' : colors.textTer} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  kvWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONT.semibold,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: FONT.regular,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },

  // AI avatar
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  aiAvatarIcon: {
    fontSize: 13,
  },

  // Bubbles
  aiBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  userBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14.5,
    fontFamily: FONT.regular,
    lineHeight: 21,
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // Disclaimer
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  disclaimerText: {
    fontSize: 10,
    fontFamily: FONT.regular,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: FONT.regular,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
