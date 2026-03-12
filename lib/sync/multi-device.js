'use client';
// lib/sync/multi-device.js
// ══════════════════════════════════════════════════════════════
// JARVIS Multi-Device Real-Time Sync
// Phone + Laptop + Tablet → sab ek saath sync
// Uses Supabase Realtime (FREE tier: 200 concurrent connections)
//
// Features:
// - New message → dusre device pe instantly dikhe
// - Settings change → everywhere reflect ho
// - Typing indicator → cross-device
// - Read status sync
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { getSupabaseBrowser } from '../db/supabase';

// ─── DEVICE ID ────────────────────────────────────────────────
function getDeviceId() {
  let id = sessionStorage.getItem('jarvis_device_id');
  if (!id) {
    id = `device_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('jarvis_device_id', id);
  }
  return id;
}

// ─── SYNC HOOK ────────────────────────────────────────────────
export function useMultiDeviceSync({
  userId,
  conversationId,
  onNewMessage,
  onRemoteTyping,
  enabled = true,
}) {
  const channelRef = useRef(null);
  const deviceId = useRef(getDeviceId());
  const sb = getSupabaseBrowser();

  const broadcastTyping = useCallback((isTyping) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { deviceId: deviceId.current, isTyping, userId },
    });
  }, [userId]);

  const broadcastMessage = useCallback((message) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'new_message',
      payload: { deviceId: deviceId.current, message },
    });
  }, []);

  useEffect(() => {
    if (!userId || !enabled || !sb) return;

    const channelName = `jarvis_sync_${userId}${conversationId ? `_${conversationId}` : ''}`;

    // Create realtime channel
    const channel = sb.channel(channelName, {
      config: { broadcast: { self: false } }, // Don't receive own messages
    });

    // Listen for typing events from other devices
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.deviceId !== deviceId.current) {
        onRemoteTyping?.(payload.isTyping, payload.deviceId);
      }
    });

    // Listen for new messages from other devices
    channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      if (payload.deviceId !== deviceId.current) {
        onNewMessage?.(payload.message);
      }
    });

    // Listen for DB changes (new messages saved to Supabase)
    if (conversationId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new && payload.new.source_device !== deviceId.current) {
            onNewMessage?.(payload.new);
          }
        }
      );
    }

    // Subscribe and announce presence
    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Announce this device
          channel.track({
            deviceId: deviceId.current,
            onlineAt: new Date().toISOString(),
            userId,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, conversationId, enabled]);

  return { broadcastTyping, broadcastMessage, deviceId: deviceId.current };
}

// ─── CROSS-DEVICE INDICATOR (small dot) ───────────────────────
export function RemoteTypingIndicator({ isTyping }) {
  if (!isTyping) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-slate-600">
      <span>Dusre device pe typing...</span>
      <div className="flex gap-0.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full bg-slate-600 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}/>
        ))}
      </div>
    </div>
  );
}
