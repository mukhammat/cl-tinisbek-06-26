/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data';
import { FlaskConical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'nadeck_research_disclaimer_ack';

interface ResearchDisclaimerModalProps {
  currentLang: Language;
}

export default function ResearchDisclaimerModal({ currentLang }: ResearchDisclaimerModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      setIsOpen(true);
    }
  }, []);

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const handleAgree = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" id="research-disclaimer-wrapper">
          <motion.div
            id="research-disclaimer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            id="research-disclaimer-content"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10"
          >
            <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <FlaskConical className="w-6 h-6" />
              </div>
              <h2 id="research-disclaimer-title" className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                {t('researchDisclaimerTitle')}
              </h2>
            </div>

            <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
              <p id="research-disclaimer-body" className="text-xl lg:text-sm text-slate-600 leading-relaxed text-center whitespace-pre-line">
                {t('researchDisclaimerBody')}
              </p>
            </div>

            <div className="p-6 pt-2">
              <button
                id="btn-research-disclaimer-agree"
                onClick={handleAgree}
                className="w-full py-3.5 bg-nadeck-600 hover:bg-nadeck-700 text-white font-bold text-[15px] rounded-xl shadow-lg transition"
              >
                {t('researchDisclaimerAgreeBtn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
