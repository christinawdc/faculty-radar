import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Animated terminal text with typewriter effect
 */
export default function TerminalText({
  lines = [],
  speed = 40,
  lineDelay = 300,
  onComplete,
  className = '',
  showCursor = true,
}) {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (currentLine >= lines.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const line = lines[currentLine];

    if (currentChar < line.text.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const updated = [...prev];
          if (updated.length <= currentLine) {
            updated.push({ ...line, text: '' });
          }
          updated[currentLine] = {
            ...line,
            text: line.text.substring(0, currentChar + 1),
          };
          return updated;
        });
        setCurrentChar((c) => c + 1);
      }, speed + Math.random() * 20); // Slight randomness for realism

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, lineDelay);

      return () => clearTimeout(timer);
    }
  }, [currentLine, currentChar, lines, speed, lineDelay, onComplete]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines]);

  return (
    <div
      ref={containerRef}
      className={`font-mono text-sm md:text-base space-y-1 ${className}`}
    >
      {displayedLines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          {line.prefix && (
            <span className="text-emerald-400/60 select-none">{line.prefix}</span>
          )}
          <span
            className={`${
              line.status === 'success'
                ? 'text-emerald-400'
                : line.status === 'warning'
                ? 'text-amber-400'
                : line.status === 'error'
                ? 'text-red-400'
                : line.status === 'info'
                ? 'text-cyan-400'
                : 'text-gray-300'
            }`}
          >
            {line.text}
          </span>
          {line.status === 'success' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-emerald-400"
            >
              ✓
            </motion.span>
          )}
          {line.status === 'error' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-red-400"
            >
              ✗
            </motion.span>
          )}
          {/* Blinking cursor on current line */}
          {showCursor && i === displayedLines.length - 1 && !isComplete && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-emerald-400 font-bold"
            >
              █
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
