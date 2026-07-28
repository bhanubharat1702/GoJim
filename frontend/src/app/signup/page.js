'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { superAdminApi, authApi, paymentsApi } from '@/lib/api';
import Link from 'next/link';
import { cleanPhone, validatePhone } from '@/lib/utils';
import { Mail, Lock, User, KeyRound, ShieldCheck, Building, Phone, MapPin, Users, Dumbbell, Compass, CheckCircle2, ChevronRight, ChevronLeft, CreditCard, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const [appName, setAppName] = useState('goJim');
  const [logo, setLogo] = useState('');
  const [logoBg, setLogoBg] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Read from cache synchronously on client-side mount to prevent visual delay
    const cachedName = localStorage.getItem('gojim_public_app_name');
    if (cachedName) setAppName(cachedName);
    const cachedLogo = localStorage.getItem('gojim_public_logo');
    if (cachedLogo) setLogo(cachedLogo);
    const cachedLogoBg = localStorage.getItem('gojim_public_logo_bg');
    if (cachedLogoBg) setLogoBg(cachedLogoBg);
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
          if (res.data?.maintenanceMode) {
            setIsMaintenance(true);
            setError('system under maintainence please try after sometime');
          }
        }
      })
      .catch(() => { });
  }, []);

  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleNavigation = (targetUrl) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(targetUrl);
    }, 350);
  };

  // Intercept native browser back button / swipe back on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, null, window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, null, window.location.href);
        handleNavigation('/');
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, []);

  const [signupStep, setSignupStep] = useState('register'); // register, otp
  const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);
    setForm(prev => ({ ...prev, otp: newDigits.join('') }));
    setError('');

    // Auto focus next input
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
  const [timer, setTimer] = useState(0); // Resend timer
  const [otpExpiry, setOtpExpiry] = useState(0); // OTP expiration timer
  const [smsFeedback, setSmsFeedback] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const { register, isAuthenticated, updateUser, user, logout } = useAuth();

  const [setupStep, setSetupStep] = useState(1); // 1, 2, 3, or 4 (success screen)
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
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

  const [phoneOtpStep, setPhoneOtpStep] = useState('idle'); // 'idle', 'sending', 'sent', 'verified'
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

  // Reset attempted submit and error when step changes
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
          setSmsFeedback(res.info || 'Email/SMTP credentials not configured in backend .env. Real OTP simulated in console!');
        } else {
          setSmsFeedback('A verification code has been sent to your email address!');
          setTimeout(() => {
            setSmsFeedback('');
          }, 5000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerSendPhoneOtp = async () => {
    if (!setupForm.phone || !setupForm.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!validatePhone(setupForm.phone)) {
      setError('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
      return;
    }
    setPhoneOtpStep('sending');
    setError('');
    setSmsFeedback('');
    try {
      const res = await authApi.sendOtp({
        phone: setupForm.phone.trim(),
        email: user?.email || form.email
      });
      if (res.success) {
        setPhoneOtpStep('sent');
        setPhoneTimer(60);
        if (res.isDemo) {
          setError(res.info || 'SMS simulated. OTP code generated in backend console!');
        } else {
          setSmsFeedback(res.info || 'Verification code sent successfully!');
          setTimeout(() => {
            setSmsFeedback('');
          }, 5000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification SMS.');
      setPhoneOtpStep('idle');
    }
  };

  const triggerVerifyPhoneOtp = async () => {
    if (phoneOtpStep === 'verified') return;
    if (phoneLoading) return;
    if (!phoneOtpCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setPhoneLoading(true);
    setError('');
    try {
      const res = await authApi.verifyOtp({ phone: setupForm.phone.trim(), otp: phoneOtpCode.trim() });
      if (res.success) {
        setPhoneOtpStep('verified');
        setError('');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setPhoneLoading(false);
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
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );

          if (!response.ok) throw new Error('Failed to fetch address details');
          const data = await response.json();

          if (data && data.address) {
            const addressParts = [];
            if (data.address.road) addressParts.push(data.address.road);
            if (data.address.suburb) addressParts.push(data.address.suburb);
            if (data.address.neighbourhood) addressParts.push(data.address.neighbourhood);

            const city = data.address.city || data.address.town || data.address.village || data.address.state || '';
            const addressStr = addressParts.join(', ') || data.display_name || '';

            setSetupForm(prev => ({
              ...prev,
              address: addressStr,
              city: city
            }));
          } else {
            setError('Could not retrieve address details from location.');
          }
        } catch (err) {
          setError('Failed to auto-detect address. Please enter manually.');
        } flex: {
          setLocating(false);
        }
      },
      (err) => {
        let msg = 'Failed to retrieve location.';
        if (err.code === 1) msg = 'Location permission denied by user.';
        setError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  const handlePaymentSubmit = async () => {
    const plan = plans.find(p => p._id === selectedPlanId);
    if (!plan) {
      setError('Please select a plan first.');
      return;
    }

    const amount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

    setSetupLoading(true);
    setError('');

    try {
      // 1. Update Profile Details first
      const res = await authApi.updateProfile({
        name: form.name || user?.name,
        gymName: setupForm.gymName,
        phone: setupForm.phone,
        address: setupForm.address,
        city: setupForm.city,
        capacity: setupForm.capacity || plan.maxClients || 100
      });

      if (!res.success) {
        throw new Error('Failed to update gym details. Please try again.');
      }

      // 2. Create Razorpay order
      const orderRes = await paymentsApi.createRazorpayOrder({ amount });
      if (!orderRes.success || !orderRes.order) {
        throw new Error('Failed to initiate Razorpay order.');
      }

      // 3. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded || orderRes.order.isMock) {
        console.log('⚠️ [Razorpay Simulator] Performing simulated demo payment checkout.');
        setTimeout(async () => {
          try {
            setSetupLoading(true);
            const verifyRes = await authApi.verifyOwnerSubscriptionRazorpay({
              razorpay_order_id: orderRes.order.id,
              razorpay_payment_id: `mock_pay_${Date.now()}`,
              razorpay_signature: 'mock_signature',
              planId: selectedPlanId,
              billingCycle
            });

            if (verifyRes.success) {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('gojim_setup_pending');
              }
              updateUser(verifyRes.user);
              setSetupStep(5); // Go to step 5 (success)
              setTimeout(() => {
                router.push('/dashboard');
              }, 2500);
            }
          } catch (err) {
            setError('Payment verification failed: ' + err.message);
          } finally {
            setSetupLoading(false);
          }
        }, 1500);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_GoJimTestKey123',
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: setupForm.gymName || 'GoJim Subscription',
        description: `Plan: ${plan.name} (${billingCycle})`,
        order_id: orderRes.order.id,
        handler: async function (response) {
          try {
            setSetupLoading(true);
            const verifyRes = await authApi.verifyOwnerSubscriptionRazorpay({
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
              setSetupStep(5); // Go to step 5 (success)
              setTimeout(() => {
                router.push('/dashboard');
              }, 2500);
            }
          } catch (err) {
            setError('Payment verification failed: ' + err.message);
          } finally {
            setSetupLoading(false);
          }
        },
        prefill: {
          name: user?.name || form.name || '',
          email: user?.email || form.email || '',
          contact: setupForm.phone || ''
        },
        theme: {
          color: '#10B981'
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message || 'An error occurred during payment setup.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleStartTrialSubmit = async () => {
    setSetupLoading(true);
    setError('');

    try {
      // 1. Update Profile Details first
      const res = await authApi.updateProfile({
        name: form.name || user?.name,
        gymName: setupForm.gymName,
        phone: setupForm.phone,
        address: setupForm.address,
        city: setupForm.city,
        capacity: setupForm.capacity || 100
      });

      if (!res.success) {
        throw new Error('Failed to update gym details. Please try again.');
      }

      // 2. Call subscribePlan (which assigns trial status & ends)
      const planRes = await authApi.subscribePlan({
        planId: selectedPlanId,
        billingCycle
      });

      if (planRes.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gojim_setup_pending');
        }
        updateUser(planRes.user);
        setSetupStep(5); // Go to success screen!
        setTimeout(() => {
          router.push('/dashboard');
        }, 2500);
      } else {
        throw new Error(planRes.message || 'Subscription failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to start trial. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSetupSubmit = async () => {
    if (!setupForm.gymName.trim()) {
      setError('Please enter your gym name.');
      return;
    }
    if (!setupForm.phone || !setupForm.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!validatePhone(setupForm.phone)) {
      setError('Phone number must be exactly 10 digits (no spaces, letters, or special characters).');
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

          setSetupStep(4);

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
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold text-white mb-2">Redirecting...</h3>
          <p className="text-xs text-text-muted">Taking you to your dashboard</p>
        </div>
      );
    }

    if (signupStep === 'register') {
      return (
        <div className="space-y-4">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="text"
              placeholder="Full Name"
              className={`bg-black/40 pl-12 transition-all w-full ${attemptedSubmit && !form.name.trim()
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/5 focus:border-accent'
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
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="email"
              placeholder="Email Address"
              className={`bg-black/40 pl-12 transition-all w-full ${attemptedSubmit && !form.email.trim()
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/5 focus:border-accent'
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
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
            <input
              type="password"
              placeholder="Password"
              className={`bg-black/40 pl-12 transition-all w-full ${attemptedSubmit && !form.password.trim()
                ? 'border-red-500/50 focus:border-red-500'
                : 'border-white/5 focus:border-accent'
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
        <div className="space-y-6 flex flex-col items-center">
          {/* Animated Lock Icon Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent relative shadow-inner animate-pulse">
              <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping duration-1000" />
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">Security Verification</h3>
              <p className="text-xs text-text-muted mt-1.5 max-w-[280px] leading-relaxed">
                We've sent a 6-digit verification code to
                <span className="block text-accent font-bold mt-0.5 truncate max-w-[260px] mx-auto">{form.email}</span>
              </p>
            </div>
          </div>

          {/* 6 Digit Inputs container */}
          <div className="flex gap-2.5 justify-center py-2" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(index, e)}
                className={`w-12 h-14 bg-black/40 border text-center text-xl font-bold rounded-xl transition-all duration-200 outline-none
                  ${digit ? 'border-accent text-accent shadow-md shadow-accent/10' : 'border-white/5 text-white'}
                  ${attemptedSubmit && !form.otp.trim() && !digit ? 'border-red-500/50' : ''}
                  focus:border-accent focus:shadow-md focus:shadow-accent/15 focus:scale-105`}
              />
            ))}
          </div>

          {/* Timer and Resend Actions */}
          <div className="w-full flex items-center justify-between px-1 text-xs">
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
                ${timer > 0 ? 'opacity-30 cursor-not-allowed text-zinc-500' : 'text-accent hover:text-accent-light hover:underline'}`}
            >
              {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
            </button>
          </div>


          {/* Back Action */}
          <button
            type="button"
            onClick={() => {
              setSignupStep('register');
              setOtpDigits(['', '', '', '', '', '']);
            }}
            className="text-[10px] text-text-muted hover:text-text-primary font-bold uppercase tracking-widest transition-colors w-full text-center border-t border-white/5 pt-4 mt-2"
          >
            ← Change Email Address
          </button>
        </div>
      );
    }

    if (signupStep === 'setup') {
      return (
        <div className="space-y-6 flex flex-col items-center w-full max-w-lg mx-auto">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center w-full">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent animate-bounce">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Configure Your Gym</h3>
            <p className="text-xs text-text-muted">Let's set up some quick defaults for your workspace</p>

            {/* Step Progress Indicators */}
            {setupStep < 5 && (
              <div className="flex items-center justify-between w-full max-w-[240px] mt-4 relative">
                {/* Background line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                {/* Active progress fill */}
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative z-10 transition-all duration-300 
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

          <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden min-h-[300px] flex flex-col justify-between transition-all duration-300">
            {/* Slide 1: Gym Essentials */}
            {setupStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 1 of 4</span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">Gym Details</h4>
                </div>
                <div className="space-y-4">
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
                    <input
                      type="text"
                      placeholder="Gym Name"
                      className="bg-black/40 border-white/5 focus:border-accent pl-12 transition-all w-full"
                      value={setupForm.gymName}
                      onChange={e => setSetupForm({ ...setupForm, gymName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-accent" />
                    <input
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                      onInput={e => e.target.setCustomValidity('')}
                      placeholder="Phone Number (e.g. 9876543210)"
                      className="bg-black/40 border-white/5 focus:border-accent pl-12 transition-all w-full"
                      value={setupForm.phone}
                      onChange={e => setSetupForm({ ...setupForm, phone: cleanPhone(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
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
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs tracking-wider uppercase hover:bg-accent-hover transition-all shadow-lg shadow-accent/10 hover:shadow-accent/25 active:scale-95"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Slide 2: Location Autofetch */}
            {setupStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 2 of 4</span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">Gym Location</h4>
                </div>

                <div className="space-y-3">
                  {/* Autofetch Location Action */}
                  <button
                    type="button"
                    onClick={handleAutofetchLocation}
                    disabled={locating}
                    className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/5 text-text-primary text-xs font-bold transition-all hover:bg-white/10 hover:border-accent/40 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    <MapPin className={`w-4 h-4 text-accent ${locating ? 'animate-spin' : ''}`} />
                    {locating ? 'Detecting Location...' : 'Detect Current Location'}
                  </button>

                  <div className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider py-1">Or Enter Manually</div>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Street Address (e.g. 123 Main St)"
                      className="bg-black/40 border-white/5 focus:border-accent px-4 py-3 transition-all w-full"
                      value={setupForm.address}
                      onChange={e => setSetupForm({ ...setupForm, address: e.target.value })}
                    />
                  </div>

                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="City (e.g. New York)"
                      className="bg-black/40 border-white/5 focus:border-accent px-4 py-3 transition-all w-full"
                      value={setupForm.city}
                      onChange={e => setSetupForm({ ...setupForm, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-text-muted font-bold text-xs uppercase hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!setupForm.address.trim() || !setupForm.city.trim()) {
                        setError('Please enter your gym address and city.');
                        return;
                      }
                      setError('');
                      setSetupStep(3);
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs tracking-wider uppercase hover:bg-accent-hover transition-all shadow-lg shadow-accent/10 hover:shadow-accent/25 active:scale-95"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Slide 3: Choose Plan */}
            {setupStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 3 of 4</span>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">Choose Subscription Plan</h4>
                </div>

                <div className="space-y-4">
                  {/* Billing Cycle Toggle */}
                  <div className="flex justify-center">
                    <div className="bg-black/40 border border-white/5 rounded-xl p-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-accent text-black shadow-lg shadow-accent/15' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-accent text-black shadow-lg shadow-accent/15' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Yearly <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-black/15 text-black border-black/10' : 'bg-green-500/20 text-green-400 border-green-500/20'}`}>Save ~20%</span>
                      </button>
                    </div>
                  </div>

                  {/* Plans List */}
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {plans.length === 0 ? (
                      <div className="text-center py-4 text-xs text-zinc-500 font-bold uppercase tracking-wider">Loading available plans...</div>
                    ) : (
                      plans.map((plan) => {
                        const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                        const period = billingCycle === 'yearly' ? '/yr' : '/mo';
                        const isSelected = selectedPlanId === plan._id;

                        return (
                          <div
                            key={plan._id}
                            onClick={() => setSelectedPlanId(plan._id)}
                            className={`p-3.5 rounded-xl border cursor-pointer text-left transition-all duration-200 hover:scale-[1.01] flex justify-between items-center gap-4
                              ${isSelected
                                ? 'border-accent bg-accent/5 shadow-md shadow-accent/5'
                                : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-accent' : 'bg-zinc-600'}`} />
                                <p className="text-xs font-black text-white uppercase tracking-tight">{plan.name}</p>
                              </div>
                              <p className="text-[10px] text-zinc-400 leading-tight max-w-[240px]">{plan.description}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-bold text-zinc-500 uppercase mt-1">
                                <span>{plan.maxClients} Clients</span>
                                <span>{plan.maxTrainers} Trainers</span>
                                <span>{plan.maxStaff} Staff</span>
                                {plan.trialDays > 0 && (
                                  <span className="text-accent font-black">{plan.trialDays} Days Trial</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-white">₹{price}</span>
                              <span className="text-[9px] text-zinc-500 font-bold">{period}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupStep(2)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-text-muted font-bold text-xs uppercase hover:text-white transition-colors"
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
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-black font-black text-xs tracking-wider uppercase hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(() => {
                      const plan = plans.find(p => p._id === selectedPlanId);
                      const hasTrial = plan && plan.trialDays > 0 && (!user?.trialUsed || user?.subscriptionStatus === 'Trial');
                      return hasTrial ? 'Start Trial Setup' : 'Proceed to Payment';
                    })()} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Slide 4: Payment Summary & Checkout */}
            {setupStep === 4 && (() => {
              const plan = plans.find(p => p._id === selectedPlanId);
              const hasTrial = plan && plan.trialDays > 0 && (!user?.trialUsed || user?.subscriptionStatus === 'Trial');
              const price = billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice;
              const period = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
              
              // Calculate Dates
              const start = new Date();
              const end = new Date();
              if (hasTrial) {
                const trialDays = plan.trialDays;
                end.setDate(start.getDate() + trialDays);
              } else {
                if (billingCycle === 'yearly') {
                  end.setFullYear(start.getFullYear() + 1);
                } else {
                  end.setMonth(start.getMonth() + 1);
                }
              }
              const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
              const startStr = start.toLocaleDateString('en-US', dateOptions);
              const endStr = end.toLocaleDateString('en-US', dateOptions);

              return (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 4 of 4</span>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                      {hasTrial ? 'Order Summary & Trial Setup' : 'Order Summary & Payment'}
                    </h4>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-4">
                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-tight">{plan?.name || 'Subscription Plan'}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{plan?.description}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-wider">{period}</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Start Date</span>
                        <span className="text-white font-semibold">{startStr}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                          {hasTrial ? 'First Bill Date' : 'Renewal Date'}
                        </span>
                        <span className="text-white font-semibold">{endStr}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/5 pt-3">
                        <span className="text-zinc-400 font-black uppercase tracking-widest text-[11px]">Total Price</span>
                        <span className="text-base font-black text-accent">
                          {hasTrial ? '₹0 (Free Trial)' : `₹${price?.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSetupStep(3)}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-text-muted font-bold text-xs uppercase hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>

                    <button
                      type="button"
                      disabled={setupLoading}
                      onClick={hasTrial ? handleStartTrialSubmit : handlePaymentSubmit}
                      className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-black font-black text-xs tracking-wider uppercase hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {setupLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {hasTrial ? (
                            <>
                              <Compass className="w-4 h-4" /> Start Your Trial
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" /> Pay with Razorpay
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Slide 5: Success animation screen */}
            {setupStep === 5 && (
              <div className="flex flex-col items-center justify-center text-center py-6 animate-scale-up space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-500 relative shadow-lg shadow-green-500/10">
                  <div className="absolute inset-0 rounded-full bg-green-500/5 animate-ping duration-1000" />
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white uppercase tracking-tight">Workspace Created!</h4>
                  <p className="text-xs text-green-400 font-bold mt-1 uppercase tracking-wider">Deploying your dashboard...</p>
                  <p className="text-gray-500 text-[10px] mt-4 leading-relaxed max-w-[260px] mx-auto">
                    Welcome to the family. Your gym management dashboard is now pre-configured and ready to run.
                  </p>
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

  const getButtonTextMobile = () => {
    if (loading) return 'PROCESSING...';
    return signupStep === 'register' ? 'SEND VERIFICATION CODE →' : 'VERIFY & SIGN UP →';
  };

  const renderFormMobile = () => {
    if (isAuthenticated && signupStep !== 'setup') {
      return (
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mb-6" />
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Redirecting...</h3>
          <p className="text-xs text-neutral-500 dark:text-text-muted">Taking you to your dashboard</p>
        </div>
      );
    }

    if (signupStep === 'register') {
      return (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full focus-within:border-accent ${
            attemptedSubmit && !form.name.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <User className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Full Name</span>
              <input
                type="text"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.name}
                onChange={e => {
                  setForm({ ...form, name: e.target.value });
                  setError('');
                }}
                required
              />
            </div>
          </div>
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full focus-within:border-accent ${
            attemptedSubmit && !form.email.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Mail className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Email Address</span>
              <input
                type="email"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  setError('');
                }}
                required
              />
            </div>
          </div>
          <div className={`flex items-center gap-3 bg-black border rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 transition-all w-full relative focus-within:border-accent ${
            attemptedSubmit && !form.password.trim()
              ? 'border-red-500/50'
              : 'border-neutral-200 dark:border-zinc-800'
          }`}>
            <Lock className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
            <div className="flex-1 flex flex-col min-w-0 pr-8">
              <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Password</span>
              <input
                type="password"
                placeholder=""
                className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
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
        </div>
      );
    }

    if (signupStep === 'otp') {
      return (
        <div className="space-y-6 flex flex-col items-center">
          {/* Animated Lock Icon Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent relative shadow-inner animate-pulse">
              <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping duration-1000" />
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Security Verification</h3>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 md:text-text-muted mt-1.5 max-w-[280px] leading-relaxed">
                We've sent a 6-digit verification code to
                <span className="block text-accent font-bold mt-0.5 truncate max-w-[260px] mx-auto">{form.email}</span>
              </p>
            </div>
          </div>

          {/* 6 Digit Inputs container */}
          <div className="flex gap-2.5 justify-center py-2" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                id={`otp-input-mobile-${index}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(index, e)}
                className={`w-12 h-14 bg-black border text-center text-xl font-bold rounded-xl transition-all duration-200 outline-none
                  ${digit ? 'border-accent text-accent shadow-md shadow-accent/10' : 'border-neutral-200 dark:border-zinc-800 text-white'}
                  ${attemptedSubmit && !form.otp.trim() && !digit ? 'border-red-500/50' : ''}
                  focus:border-accent focus:shadow-md focus:shadow-accent/15 focus:scale-105`}
              />
            ))}
          </div>

          {/* Timer and Resend Actions */}
          <div className="w-full flex items-center justify-between px-1 text-xs text-neutral-500 dark:text-zinc-400 md:text-text-muted">
            <span className={`font-semibold uppercase tracking-wider ${otpExpiry > 0 ? 'text-neutral-400 dark:text-zinc-500' : 'text-red-500/80'}`}>
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
              className={`font-extrabold uppercase tracking-widest text-[10px] transition-all bg-transparent border-none cursor-pointer
                ${timer > 0 ? 'opacity-30 cursor-not-allowed text-neutral-400 dark:text-zinc-500' : 'text-accent hover:text-accent-light hover:underline'}`}
            >
              {timer > 0 ? `Resend in ${timer}s` : 'Resend Code'}
            </button>
          </div>

          {/* Back Action */}
          <button
            type="button"
            onClick={() => {
              setSignupStep('register');
              setOtpDigits(['', '', '', '', '', '']);
            }}
            className="text-[10px] text-neutral-500 dark:text-zinc-400 md:text-text-muted hover:text-text-primary font-bold uppercase tracking-widest transition-colors w-full text-center border-t border-neutral-200 dark:border-zinc-700 md:border-white/5 pt-4 mt-2 bg-transparent cursor-pointer"
          >
            ← Change Email Address
          </button>
        </div>
      );
    }

    if (signupStep === 'setup') {
      return (
        <div className="space-y-6 flex flex-col items-center w-full max-w-lg mx-auto">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center w-full">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent animate-bounce">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Configure Your Gym</h3>
            <p className="text-xs text-neutral-500 dark:text-zinc-400 md:text-text-muted">Let's set up some quick defaults for your workspace</p>

            {/* Step Progress Indicators */}
            {setupStep < 5 && (
              <div className="flex items-center justify-between w-full max-w-[240px] mt-4 relative">
                {/* Background line */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 dark:bg-zinc-800 md:bg-white/5 -translate-y-1/2 z-0" />
                {/* Active progress fill */}
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative z-10 transition-all duration-300 
                      ${s === setupStep
                        ? 'bg-accent text-black scale-110 shadow-lg shadow-accent/20'
                        : s < setupStep
                          ? 'bg-accent text-black'
                          : 'bg-neutral-200 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border border-neutral-300 dark:border-zinc-700 md:border-white/5'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-full bg-neutral-50 dark:bg-zinc-900 md:bg-black/40 border border-neutral-200 dark:border-zinc-800 md:border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl relative overflow-hidden min-h-[300px] flex flex-col justify-between transition-all duration-300">
            {/* Slide 1: Gym Essentials */}
            {setupStep === 1 && (
              <div className="space-y-4 animate-fade-in animate-duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 1 of 4</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Gym Details</h4>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-black border border-neutral-200 dark:border-zinc-800 rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 focus-within:border-accent transition-all w-full">
                    <Building className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Gym Name</span>
                      <input
                        type="text"
                        placeholder=""
                        className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                        value={setupForm.gymName}
                        onChange={e => setSetupForm({ ...setupForm, gymName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-black border border-neutral-200 dark:border-zinc-800 rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 focus-within:border-accent transition-all w-full">
                    <Phone className="w-5 h-5 text-accent md:text-text-muted shrink-0" />
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Phone Number</span>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                        onInput={e => e.target.setCustomValidity('')}
                        placeholder=""
                        className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                        value={setupForm.phone}
                        onChange={e => setSetupForm({ ...setupForm, phone: cleanPhone(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
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
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs tracking-wider uppercase hover:bg-accent-hover transition-all active:scale-95"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Slide 2: Gym Location */}
            {setupStep === 2 && (
              <div className="space-y-4 animate-fade-in animate-duration-150">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 2 of 4</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Gym Location</h4>
                </div>

                <div className="space-y-3">
                  {/* Autofetch Location Action */}
                  <button
                    type="button"
                    onClick={handleAutofetchLocation}
                    disabled={locating}
                    className="w-full py-3.5 px-4 rounded-xl bg-white dark:bg-zinc-800 md:bg-white/5 border border-neutral-200 dark:border-zinc-700 md:border-white/5 text-neutral-800 dark:text-zinc-100 md:text-text-primary text-xs font-bold transition-all hover:bg-neutral-50 dark:hover:bg-zinc-700 md:hover:bg-white/10 hover:border-accent/40 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    <MapPin className={`w-4 h-4 text-accent ${locating ? 'animate-spin' : ''}`} />
                    {locating ? 'Detecting Location...' : 'Detect Current Location'}
                  </button>

                  <div className="text-center text-[10px] text-neutral-400 dark:text-zinc-500 font-bold uppercase tracking-wider py-1">Or Enter Manually</div>

                  <div className="flex items-center gap-3 bg-black border border-neutral-200 dark:border-zinc-800 rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 focus-within:border-accent transition-all w-full">
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">Street Address</span>
                      <input
                        type="text"
                        placeholder=""
                        className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                        value={setupForm.address}
                        onChange={e => setSetupForm({ ...setupForm, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-black border border-neutral-200 dark:border-zinc-800 rounded-2xl md:rounded-xl px-4 py-3 md:py-3.5 focus-within:border-accent transition-all w-full">
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className="md:hidden text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5 leading-none">City</span>
                      <input
                        type="text"
                        placeholder=""
                        className="bg-transparent text-white text-base outline-none border-none p-0 w-full font-normal leading-normal placeholder-transparent"
                        value={setupForm.city}
                        onChange={e => setSetupForm({ ...setupForm, city: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-text-muted font-bold text-xs uppercase hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!setupForm.address.trim() || !setupForm.city.trim()) {
                        setError('Please enter your gym address and city.');
                        return;
                      }
                      setError('');
                      setSetupStep(3);
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-black font-extrabold text-xs tracking-wider uppercase hover:bg-accent-hover transition-all active:scale-95"
                  >
                    Next Step <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Slide 3: Choose Plan */}
            {setupStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 3 of 4</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Choose Subscription Plan</h4>
                </div>

                <div className="space-y-4">
                  {/* Billing Cycle Toggle */}
                  <div className="flex justify-center">
                    <div className="bg-neutral-200 dark:bg-black/40 border border-neutral-300 dark:border-white/5 rounded-xl p-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-accent text-black shadow-lg shadow-accent/15' : 'text-zinc-500 dark:text-zinc-400 hover:text-white'}`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-accent text-black shadow-lg shadow-accent/15' : 'text-zinc-500 dark:text-zinc-400 hover:text-white'}`}
                      >
                        Yearly <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-widest transition-all ${billingCycle === 'yearly' ? 'bg-black/15 text-black border-black/10' : 'bg-green-500/20 text-green-400 border-green-500/20'}`}>Save ~20%</span>
                      </button>
                    </div>
                  </div>

                  {/* Plans List */}
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {plans.length === 0 ? (
                      <div className="text-center py-4 text-xs text-zinc-500 font-bold uppercase tracking-wider">Loading available plans...</div>
                    ) : (
                      plans.map((plan) => {
                        const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                        const period = billingCycle === 'yearly' ? '/yr' : '/mo';
                        const isSelected = selectedPlanId === plan._id;

                        return (
                          <div
                            key={plan._id}
                            onClick={() => setSelectedPlanId(plan._id)}
                            className={`p-3.5 rounded-xl border cursor-pointer text-left transition-all duration-200 hover:scale-[1.01] flex justify-between items-center gap-4
                              ${isSelected
                                ? 'border-accent bg-accent/5 shadow-md shadow-accent/5'
                                : 'border-neutral-200 dark:border-white/5 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10'}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-accent' : 'bg-zinc-600'}`} />
                                <p className="text-xs font-black text-neutral-800 dark:text-white uppercase tracking-tight">{plan.name}</p>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight max-w-[240px]">{plan.description}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-bold text-zinc-500 uppercase mt-1">
                                <span>{plan.maxClients} Clients</span>
                                <span>{plan.maxTrainers} Trainers</span>
                                <span>{plan.maxStaff} Staff</span>
                                {plan.trialDays > 0 && (
                                  <span className="text-accent font-black">{plan.trialDays} Days Trial</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-neutral-800 dark:text-white">₹{price}</span>
                              <span className="text-[9px] text-zinc-500">{period}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSetupStep(2)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-text-muted font-bold text-xs uppercase hover:text-white transition-colors"
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
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-black font-black text-xs tracking-wider uppercase hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(() => {
                      const plan = plans.find(p => p._id === selectedPlanId);
                      const hasTrial = plan && plan.trialDays > 0 && (!user?.trialUsed || user?.subscriptionStatus === 'Trial');
                      return hasTrial ? 'Start Trial Setup' : 'Proceed to Payment';
                    })()} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Slide 4: Checkout */}
            {setupStep === 4 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <span className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Step 4 of 4</span>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-tight">Confirm & Activate</h4>
                </div>

                {(() => {
                  const plan = plans.find(p => p._id === selectedPlanId);
                  if (!plan) return null;
                  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                  const period = billingCycle === 'yearly' ? '/year' : '/month';
                  const hasTrial = plan.trialDays > 0 && (!user?.trialUsed || user?.subscriptionStatus === 'Trial');

                  return (
                    <div className="space-y-4">
                      {/* Summary Card */}
                      <div className="p-4 rounded-xl bg-neutral-200 dark:bg-black/25 border border-neutral-300 dark:border-white/5 space-y-3">
                        <div className="flex justify-between items-center border-b border-neutral-300 dark:border-white/5 pb-2.5">
                          <div>
                            <p className="text-xs font-black text-neutral-800 dark:text-white uppercase tracking-tight">{plan.name} Onboarding</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Billing Cycle: {billingCycle}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-accent/15 border border-accent/20 text-accent font-black text-[9px] uppercase tracking-widest">
                            {hasTrial ? `${plan.trialDays} Days Trial` : 'Active Plan'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-zinc-500">
                            <span>Workspace Setup</span>
                            <span className="font-bold text-neutral-800 dark:text-white">FREE</span>
                          </div>
                          {hasTrial ? (
                            <>
                              <div className="flex justify-between text-zinc-500">
                                <span>Subscription Price</span>
                                <span className="line-through">₹{price}{period}</span>
                              </div>
                              <div className="flex justify-between text-accent font-bold pt-1.5 border-t border-dashed border-neutral-300 dark:border-white/5">
                                <span>Due Today</span>
                                <span>₹0 (Trial)</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between text-accent font-bold pt-1.5 border-t border-dashed border-neutral-300 dark:border-white/5">
                              <span>Total Due</span>
                              <span>₹{price}{period}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSetupStep(3)}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-text-muted font-bold text-xs uppercase hover:text-white transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleCheckoutSubmit}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-black font-black text-xs tracking-wider uppercase hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-50"
                        >
                          {submitting ? (
                            <>Creating Workspace...</>
                          ) : hasTrial ? (
                            <>Activate Free Trial</>
                          ) : (
                            <>Pay &amp; Activate Workspace</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Slide 5: Success animation screen */}
            {setupStep === 5 && (
              <div className="flex flex-col items-center justify-center text-center py-6 animate-scale-up space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-500 relative shadow-lg shadow-green-500/10">
                  <div className="absolute inset-0 rounded-full bg-green-500/5 animate-ping duration-1000" />
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-neutral-800 dark:text-white uppercase tracking-tight">Workspace Created!</h4>
                  <p className="text-xs text-green-400 font-bold mt-1 uppercase tracking-wider">Deploying your dashboard...</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-4 leading-relaxed max-w-[260px] mx-auto">
                    Welcome to the family. Your gym management dashboard is now pre-configured and ready to run.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <>
      {/* Laptop & Desktop Mode (Exactly as it was originally) */}
      <div className="hidden md:block">
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
          {/* Floating Navbar */}
          <nav className="fixed top-6 left-0 right-0 z-[999] flex justify-center px-4">
            <div
              className="w-full max-w-5xl border border-white/10 rounded-2xl px-6 md:px-8 py-3 flex items-center justify-between shadow-2xl"
              style={{
                backgroundColor: 'rgba(22, 22, 23, 0.72)',
                backdropFilter: 'saturate(180%) blur(20px)',
                WebkitBackdropFilter: 'saturate(180%) blur(20px)'
              }}
            >
              {/* Logo */}
              {signupStep === 'setup' ? (
                <div className={`flex items-center gap-3 select-none cursor-default transition-opacity duration-150 ${hasMounted ? 'opacity-100' : 'opacity-0'}`}>
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
                </div>
              ) : (
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
              )}

              {/* Links (Desktop) */}
              {signupStep !== 'setup' && (
                <div className="hidden md:flex items-center gap-1 text-[13px] font-semibold">
                  {navLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={link.href}
                      className="px-4 py-2 rounded-lg transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5"
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
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-red-500/20 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/40 active:scale-95"
                >
                  Log Out
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="hidden sm:inline-block px-4 py-2 text-[13px] font-semibold transition-all duration-300 rounded-lg text-text-secondary hover:text-text-primary"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2.5 text-[13px] font-extrabold rounded-xl transition-all shadow-2xl hover:scale-[1.02] active:scale-95 bg-accent text-black shadow-lg shadow-accent/20 hover:shadow-accent/40"
                  >
                    Get Started
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

          <div className="w-full max-w-md relative z-10 mt-20">
            <div className="card !p-8 border-white/5 bg-bg-card/80 backdrop-blur-xl">
              {!isAuthenticated && signupStep === 'register' && (
                <div className="flex gap-2 mb-8 bg-black/40 rounded-2xl p-1.5 border border-white/5">
                  <Link href="/login" className="flex-1 py-3 text-center rounded-xl text-[13px] font-bold transition-all duration-300 cursor-pointer text-text-muted hover:text-text-primary hover:bg-white/5">
                    Log In
                  </Link>
                  <div className="flex-1 py-3 text-center rounded-xl text-[13px] font-bold bg-accent text-black shadow-lg shadow-accent/30 cursor-pointer">
                    Sign Up
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}

              {smsFeedback && (
                <div className="mb-6 p-4 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 text-xs font-medium">
                  {smsFeedback}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {renderForm()}

                {!isAuthenticated && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-accent hover:bg-accent-light text-black text-sm font-black rounded-xl transition-all shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {getButtonText()}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only View */}
      <div className="md:hidden min-h-screen flex flex-col bg-black overflow-x-hidden">
        {/* Mobile-only Header (Second Image) */}
        {signupStep !== 'setup' && (
          <div className="w-full px-6 pt-12 pb-8 flex flex-col gap-6 bg-black">
            <div>
              <button
                onClick={() => handleNavigation('/')}
                className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            <div className={`space-y-2 ${isExiting ? 'animate-slide-right-out-custom' : 'animate-slide-right-custom'}`}>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                Create your account
              </h1>
              <p className="text-sm text-neutral-400 font-medium">
                Let's set up your premium GoJim workspace today
              </p>
            </div>
          </div>
        )}

        <div className="w-full flex-1 flex flex-col">
          <div className={`card bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white rounded-t-[36px] p-6 shadow-2xl flex-1 flex flex-col justify-between ${signupStep === 'setup' ? 'rounded-t-none bg-neutral-50 dark:bg-zinc-950 p-4' : ''} ${isExiting ? 'animate-slide-down-custom' : 'animate-slide-up-custom'}`}>
            <div>
              {!isAuthenticated && signupStep === 'register' && (
                <div className="flex gap-1.5 mb-6 bg-neutral-100 dark:bg-zinc-800 rounded-full p-1 border border-neutral-200/50 dark:border-zinc-700">
                  <button
                    onClick={() => handleNavigation('/login')}
                    className="flex-1 py-2.5 sm:py-3 text-center rounded-full text-xs sm:text-[13px] font-bold transition-all cursor-pointer text-neutral-400 dark:text-zinc-500 hover:text-neutral-600 dark:hover:text-zinc-300 hover:bg-neutral-200/55 dark:hover:bg-zinc-800/50 bg-transparent border-none outline-none no-underline"
                  >
                    Login
                  </button>
                  <div className="flex-1 py-2.5 sm:py-3 text-center rounded-full text-xs sm:text-[13px] font-black bg-black text-white cursor-pointer">
                    Sign Up
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}

              {smsFeedback && (
                <div className="mb-6 p-4 rounded-xl border border-green-500/20 bg-green-500/10 text-green-400 text-xs font-medium">
                  {smsFeedback}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
                {renderFormMobile()}

                {!isAuthenticated && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-accent hover:bg-accent-light text-black text-xs sm:text-sm font-black rounded-full transition-all active:scale-95 disabled:opacity-50 mt-2"
                  >
                    {getButtonTextMobile()}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
