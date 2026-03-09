export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(26,86,219,0.4)]">
        <span className="text-white font-black text-3xl">J</span>
      </div>
      <h1 className="text-2xl font-black text-white">Offline Mode</h1>
      <p className="text-slate-400 text-sm max-w-xs">JARVIS abhi offline hai. Internet connection check karo — wapas connect hone par sab automatically resume ho jaayega.</p>
      <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm">Retry Connection</button>
    </div>
  );
}
