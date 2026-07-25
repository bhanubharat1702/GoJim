'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

const images = [
  { id: 1, url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop', rot: -6, z: 10, y: 10 },
  { id: 2, url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop', rot: 4, z: 20, y: -15 },
  { id: 3, url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop', rot: -3, z: 15, y: 20 },
  { id: 4, url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop', rot: 7, z: 25, y: -5 },
  { id: 5, url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop', rot: -5, z: 12, y: 15 },
  { id: 6, url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=600&auto=format&fit=crop', rot: 8, z: 30, y: -20 },
  { id: 7, url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmphyxxdI3hDmKJfg6SofhweP2uhma3Ni1qQ&s', rot: -4, z: 22, y: 5 },
  { id: 8, url: 'https://t3.ftcdn.net/jpg/02/10/17/94/360_F_210179424_mTLrEUOv1bbiYHW7kGjq2xRmr73rfcGI.jpg', rot: 6, z: 18, y: 25 },
  { id: 9, url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=600&auto=format&fit=crop', rot: -7, z: 14, y: -10 },
];

export default function ImageCollage() {
  const [hoveredImg, setHoveredImg] = useState(null);
  const hoveredImgRef = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const width = 320;
      const height = 320;
      const padding = 25;

      // Use the ref to get the latest hovered image without triggering effect re-runs
      const currentImg = hoveredImgRef.current;
      const id = currentImg?.id || 0;
      const preferLeft = id % 2 === 0;
      const preferTop = id % 3 === 0;

      let x = preferLeft ? e.clientX - width - padding : e.clientX + padding;
      let y = preferTop ? e.clientY - height - padding : e.clientY + padding;

      // Boundary Checks: Flip if it goes off screen
      if (x + width > window.innerWidth) x = e.clientX - width - padding;
      if (x < 0) x = e.clientX + padding;

      if (y + height > window.innerHeight) y = e.clientY - height - padding;
      if (y < 0) y = e.clientY + padding;

      // Final clamping for small viewports
      x = Math.max(10, Math.min(x, window.innerWidth - width - 10));
      y = Math.max(10, Math.min(y, window.innerHeight - height - 10));

      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section className="py-24 w-full relative z-10 bg-bg-primary overflow-hidden border-t border-white/5 hidden md:block">

      {/* Title */}
      <div className="text-center mb-16 relative z-20 px-4">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-text-primary">
          Inside Our Facilities
        </h2>
        <p className="text-[#888888] text-[14px] md:text-[15px] max-w-2xl mx-auto font-medium leading-relaxed">
          Hover over the photos below to take a closer look at where the magic happens.
        </p>
      </div>

      <div className="flex justify-center items-center max-w-[100vw] py-16 px-8 relative">
        {images.map((img, index) => (
          <motion.div
            key={img.id}
            onMouseEnter={() => {
              setHoveredImg(img);
              hoveredImgRef.current = img;
            }}
            onMouseLeave={() => {
              setHoveredImg(null);
              hoveredImgRef.current = null;
            }}
            initial={{ rotate: img.rot, y: img.y }}
            whileHover={{
              rotate: [img.rot, img.rot - 3, img.rot + 3, img.rot - 3, img.rot + 3, img.rot - 3, img.rot + 3, img.rot],
              transition: { duration: 0.7, ease: "easeInOut" }
            }}
            className={`relative w-[220px] h-[280px] shrink-0 cursor-crosshair ${index === 0 ? '' : '-ml-20'}`}
            style={{ zIndex: img.z }}
          >
            <div className="w-full h-full border-[6px] border-[#e5e5e5] shadow-2xl overflow-hidden group rounded-sm">
              <img src={img.url} alt="Gym Facility" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-75 group-hover:brightness-100" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating Cursor Portal */}
      <AnimatePresence>
        {hoveredImg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 pointer-events-none z-[100] overflow-hidden border-[8px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm"
            style={{
              x: mouseX,
              y: mouseY,
              width: 320,
              height: 320
            }}
          >
            <img src={hoveredImg.url} alt="Enlarged Gym" className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
