'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { Check, XCircle, Activity } from 'lucide-react';

const UIContext = createContext();

export function UIProvider({ children }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.alert = (msg) => {
        let type = 'warning';
        const lower = String(msg).toLowerCase();
        if (
          lower.includes('success') || 
          lower.includes('paid') || 
          lower.includes('done') || 
          lower.includes('recorded') ||
          lower.includes('saved') ||
          lower.includes('updated') ||
          lower.includes('created') ||
          lower.includes('deleted')
        ) {
          type = 'success';
        } else if (
          lower.includes('failed') || 
          lower.includes('error') || 
          lower.includes('required') || 
          lower.includes('fill') ||
          lower.includes('must') ||
          lower.includes('select') ||
          lower.includes('invalid')
        ) {
          type = 'error';
        }
        showToast(msg, type);
      };
    }
  }, []);

  return (
    <UIContext.Provider value={{ 
      isSettingsOpen, openSettings, closeSettings, showToast
    }}>
      {children}
      
      {/* Global Custom Styled Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-[400px]">
        {toasts.map(toast => {
          let borderClass = 'border-yellow-500/30 text-yellow-500';
          let bgClass = 'bg-[#0d0d0d]/95';
          if (toast.type === 'success') borderClass = 'border-success/30 text-success';
          if (toast.type === 'error') borderClass = 'border-danger/30 text-danger';

          return (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-start justify-between p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-bold uppercase tracking-wider text-[10px] backdrop-blur-md text-white border transition-all duration-300 transform scale-100 ${borderClass} ${bgClass}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'success' && <Check size={14} className="text-success" />}
                  {toast.type === 'warning' && <Activity size={14} className="text-yellow-500" />}
                  {toast.type === 'error' && <XCircle size={14} className="text-danger" />}
                </div>
                <span className="leading-relaxed break-words">{toast.message}</span>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} 
                className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer ml-4 shrink-0 text-white font-black text-xs"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};
