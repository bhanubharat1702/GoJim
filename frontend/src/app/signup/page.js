'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { superAdminApi, authApi, paymentsApi } from '@/lib/api';
import Link from 'next/link';
import { cleanPhone, validatePhone } from '@/lib/utils';
import { Mail, Lock, User, KeyRound, ShieldCheck, Building, Phone, MapPin, Users, Dumbbell, Compass, CheckCircle2, ChevronRight, ChevronLeft, CreditCard } from 'lucide-react';

export default function SignupPage() {
  const [appName, setAppName] = useState('goJim');
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    superAdminApi.getPublicSettings()
      .then(res => {
        if (res.success) {
          if (res.data?.appName) {
            setAppName(res.data.appName);
          }
          if (res.data?.maintenanceMode) {
            setIsMaintenance(true);
            setError('system under maintainence please try after sometime');
          }
        }
      })
      .catch(() => { });
  }, []);

  const [signupStep, setSignupStep] = useState('register'); // register, otp, setup
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);
    setForm(prev => ({ ...prev, otp: newDigits.join('') }));
    setError('');

    if (cleanValue && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setForm(prev => ({ ...prev, otp: newDigits.join('') }));
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        if (prevInput) {
          prevInput.focus();
        }
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('Text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setOtpDigits(newDigits);
      setForm(prev => ({ ...prev, otp: newDigits.join('') }));

      const lastIndex = Math.min(pastedData.length - 1, 5);
      const targetInput = document.getElementById(`otp-input-${lastIndex}`);
      if (targetInput) targetInput.focus();
    }
  };
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [smsFeedback, setSmsFeedback] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const { register, isAuthenticated, updateUser, user, logout } = useAuth();
  const router = useRouter();

  const [setupStep, setSetupStep] = useState(1); // 1, 2, 3, 4, 5
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [setupForm, setSetupForm] = useState({
    gymName: '',
    phone: '',
    address: '',
    city: '',
    capacity: 100,
    gymType: 'General Fitness'
  });
  const [locating, setLocating] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    superAdminApi.getPublicPlans()
      .then(res => {
        if (res.success && res.data) {
          const activePlans = res.data.filter(p => p.status === 'Active');
          setPlans(activePlans);
          if (activePlans.length > 0) {
            setSelectedPlanId(activePlans[0]._id);
          }
        }
      })
      .catch(() => { });
  }, []);

  const [phoneOtpStep, setPhoneOtpStep] = useState('idle');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneTimer, setPhoneTimer] = useState(0);
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    let interval;
    if (otpExpiry > 0) {
      interval = setInterval(() => setOtpExpiry(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiry]);

  useEffect(() => {
    let interval;
    if (phoneTimer > 0) {
      interval = setInterval(() => setPhoneTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phoneTimer]);

  useEffect(() => {
    if (isAuthenticated) {
      const isSetupPending = localStorage.getItem('gojim_setup_pending');
      if (isSetupPending === 'true') {
        setSignupStep('setup');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setAttemptedSubmit(false);
    setError('');
  }, [signupStep]);

  const navLinks = [
    { name: 'Home', href: '/#home', id: 'home' },
    { name: 'Features', href: '/#features', id: 'features' },
    { name: 'Pricing', href: '/#pricing', id: 'pricing' },
    { name: 'Testimonials', href: '/#testimonials', id: 'testimonials' },
  ];

  const triggerSendOtp = async () => {
    try {
      setLoading(true);
      setError('');
      setSmsFeedback('');

      const trimmedEmail = form.email.trim();
      const res = await authApi.sendOtp({ email: trimmedEmail });
      if (res.success) {
        setTimer(30);
        setOtpExpiry(240);
        setSignupStep('otp');
        if (res.isDemo) {
          setSmsFeedback(res.info || (res.otpCode ? `Verification Code (Demo): ${res.otpCode}` : 'SMTP connection timed out. OTP generated in demo mode!'));
        } else {
          setSmsFeedback('A verification code has been sent to your email address!');
          setTimeout(() => {
            setSmsFeedback('');
          }, 8000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofetchLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state_district || '';
            const road = data.address.road || data.address.suburb || data.address.neighbourhood || '';
            setSetupForm(prev => ({
              ...prev,
              address: road ? `${road}, ${city}` : city,
              city: city
            }));
          }
        } catch (err) {
          setError('Failed to fetch address automatically. Please type manually.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setError('Location permission denied. Please enter address manually.');
        setLocating(false);
      }
    );
  };

  const handleStartTrialSubmit = async () => {
    if (!setupForm.gymName.trim()) {
      setError('Please enter your gym name.');
      return;
    }
    if (!setupForm.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!setupForm.address.trim()) {
      setError('Please enter your gym address.');
      return;
    }
    if (!setupForm.city.trim()) {
      setError('Please enter your gym city.');
      return;
    }
    if (!selectedPlanId) {
      setError('Please select a subscription plan.');
      return;
    }

    setSetupLoading(true);
    setError('');

    try {
      const res = await authApi.updateProfile({
        name: form.name || user?.name,
        gymName: setupForm.gymName,
        phone: setupForm.phone,
        address: setupForm.address,
        city: setupForm.city,
        capacity: setupForm.capacity
      });

      if (res.success) {
        const planRes = await authApi.subscribePlan({
          planId: selectedPlanId,
          billingCycle
        });

        if (planRes.success) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('gojim_setup_pending');
          }
          updateUser(planRes.user);
          setSetupStep(5);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2500);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save settings. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    setError('');
    setSetupLoading(true);

    try {
      const plan = plans.find(p => p._id === selectedPlanId);
      const amount = billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;

      if (!amount) {
        throw new Error('Invalid plan pricing details.');
      }

      const orderRes = await paymentsApi.createOrder({
        amount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`
      });

      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Failed to create payment order.');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mockKey',
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: appName,
        description: `Subscription for ${plan.name}`,
        order_id: orderRes.order.id,
        handler: async function (response) {
          try {
            const verifyRes = await paymentsApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: selectedPlanId,
              billingCycle
            });

            if (verifyRes.success) {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('gojim_setup_pending');
              }
              updateUser(verifyRes.user);
              setSetupStep(5);
              setTimeout(() => {
                router.push('/dashboard');
              }, 2500);
            }
          } catch (err) {
            setError(err.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: user?.name || form.name,
          email: user?.email || form.email,
          contact: setupForm.phone
        },
        theme: {
          color: '#eab308'
        }
      };

      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        throw new Error('Razorpay SDK failed to load. Please refresh and try again.');
      }
    } catch (err) {
      setError(err.message || 'Payment processing error.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (signupStep === 'setup') {
      return;
    }
    setAttemptedSubmit(true);
    setError('');

    if (isMaintenance) {
      setError('system under maintainence please try after sometime');
      return;
    }

    if (signupStep === 'register') {
      if (!form.name.trim()) return setError('Please enter your name.');
      if (!form.email.trim()) return setError('Please enter your email.');
      if (!form.password.trim() || form.password.length < 6) {
        return setError('Password must be at least 6 characters.');
      }

      await triggerSendOtp();
    } else if (signupStep === 'otp') {
      if (!form.otp.trim()) return setError('Please enter the verification code.');

      setLoading(true);
      try {
        const trimmedEmail = form.email.trim();
        const trimmedOtp = form.otp.trim();
        await authApi.verifyOtp({ email: trimmedEmail, otp: trimmedOtp });

        const planId = localStorage.getItem('selectedPlanId');
        const registrationData = {
          name: form.name.trim(),
          email: trimmedEmail,
          password: form.password,
          role: 'owner'
        };
        if (planId) {
          registrationData.subscriptionPlanId = planId;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('gojim_setup_pending', 'true');
        }

        const result = await register(registrationData);
        if (result?.success) {
          if (planId) {
            localStorage.removeItem('selectedPlanId');
          }
          setSignupStep('setup');
        }
      } catch (err) {
        setError(err.message || 'Incorrect verification code. Please check and try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderForm = () => {
    if (isAuthenticated && signupStep !== 'setup') {
      return (
        <div className="text-center py-8 sm:py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Redirecting...</h3>
          <p className="text-xs text-text-muted">Taking you to your dashboard</p>
        </div>
      );
    }

    if (signupStep === 'register') {
      return (
        <div className="space-y-3.5 sm:space-y-4">
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="text"
              placeholder="Full Name"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${attemptedSubmit && !form.name.trim()
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/10 focus:border-accent'
                }`}
              value={form.name}
              onChange={e => {
                setForm({ ...form, name: e.target.value });
                setError('');
              }}
              required
            />
          </div>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="email"
              placeholder="Email Address"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${attemptedSubmit && !form.email.trim()
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/10 focus:border-accent'
                }`}
              value={form.email}
              onChange={e => {
                setForm({ ...form, email: e.target.value });
                setError('');
              }}
              required
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="password"
              placeholder="Password"
              className={`bg-black/50 text-sm sm:text-base pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border transition-all w-full focus:outline-none ${attemptedSubmit && !form.password.trim()
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/10 focus:border-accent'
                }`}
              value={form.password}
              onChange={e => {
                setForm({ ...form, password: e.target.value });
                setError('');
              }}
              required
              minLength={6}
            />
          </div>
        </div>
      );
    }

    if (signupStep === 'otp') {
      return (
        <div className="space-y-5 sm:space-y-6 flex flex-col items-center">
          <div className="flex flex-col items-center gap-2 sm:gap-3 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent relative shadow-inner animate-pulse">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">Security Verification</h3>
              <p className="text-xs text-text-muted mt-1 max-w-[260px] leading-relaxed">
                We&apos;ve sent a 6-digit verification code to
                <span className="block text-accent font-bold mt-0.5 truncate max-w-[240px] mx-auto">{form.email}</span>
              </p>
            </div>
          </div>

          {/* 6 Digit Inputs container optimized for mobile screens */}
          <div className="flex gap-1.5 sm:gap-2.5 justify-center py-2 w-full max-w-[320px]" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(index, e)}
                className={`w-9 h-11 sm:w-12 sm:h-14 bg-black/50 border text-center text-base sm:text-xl font-black rounded-lg sm:rounded-xl transition-all outline-none shrink-0
                  ${digit ? 'border-accent text-accent shadow-md shadow-accent/10' : 'border-white/10 text-white'}
                  ${attemptedSubmit && !form.otp.trim() && !digit ? 'border-red-500/50' : ''}
                  focus:border-accent focus:shadow-md focus:shadow-accent/15`}
              />
            ))}
          </div>

          <div className="w-full flex items-center justify-between px-1 text-[11px] sm:text-xs">
            <span className={`font-semibold uppercase tracking-wider ${otpExpiry > 0 ? 'text-zinc-500' : 'text-red-500/80'}`}>
              {otpExpiry > 0 
                ? `Expires in ${Math.floor(otpExpiry / 60)}:${String(otpExpiry % 60).padStart(2, '0')}` 
                : 'Code Expired'}
            </span>
            <button
              type="button"
              disabled={timer > 0}
              onClick={() => {
                triggerSendOtp();
                setOtpDigits(['', '', '', '', '', '']);
              }}
              className={`font-extrabold uppercase tracking-widest text-[10px] transition-all
                ${timer > 0 ? 'opacity-30 cursor-not-allowed text-zinc-500' : 'text-accent hover:text-accent-light'}`}
            >
              {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSignupStep('register');
              setOtpDigits(['', '', '', '', '', '']);
            }}
            className="text-[10px] sm:text-xs text-text-muted hover:text-text-primary font-bold uppercase tracking-widest transition-colors w-full text-center border-t border-white/5 pt-4 mt-1"
          >
            ← Change Email Address
          </button>
        </div>
      );
    }

    if (signupStep === 'setup') {
      return (
        <div className="space-y-5 flex flex-col items-center w-full max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-1.5 text-center w-full">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent animate-bounce mb-1">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">Configure Your Gym</h3>
            <p className="text-xs text-text-muted">Set up defaults for your workspace</p>

            {setupStep < 5 && (
              <div className="flex items-center justify-between w-full max-w-[220px] sm:max-w-[240px] mt-3 relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-accent -translate-y-1/2 z-0 transition-all duration-300"
                  style={{ width: `${((setupStep - 1) / 3) * 100}%` }}
                />

                {[1, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (s < setupStep) setSetupStep(s);
                    }}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold relative z-10 transition-all 
                      ${s === setupStep
                        ? 'bg-accent text-black scale-110 shadow-lg shadow-accent/20'
                        : s < setupStep
                          ? 'bg-accent text-black'
                          : 'bg-zinc-800 text-zinc-400 border border-white/5'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-full bg-black/50 border border-white/10 rounded-2xl p-4.5 sm:p-6 backdrop-blur-xl relative overflow-hidden min-h-[280px] flex flex-col justify-between transition-all">
            {/* Step 1 */}
            {setupStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 1 of 4</span>
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">Gym Details</h4>
                </div>
                <div className="space-y-3">
                  <div className="relative group">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
                    <input
                      type="text"
                      placeholder="Gym Name"
                      className="bg-black/50 border-white/10 text-sm focus:border-accent pl-11 py-3 transition-all w-full rounded-xl"
                      value={setupForm.gymName}
                      onChange={e => setSetupForm({ ...setupForm, gymName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
                    <input
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="Phone Number (10 digits)"
                      className="bg-black/50 border-white/10 text-sm focus:border-accent pl-11 py-3 transition-all w-full rounded-xl"
                      value={setupForm.phone}
                      onChange={e => setSetupForm({ ...setupForm, phone: cleanPhone(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!setupForm.gymName.trim() || !setupForm.phone.trim()) {
                        setError('Please enter your gym name and phone number.');
                        return;
                      }
                      setError('');
                      setSetupStep(2);
                    }}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs uppercase hover:bg-accent-hover transition-all shadow-md shadow-accent/10 active:scale-95 min-h-[44px]"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {setupStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 2 of 4</span>
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">Gym Location</h4>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleAutofetchLocation}
                    disabled={locating}
                    className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-text-primary text-xs font-bold transition-all hover:bg-white/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 min-h-[44px]"
                  >
                    <MapPin className={`w-4 h-4 text-accent ${locating ? 'animate-spin' : ''}`} />
                    {locating ? 'Detecting Location...' : 'Detect Current Location'}
                  </button>

                  <div className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Or Enter Manually</div>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Street Address"
                      className="bg-black/50 border-white/10 text-sm focus:border-accent px-4 py-3 transition-all w-full rounded-xl"
                      value={setupForm.address}
                      onChange={e => setSetupForm({ ...setupForm, address: e.target.value })}
                    />
                  </div>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="City"
                      className="bg-black/50 border-white/10 text-sm focus:border-accent px-4 py-3 transition-all w-full rounded-xl"
                      value={setupForm.city}
                      onChange={e => setSetupForm({ ...setupForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-white/5 text-text-muted font-bold text-xs uppercase transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!setupForm.address.trim() || !setupForm.city.trim()) {
                        setError('Please enter street address and city.');
                        return;
                      }
                      setError('');
                      setSetupStep(3);
                    }}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs uppercase hover:bg-accent-hover transition-all shadow-md shadow-accent/10 active:scale-95 min-h-[44px]"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {setupStep === 3 && (
              <div className="space-y-4 animate-fade-in text-left">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 3 of 4</span>
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">Select Subscription Plan</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-black/60 border border-white/10 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase rounded-lg transition-all ${billingCycle === 'monthly' ? 'bg-accent text-black' : 'text-zinc-400'}`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-1 ${billingCycle === 'yearly' ? 'bg-accent text-black' : 'text-zinc-400'}`}
                    >
                      Yearly <span className="text-[8px] bg-accent-dark/30 px-1 py-0.2 rounded">Save ~20%</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {plans.length === 0 ? (
                      <div className="text-center py-4 text-xs text-zinc-500">Loading plans...</div>
                    ) : (
                      plans.map(plan => {
                        const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                        const period = billingCycle === 'yearly' ? '/year' : '/month';
                        const isSelected = selectedPlanId === plan._id;
                        return (
                          <div
                            key={plan._id}
                            onClick={() => setSelectedPlanId(plan._id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-2 ${isSelected ? 'border-accent bg-accent/10 shadow-md' : 'border-white/10 bg-black/30 hover:border-white/20'}`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-black text-white">{plan.name}</h5>
                                {plan.isPopular && <span className="text-[8px] bg-accent text-black px-1.5 py-0.2 rounded font-black">Popular</span>}
                              </div>
                              <div className="flex flex-wrap gap-x-2 text-[9px] text-zinc-400 mt-0.5">
                                <span>{plan.maxClients} Members</span>
                                <span>{plan.maxTrainers} Trainers</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-white">₹{price}</span>
                              <span className="text-[9px] text-zinc-500 block">{period}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupStep(2)}
                    className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-white/5 text-text-muted font-bold text-xs uppercase transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <button
                    type="button"
                    disabled={plans.length === 0 || !selectedPlanId}
                    onClick={() => {
                      setError('');
                      setSetupStep(4);
                    }}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs uppercase hover:bg-accent-hover transition-all shadow-md shadow-accent/10 active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    Proceed <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {setupStep === 4 && (() => {
              const plan = plans.find(p => p._id === selectedPlanId);
              const hasTrial = plan && plan.trialDays > 0 && (!user?.trialUsed || user?.subscriptionStatus === 'Trial');
              const price = billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;
              const period = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
              
              const start = new Date();
              const end = new Date();
              if (hasTrial) {
                end.setDate(start.getDate() + plan.trialDays);
              } else {
                if (billingCycle === 'yearly') end.setFullYear(start.getFullYear() + 1);
                else end.setMonth(start.getMonth() + 1);
              }
              const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

              return (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 4 of 4</span>
                    <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">Order Summary</h4>
                  </div>

                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start border-b border-white/10 pb-2.5">
                      <div>
                        <p className="text-xs font-black text-white">{plan?.name || 'Plan'}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{plan?.description}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase">{period}</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-bold uppercase text-[10px]">Start Date</span>
                        <span className="text-white font-semibold text-xs">{start.toLocaleDateString('en-US', dateOptions)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/5 pt-2">
                        <span className="text-zinc-400 font-black uppercase text-[11px]">Total Price</span>
                        <span className="text-sm font-black text-accent">
                          {hasTrial ? '₹0 (Free Trial)' : `₹${price?.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupStep(3)}
                      className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-white/5 text-text-muted font-bold text-xs uppercase transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    <button
                      type="button"
                      disabled={setupLoading}
                      onClick={hasTrial ? handleStartTrialSubmit : handlePaymentSubmit}
                      className="flex items-center gap-1.5 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs uppercase hover:bg-accent-hover transition-all shadow-md shadow-accent/10 active:scale-95 disabled:opacity-50 min-h-[44px]"
                    >
                      {setupLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {hasTrial ? 'Start Trial' : 'Pay with Razorpay'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Step 5 */}
            {setupStep === 5 && (
              <div className="flex flex-col items-center justify-center text-center py-6 animate-scale-up space-y-3">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-500 relative shadow-lg shadow-green-500/10">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Workspace Created!</h4>
                  <p className="text-xs text-green-400 font-bold mt-1 uppercase tracking-wider">Deploying your dashboard...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const getButtonText = () => {
    if (loading) return 'PROCESSING...';
    return signupStep === 'register' ? 'SEND VERIFICATION CODE →' : 'VERIFY & SIGN UP →';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-bg-primary overflow-x-hidden">

      {/* Floating Navbar */}
      <nav className="fixed top-3 sm:top-6 left-0 right-0 z-[999] flex justify-center px-3 sm:px-4">
        <div
          className="w-full max-w-5xl border border-white/10 rounded-2xl px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between shadow-2xl"
          style={{
            backgroundColor: 'rgba(22, 22, 23, 0.85)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)'
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-base shadow-inner">
              💪
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-text-primary">{appName}</span>
          </Link>

          {/* Links (Desktop) */}
          {signupStep !== 'setup' && (
            <div className="hidden md:flex items-center gap-1 text-[13px] font-semibold">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="px-3.5 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          {signupStep === 'setup' ? (
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20"
            >
              Log Out
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs sm:text-[13px] font-bold text-text-secondary hover:text-white transition-colors no-underline"
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 mt-16 sm:mt-20">
        <div className="card !p-5 sm:!p-8 border-white/10 bg-bg-card/90 backdrop-blur-xl rounded-2xl shadow-2xl">
          {!isAuthenticated && signupStep === 'register' && (
            <div className="flex gap-1.5 mb-6 sm:mb-8 bg-black/50 rounded-xl p-1 border border-white/5">
              <Link href="/login" className="flex-1 py-2.5 sm:py-3 text-center rounded-lg text-xs sm:text-[13px] font-bold transition-all cursor-pointer text-text-muted hover:text-text-primary hover:bg-white/5 no-underline">
                Log In
              </Link>
              <div className="flex-1 py-2.5 sm:py-3 text-center rounded-lg text-xs sm:text-[13px] font-black bg-accent text-black shadow-md shadow-accent/30 cursor-pointer">
                Sign Up
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 sm:p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {smsFeedback && (
            <div className="mb-5 p-3.5 sm:p-4 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 text-xs font-medium leading-relaxed">
              {smsFeedback}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {renderForm()}

            {!isAuthenticated && (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 sm:py-4 bg-accent hover:bg-accent-light text-black text-xs sm:text-sm font-black rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2 min-h-[48px]"
              >
                {getButtonText()}
              </button>
            )}
          </form>

        </div>
      </div>
    </div>
  );
}
