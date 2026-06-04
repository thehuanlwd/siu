import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const LOADING_PULSES = [
  "Collating release logs...",
  "Reading version records...",
  "Querying version displacement map...",
  "Extracting semantic differences...",
  "Analyzing safety index metrics...",
  "Synthesizing breaking API changes...",
  "Auditing vulnerabilities using Gemini...",
  "Compiling comprehensive verdict report..."
];

interface LoaderProps {
  repoName?: string;
  currentVersion?: string;
  latestVersion?: string;
  statusMessage?: string;
}

export default function Loader({ repoName = "selected repository", currentVersion, latestVersion, statusMessage }: LoaderProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < LOADING_PULSES.length - 1 ? prev + 1 : prev));
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="editorial-loader" className="flex flex-col items-center justify-center py-20 px-8 text-center max-w-lg mx-auto min-h-[400px] animate-fade-in select-none">
      {/* Editorial Bar Loader */}
      <div className="w-72 h-[2px] bg-ui-border relative overflow-hidden mb-8">
        <motion.div
          className="absolute h-full bg-charcoal"
          initial={{ left: "-30%", width: "30%" }}
          animate={{ 
            left: ["-30%", "110%"],
            width: ["30%", "40%", "30%"]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-3"
        >
          <h2 className="font-serif italic text-3xl font-bold tracking-tight text-charcoal">
            {statusMessage || LOADING_PULSES[step]}
          </h2>
          
          <p className="text-[10px] uppercase tracking-[0.25em] text-charcoal/40 font-extrabold">
            Analyzing {repoName} {currentVersion ? `from version ${currentVersion}` : ''}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Decorative typographic element */}
      <div className="mt-12 pt-6 border-t border-ui-border-light w-full flex justify-between items-center text-[9px] font-mono tracking-tighter text-charcoal/40">
        <span>SIU ENGINE DEPLOYED [3.5-FLASH]</span>
        <span>SCAN STATUS: ACTIVE</span>
      </div>
    </div>
  );
}
