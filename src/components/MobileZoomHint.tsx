import React, { useState, useEffect } from 'react';
import { Info, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MobileZoomHint: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile screens
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        // Check if user has already dismissed it
        const dismissed = localStorage.getItem('zoom-hint-dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('zoom-hint-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-lotofacil-purple text-white overflow-hidden"
        >
          <div className="px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ZoomIn size={14} className="text-lotofacil-yellow" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                Dica: Use o zoom do navegador para ajustar a visualização se necessário.
              </p>
            </div>
            <button 
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded-full transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileZoomHint;
