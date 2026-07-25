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

  useEffect(() => {
    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success && res.data?.appName) {
          setAppName(res.data.appName);
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

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base shadow-inner">
                💪
              </div>
              <span className="font-extrabold text-xl tracking-tight text-text-primary">{appName}</span>
            </Link>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold text-sm mb-6 text-text-muted uppercase tracking-wider">Product</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#features" className="text-text-secondary hover:text-text-primary transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="text-text-secondary hover:text-text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">Class Scheduling</Link></li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h4 className="font-bold text-sm mb-6 text-text-muted uppercase tracking-wider">Developers</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">API Documentation</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Support</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Changelog</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Developer Forum</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-sm mb-6 text-text-muted uppercase tracking-wider">Company</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">About Us</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Careers</Link></li>
              <li><Link href="#blog" className="text-text-secondary hover:text-text-primary transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-sm mb-6 text-text-muted uppercase tracking-wider">Legal</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Data Protection</Link></li>
              <li><Link href="#" className="text-text-secondary hover:text-text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:row items-center justify-between gap-6">
          <p className="text-gray-600 text-xs font-medium">
            © 2024 {appName}. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-gray-600">
            <Link href="#" className="hover:text-white transition-colors"><FacebookIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><InstagramIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><TwitterIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><LinkedinIcon /></Link>
            <Link href="#" className="hover:text-white transition-colors"><YoutubeIcon /></Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
