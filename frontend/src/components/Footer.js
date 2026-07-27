'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { superAdminApi } from '@/lib/api';

// Custom Social Icons to avoid dependency issues
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
);
const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);
const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
);

export default function Footer() {
  const [appName, setAppName] = useState('goJim');
  const [logo, setLogo] = useState('');
  const [logoBg, setLogoBg] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  const footerLinks = [
    { name: 'Home', id: 'home', href: '#home' },
    { name: 'Features', id: 'features', href: '#features' },
    { name: 'Pricing', id: 'pricing', href: '#pricing' },
    { name: 'Testimonials', id: 'testimonials', href: '#testimonials' },
  ];

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 90;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Read from cache synchronously on client-side mount
    const cachedName = localStorage.getItem('gojim_public_app_name');
    if (cachedName) setAppName(cachedName);
    const cachedLogo = localStorage.getItem('gojim_public_logo');
    if (cachedLogo) setLogo(cachedLogo);
    const cachedLogoBg = localStorage.getItem('gojim_public_logo_bg');
    if (cachedLogoBg) setLogoBg(cachedLogoBg);
    const cachedPhone = localStorage.getItem('gojim_public_support_phone');
    if (cachedPhone) setSupportPhone(cachedPhone);
    setHasMounted(true);

    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success) {
          if (res.data?.appName) {
            setAppName(res.data.appName);
            localStorage.setItem('gojim_public_app_name', res.data.appName);
          }
          if (res.data?.logo) {
            setLogo(res.data.logo);
            localStorage.setItem('gojim_public_logo', res.data.logo);
          } else {
            localStorage.removeItem('gojim_public_logo');
          }
          if (res.data?.logoBg) {
            setLogoBg(res.data.logoBg);
            localStorage.setItem('gojim_public_logo_bg', res.data.logoBg);
          } else {
            localStorage.removeItem('gojim_public_logo_bg');
          }
          if (res.data?.supportPhone) {
            setSupportPhone(res.data.supportPhone);
            localStorage.setItem('gojim_public_support_phone', res.data.supportPhone);
          } else {
            localStorage.removeItem('gojim_public_support_phone');
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-[#050505] text-white pt-24 pb-12 px-4 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        
        {/* CTA Section */}
        <div className="text-center mb-24">
          <div className="flex justify-center gap-4 mb-8 text-4xl">
            <span>🔥</span>
            <span>💃</span>
            <span>🚴</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Ready to Get Started
          </h2>
          <p className="text-[#888888] text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Take control of your gym&apos;s operations with ease.<br />
            Start now or book a demo to see how we can help
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-3.5 bg-accent text-black font-bold rounded-xl shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all">
              Get Started
            </Link>
            <Link href="/demoform" className="px-8 py-3.5 bg-white/5 text-text-primary font-bold rounded-xl hover:bg-white/10 hover:-translate-y-1 transition-all">
              Book a Demo
            </Link>
          </div>
        </div>

        {/* Bottom Bar / Unified Footer */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Left Column: Brand & Support */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className={`flex items-center gap-3 no-underline transition-opacity duration-150 ${hasMounted ? 'opacity-100' : 'opacity-0'}`}>
              <div 
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-extrabold text-white shadow-inner overflow-hidden ${(!logoBg && !logo) ? 'bg-gradient-to-br from-accent to-accent-dark' : 'bg-transparent'}`}
                style={logoBg ? { background: logoBg, backgroundColor: logoBg } : undefined}
              >
                {logo ? (
                  <img src={logo} alt={appName} className="w-full h-full object-cover" />
                ) : (
                  (appName || 'goJim')[0]?.toUpperCase()
                )}
              </div>
              <span className="font-extrabold text-xl tracking-tight text-text-primary">{appName}</span>
            </Link>
            {supportPhone && (
              <p className="text-xs text-text-muted mt-1 font-semibold text-center md:text-left">
                Support: <a href={`tel:${supportPhone}`} className="hover:text-accent transition-colors">{supportPhone}</a>
              </p>
            )}
          </div>

          {/* Center Column: Section Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
            {footerLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.id)}
                className="text-text-secondary hover:text-text-primary transition-colors no-underline"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Column: Social Links */}
          <div className="flex items-center gap-6 text-gray-600">
            <Link href="#" className="hover:text-white transition-colors"><FacebookIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><InstagramIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><TwitterIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><LinkedinIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><YoutubeIcon /></Link>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="pt-8 border-t border-white/5 mt-8 text-center">
          <p className="text-gray-600 text-xs font-medium">
            © 2024 {appName}. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
