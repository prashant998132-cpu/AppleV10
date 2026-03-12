// lib/ai/self-learning.js
// ══════════════════════════════════════════════════════════════
// JARVIS Self-Learning Engine
// Thumbs up → reinforce pattern
// Thumbs down → learn correction, adjust behavior
// Stores patterns in Supabase memories table (no extra DB)
// ══════════════════════════════════════════════════════════════

// ─── ANALYZE WHAT MADE A RESPONSE GOOD/BAD ───────────────────
export function analyzeResponsePattern(userMessage, botReply, rating) {
  const msg = userMessage.toLowerCase();
  const reply = botReply.toLowerCase();

  const patterns = {
    length: reply.split(' ').length < 50 ? 'short' : reply.split(' ').length < 150 ? 'medium' : 'long',
    hasCode: /```/.test(botReply),
    hasList: /\n[-•]|\n\d+\./.test(botReply),
    hasEmoji: /[\u{1F300}-\u{1F9FF}]/u.test(botReply),
    language: /[अ-ह]/.test(msg) ? 'hindi' : /hinglish|bhai|yaar|kya|hai|nahi/i.test(msg) ? 'hinglish' : 'english',
    intent: msg.includes('code') || msg.includes('fix') ? 'coding'
          : msg.includes('sad') || msg.includes('dukhi') ? 'emotional'
          : msg.includes('study') || msg.includes('padhai') ? 'study'
          : 'general',
  };

  return {
    rating,
    patterns,
    key: `feedback_pattern_${patterns.intent}_${patterns.length}`,
    value: JSON.stringify({ ...patterns, rating, learnedAt: new Date().toISOString() }),
    category: 'feedback',
    importance: rating === 'up' ? 5 : 8, // bad feedback = more important to remember
  };
}

// ─── BUILD LEARNING CONTEXT ───────────────────────────────────
// Reads past feedback patterns and adds to system prompt
export function buildLearningContext(feedbackMemories) {
  if (!feedbackMemories?.length) return '';

  const upPatterns = feedbackMemories
    .filter(m => {
      try { return JSON.parse(m.value).rating === 'up'; } catch { return false; }
    })
    .map(m => {
      try { return JSON.parse(m.value); } catch { return null; }
    })
    .filter(Boolean)
    .slice(-5);

  const downPatterns = feedbackMemories
    .filter(m => {
      try { return JSON.parse(m.value).rating === 'down'; } catch { return false; }
    })
    .map(m => {
      try { return JSON.parse(m.value); } catch { return null; }
    })
    .filter(Boolean)
    .slice(-5);

  const lines = [];

  if (upPatterns.length) {
    const preferShort = upPatterns.filter(p => p.patterns?.length === 'short').length;
    const preferLong  = upPatterns.filter(p => p.patterns?.length === 'long').length;
    if (preferShort > preferLong) lines.push('User ko chhote, direct replies zyada pasand aate hain.');
    if (preferLong  > preferShort) lines.push('User ko detailed, thorough replies pasand aate hain.');
    if (upPatterns.filter(p => p.patterns?.hasEmoji).length > 2) lines.push('User ko emoji-rich replies pasand hain.');
    if (upPatterns.filter(p => p.patterns?.hasCode).length > 1) lines.push('User code snippets pe thumbs up deta hai — include karo.');
  }

  if (downPatterns.length) {
    const dislikeEmoji = downPatterns.filter(p => p.patterns?.hasEmoji).length;
    const dislikeList  = downPatterns.filter(p => p.patterns?.hasList).length;
    if (dislikeEmoji > 1) lines.push('User emoji zyada use karna pasand nahi karta.');
    if (dislikeList  > 1) lines.push('User bullet points se bore hota hai — prose mein reply karo.');
  }

  return lines.length
    ? `\n⚡ USER PREFERENCES (feedback se seekha):\n${lines.map(l => `• ${l}`).join('\n')}\n`
    : '';
}

// ─── SERVER SIDE: save feedback pattern as memory ─────────────
export async function saveLearningPattern(userId, userMessage, botReply, rating, db) {
  if (!userId || !userMessage || !botReply) return;

  const pattern = analyzeResponsePattern(userMessage, botReply, rating);

  try {
    // Check if similar pattern exists — update importance instead of duplicate
    const { data: existing } = await db
      .from('memories')
      .select('id, importance')
      .eq('user_id', userId)
      .eq('key', pattern.key)
      .single();

    if (existing) {
      await db.from('memories').update({
        value: pattern.value,
        importance: Math.min(10, (existing.importance || 5) + (rating === 'up' ? 1 : 2)),
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await db.from('memories').insert({
        user_id: userId,
        key: pattern.key,
        value: pattern.value,
        category: 'feedback',
        importance: pattern.importance,
        tags: ['feedback', 'learning', pattern.patterns.intent],
      });
    }
  } catch {}
}
