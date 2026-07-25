'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Typewriter3D = ({ 
  words, 
  typingSpeed = 100, 
  deletingSpeed = 60, 
  pauseBeforeDelete = 2000,
  className 
}) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Use a ref to keep track of the current word to avoid dependency issues with the 'words' array
  const wordsRef = React.useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    const currentWord = wordsRef.current[index];

    const handleStep = () => {
      // Case: Typing
      if (!reverse && subIndex < currentWord.length) {
        setSubIndex((prev) => prev + 1);
      } 
      // Case: Finished typing, start pause
      else if (!reverse && subIndex === currentWord.length) {
        setIsPaused(true);
        setTimeout(() => {
          setReverse(true);
          setIsPaused(false);
        }, pauseBeforeDelete);
      } 
      // Case: Deleting
      else if (reverse && subIndex > 0) {
        setSubIndex((prev) => prev - 1);
      } 
      // Case: Finished deleting, move to next word
      else if (reverse && subIndex === 0) {
        setReverse(false);
        setIndex((prev) => (prev + 1) % wordsRef.current.length);
      }
    };

    if (isPaused) return;

    const timeout = setTimeout(
      handleStep, 
      reverse ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, isPaused, typingSpeed, deletingSpeed, pauseBeforeDelete]);

  const displayedChars = wordsRef.current[index].substring(0, subIndex).split('');

  return (
    <div className={`inline-flex items-center min-h-[1.2em] relative ${className}`} style={{ minHeight: '1.2em' }}>
      <div className="flex relative items-center">
        <span className="select-none pointer-events-none w-0 opacity-0">&#x200B;</span>
        <AnimatePresence mode="wait">
          <div className="flex items-center" key={index}>
            <span className="select-none pointer-events-none w-0 opacity-0">&#x200B;</span>
            <AnimatePresence mode="popLayout">
              {displayedChars.map((char, i) => (
                <motion.span
                  key={`${index}-${i}-${char}`}
                  initial={{ 
                    rotateY: 90, 
                    opacity: 0, 
                    filter: 'blur(8px)',
                    z: -40 
                  }}
                  animate={{ 
                    rotateY: 0, 
                    opacity: 1, 
                    filter: 'blur(0px)',
                    z: 0
                  }}
                  exit={{ 
                    rotateY: -90, 
                    opacity: 0, 
                    filter: 'blur(8px)',
                    z: -40 
                  }}
                  transition={{ 
                    duration: 0.2,
                    ease: "easeOut"
                  }}
                  className="inline-block whitespace-pre perspective-1000"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </AnimatePresence>

        {/* Cursor Dot */}
        <motion.div
          animate={{
            backgroundColor: reverse ? 'var(--danger)' : 'var(--primary)',
            scale: isPaused ? [1, 1.4, 1] : 1,
          }}
          transition={{
            backgroundColor: { 
              duration: 1, 
              repeat: reverse ? 0 : Infinity, 
              repeatType: 'reverse' 
            },
            scale: { 
              duration: 0.6, 
              repeat: isPaused ? Infinity : 0 
            }
          }}
          className="w-2.5 h-2.5 rounded-full ml-1.5 self-center relative z-20 shadow-lg shadow-accent/30"
        />
      </div>
    </div>
  );
};
