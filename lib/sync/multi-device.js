'use client';
// lib/sync/multi-device.js — No-op version (Supabase removed)
import { useCallback } from 'react';

export function useMultiDeviceSync({ userId, conversationId, onNewMessage, onRemoteTyping, enabled = true }) {
  const broadcastTyping = useCallback(() => {}, []);
  const broadcastMessage = useCallback(() => {}, []);
  return { broadcastMessage, broadcastTyping };
}

export function RemoteTypingIndicator({ isTyping }) {
  return null;
}
