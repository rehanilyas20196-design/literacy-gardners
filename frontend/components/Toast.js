'use client';

import { useEffect, useState } from 'react';

export default function Toast() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let timer;
    function onToast(e) {
      setMsg(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(''), 2800);
    }
    window.addEventListener('lg-toast', onToast);
    return () => {
      window.removeEventListener('lg-toast', onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[300] -translate-x-1/2 rounded-full bg-ink text-white text-sm font-medium px-6 py-3.5 border border-border transition-transform duration-300 pointer-events-none ${
        msg ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
      }`}
      role="status"
    >
      {msg}
    </div>
  );
}
