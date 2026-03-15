'use client';
// lib/sync/multi-device.js — JARVIS v10.9 Multi-Device Sync
// Safe: works without Supabase (degrades gracefully)

import { useEffect, useRef, useCallback } from 'react';

function getDeviceId() {
  try {
    let id = sessionStorage.getItem('jarvis_device_id');
    if (!id) {
      id = `device_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('jarvis_device_id', id);
    }
    return id;
  } catch { return 'device_local'; }
}

export function useMultiDeviceSync({ userId, conversationId, onNewMessage, onRemoteTyping, enabled = true }) {
  const channelRef = useRef(null);
  const deviceId   = useRef(getDeviceId());

  // Broadcast typing — safe noop if no channel
  const broadcastTyping = useCallback((isTyping) => {
    try { channelRef.current?.send?.({ type:'broadcast', event:'typing', payload:{ deviceId: deviceId.current, isTyping, userId } }); } catch {}
  }, [userId]);

  // Broadcast message — safe noop if no channel
  const broadcastMessage = useCallback((message) => {
    try { channelRef.current?.send?.({ type:'broadcast', event:'new_message', payload:{ deviceId: deviceId.current, message } }); } catch {}
  }, []);

  useEffect(() => {
    if (!userId || !enabled) return;

    // Try to setup Supabase Realtime — if fails, silently skip
    let cleanup = () => {};
    (async () => {
      try {
        const { getSupabaseBrowser, SUPABASE_ENABLED } = await import('../db/supabase');
        if (!SUPABASE_ENABLED) return; // No Supabase — skip, no crash

        const sb = getSupabaseBrowser();
        const channelName = `jarvis_sync_${userId}${conversationId ? `_${conversationId}` : ''}`;
        const channel = sb.channel(channelName, { config: { broadcast: { self: false } } });

        channel
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (payload?.deviceId !== deviceId.current) onRemoteTyping?.(payload?.isTyping, payload?.deviceId);
          })
          .on('broadcast', { event: 'new_message' }, ({ payload }) => {
            if (payload?.deviceId !== deviceId.current) onNewMessage?.(payload?.message);
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') channelRef.current = channel;
          });

        cleanup = () => {
          try { sb.removeChannel(channel); } catch {}
          channelRef.current = null;
        };
      } catch { /* Supabase unavailable — silent */ }
    })();

    return () => cleanup();
  }, [userId, conversationId, enabled]);

  return { broadcastMessage, broadcastTyping };
}

// Remote typing indicator component
export function RemoteTypingIndicator({ isTyping }) {
  if (!isTyping) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
      </div>
      <span>Dusre device pe type ho raha hai...</span>
    </div>
  );
}
