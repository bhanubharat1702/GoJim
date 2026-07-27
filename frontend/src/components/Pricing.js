'use client';
import { useState, useEffect } from 'react';
import { Check, X, Users, MessageSquare, LineChart, Search, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { superAdminApi } from '@/lib/api';

const hasFeature = (plan, featureKey) => {
  const planName = (plan.name || '').toLowerCase();
  const isMidOrHigh = planName.includes('silver') || planName.includes('gold') || planName.includes('pro') || planName.includes('enterprise');
  const isHigh = planName.includes('gold') || planName.includes('enterprise');
  
  switch(featureKey) {
    case 'whatsapp':
      return isMidOrHigh;
    case 'runway':
      return isMidOrHigh;
    case 'trainer_split':
      return isMidOrHigh;
    case 'support_impersonation':
      return isHigh;
    case 'support_24_7':
      return isMidOrHigh;
    case 'custom_analytics':
      return isHigh;
    default:
      return false;
  }
};

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await superAdminApi.getPublicPlans();
        if (res && res.success && Array.isArray(res.data)) {
          const activePlans = res.data.filter(p => p.status === 'Active');
          if (activePlans.length > 0) {
            setPlans(activePlans);
          }
        }
      } catch (err) {
        // Fallback to default plans silently when backend is unavailable
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
      features: ['Leads Module', 'Attendance Module']
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
      features: ['Leads Module', 'Payments Module', 'Attendance Module', 'Trainer Module', 'Staff Module']
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
      features: ['Leads Module', 'Payments Module', 'Attendance Module', 'Trainer Module', 'Staff Module', 'Equipment Module']
    }
  ];

  const plansToDisplay = plans.length > 0 ? plans : defaultPlans;

  const comparisonRows = [
    {
      name: 'Client Accounts Limit',
      desc: 'Max active members in workspace',
      icon: <Users size={16} />,
      getValue: (plan) => plan.maxClients >= 9999 ? 'Unlimited' : `${plan.maxClients} Members`
    },
    {
      name: 'Staff & Coach Limits',
      desc: 'Total admin and trainer logins',
      icon: <Users size={16} />,
      getValue: (plan) => plan.maxTrainers >= 999 ? 'Unlimited' : `${plan.maxTrainers} of each`
    },
    {
      name: 'Free Trial Period',
      desc: 'Days to test features before subscription starts',
      icon: <CalendarCheck size={16} />,
      getValue: (plan) => `${plan.trialDays} Days`
    },
    {
      name: 'WhatsApp Automation',
      desc: 'Automatic expiration reminders & templates',
      icon: <MessageSquare size={16} />,
      featureKey: 'whatsapp'
    },
    {
      name: 'Gym Income & Expenses',
      desc: 'Overhead margin logs and cash alert flags',
      icon: <LineChart size={16} />,
      featureKey: 'runway'
    },
    {
      name: 'Trainer Payout splits',
      desc: 'Trainer base salaries and PT commissions splits',
      icon: <LineChart size={16} />,
      featureKey: 'trainer_split'
    },
    {
      name: 'Remote Support Debugging',
      desc: 'Secure admin support log impersonation',
      icon: <Search size={16} />,
      featureKey: 'support_impersonation'
    },
    {
      name: '24/7 Priority Support',
      desc: 'Rapid email and chat support access',
      icon: <CalendarCheck size={16} />,
      featureKey: 'support_24_7'
    },
    {
      name: 'Advanced Analytics Reports',
      desc: 'Custom reporting and predictive trends log',
      icon: <LineChart size={16} />,
      featureKey: 'custom_analytics'
    }
  ];

  return (
    <section className="py-24 px-4 w-full relative z-10 bg-bg-primary">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 relative z-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-text-primary">
            Flexible Plans Built to Scale Your Gym
          </h2>
          <p className="text-text-muted text-[14px] md:text-[15px] max-w-2xl mx-auto font-medium leading-relaxed">
            Choose a plan that fits your current needs and scale it as your membership grows. Start a 14-day free trial, no credit card required.
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

        {/* Dynamic Comparison Table */}
        <div className="overflow-x-auto border border-white/10 rounded-2xl bg-[#0b0b0d] relative z-20 shadow-2xl">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-6 px-6 font-bold text-sm text-[#888888] w-[35%]">Features</th>
                {plansToDisplay.map((plan, idx) => {
                  const isFree = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
                  const isEnterprise = plan.monthlyPrice === null || plan.monthlyPrice === undefined;
                  const isPopular = (plansToDisplay.length === 3 && idx === 1) || (plansToDisplay.length === 2 && idx === 1);

                  return (
                    <th key={plan._id} className="py-6 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-[15px] font-black uppercase tracking-wider mb-2 ${isPopular ? 'text-accent' : 'text-white'}`}>
                          {plan.name}
                        </span>
                        <div className="flex items-end justify-center mb-4">
                          {isFree ? (
                            <span className="text-2xl font-extrabold text-white">₹0</span>
                          ) : isEnterprise ? (
                            <span className="text-lg font-extrabold text-white">Custom</span>
                          ) : (
                            <>
                              <span className="text-2xl font-extrabold text-white">
                                ₹{billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                              </span>
                              <span className="text-[10px] text-zinc-500 ml-1">
                                /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                              </span>
                            </>
                          )}
                        </div>
                        {isEnterprise ? (
                          <Link
                            href="/contact"
                            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-extrabold transition-all w-full max-w-[150px] text-center hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Contact Us
                          </Link>
                        ) : (
                          <Link
                            href="/signup"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('selectedPlanId', plan._id);
                              }
                            }}
                            className={`px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all w-full max-w-[150px] whitespace-nowrap text-center hover:scale-[1.02] active:scale-[0.98] ${
                              isPopular
                                ? 'bg-accent hover:bg-accent-hover text-black shadow-lg shadow-accent/20'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                            }`}
                          >
                            Start {plan.trialDays ? `${plan.trialDays}-Day ` : ''}Trial
                          </Link>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, rIdx) => (
                <tr 
                  key={rIdx} 
                  className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors ${
                    rIdx === comparisonRows.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="py-5 px-6 flex items-start gap-3">
                    <div className="mt-0.5 text-accent shrink-0">
                      {row.icon}
                    </div>
                    <div>
                      <strong className="text-white block text-sm font-bold tracking-tight">{row.name}</strong>
                      <span className="text-zinc-500 text-[11px] font-medium leading-normal">{row.desc}</span>
                    </div>
                  </td>
                  {plansToDisplay.map((plan) => (
                    <td key={plan._id} className="py-5 px-4 text-center align-middle">
                      {row.getValue ? (
                        <span className="text-[13px] text-zinc-300 font-bold">
                          {row.getValue(plan)}
                        </span>
                      ) : hasFeature(plan, row.featureKey) ? (
                        <Check size={16} className="text-accent mx-auto" strokeWidth={3} />
                      ) : (
                        <X size={16} className="text-red-500/80 mx-auto" strokeWidth={3} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
