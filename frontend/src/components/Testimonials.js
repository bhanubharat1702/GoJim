'use client';

import { useRef, useState } from 'react';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const row1 = [
  { name: 'Rajesh Sharma', role: 'Founder, Peak Performance Gym, Mumbai', text: "Pehle Excel sheet par saara record rakhna bahut mushkil tha. GoJim ke aane se members ke membership status aur alerts track karna bahut aasan ho gaya hai.", avatar: '🧔', bg: 'bg-accent', rating: '5.0' },
  { name: 'Karan Malhotra', role: 'Owner, Gold\'s Club Franchise, Delhi', text: "Automatic WhatsApp alerts set up karne ke baad, members ko unki expiry date khud pata chal jaati hai. Hamein billing ke liye baar-baar call nahi karna padta.", avatar: '👨', bg: 'bg-[#fdba74]', rating: '4.9' },
  { name: 'Pooja Patel', role: 'Director, Cult Fit Partner Gym, Ahmedabad', text: "Trainers ki personal training (PT) commissions aur monthly split reports automatic calculate ho jaati hain. Fee calculation ki saari chik-chik khatam ho gayi.", avatar: '👩', bg: 'bg-[#fbcfe8]', rating: '5.0' },
  { name: 'Ankit Verma', role: 'Founder, Iron & Steel Gym, Bangalore', text: "Sabse badhiya baat ye hai ki jab kisi ka plan expire hota hai, toh check-in block ho jata hai. Unpaid training sessions ab bilkul band ho gaye hain.", avatar: '🧔', bg: 'bg-[#fca5a5]', rating: '4.9' },
  { name: 'Sunita Rao', role: 'Owner, Fit & Fab Studio, Hyderabad', text: "Multiple tabs aur mobile par live check-in status aur alerts dekhna bohot helpful hai. Staff aur receptionists ise aasan se operate kar lete hain.", avatar: '👩', bg: 'bg-[#bbf7d0]', rating: '4.9' },
];

const row2 = [
  { name: 'Amit Joshi', role: 'Owner, Powerhouse Fitness, Pune', text: "Software chalana bohot simple aur simple hai. Humne pehle do systems try kiye the, lekin iski dashboard speed aur clean layout sabse best hai.", avatar: '👨', bg: 'bg-[#d8b4fe]', rating: '4.9' },
  { name: 'Vikram Singh', role: 'Founder, Spartan Arena, Chandigarh', text: "Admin troubleshooting panel se support staff ko remote login access de sakte hain bina password share kiye. Settings aur fee plans verify karna aasan ho jata hai.", avatar: '🧔', bg: 'bg-[#bae6fd]', rating: '4.8' },
  { name: 'Neha Gupta', role: 'Owner, Grace Yoga Center, Jaipur', text: "Hamare yoga studio ke members ko unke birthday par automatic custom greetings chala jata hai. Personal touch se member retention bohot improve hui hai.", avatar: '👩', bg: 'bg-[#7dd3fc]', rating: '5.0' },
  { name: 'Sanjay Dutt', role: 'Director, Muscle Power Gym, Kolkata', text: "Rent, electricity aur daily maintenance logs ek hi dashboard par dikh jate hain. Overhead margins track karna ab bilkul tension-free kaam hai.", avatar: '👨', bg: 'bg-[#67e8f9]', rating: '4.9' },
  { name: 'Rohan Mehta', role: 'Co-owner, The Flex Gym, Pune', text: "Hamein lagta tha ki system seekhna mushkil hoga, par dashboard ka interface bohot straight-forward hai. Mere staff ne ek hi din mein pura software samajh liya.", avatar: '👨', bg: 'bg-[#ffedd5]', rating: '5.0' },
];

export default function Testimonials({ appName = 'goJim' }) {
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
              Loved by Gym Owners & Directors
            </span>
          </h2>
          <p className="text-[#888888] text-[13px] md:text-sm max-w-2xl mx-auto font-medium leading-relaxed">
            See how {appName} is helping fitness clubs, franchises, and boutique studios optimize operations, recover lost revenues, and boost member retention rates.
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
              {[...row1, ...row1, ...row1, ...row1].map((t, i) => <Card key={`r1-${i}`} t={t} appName={appName} />)}
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
              {[...row2, ...row2, ...row2, ...row2].map((t, i) => <Card key={`r2-${i}`} t={t} appName={appName} />)}
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}

function Card({ t, appName }) {
  return (
    <div className="w-[350px] shrink-0 bg-bg-card rounded-[20px] p-6 flex flex-col gap-4 transition-colors border border-white/5 shadow-xl hover:bg-bg-card-hover">
      <Quote className="text-[#333] w-8 h-8 fill-current" />
      <p className="text-[#cccccc] text-[14px] leading-relaxed flex-1">{t.text.replace(/GoJim/g, appName)}</p>
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
