import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * Cinematic Radar HUD with concentric rings, sweep line, grid, and target blip
 */
export default function RadarHUD({
  bearing = 0,
  distance = 0,
  maxRange = 500,
  proximityState,
  signalStrength = 0,
  isActive = false,
  hasCompass = false,
  deviceHeading = 0,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const sweepAngle = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const size = Math.min(canvas.parentElement.offsetWidth, 400);
    canvas.width = size * 2; // Retina
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(2, 2);

    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size / 2 - 20;

    function drawFrame() {
      ctx.clearRect(0, 0, size, size);

      // Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      bgGrad.addColorStop(0, 'rgba(0, 20, 30, 0.9)');
      bgGrad.addColorStop(1, 'rgba(0, 10, 20, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius + 10, 0, Math.PI * 2);
      ctx.fill();

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.05)';
      ctx.lineWidth = 0.5;
      for (let i = -maxRadius; i <= maxRadius; i += 20) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy - maxRadius);
        ctx.lineTo(cx + i, cy + maxRadius);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy + i);
        ctx.lineTo(cx + maxRadius, cy + i);
        ctx.stroke();
      }

      // Concentric rings
      const rings = [0.25, 0.5, 0.75, 1.0];
      rings.forEach((r) => {
        const radius = maxRadius * r;
        ctx.strokeStyle = `rgba(0, 255, 200, ${0.08 + r * 0.05})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Cross hairs
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.stroke();

      // Cardinal labels
      ctx.fillStyle = 'rgba(0, 255, 200, 0.4)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';

      // If we have compass, rotate labels
      const labelOffset = hasCompass ? -deviceHeading : 0;
      const cardinals = [
        { label: 'N', angle: 0 },
        { label: 'E', angle: 90 },
        { label: 'S', angle: 180 },
        { label: 'W', angle: 270 },
      ];

      cardinals.forEach(({ label, angle }) => {
        const rad = ((angle + labelOffset - 90) * Math.PI) / 180;
        const lx = cx + (maxRadius + 12) * Math.cos(rad);
        const ly = cy + (maxRadius + 12) * Math.sin(rad);
        ctx.fillText(label, lx, ly + 4);
      });

      // Sweep line
      if (isActive) {
        sweepAngle.current = (sweepAngle.current + 1.5) % 360;
        const sweepRad = (sweepAngle.current * Math.PI) / 180;

        // Sweep glow
        const sweepGrad = ctx.createConicalGradient
          ? null
          : null; // Fallback

        // Draw sweep arc trail
        for (let i = 0; i < 30; i++) {
          const trailAngle = sweepRad - (i * Math.PI) / 180;
          const alpha = (30 - i) / 30;
          ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * 0.15})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(
            cx + maxRadius * Math.cos(trailAngle),
            cy + maxRadius * Math.sin(trailAngle)
          );
          ctx.stroke();
        }

        // Main sweep line
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + maxRadius * Math.cos(sweepRad),
          cy + maxRadius * Math.sin(sweepRad)
        );
        ctx.stroke();
      }

      // Target blip
      if (isActive && distance > 0) {
        const clampedDist = Math.min(distance, maxRange);
        const blipRadius = (clampedDist / maxRange) * maxRadius * 0.85;

        // Bearing relative to device or north
        const effectiveBearing = hasCompass ? bearing - deviceHeading : bearing;
        const blipAngle = ((effectiveBearing - 90) * Math.PI) / 180;

        const bx = cx + blipRadius * Math.cos(blipAngle);
        const by = cy + blipRadius * Math.sin(blipAngle);

        // Blip glow
        const glowColor = proximityState?.color || '#00ffcc';
        const glowGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 15);
        glowGrad.addColorStop(0, glowColor);
        glowGrad.addColorStop(0.5, glowColor + '60');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 15, 0, Math.PI * 2);
        ctx.fill();

        // Blip dot
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing ring around blip
        const pulsePhase = (Date.now() / (proximityState?.pulseSpeed * 1000 || 2000)) % 1;
        const pulseRadius = 5 + pulsePhase * 15;
        ctx.strokeStyle = glowColor + Math.round((1 - pulsePhase) * 100).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center dot (tracker position)
      ctx.fillStyle = 'rgba(0, 255, 200, 0.8)';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring glow
      const outerGrad = ctx.createRadialGradient(cx, cy, maxRadius - 5, cx, cy, maxRadius + 5);
      outerGrad.addColorStop(0, 'transparent');
      outerGrad.addColorStop(0.5, 'rgba(0, 255, 200, 0.1)');
      outerGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = outerGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
      ctx.stroke();

      animRef.current = requestAnimationFrame(drawFrame);
    }

    drawFrame();

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [bearing, distance, maxRange, proximityState, signalStrength, isActive, hasCompass, deviceHeading]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative flex items-center justify-center"
    >
      {/* Outer glow ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: '105%',
          height: '105%',
          background: `radial-gradient(circle, transparent 45%, ${proximityState?.color || '#00ffcc'}10 70%, transparent 75%)`,
          filter: 'blur(10px)',
        }}
      />
      <canvas ref={canvasRef} className="relative z-10" />
    </motion.div>
  );
}
