'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUI } from '@/context/UIContext';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';
import { superAdminApi, authApi, paymentsApi } from '@/lib/api';
import { Lock, AlertCircle, X, ChevronDown } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const { isAuthenticated, loading, user, updateUser, logout } = useAuth();
  const { isSettingsOpen, closeSettings } = useUI();
  const router = useRouter();
  const pathname = usePathname();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [plans, setPlans] = useState([]);
  const [broadcast, setBroadcast] = useState(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);

  const selectedPlan = plans.find(p => p._id === selectedPlanId);

  // Payment states
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getPaymentDetails = () => {
    if (!selectedPlan) return { finalAmount: 0, isUpgrade: false, credit: 0, remainingDays: 0, originalPrice: 0 };
    
    const newPrice = billingCycle === 'yearly' ? (selectedPlan.yearlyPrice || 0) : (selectedPlan.monthlyPrice || 0);
    
    if (user?.subscriptionPlan) {
      const currentPlan = user.subscriptionPlan;
      const currentPrice = user.billingCycle === 'yearly' ? (currentPlan.yearlyPrice || 0) : (currentPlan.monthlyPrice || 0);
      
      if (newPrice > currentPrice) {
        const now = new Date();
        const subEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
        const subStart = user.subscriptionStart ? new Date(user.subscriptionStart) : null;
        
        if (subEnd && subEnd > now) {
          const totalDays = user.billingCycle === 'yearly' ? 365 : 30;
          const remainingMs = subEnd.getTime() - now.getTime();
          const remainingDays = Math.max(0, remainingMs / (1000 * 60 * 60 * 24));
          const proratedCredit = Math.max(0, (remainingDays / totalDays) * currentPrice);
          const finalAmount = Math.max(0, Math.round(newPrice - proratedCredit));
          
          return {
            finalAmount,
            isUpgrade: true,
            originalPrice: newPrice,
            credit: Math.round(proratedCredit),
            remainingDays: Math.ceil(remainingDays)
          };
        }
      }
    }
    
    return { finalAmount: newPrice, isUpgrade: false, credit: 0, remainingDays: 0, originalPrice: newPrice };
  };

  const paymentDetails = getPaymentDetails();

  const handleSubscriptionPayment = async () => {
    if (!user || !selectedPlan) {
      setPayError('No active subscription plan selected.');
      return;
    }

    const amount = paymentDetails.finalAmount;

    setPayLoading(true);
    setPayError('');

    try {
      // 1. Create order
      const orderRes = await paymentsApi.createRazorpayOrder({ amount });
      if (!orderRes.success || !orderRes.order) {
        throw new Error('Failed to create payment order.');
      }

      // 2. Load script
      const loaded = await loadRazorpayScript();
      if (!loaded || orderRes.order.isMock) {
        // Simulated checkout for mock credentials
        setTimeout(async () => {
          try {
            const verifyRes = await authApi.verifyOwnerSubscriptionRazorpay({
              razorpay_order_id: orderRes.order.id,
              razorpay_payment_id: `mock_pay_${Date.now()}`,
              razorpay_signature: 'mock_signature',
              planId: selectedPlan._id,
              billingCycle
            });

            if (verifyRes.success) {
              updateUser(verifyRes.user);
            } else {
              throw new Error('Failed to verify simulation payment.');
            }
          } catch (err) {
            setPayError(err.message);
          } finally {
            setPayLoading(false);
          }
        }, 1500);
        return;
      }

      // 3. Regular Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_GoJimTestKey123',
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: user.gymName || 'GoJim Subscription',
        description: `Plan: ${selectedPlan.name} (${billingCycle})`,
        order_id: orderRes.order.id,
        handler: async function (response) {
          try {
            setPayLoading(true);
            const verifyRes = await authApi.verifyOwnerSubscriptionRazorpay({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: selectedPlan._id,
              billingCycle
            });

            if (verifyRes.success) {
              updateUser(verifyRes.user);
            } else {
              throw new Error('Payment verification failed.');
            }
          } catch (err) {
            setPayError(err.message);
          } finally {
            setPayLoading(false);
          }
        },
        prefill: {
          name: user.name || '',
          email: user.email || ''
        },
        theme: {
          color: '#10B981'
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setPayError(err.message || 'An error occurred during payment.');
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsImpersonating(!!localStorage.getItem('gojim_admin_token'));
    }
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      superAdminApi.getPublicPlans()
        .then(res => {
          if (res.success && res.data) {
            setPlans(res.data);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (user && user.subscriptionPlan) {
      setSelectedPlanId(prev => {
        if (!prev) {
          if (user.billingCycle) {
            setBillingCycle(user.billingCycle);
          }
          return user.subscriptionPlan._id || user.subscriptionPlan;
        }
        return prev;
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const syncUser = () => {
      authApi.getMe({ silent: true })
        .then(res => {
          if (res.success && res.user) {
            updateUser(res.user);
          }
        })
        .catch(() => {});

      authApi.getLatestBroadcast({ silent: true })
        .then(res => {
          if (res.success && res.data) {
            const dismissed = localStorage.getItem(`dismissed_broadcast_${res.data._id}`);
            if (!dismissed) {
              setBroadcast(res.data);
            } else {
              setBroadcast(null);
            }
          } else {
            setBroadcast(null);
          }
        })
        .catch(() => {});
    };

    syncUser();

    window.addEventListener('focus', syncUser);
    document.addEventListener('visibilitychange', syncUser);

    const interval = setInterval(syncUser, 60000);

    return () => {
      window.removeEventListener('focus', syncUser);
      document.removeEventListener('visibilitychange', syncUser);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  if (loading) {
    return null;
  }

  if (!isAuthenticated) return null;

  const isSubscriptionExpired = () => {
    if (!user || user.role === 'superadmin') return false;
    
    const now = new Date();
    
    if (user.subscriptionStatus === 'Suspended' || !user.isActive || user.subscriptionStatus === 'Expired') {
      return true;
    }
    
    if (user.subscriptionStatus === 'Trial') {
      let trialEnd = user.subscriptionTrialEnds ? new Date(user.subscriptionTrialEnds) : null;
      if (!trialEnd && user.createdAt) {
        trialEnd = new Date(new Date(user.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      if (trialEnd && trialEnd <= now) {
        return true;
      }
    }
    
    let end = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
    if (!end && user.createdAt) {
      end = new Date(new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    if (end && end <= now) {
      return true;
    }
    
    return false;
  };

  const isExpired = isSubscriptionExpired();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-bg-primary relative flex items-center justify-center p-4">
        {/* Sleek background design */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-bg-primary to-bg-primary" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="w-full max-w-sm sm:max-w-md bg-[#18181b]/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl text-center space-y-5 sm:space-y-6 relative z-10 animate-fade-in">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
            <Lock size={20} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-white tracking-wide uppercase">Workspace Locked</h3>
            {user.subscriptionStatus === 'Trial' || (user.trialUsed && user.subscriptionStatus === 'Expired') ? (
              <p className="text-sm text-zinc-400 leading-relaxed">
                your trail completed please pay to restart the plan
              </p>
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed">
                please renevew your plan
              </p>
            )}
          </div>

          {plans.length > 0 && user.role === 'owner' ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-4 text-left animate-fade-in">
              {/* Plan Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Choose Subscription Plan</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPlanDropdownOpen(!isPlanDropdownOpen)}
                    className="w-full flex items-center justify-between bg-bg-input border border-border hover:border-border-hover rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-accent transition-all cursor-pointer text-left font-medium"
                  >
                    <div className="flex items-center justify-between w-full pr-2">
                      <span>{selectedPlan?.name || 'Select Plan'}</span>
                      {user?.subscriptionPlan?._id === selectedPlan?._id && user?.billingCycle === billingCycle && (
                        <span className="text-[9px] uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded font-black shrink-0 ml-2">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${isPlanDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isPlanDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-[130]" onClick={() => setIsPlanDropdownOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-[140] bg-bg-secondary border border-border rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1 space-y-0.5 no-scrollbar dropdown-options-list">
                        {plans.map(p => {
                          const isCurrentPlan = user?.subscriptionPlan?._id === p._id && user?.billingCycle === billingCycle;
                          return (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => {
                                setSelectedPlanId(p._id);
                                setIsPlanDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all hover:bg-white/5 hover:text-white cursor-pointer flex justify-between items-center ${
                                selectedPlanId === p._id
                                  ? 'bg-white/10 text-white font-extrabold'
                                  : 'text-zinc-400 font-medium'
                              }`}
                            >
                              <span>{p.name}</span>
                              {isCurrentPlan && (
                                <span className="text-[9px] uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded font-black shrink-0 ml-2">
                                  Current Plan
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Billing Cycle Selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-transparent border-white/5 text-zinc-500 hover:text-white hover:border-white/10'
                  }`}
                >
                  Monthly Plan
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-transparent border-white/5 text-zinc-500 hover:text-white hover:border-white/10'
                  }`}
                >
                  Yearly Plan
                </button>
              </div>

              {/* Selected Plan Details */}
              {selectedPlan && (
                <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Clients</p>
                      <p className="text-xs font-black text-white mt-0.5">{selectedPlan.maxClients}</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Trainers</p>
                      <p className="text-xs font-black text-white mt-0.5">{selectedPlan.maxTrainers}</p>
                    </div>
                    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Staff</p>
                      <p className="text-xs font-black text-white mt-0.5">{selectedPlan.maxStaff}</p>
                    </div>
                  </div>

                  {selectedPlan.description && (
                    <p className="text-[11px] text-zinc-400 leading-normal italic border-t border-white/5 pt-2">
                      {selectedPlan.description}
                    </p>
                  )}

                  {selectedPlan.features && selectedPlan.features.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block">Included Features</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedPlan.features.map((feature, index) => (
                          <span key={index} className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-300 text-[9px] font-medium">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 pt-2.5 border-t border-white/5 text-xs animate-fade-in">
                {paymentDetails.isUpgrade && (
                  <>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Full Plan Price</span>
                      <span>₹{paymentDetails.originalPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-[#b8f175]">
                      <span>Upgrade Credit ({paymentDetails.remainingDays} days remaining)</span>
                      <span>-₹{paymentDetails.credit}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    {paymentDetails.isUpgrade ? 'Upgrade Price' : 'Renewal Price'}
                  </span>
                  <span className="text-white font-black">
                    ₹{paymentDetails.finalAmount}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3.5 text-left">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <div>
                  <p className="text-xs font-bold text-white uppercase">{user.subscriptionPlan?.name || 'Standard Plan'}</p>
                  <p className="text-[10px] text-zinc-400">Gym: {user.gymName}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-wider">
                  {user.billingCycle || 'monthly'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Renewal Price</span>
                <span className="text-white font-black">
                  ₹{user.billingCycle === 'yearly' ? user.subscriptionPlan?.yearlyPrice : user.subscriptionPlan?.monthlyPrice || user.subscriptionAmount || 0}
                </span>
              </div>
            </div>
          )}

          {payError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-semibold text-center animate-shake">
              {payError}
            </div>
          )}

          <div className="pt-2 space-y-3">
            {user.role === 'owner' ? (
              <button
                type="button"
                disabled={payLoading}
                onClick={handleSubscriptionPayment}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-accent text-black font-black text-xs tracking-wider uppercase hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {payLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  selectedPlanId && selectedPlanId !== (user.subscriptionPlan?._id || user.subscriptionPlan)
                    ? 'Switch Plan & Pay'
                    : 'Pay & Renew Workspace'
                )}
              </button>
            ) : (
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                Please ask the Gym Owner to renew the subscription to restore workspace access.
              </p>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-black text-xs tracking-wider uppercase transition-all active:scale-95 cursor-pointer"
            >
              Sign Out / Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ROUTE_FEATURE_MAP = {
    '/leads': 'Leads Module',
    '/operations/equipment': 'Equipment Module',
    '/attendance': 'Attendance Module',
    '/payments': 'Payments Module',
    '/trainers': 'Trainer Module',
    '/staff': 'Staff Module'
  };

  const matchedRouteKey = Object.keys(ROUTE_FEATURE_MAP).find(route => pathname.startsWith(route));
  const requiredFeature = matchedRouteKey ? ROUTE_FEATURE_MAP[matchedRouteKey] : null;

  const userFeatures = user?.subscriptionPlan?.features || [];
  const hasAccess = !requiredFeature || user?.role === 'superadmin' || userFeatures.includes(requiredFeature);

  const upgradePlans = plans.filter(p => p.features && p.features.includes(requiredFeature));

  const impersonatedByAdminBannerHeight = (user?.isBeingImpersonated && !isImpersonating) ? 40 : 0;
  const impersonateBannerHeight = isImpersonating ? 40 : 0;
  const broadcastBannerHeight = broadcast ? 40 : 0;
  const totalBannerHeight = impersonatedByAdminBannerHeight + impersonateBannerHeight + broadcastBannerHeight;

  let paddingClass = 'pt-13 lg:pt-15';
  if (totalBannerHeight === 120) {
    paddingClass = 'pt-[calc(3.25rem+120px)] lg:pt-[calc(3.75rem+120px)]';
  } else if (totalBannerHeight === 80) {
    paddingClass = 'pt-[calc(3.25rem+80px)] lg:pt-[calc(3.75rem+80px)]';
  } else if (totalBannerHeight === 40) {
    paddingClass = 'pt-[calc(3.25rem+40px)] lg:pt-[calc(3.75rem+40px)]';
  }

  const getExpiryAlertInfo = () => {
    if (!user || user.role === 'superadmin') return null;

    const parseDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const now = new Date();
    let expiryDate = null;
    let isTrial = user.subscriptionStatus === 'Trial';

    if (isTrial) {
      expiryDate = parseDate(user.subscriptionTrialEnds);
      if (!expiryDate && user.createdAt) {
        const created = parseDate(user.createdAt);
        if (created) {
          expiryDate = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
        }
      }
    } else {
      expiryDate = parseDate(user.subscriptionEnd);
      if (!expiryDate && user.createdAt) {
        const created = parseDate(user.createdAt);
        if (created) {
          expiryDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      }
    }

    if (!expiryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      const formattedDate = `${expiryDate.toLocaleDateString('en-US', dateOptions)} at ${expiryDate.toLocaleTimeString('en-US', timeOptions)}`;

      if (isTrial) {
        return {
          type: 'trial',
          daysLeft: diffDays,
          message: `your trail will expire by ${formattedDate}, please renew the plan`
        };
      } else {
        return {
          type: 'paid',
          daysLeft: diffDays,
          message: `your plan will be expired by ${formattedDate}, please renew the plan`
        };
      }
    }

    return null;
  };

  const alertInfo = getExpiryAlertInfo();

  return (
    <div className={`min-h-screen bg-bg-primary ${paddingClass}`}>
      <TopNav broadcast={broadcast} setBroadcast={setBroadcast} />
      <main className="pb-6 lg:pb-4">
        <div className="py-2 px-3 sm:px-4 lg:py-4 lg:px-8 max-w-7xl mx-auto relative">
          {alertInfo && !isAlertDismissed && (
            <div className="mb-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-yellow-500" />
                <p className="text-xs font-bold uppercase tracking-wide leading-relaxed">
                  {alertInfo.message}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {user.role === 'owner' && (
                  <button
                    onClick={handleSubscriptionPayment}
                    disabled={payLoading}
                    className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                  >
                    Pay & Renew
                  </button>
                )}
                <button
                  onClick={() => setIsAlertDismissed(true)}
                  className="p-1 rounded-lg text-yellow-400 hover:bg-yellow-500/10 hover:text-white transition-all active:scale-90"
                  title="Dismiss warning"
                >
                  <X size={16} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}
          {!hasAccess ? (
            <div className="relative min-h-[400px]">
              {/* Blurred children */}
              <div className="filter blur-md pointer-events-none select-none opacity-25 transition-all duration-300">
                {children}
              </div>
              
              {/* Lock overlay */}
              <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
                <div className="w-full max-w-md bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl text-center space-y-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                    <Lock size={20} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white tracking-wide">Feature Locked</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Your current plan <span className="text-white font-medium">({user?.subscriptionPlan?.name || 'Trial Plan'})</span> does not include the <span className="text-white font-medium">{requiredFeature}</span>.
                    </p>
                  </div>

                  {upgradePlans.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Available in these plans</p>
                      <div className="space-y-2">
                        {upgradePlans.map(p => (
                          <div key={p._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                            <div className="text-left">
                              <p className="text-xs font-bold text-white">{p.name}</p>
                              <p className="text-[10px] text-zinc-400">
                                Max Clients: {p.maxClients} • Trainers: {p.maxTrainers}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-white">₹{p.monthlyPrice}/mo</p>
                              <p className="text-[9px] text-zinc-500">₹{p.yearlyPrice}/yr</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Please contact your system administrator or upgrade your subscription tier to unlock this page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  );
}
