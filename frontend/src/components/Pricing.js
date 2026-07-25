'use client';
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { superAdminApi } from '@/lib/api';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await superAdminApi.getPublicPlans();
        if (res.success && res.data) {
          // Only show Active plans
          const activePlans = res.data.filter(p => p.status === 'Active');
          setPlans(activePlans);
        }
      } catch (err) {
        console.error('Failed to fetch public subscription plans:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const defaultPlans = [
    {
      _id: 'default-free',
      name: 'Free Plan',
      description: 'Everything to get started with basic features',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxClients: 10,
      maxTrainers: 2,
      maxStaff: 2,
      trialDays: 14,
      features: [
        'No credit card required',
        'Manage up to 10 members',
        'Access basic gym analytics',
        'Limited trainer scheduling tools',
        'Free support',
        'Track gym revenue'
      ]
    },
    {
      _id: 'default-pro',
      name: 'Pro Plan',
      description: 'Advanced tools for gym management',
      monthlyPrice: 49,
      yearlyPrice: 490,
      maxClients: 100,
      maxTrainers: 10,
      maxStaff: 10,
      trialDays: 14,
      features: [
        'Manage up to 100 members',
        'Advanced gym analytics',
        'Unlimited trainer scheduling tools',
        'Custom member insights',
        'Priority support',
        'Integrated marketing tools'
      ]
    },
    {
      _id: 'default-enterprise',
      name: 'Enterprise Plan',
      description: 'Custom solutions for your business',
      monthlyPrice: null,
      yearlyPrice: null,
      maxClients: 9999,
      maxTrainers: 999,
      maxStaff: 999,
      trialDays: 30,
      features: [
        'Unlimited members',
        'Personalized dashboard',
        'Custom reporting and analytics',
        'Dedicated account manager',
        '24/7 priority support',
        'API integrations and more'
      ]
    }
  ];

  const plansToDisplay = plans.length > 0 ? plans : defaultPlans;

  return (
    <section className="py-24 px-4 w-full relative z-10 bg-bg-primary">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 relative z-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-text-primary">
            Easy For Your Bank Account
          </h2>
          <p className="text-text-muted text-[14px] md:text-[15px] max-w-2xl mx-auto font-medium leading-relaxed">
            Our flexible pricing options ensure you have access to the features you need, without breaking the bank.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center items-center gap-3 mb-16 relative z-20">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-12 h-6 rounded-full p-1 bg-zinc-800 border border-white/10 transition-colors focus:outline-none relative flex items-center"
            aria-label="Toggle billing cycle"
          >
            <div 
              className={`w-4 h-4 rounded-full bg-accent transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} 
            />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'text-white' : 'text-zinc-500'}`}>
            Yearly 
            <span className="text-[9px] bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Save ~20%</span>
          </span>
        </div>

        <div className={`grid grid-cols-1 gap-6 max-w-5xl mx-auto ${
          plansToDisplay.length === 1 ? 'max-w-md' :
          plansToDisplay.length === 2 ? 'md:grid-cols-2 max-w-3xl' :
          'md:grid-cols-3'
        }`}>
          {plansToDisplay.map((plan, index) => {
            const isPopular = plan.isPopular || (plansToDisplay.length === 3 && index === 1) || (plansToDisplay.length === 2 && index === 1);
            
            // Build dynamic features list if it is a fetched plan
            const planFeatures = [...(plan.features || [])];
            if (plans.length > 0) {
              // Add limit features to front
              planFeatures.unshift(
                `Manage up to ${plan.maxClients} members`,
                `Add up to ${plan.maxTrainers} trainers`,
                `Add up to ${plan.maxStaff} staff members`,
                `${plan.trialDays} days free trial`
              );
            }

            const isFree = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
            const isEnterprise = plan.monthlyPrice === null || plan.monthlyPrice === undefined;

            return (
              <div 
                key={plan._id} 
                className={`${
                  isPopular 
                    ? 'bg-bg-card border border-accent/40 shadow-[0_0_40px_rgba(var(--primary),0.03)] rounded-[24px] p-8 flex flex-col relative z-10 md:scale-105 transition-all duration-500' 
                    : 'bg-bg-card border border-white/5 rounded-[24px] p-8 flex flex-col hover:border-accent/20 transition-all duration-300'
                }`}
              >
                {isPopular && (
                  <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent rounded-[24px] pointer-events-none"></div>
                )}
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <h3 className="text-[22px] font-bold text-text-primary">{plan.name}</h3>
                  {isPopular && (
                    <span className="text-[8px] bg-accent text-black font-black uppercase tracking-wider px-2 py-0.5 rounded border border-accent">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-[13px] mb-8 relative z-10">{plan.description || 'Flexible subscription tier'}</p>
                
                <div className="flex flex-col mb-6 relative z-10">
                  {isFree ? (
                    <div className="flex items-end gap-1">
                      <span className="text-[44px] leading-none font-bold text-text-primary">₹0</span>
                      <span className="text-text-muted text-[11px] mb-1 ml-1">forever</span>
                    </div>
                  ) : isEnterprise ? (
                    <div className="flex items-end gap-1 h-[44px]">
                      <span className="text-[28px] leading-none font-bold text-text-primary tracking-tight">Let&apos;s Talk</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1">
                        <span className="text-text-muted text-[11px] font-bold mb-2">₹</span>
                        <span className="text-[44px] leading-none font-bold text-text-primary">
                          {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                        </span>
                        <span className="text-text-muted text-[11px] mb-1 ml-1">
                          {billingCycle === 'monthly' ? 'per month' : 'per year'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && plan.monthlyPrice && (
                        <span className="text-[10px] text-text-muted mt-1">
                          (equivalent to ₹{Math.round(plan.yearlyPrice / 12)}/month)
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="h-[1px] w-full bg-white/5 mb-8 relative z-10"></div>
                
                <ul className="flex flex-col gap-5 mb-10 flex-1 relative z-10">
                  {planFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-[13px] text-text-secondary">
                      <Check size={18} strokeWidth={3} className="text-accent shrink-0 mt-[2px]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <Link 
                    href="/contact" 
                    className="w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-text-primary text-[14px] font-bold transition-colors text-center border border-white/5 relative z-10"
                  >
                    Contact Sales
                  </Link>
                ) : (
                  <Link 
                    href="/signup" 
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('selectedPlanId', plan._id);
                      }
                    }}
                    className={`${
                      isPopular 
                        ? 'w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-black text-[14px] font-bold transition-all text-center relative z-10 shadow-lg shadow-accent/20 active:scale-95'
                        : 'w-full py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-text-primary text-[14px] font-bold transition-colors text-center border border-white/5 relative z-10'
                    }`}
                  >
                    Start {plan.trialDays ? `${plan.trialDays}-Day ` : ''}Free Trial
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
