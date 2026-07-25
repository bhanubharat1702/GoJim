'use client';

import { useRef, useState } from 'react';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const row1 = [
  { name: 'John Cena', role: 'Gym Owner', text: "I've seen massive improvements in my gym's performance thanks to the expert trainers. Highly recommend!", avatar: '👨‍🦲', bg: 'bg-accent', rating: '4.9' },
  { name: 'Esther Howard', role: 'Gym Owner', text: "Great results from dedicated trainers! My gym has flourished.", avatar: '👵', bg: 'bg-[#fbcfe8]', rating: '4.9' },
  { name: 'Michael Smith', role: 'Fitness Enthusiast', text: "The app interface is clean and easy to navigate. Best investment for my gym.", avatar: '🧔', bg: 'bg-[#bae6fd]', rating: '4.8' },
  { name: 'Maria Gomez', role: 'Personal Trainer', text: "The trainers are dedicated and professional. My gym members love them!", avatar: '👩', bg: 'bg-[#fca5a5]', rating: '4.9' },
  { name: 'Devon Lane', role: 'Gym Manager', text: "Expert trainers who know their craft! Highly recommend for any gym", avatar: '👨', bg: 'bg-[#bbf7d0]', rating: '4.9' },
  { name: 'Robert Fox', role: 'CrossFit Coach', text: "The lead management tool helped me double my membership in 3 months.", avatar: '👨', bg: 'bg-[#fdba74]', rating: '5.0' },
];

const row2 = [
  { name: 'Sarah Connor', role: 'Gym Manager', text: "Tracking member attendance has never been easier. Love the automated alerts!", avatar: '👩‍🦰', bg: 'bg-[#fde047]', rating: '5.0' },
  { name: 'James Wilson', role: 'Gym Owner', text: "The revenue tracking features saved me hours of manual accounting.", avatar: '👨‍🦱', bg: 'bg-[#d8b4fe]', rating: '4.7' },
  { name: 'Lisa Ray', role: 'Yoga Instructor', text: "Managing my client schedules is a breeze now. Great support team too.", avatar: '👩‍🦱', bg: 'bg-[#7dd3fc]', rating: '4.9' },
  { name: 'David Lee', role: 'Gym Manager', text: "Excellent trainers, fantastic customer support. Couldn't ask for more!", avatar: '👨‍🦱', bg: 'bg-[#67e8f9]', rating: '4.9' },
  { name: 'Marvin McKinney', role: 'Fitness Coach', text: "The trainers have transformed my workout routine! I'm more motivated than ever", avatar: '🧔', bg: 'bg-[#fef08a]', rating: '4.9' },
  { name: 'Emily Chen', role: 'Gym Owner', text: "I've tried many platforms, but this one is by far the most intuitive.", avatar: '👩', bg: 'bg-[#ffedd5]', rating: '4.8' },
];

export default function Testimonials() {
  const containerRef = useRef(null);
  
  // Manual offset states for clicking arrows
  const [manualX1, setManualX1] = useState(0);
  const [manualX2, setManualX2] = useState(0);
  
  // Card width (350px) + Gap (24px)
  const shiftAmount = 374;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001
  });

  const x1 = useTransform(smoothProgress, [0, 1], [-500, -1500]);
  const x2 = useTransform(smoothProgress, [0, 1], [-1500, -500]);

  return (
    <section ref={containerRef} className="py-24 w-full relative z-10 bg-bg-primary border-t border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16 relative z-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent">
              What Our Clients Say
            </span>
          </h2>
          <p className="text-[#888888] text-[13px] md:text-sm max-w-2xl mx-auto font-medium leading-relaxed">
            Hear from gym owners and fitness enthusiasts who trust our trainers to help them reach their fitness goals. Their feedback inspires us to continue delivering top-tier services.
          </p>
        </div>
      </div>

      <div className="overflow-hidden relative flex flex-col gap-6 py-4">
        {/* Left and Right Fade Gradients */}
        <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-bg-primary to-transparent z-20 pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-bg-primary to-transparent z-20 pointer-events-none"></div>

        {/* Row 1 Container */}
        <div className="relative w-full group/row1">
          {/* Arrow Buttons (Row 1) */}
          <button onClick={() => setManualX1(p => p + shiftAmount)} className="absolute left-8 md:left-24 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row1:opacity-100 transition-all hover:bg-white/20 hover:scale-110">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => setManualX1(p => p - shiftAmount)} className="absolute right-8 md:right-24 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row1:opacity-100 transition-all hover:bg-white/20 hover:scale-110">
            <ChevronRight size={24} />
          </button>

          <motion.div style={{ x: x1 }} className="flex w-max">
            <motion.div 
              animate={{ x: manualX1 }} 
              transition={{ type: "spring", stiffness: 200, damping: 25 }} 
              className="flex gap-6 w-max"
            >
              {[...row1, ...row1, ...row1, ...row1].map((t, i) => <Card key={`r1-${i}`} t={t} />)}
            </motion.div>
          </motion.div>
        </div>

        {/* Row 2 Container */}
        <div className="relative w-full group/row2">
          {/* Arrow Buttons (Row 2) */}
          <button onClick={() => setManualX2(p => p + shiftAmount)} className="absolute left-8 md:left-24 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row2:opacity-100 transition-all hover:bg-white/20 hover:scale-110">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => setManualX2(p => p - shiftAmount)} className="absolute right-8 md:right-24 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover/row2:opacity-100 transition-all hover:bg-white/20 hover:scale-110">
            <ChevronRight size={24} />
          </button>

          <motion.div style={{ x: x2 }} className="flex w-max">
            <motion.div 
              animate={{ x: manualX2 }} 
              transition={{ type: "spring", stiffness: 200, damping: 25 }} 
              className="flex gap-6 w-max"
            >
              {[...row2, ...row2, ...row2, ...row2].map((t, i) => <Card key={`r2-${i}`} t={t} />)}
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}

function Card({ t }) {
  return (
    <div className="w-[350px] shrink-0 bg-bg-card rounded-[20px] p-6 flex flex-col gap-4 transition-colors border border-white/5 shadow-xl hover:bg-bg-card-hover">
      <Quote className="text-[#333] w-8 h-8 fill-current" />
      <p className="text-[#cccccc] text-[14px] leading-relaxed flex-1">{t.text}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${t.bg}`}>
            {t.avatar}
          </div>
          <div>
            <h4 className="text-white font-bold text-[13px]">{t.name}</h4>
            <p className="text-[#888888] text-[11px] font-medium">{t.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[#eab308]">
          <Star size={14} fill="currentColor" />
          <span className="text-white text-[12px] font-bold">{t.rating}</span>
        </div>
      </div>
    </div>
  );
}
