'use client';
// app/share/page.jsx — Web Share Target Receiver
// Jab koi app "Share" kare aur JARVIS select kare — yahan aata hai
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, ExternalLink, MessageSquare, FileText, Image } from 'lucide-react';

export default function ShareTarget() {
  const [shared, setShared]   = useState(null);
  const [status, setStatus]   = useState('loading');
  const router = useRouter();

  useEffect(() => {
    // Parse shared data from URL params (Web Share Target POST → GET fallback)
    const url  = new URL(window.location.href);
    const text  = url.searchParams.get('text')  || '';
    const title = url.searchParams.get('title') || '';
    const sharedUrl = url.searchParams.get('url') || '';

    if (text || title || sharedUrl) {
      setShared({ text, title, url: sharedUrl });
      setStatus('received');

      // Auto-redirect to chat with shared content as message
      const msg = [title, text, sharedUrl].filter(Boolean).join('\n');
      setTimeout(() => {
        router.push(`/chat?shared=${encodeURIComponent(msg)}`);
      }, 1500);
    } else {
      setStatus('empty');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Share2 size={32} className="text-blue-400" />
        </div>

        {status === 'loading' && (
          <div>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/60 text-sm">Shared content load ho raha hai...</p>
          </div>
        )}

        {status === 'received' && shared && (
          <div>
            <h2 className="text-white text-xl font-bold mb-2">JARVIS ne receive kiya! ✅</h2>
            <p className="text-white/60 text-sm mb-4">JARVIS Chat mein bhej raha hoon...</p>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-left mb-4">
              {shared.title && <p className="text-blue-400 text-xs font-bold mb-1">{shared.title}</p>}
              {shared.text  && <p className="text-white text-sm">{shared.text}</p>}
              {shared.url   && <p className="text-cyan-400 text-xs mt-1 flex items-center gap-1"><ExternalLink size={10} />{shared.url}</p>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => router.push('/chat')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2">
                <MessageSquare size={16} /> JARVIS se baat karo
              </button>
            </div>
          </div>
        )}

        {status === 'empty' && (
          <div>
            <p className="text-white text-lg font-bold mb-2">Kuch share nahi hua</p>
            <p className="text-white/40 text-sm mb-4">Kisi bhi app se content share karo — JARVIS receive karega</p>
            <button onClick={() => router.push('/chat')}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm">
              JARVIS Chat kholो
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
