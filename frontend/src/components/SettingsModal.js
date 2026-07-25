'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  X, Search, User, Shield, Bell,
  Settings as SettingsIcon, Package,
  ChevronRight, ArrowLeft, Info,
  Monitor, Palette, Database, Lock,
  Plus, Trash2, Edit3, Check, RefreshCcw,
  SearchX, TrendingDown, ChevronDown,
  Camera, Mail, Phone, MapPin, Globe, ExternalLink, MessageCircle, Share2, Hash, Key, Eye, EyeOff, Navigation,
  Split, MoreHorizontal, RotateCcw, CheckCircle, AlertTriangle, Clock, Zap
} from 'lucide-react';
import { plansApi, authApi, membersApi, expenseCategoriesApi, superAdminApi, paymentsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cleanPhone, validatePhone } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const VS_CODE_THEME = {
  bg: 'var(--bg)',
  sidebar: 'var(--bg-dark)',
  header: 'var(--bg-light)',
  border: 'var(--border-muted)',
  accent: 'var(--primary)',
  text: 'var(--text-muted)',
  textBright: 'var(--text)',
  input: 'var(--bg-light)',
  selection: 'var(--border-muted)'
};

const DEFAULT_WHATSAPP_AUTOMATIONS = {
  welcomeMessage: { enabled: true, templateText: "Hello {member_name}! Welcome to {gym_name}. We're excited to have you on board! Let's smash those fitness goals together! 🚀" },
  birthdayWish: { enabled: true, templateText: "Happy Birthday {member_name}! 🎂 Wishing you a fantastic day and a year full of strength and health from {gym_name}! 💪" },
  paymentReminder: { enabled: true, daysBefore: 3, templateText: "Hello {member_name}, this is a reminder from {gym_name} that your membership expires in {days_left} days ({expiry_date}). Renew now to keep training without interruptions! 💳" },
  comebackNudge: { enabled: true, daysInactive: 5, templateText: "Hey {member_name}! We missed you at {gym_name}. It's been {days_inactive} days since your last session. Let's get back on track! When are you coming in? 🏋️" },
  newLeadNudge: { enabled: true, templateText: "Hi {member_name}! Thanks for checking out {gym_name}. 🏋️ Claim your FREE 1-day pass today and start your journey! Respond to book your slot. 💪" },
  leadFollowup: { enabled: true, daysInactive: 2, templateText: "Hi {member_name}! Just checking back in. Did you have any questions about {gym_name}? We have a special discount if you sign up this week! 💸💪" },
  leadFollowupReminder: { enabled: true, templateText: "Hello {member_name}! This is a reminder for your scheduled follow-up session/call with {gym_name} today. Let's discuss your fitness goals! 📅🏋️" },
  salaryPayout: { enabled: true, templateText: "Hello {staff_name}!\n\nYour salary for {month} has been paid successfully!\n\nPayment Details:\n{payment_details}\n\nThank you for your dedication and hard work! 💪\n- {gym_name}" }
};

const SEARCHABLE_SETTINGS = [
  {
    id: 'profile-name',
    label: 'Full Name',
    tabId: 'profile-general',
    path: 'Gym Profile > General & Security',
    description: 'Update the full name of the gym owner.',
    keywords: 'name owner user profile general'
  },
  {
    id: 'profile-email',
    label: 'Email Address',
    tabId: 'profile-general',
    path: 'Gym Profile > General & Security',
    description: 'View the primary email address used for login.',
    keywords: 'email login mail address owner'
  },
  {
    id: 'profile-gymName',
    label: 'Gym Brand Name',
    tabId: 'profile-general',
    path: 'Gym Profile > General & Security',
    description: 'Change the official branding name of your gym facility.',
    keywords: 'gym brand club company branding center facility title'
  },
  {
    id: 'profile-phone',
    label: 'Contact Phone',
    tabId: 'profile-general',
    path: 'Gym Profile > General & Security',
    description: 'Update the primary contact telephone number.',
    keywords: 'phone contact call mobile number tele'
  },
  {
    id: 'profile-password',
    label: 'Update Password',
    tabId: 'profile-general',
    path: 'Gym Profile > General & Security',
    description: 'Securely update your login credentials and password.',
    keywords: 'password credentials security authentication change login update pass lock key credentials'
  },
  {
    id: 'profile-address',
    label: 'Physical Address',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Set the official address or geographic coordinates of your facility.',
    keywords: 'address physical location maps reach route street residency map'
  },
  {
    id: 'profile-city',
    label: 'City / Region',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Update the city or regional hub name.',
    keywords: 'city region state neighborhood area hub location'
  },
  {
    id: 'profile-website',
    label: 'Website URL',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Link your custom web domain or landing page URL.',
    keywords: 'website url web internet link domain portal browser page'
  },
  {
    id: 'profile-whatsapp',
    label: 'WhatsApp Contact',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Provide a quick message contact link via WhatsApp.',
    keywords: 'whatsapp social reach phone chat message call messenger number link status'
  },
  {
    id: 'profile-instagram',
    label: 'Instagram Profile',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Link your gym\'s official Instagram handle.',
    keywords: 'instagram social reach profile handle page account ig followers images post'
  },
  {
    id: 'profile-facebook',
    label: 'Facebook Page',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Connect your business page on Facebook.',
    keywords: 'facebook social reach profile account page link group fb post'
  },
  {
    id: 'profile-twitter',
    label: 'Twitter / X Handle',
    tabId: 'profile-location',
    path: 'Gym Profile > Reach & Location',
    description: 'Link your official Twitter / X social account.',
    keywords: 'twitter x social reach handle profile account page status tweet'
  },
  {
    id: 'profile-timeslots',
    label: 'Operating Time Slots & Batches',
    tabId: 'profile-timeslots',
    path: 'Gym Profile > Time Slots',
    description: 'Configure gym operational time intervals, batches, active days, and capacities.',
    keywords: 'timeslots timings shifts active hours hours open clock schedule slot batch schedules days capacity'
  },
  {
    id: 'membership-plans',
    label: 'Membership Plans & Packages',
    tabId: 'membership',
    path: 'Membership Plans',
    description: 'Manage gym subscription pricing, duration, standard and personal training packages.',
    keywords: 'membership plans packages pricing rates subscriptions discounts actual standard pt price billing duration months'
  },
  {
    id: 'deactivation-threshold',
    label: 'Auto-Deactivate Inactive Members',
    tabId: 'membership',
    path: 'Membership Plans > Auto-Deactivate Inactive Members',
    description: 'Automatically mark members as Inactive (Deactivated) if they haven\'t attended the gym for a consecutive number of days.',
    keywords: 'deactivate inactive threshold days attendance alert status limit sixty 60 absence checkin'
  },
  {
    id: 'compensation-normal',
    label: 'Trainer Compensation Model',
    tabId: 'compensation',
    path: 'Trainer Compensation',
    description: 'Define default base salary and commissions for Normal, PT, and Hybrid trainers.',
    keywords: 'trainer compensation base salary commission splits normal pt hybrid split percent commission salary payroll split rates custom structure'
  },
  {
    id: 'payment-settings',
    label: 'UPI Payment Settings',
    tabId: 'payment',
    path: 'Payment Settings',
    description: 'Configure and verify gym owner UPI ID details to receive customer payments.',
    keywords: 'payment upi id owner verify payee account bank'
  }
];

const SIDEBAR_STRUCTURE = [
  {
    id: 'profile',
    label: 'Gym Profile',
    subItems: [
      { id: 'profile-general', label: 'General & Security' },
      { id: 'profile-location', label: 'Reach & Location' },
      { id: 'profile-timeslots', label: 'Time Slots' },
      { id: 'profile-whatsapp', label: 'WhatsApp Automation' }
    ]
  },
  { id: 'membership', label: 'Membership Plans' },
  { id: 'compensation', label: 'Trainer Compensation' },
  { id: 'payment', label: 'Payment Settings' },
  { id: 'subscription', label: 'Software Subscription' }
];

const parseTime24 = (timeStr) => {
  if (!timeStr) return { hour: 12, minute: '00', period: 'AM' };
  const [hStr, mStr] = timeStr.split(':');
  let hour = parseInt(hStr, 10);
  const minute = mStr || '00';
  let period = 'AM';
  if (hour >= 12) {
    period = 'PM';
    if (hour > 12) hour -= 12;
  }
  if (hour === 0) hour = 12;
  return { hour, minute, period };
};

const formatTime24 = (hour, minute, period) => {
  let h = parseInt(hour, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const formatTime12 = (time24) => {
  if (!time24) return '-';
  const { hour, minute, period } = parseTime24(time24);
  return `${hour}:${minute} ${period}`;
};

export default function SettingsModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile-general');
  const [expandedMenus, setExpandedMenus] = useState({ profile: false });
  const [scope, setScope] = useState('owner'); // 'owner' or 'gym'
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Plans specific state
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', durationMonths: 1, actualPrice: '', discountedPrice: '', hasPtPricing: false, ptActualPrice: '', ptDiscountedPrice: '' });

  // Compensation specific state
  const [compensationForm, setCompensationForm] = useState({
    normal: { baseSalary: 0, commission: 0, isActive: true },
    ptOnly: { baseSalary: 0, commission: 0, isActive: true },
    ptAndTrainer: { baseSalary: 0, commission: 0, isActive: true },
    allowCustomStructure: false
  });
  const [savingComp, setSavingComp] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleDevSeed = async () => {
    if (!window.confirm("Are you sure you want to seed development data? This will wipe your existing member, payment, and attendance records and replace them with 110 comprehensive sandbox profiles (including 10 current-month active joins) for realistic testing.")) {
      return;
    }
    setSeeding(true);
    try {
      const res = await membersApi.devSeed();
      if (res.success) {
        showToast("🎉 Seeding Successful! 110 sandbox records loaded.", "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast(`Seeding failed: ${res.message || 'Unknown error'}`, "error");
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setSeeding(false);
    }
  };


  const [profileForm, setProfileForm] = useState({
    name: '', email: '', phone: '', gymName: '', capacity: '', timeSlots: [], address: '', city: '', website: '', whatsapp: '', instagram: '', facebook: '', twitter: '', upiId: '', equipmentCategories: ['Cardio', 'Strength', 'Free Weights', 'Accessories'], staffRoles: ['Trainer', 'Manager', 'Staff', 'Admin'], specializations: ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'], deactivationThresholdDays: 60,
    whatsappConfig: {
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      isVerified: false,
      automations: {
        paymentReminder: { enabled: true, daysBefore: 3 },
        comebackNudge: { enabled: true, daysInactive: 5 },
        welcomeMessage: { enabled: true },
        birthdayWish: { enabled: true }
      }
    }
  });
  const [initialProfileForm, setInitialProfileForm] = useState(null);
  const [initialCompensationForm, setInitialCompensationForm] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [slotFormState, setSlotFormState] = useState(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);

  // UPI verification states
  const [upiVerified, setUpiVerified] = useState(false);
  const [upiVerifying, setUpiVerifying] = useState(false);
  const [verifiedPayeeName, setVerifiedPayeeName] = useState('');
  const [upiError, setUpiError] = useState('');
  const [newUpiInput, setNewUpiInput] = useState('');

  // Expense Categories states
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(null);
  const [newExpenseCatName, setNewExpenseCatName] = useState('');
  const [newExpenseTitleName, setNewExpenseTitleName] = useState('');
  const [editingExpenseCatId, setEditingExpenseCatId] = useState(null);
  const [editingExpenseCatName, setEditingExpenseCatName] = useState('');
  const [loadingExpenseCats, setLoadingExpenseCats] = useState(false);
  const [isApiUnlocked, setIsApiUnlocked] = useState(false);
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);

  // Subscription plans
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscribingPlanId, setSubscribingPlanId] = useState(null);
  const [testingExpiry, setTestingExpiry] = useState(false);
  const [settingsBillingCycle, setSettingsBillingCycle] = useState('monthly');
  const [activeAutomationTab, setActiveAutomationTab] = useState('welcomeMessage');

  const handleResetAutomations = () => {
    setDeleteConfirmState({
      title: 'Reset WhatsApp Automations',
      message: 'Are you sure you want to reset all WhatsApp automation messages and configurations to default values? This will overwrite your current templates.',
      confirmText: 'Yes, Reset',
      type: 'danger',
      onConfirm: async () => {
        setProfileForm({
          ...profileForm,
          whatsappConfig: {
            ...(profileForm.whatsappConfig || {}),
            automations: JSON.parse(JSON.stringify(DEFAULT_WHATSAPP_AUTOMATIONS))
          }
        });
        showToast("WhatsApp automations reset to defaults! Click 'Save Profile Settings' to persist.", "success");
      }
    });
  };

  const handleTestExpiry = async () => {
    setTestingExpiry(true);
    try {
      const res = await authApi.testExpireSubscription();
      if (res.success) {
        showToast("Test Expiry Activated! Expires in 5 seconds. Watch the server console.", "success");
        const meRes = await authApi.getMe();
        if (meRes.success && meRes.user) {
          updateUser(meRes.user);
        }
      }
    } catch (err) {
      showToast(err.message || "Failed to trigger test expiry", "error");
    } finally {
      setTestingExpiry(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      superAdminApi.getPublicPlans()
        .then(res => {
          if (res.success && res.data) {
            setSubscriptionPlans(res.data);
          }
        })
        .catch(err => console.error(err));

      if (user?.billingCycle) {
        setSettingsBillingCycle(user.billingCycle);
      }
    }
  }, [isOpen, user?.billingCycle]);

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

  const handleSubscribePlan = async (planId, billingCycle = 'monthly') => {
    if (user?.role !== 'owner') {
      showToast("Only gym owners can subscribe to software plans.", "error");
      return;
    }
    
    if (user?.subscriptionPlan?._id === planId && user?.billingCycle === billingCycle) {
      showToast("You are already subscribed to this plan with this billing cycle.", "info");
      return;
    }

    const selectedPlan = subscriptionPlans.find(p => p._id === planId);
    if (!selectedPlan) {
      showToast("Selected plan not found.", "error");
      return;
    }

    const newPrice = billingCycle === 'yearly' ? (selectedPlan.yearlyPrice || 0) : (selectedPlan.monthlyPrice || 0);
    
    const currentPlan = user.subscriptionPlan;
    const currentPrice = currentPlan 
      ? (user.billingCycle === 'yearly' ? (currentPlan.yearlyPrice || 0) : (currentPlan.monthlyPrice || 0))
      : 0;

    let isUpgrade = false;
    let isDowngrade = false;
    let finalAmount = newPrice;

    const now = new Date();
    const subEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
    const isActive = user.subscriptionStatus === 'Active' && subEnd && subEnd > now;

    if (isActive && currentPlan) {
      if (newPrice > currentPrice) {
        isUpgrade = true;
        finalAmount = newPrice;
      } else if (newPrice <= currentPrice) {
        isDowngrade = true;
      }
    } else {
      // Inactive / Expired / Renewals
      if (newPrice > 0) {
        isUpgrade = true;
        finalAmount = newPrice;
      }
    }

    if (isUpgrade && finalAmount > 0) {
      setDeleteConfirmState({
        title: 'Upgrade Subscription Plan',
        message: `Upgrading to ${selectedPlan.name} (${billingCycle}). Total payable amount: ₹${finalAmount}. Your new plan cycle will start immediately upon successful payment. Proceed to payment?`,
        confirmText: 'Pay & Upgrade',
        type: 'accent',
        onConfirm: async () => {
          setSubscribingPlanId(planId);
          try {
            // 1. Create order
            const orderRes = await paymentsApi.createRazorpayOrder({ amount: finalAmount });
            if (!orderRes.success || !orderRes.order) {
              throw new Error('Failed to create payment order.');
            }

            // 2. Load script
            const loaded = await loadRazorpayScript();
            if (!loaded || orderRes.order.isMock) {
              // Simulated checkout
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
                    showToast("Upgrade successful!", "success");
                  } else {
                    throw new Error('Failed to verify simulation payment.');
                  }
                } catch (err) {
                  showToast(err.message, "error");
                } finally {
                  setSubscribingPlanId(null);
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
              description: `Upgrade Plan: ${selectedPlan.name} (${billingCycle})`,
              order_id: orderRes.order.id,
              handler: async function (response) {
                try {
                  setSubscribingPlanId(planId);
                  const verifyRes = await authApi.verifyOwnerSubscriptionRazorpay({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    planId: selectedPlan._id,
                    billingCycle
                  });

                  if (verifyRes.success) {
                    updateUser(verifyRes.user);
                    showToast("Upgrade successful!", "success");
                  } else {
                    throw new Error('Payment verification failed.');
                  }
                } catch (err) {
                  showToast(err.message, "error");
                } finally {
                  setSubscribingPlanId(null);
                }
              },
              modal: {
                ondismiss: function () {
                  setSubscribingPlanId(null);
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
            showToast(err.message || 'An error occurred during payment.', "error");
            setSubscribingPlanId(null);
          }
        }
      });
    } else {
      // Downgrade, free switch, or trial activation
      setDeleteConfirmState({
        title: isDowngrade ? 'Downgrade Software Plan' : 'Switch Software Plan',
        message: isDowngrade 
          ? `Downgrading to ${selectedPlan.name} (${billingCycle}). Your subscription will switch immediately, and your current expiry date (${user.subscriptionEnd ? new Date(user.subscriptionEnd).toLocaleDateString() : 'N/A'}) will remain the same. No payment is required. Confirm switch?`
          : 'Are you sure you want to switch your software plan? Your limits and active features will be updated accordingly.',
        confirmText: 'Confirm Switch',
        type: 'accent',
        onConfirm: async () => {
          setSubscribingPlanId(planId);
          try {
            const res = await authApi.subscribePlan({ planId, billingCycle });
            if (res.success && res.user) {
              updateUser(res.user);
              showToast("Software plan updated successfully!", "success");
            } else {
              showToast(res.message || "Failed to update subscription", "error");
            }
          } catch (err) {
            showToast(err.message || "An error occurred", "error");
          } finally {
            setSubscribingPlanId(null);
          }
        }
      });
    }
  };

  const fetchExpenseCategories = async (selectFirst = false) => {
    setLoadingExpenseCats(true);
    try {
      const res = await expenseCategoriesApi.getAll();
      if (res.success) {
        setExpenseCategories(res.data);
        if (res.data.length > 0) {
          if (selectedExpenseCategory) {
            const updated = res.data.find(c => c._id === selectedExpenseCategory._id);
            setSelectedExpenseCategory(updated || res.data[0]);
          } else if (selectFirst) {
            setSelectedExpenseCategory(res.data[0]);
          }
        } else {
          setSelectedExpenseCategory(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingExpenseCats(false);
    }
  };

  const handleCreateExpenseCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newExpenseCatName.trim()) return;
    try {
      const res = await expenseCategoriesApi.create({
        name: newExpenseCatName.trim(),
        titles: ['Other']
      });
      if (res.success) {
        showToast('Expense category created!', 'success');
        setNewExpenseCatName('');
        await fetchExpenseCategories();
        // Select the newly created category
        const created = res.data;
        setSelectedExpenseCategory(created);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create category', 'error');
    }
  };

  const handleUpdateExpenseCategoryName = async (id) => {
    if (!editingExpenseCatName.trim()) return;
    try {
      const res = await expenseCategoriesApi.update(id, { name: editingExpenseCatName.trim() });
      if (res.success) {
        showToast('Category renamed successfully!', 'success');
        setEditingExpenseCatId(null);
        setEditingExpenseCatName('');
        await fetchExpenseCategories();
      }
    } catch (err) {
      showToast(err.message || 'Failed to rename category', 'error');
    }
  };

  const handleDeleteExpenseCategory = (id, name) => {
    setDeleteConfirmState({
      title: 'Delete Category',
      message: `Are you sure you want to delete the category "${name}"? This will delete all its dependent titles.`,
      confirmText: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const res = await expenseCategoriesApi.delete(id);
          if (res.success) {
            showToast('Category deleted successfully!', 'success');
            if (selectedExpenseCategory?._id === id) {
              setSelectedExpenseCategory(null);
            }
            await fetchExpenseCategories(true);
          }
        } catch (err) {
          showToast(err.message || 'Failed to delete category', 'error');
        }
      }
    });
  };

  const handleAddExpenseTitle = async (e) => {
    if (e) e.preventDefault();
    if (!selectedExpenseCategory || !newExpenseTitleName.trim()) return;
    const titleTrimmed = newExpenseTitleName.trim();
    if (selectedExpenseCategory.titles.includes(titleTrimmed)) {
      showToast('Title already exists!', 'warning');
      return;
    }
    try {
      const updatedTitles = [...selectedExpenseCategory.titles, titleTrimmed];
      const res = await expenseCategoriesApi.update(selectedExpenseCategory._id, { titles: updatedTitles });
      if (res.success) {
        showToast('Expense title added!', 'success');
        setNewExpenseTitleName('');
        await fetchExpenseCategories();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add title', 'error');
    }
  };

  const handleDeleteExpenseTitle = (titleToDelete) => {
    if (!selectedExpenseCategory) return;
    if (titleToDelete === 'Other') {
      showToast('The "Other" title option cannot be removed.', 'warning');
      return;
    }
    setDeleteConfirmState({
      title: 'Remove Title',
      message: `Are you sure you want to remove the title "${titleToDelete}"?`,
      confirmText: 'Yes, Remove',
      onConfirm: async () => {
        try {
          const updatedTitles = selectedExpenseCategory.titles.filter(t => t !== titleToDelete);
          const res = await expenseCategoriesApi.update(selectedExpenseCategory._id, { titles: updatedTitles });
          if (res.success) {
            showToast('Title removed successfully!', 'success');
            await fetchExpenseCategories();
          }
        } catch (err) {
          showToast(err.message || 'Failed to remove title', 'error');
        }
      }
    });
  };

  const handleResetExpenseCategories = () => {
    setDeleteConfirmState({
      title: 'Reset Categories',
      message: 'Are you sure you want to reset all expense categories and titles back to the default system choices? This will overwrite your custom choices.',
      confirmText: 'Yes, Reset',
      onConfirm: async () => {
        try {
          const res = await expenseCategoriesApi.reset();
          if (res.success) {
            showToast('Expense categories reset to default!', 'success');
            await fetchExpenseCategories(true);
          }
        } catch (err) {
          showToast(err.message || 'Failed to reset categories', 'error');
        }
      }
    });
  };

  const handleResetEquipmentCategories = () => {
    setDeleteConfirmState({
      title: 'Reset Categories',
      message: 'Are you sure you want to reset Equipment Categories back to default choices?',
      confirmText: 'Yes, Reset',
      onConfirm: async () => {
        setProfileForm(prev => ({
          ...prev,
          equipmentCategories: ['Cardio', 'Strength', 'Free Weights', 'Accessories']
        }));
        showToast('Equipment categories reset to default!', 'success');
      }
    });
  };

  const handleResetStaffRoles = () => {
    setDeleteConfirmState({
      title: 'Reset Staff Roles',
      message: 'Are you sure you want to reset Staff Roles back to default choices?',
      confirmText: 'Yes, Reset',
      onConfirm: async () => {
        setProfileForm(prev => ({
          ...prev,
          staffRoles: ['Trainer', 'Manager', 'Staff', 'Admin']
        }));
        showToast('Staff roles reset to default!', 'success');
      }
    });
  };

  const handleResetSpecializations = () => {
    setDeleteConfirmState({
      title: 'Reset Specializations',
      message: 'Are you sure you want to reset Specializations back to default choices?',
      confirmText: 'Yes, Reset',
      onConfirm: async () => {
        setProfileForm(prev => ({
          ...prev,
          specializations: ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit']
        }));
        showToast('Specializations reset to default!', 'success');
      }
    });
  };

  const showToast = (message, type = 'success', actions = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, actions }]);
    if (!actions) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    }
  };

  const discardUnsavedChanges = () => {
    if ((activeTab.startsWith('profile') || activeTab.startsWith('categories') || activeTab === 'payment') && initialProfileForm) {
      setProfileForm(initialProfileForm);
    }
    if (activeTab === 'compensation' && initialCompensationForm) {
      setCompensationForm(initialCompensationForm);
    }
  };

  const hasUnsavedChanges = () => {
    if (activeTab.startsWith('profile') || activeTab.startsWith('categories') || activeTab === 'payment') {
      if (!initialProfileForm) return false;
      return JSON.stringify(profileForm) !== JSON.stringify(initialProfileForm);
    }
    if (activeTab === 'compensation') {
      if (!initialCompensationForm) return false;
      return JSON.stringify(compensationForm) !== JSON.stringify(initialCompensationForm);
    }
    return false;
  };

  const handleTabChange = (newTab) => {
    if (newTab === activeTab) return;
    setIsApiUnlocked(false);
    setShowUnlockWarning(false);
    if (hasUnsavedChanges()) {
      showToast('Changes were not saved. Would you like to save?', 'warning', [
        {
          label: 'Save', onClick: async () => {
            if (activeTab.startsWith('profile') || activeTab.startsWith('categories') || activeTab === 'payment') await handleSaveProfile();
            if (activeTab === 'compensation') await handleCompensationSubmit();
            setActiveTab(newTab);
          }
        },
        {
          label: "Don't Save", onClick: () => {
            discardUnsavedChanges();
            setActiveTab(newTab);
          }
        }
      ]);
      return;
    }
    setActiveTab(newTab);
  };

  const handleClose = () => {
    setIsApiUnlocked(false);
    setShowUnlockWarning(false);
    if (hasUnsavedChanges()) {
      showToast('Changes were not saved. Would you like to save?', 'warning', [
        {
          label: 'Save', onClick: async () => {
            if (activeTab.startsWith('profile') || activeTab.startsWith('categories') || activeTab === 'payment') await handleSaveProfile();
            if (activeTab === 'compensation') await handleCompensationSubmit();
            onClose();
          }
        },
        {
          label: "Don't Save", onClick: () => {
            discardUnsavedChanges();
            onClose();
          }
        }
      ]);
      return;
    }
    onClose();
  };



  const handleSaveProfile = async () => {
    if (!profileForm.phone || !profileForm.phone.trim()) {
      showToast('Contact phone number is required.', 'error');
      return;
    }
    if (!validatePhone(profileForm.phone)) {
      showToast('Contact phone number must be exactly 10 digits (no spaces, letters, or special characters).', 'error');
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await authApi.updateProfile(profileForm);
      if (res.success) {
        if (updateUser) updateUser(res.user);
        setInitialProfileForm(profileForm);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyUpi = async (vpa) => {
    if (!vpa) return;
    
    const currentUpiIds = profileForm.upiIds || [];
    if (currentUpiIds.length >= 5) {
      showToast('Maximum of 5 UPI IDs allowed.', 'error');
      return;
    }
    
    if (currentUpiIds.some(item => item.upiId.toLowerCase() === vpa.toLowerCase())) {
      showToast('This UPI ID has already been added.', 'error');
      return;
    }

    setDeleteConfirmState({
      title: 'Confirm UPI ID',
      message: `Please verify that this is a valid and correct UPI ID before adding it to your payment profile: ${vpa}`,
      type: 'accent',
      confirmText: 'Verify & Add',
      onConfirm: async () => {
        setUpiVerifying(true);
        setUpiError('');
        setUpiVerified(false);
        try {
          const res = await authApi.verifyUpi({ upiId: vpa });
          if (res.success) {
            const isFirst = currentUpiIds.length === 0;
            const newUpiItem = {
              upiId: vpa,
              payeeName: res.payeeName || 'Owner',
              bankName: res.bankName || '',
              isDefault: isFirst
            };
            const updatedList = [...currentUpiIds, newUpiItem];
            
            setProfileForm(prev => {
              const updatedForm = { ...prev, upiIds: updatedList };
              if (isFirst) {
                updatedForm.upiId = vpa;
              }
              return updatedForm;
            });
            
            if (isFirst) {
              setUpiVerified(true);
              setVerifiedPayeeName(res.payeeName);
            }
            setNewUpiInput('');
            showToast('UPI ID added successfully!', 'success');
          } else {
            setUpiError(res.message || 'Verification failed');
            showToast(res.message || 'Verification failed', 'error');
          }
        } catch (err) {
          setUpiError(err.message || 'Verification failed');
          showToast(err.message || 'Verification failed', 'error');
        } finally {
          setUpiVerifying(false);
        }
      }
    });
  };

  const handleMakeDefaultUpi = (vpa) => {
    const currentUpiIds = profileForm.upiIds || [];
    const updatedList = currentUpiIds.map(item => ({
      ...item,
      isDefault: item.upiId.toLowerCase() === vpa.toLowerCase()
    }));
    const newDefaultItem = updatedList.find(item => item.isDefault);
    
    setProfileForm(prev => ({
      ...prev,
      upiIds: updatedList,
      upiId: newDefaultItem ? newDefaultItem.upiId : ''
    }));
    
    if (newDefaultItem) {
      setUpiVerified(true);
      setVerifiedPayeeName(newDefaultItem.payeeName);
    }
    showToast('Default UPI ID updated!', 'success');
  };

  const handleDeleteUpi = (vpa) => {
    setDeleteConfirmState({
      title: 'Delete UPI ID',
      message: `Are you sure you want to delete the UPI ID: ${vpa}? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Yes, Delete',
      onConfirm: () => {
        const currentUpiIds = profileForm.upiIds || [];
        const updatedList = currentUpiIds.filter(item => item.upiId.toLowerCase() !== vpa.toLowerCase());
        
        let newDefaultItem = null;
        if (updatedList.length > 0) {
          const hasDefault = updatedList.some(item => item.isDefault);
          if (!hasDefault) {
            updatedList[0].isDefault = true;
            newDefaultItem = updatedList[0];
          } else {
            newDefaultItem = updatedList.find(item => item.isDefault);
          }
        }
        
        setProfileForm(prev => ({
          ...prev,
          upiIds: updatedList,
          upiId: newDefaultItem ? newDefaultItem.upiId : ''
        }));
        
        if (newDefaultItem) {
          setUpiVerified(true);
          setVerifiedPayeeName(newDefaultItem.payeeName);
        } else {
          setUpiVerified(false);
          setVerifiedPayeeName('');
        }
        
        showToast('UPI ID removed successfully!', 'success');
      }
    });
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        if (data && data.address) {
          setProfileForm(prev => ({
            ...prev,
            address: data.display_name,
            city: data.address.city || data.address.town || data.address.village || data.address.suburb || ''
          }));
        }
      } catch (error) {
        showToast('Could not resolve address.', 'error');
      } finally { setIsLocating(false); }
    }, (error) => { setIsLocating(false); showToast('Error getting location: ' + error.message, 'error'); });
  };

  const verifySocialLink = (type, value) => {
    if (!value) {
      showToast('Please enter a value first', 'warning');
      return;
    }
    let url = '';
    switch (type) {
      case 'whatsapp': url = `https://wa.me/${value.replace(/\D/g, '')}`; break;
      case 'instagram': url = `https://instagram.com/${value.replace('@', '')}`; break;
      case 'facebook': url = value.includes('facebook.com') ? (value.startsWith('http') ? value : `https://${value}`) : `https://facebook.com/${value}`; break;
      case 'twitter': url = `https://twitter.com/${value.replace('@', '')}`; break;
      case 'website': url = value.startsWith('http') ? value : `https://${value}`; break;
      default: return;
    }
    window.open(url, '_blank');
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await authApi.updatePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      if (res.success) {
        showToast('Password updated successfully', 'success');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) { showToast(err.message || 'Failed to update password', 'error'); }
    finally { setIsSaving(false); }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await plansApi.getAll();
      if (res.success) setPlans(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      fetchExpenseCategories(true);

      // Dynamically fetch all current user settings from the database
      authApi.getMe().then(res => {
        if (res.success && res.user) {
          const dbUser = res.user;

          // Seed Profile Form
          const newProfileForm = {
            name: dbUser.name || '',
            email: dbUser.email || '',
            phone: dbUser.phone || '',
            gymName: dbUser.gymName || '',
            capacity: dbUser.capacity || '',
            timeSlots: dbUser.timeSlots || [],
            address: dbUser.address || '',
            city: dbUser.city || '',
            website: dbUser.website || '',
            whatsapp: dbUser.whatsapp || '',
            instagram: dbUser.instagram || '',
            facebook: dbUser.facebook || '',
            twitter: dbUser.twitter || '',
            equipmentCategories: dbUser.equipmentCategories && dbUser.equipmentCategories.length > 0 ? dbUser.equipmentCategories : ['Cardio', 'Strength', 'Free Weights', 'Accessories'],
            staffRoles: dbUser.staffRoles && dbUser.staffRoles.length > 0 ? dbUser.staffRoles : ['Trainer', 'Manager', 'Staff', 'Admin'],
            specializations: dbUser.specializations && dbUser.specializations.length > 0 ? dbUser.specializations : ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'],
             deactivationThresholdDays: dbUser.deactivationThresholdDays !== undefined ? dbUser.deactivationThresholdDays : 60,
             upiId: dbUser.upiId || '',
             upiIds: dbUser.upiIds || [],
             whatsappConfig: (() => {
                const defaults = {
                  welcomeMessage: "Hello {member_name}! Welcome to {gym_name}. We're excited to have you on board! Let's smash those fitness goals together! 🚀",
                  birthdayWish: "Happy Birthday {member_name}! 🎂 Wishing you a fantastic day and a year full of strength and health from {gym_name}! 💪",
                  paymentReminder: "Hello {member_name}, this is a reminder from {gym_name} that your membership expires in {days_left} days ({expiry_date}). Renew now to keep training without interruptions! 💳",
                  comebackNudge: "Hey {member_name}! We missed you at {gym_name}. It's been {days_inactive} days since your last session. Let's get back on track! When are you coming in? 🏋️",
                  newLeadNudge: "Hi {member_name}! Thanks for checking out {gym_name}. 🏋️ Claim your FREE 1-day pass today and start your journey! Respond to book your slot. 💪",
                  leadFollowup: "Hi {member_name}! Just checking back in. Did you have any questions about {gym_name}? We have a special discount if you sign up this week! 💸💪",
                  leadFollowupReminder: "Hello {member_name}! This is a reminder for your scheduled follow-up session/call with {gym_name} today. Let's discuss your fitness goals! 📅🏋️"
                };
                const config = dbUser.whatsappConfig || {
                  phoneNumberId: '',
                  accessToken: '',
                  businessAccountId: '',
                  isVerified: false,
                  automations: {}
                };
                return {
                  phoneNumberId: config.phoneNumberId || '',
                  accessToken: config.accessToken || '',
                  businessAccountId: config.businessAccountId || '',
                  isVerified: config.isVerified || false,
                  automations: {
                    welcomeMessage: {
                      enabled: config.automations?.welcomeMessage?.enabled ?? true,
                      templateText: config.automations?.welcomeMessage?.templateText ?? defaults.welcomeMessage
                    },
                    birthdayWish: {
                      enabled: config.automations?.birthdayWish?.enabled ?? true,
                      templateText: config.automations?.birthdayWish?.templateText ?? defaults.birthdayWish
                    },
                    paymentReminder: {
                      enabled: config.automations?.paymentReminder?.enabled ?? true,
                      daysBefore: config.automations?.paymentReminder?.daysBefore ?? 3,
                      templateText: config.automations?.paymentReminder?.templateText ?? defaults.paymentReminder
                    },
                    comebackNudge: {
                      enabled: config.automations?.comebackNudge?.enabled ?? true,
                      daysInactive: config.automations?.comebackNudge?.daysInactive ?? 5,
                      templateText: config.automations?.comebackNudge?.templateText ?? defaults.comebackNudge
                    },
                    newLeadNudge: {
                      enabled: config.automations?.newLeadNudge?.enabled ?? true,
                      templateText: config.automations?.newLeadNudge?.templateText ?? defaults.newLeadNudge
                    },
                    leadFollowup: {
                      enabled: config.automations?.leadFollowup?.enabled ?? true,
                      daysInactive: config.automations?.leadFollowup?.daysInactive ?? 2,
                      templateText: config.automations?.leadFollowup?.templateText ?? defaults.leadFollowup
                    },
                    leadFollowupReminder: {
                      enabled: config.automations?.leadFollowupReminder?.enabled ?? true,
                      templateText: config.automations?.leadFollowupReminder?.templateText ?? defaults.leadFollowupReminder
                    },
                    salaryPayout: {
                      enabled: config.automations?.salaryPayout?.enabled ?? true,
                      templateText: config.automations?.salaryPayout?.templateText ?? defaults.salaryPayout
                    }
                  }
                };
              })()
           };
           setProfileForm(newProfileForm);
           setInitialProfileForm(JSON.parse(JSON.stringify(newProfileForm)));
 
           if (dbUser.upiId) {
             setUpiVerified(true);
             const defaultItem = (dbUser.upiIds || []).find(item => item.isDefault || item.upiId === dbUser.upiId);
             setVerifiedPayeeName(defaultItem ? defaultItem.payeeName : (dbUser.gymName || dbUser.name || 'Valued Gym Partner'));
           } else {
            setUpiVerified(false);
            setVerifiedPayeeName('');
          }

          // Seed Compensation Form
          if (dbUser.trainerCompensation) {
            setCompensationForm(dbUser.trainerCompensation);
            setInitialCompensationForm(dbUser.trainerCompensation);
          } else {
            setInitialCompensationForm({
              normal: { baseSalary: 0, commission: 0, isActive: true },
              ptOnly: { baseSalary: 0, commission: 0, isActive: true },
              ptAndTrainer: { baseSalary: 0, commission: 0, isActive: true },
              allowCustomStructure: false
            });
          }

          // Sync context to avoid desyncs
          if (updateUser) updateUser(dbUser);
        }
      }).catch(err => console.error('Failed to dynamically fetch settings:', err));
    }
  }, [isOpen]);

  const handleCompensationSubmit = async (e) => {
    if (e) e.preventDefault();
    setSavingComp(true);
    try {
      const res = await authApi.updateProfile({ trainerCompensation: compensationForm });
      if (res.success) {
        showToast('Trainer Compensation settings saved!', 'success');
        setInitialCompensationForm(compensationForm);
        if (updateUser) updateUser(res.user);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingComp(false);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans;
  }, [plans]);

  const matchingSettings = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();

    // 1. Filter our hardcoded settings catalog
    const matchingCatalog = SEARCHABLE_SETTINGS.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.keywords.toLowerCase().includes(query)
    );

    // 2. Also search through dynamic plans matching the query!
    const matchingPlanItems = plans
      .filter(plan =>
        plan.name.toLowerCase().includes(query) ||
        plan.durationMonths.toString().includes(query)
      )
      .map(plan => ({
        id: `plan-${plan._id}`,
        label: `Plan: ${plan.name}`,
        tabId: 'membership',
        path: `Membership Plans > Active Package`,
        description: `Standard Price: ₹${plan.discountedPrice || plan.actualPrice} | Duration: ${plan.durationMonths} Months.`,
        isPlan: true
      }));

    return [...matchingCatalog, ...matchingPlanItems];
  }, [plans, searchQuery]);

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...planForm,
        ptActualPrice: planForm.hasPtPricing ? Number(planForm.ptActualPrice) || 0 : 0,
        ptDiscountedPrice: planForm.hasPtPricing ? Number(planForm.ptDiscountedPrice) || 0 : 0,
      };
      if (editingPlan) {
        await plansApi.update(editingPlan._id, payload);
      } else {
        await plansApi.create(payload);
      }
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanForm({ name: '', durationMonths: 1, actualPrice: '', discountedPrice: '', hasPtPricing: false, ptActualPrice: '', ptDiscountedPrice: '' });
      fetchPlans();
    } catch (err) { showToast(err.message, 'error'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 lg:p-8">
      <div
        className="relative w-full max-w-[1200px] h-full max-h-[850px] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-[#2b2b2b]"
        style={{ backgroundColor: VS_CODE_THEME.bg, color: VS_CODE_THEME.text, fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}
      >
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-center justify-between min-w-[350px] w-auto max-w-[500px] p-3 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-medium bg-[#252526] text-white border ${toast.type === 'success' ? 'border-[#b8f175]/30' :
                  toast.type === 'warning' ? 'border-yellow-500/30' :
                    'border-red-500/30'
                  }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {toast.type === 'success' && <CheckCircle size={18} className="text-accent shrink-0" />}
                  {toast.type === 'warning' && <Info size={18} className="text-yellow-500 shrink-0" />}
                  {toast.type === 'error' && <AlertTriangle size={18} className="text-red-400 shrink-0" />}
                  <span className="text-[13px]">{toast.message}</span>
                </div>

                {toast.actions ? (
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {toast.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => { act.onClick(); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded transition-all ${act.label === 'Save'
                          ? 'bg-accent text-black hover:bg-[#a3e635]'
                          : 'bg-[#3c3c3c] text-white hover:bg-[#4c4c4c]'
                          }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer ml-4 shrink-0">
                    <X size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* VS Code Title Bar */}
        <div className="flex items-center justify-between px-3 h-9 bg-[#323233] border-b border-[#2b2b2b]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400">Gym Settings</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <X size={16} onClick={handleClose} className="hover:text-white cursor-pointer" />
          </div>
        </div>



        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-[260px] flex flex-col border-r border-[#2b2b2b]" style={{ backgroundColor: VS_CODE_THEME.sidebar }}>
            <div className="flex-1 overflow-y-auto pt-4 no-scrollbar">
              <div className="mb-4">
                <div className="w-full flex items-center gap-1 px-4 py-1 text-[11px] font-bold text-gray-400">
                  <span className="uppercase tracking-wider">SETTINGS</span>
                </div>

                <div className="mt-2">
                  {SIDEBAR_STRUCTURE.map(sub => (
                    <div key={sub.id}>
                      <button
                        onClick={() => {
                          if (sub.subItems) {
                            setExpandedMenus(prev => ({ ...prev, [sub.id]: !prev[sub.id] }));
                          } else {
                            handleTabChange(sub.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-6 py-2.5 text-[13px] transition-all relative
                          ${activeTab === sub.id || (sub.subItems && sub.subItems.some(s => s.id === activeTab))
                            ? 'bg-[#37373d] text-white border-l-2 border-[#b8f175]'
                            : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200'}`}
                      >
                        <span>{sub.label}</span>
                        {sub.subItems && (
                          <ChevronDown size={14} className={`transition-transform ${expandedMenus[sub.id] ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {/* Sub Items */}
                      {sub.subItems && expandedMenus[sub.id] && (
                        <div className="bg-[#1e1e1e]/50 py-1">
                          {sub.subItems.map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleTabChange(item.id)}
                              className={`w-full text-left pl-10 pr-6 py-2 text-[12px] transition-all
                                ${activeTab === item.id
                                  ? 'text-accent font-bold'
                                  : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel Wrapper containing Search Bar Row and Settings Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar Row (Starts after side nav bar!) */}
            <div className="px-8 pt-6 pb-2 border-b border-[#2b2b2b]/30 flex justify-end">
              {/* Animated Collapsible Search Container */}
              <div className="w-full flex justify-end">
                <motion.div
                  initial={false}
                  animate={{
                    width: isSearchExpanded ? '100%' : '32px',
                  }}
                  transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                  onClick={() => {
                    if (!isSearchExpanded) {
                      setIsSearchExpanded(true);
                    }
                  }}
                  className={`flex items-center rounded overflow-hidden h-8 transition-all duration-200 ${isSearchExpanded
                    ? 'bg-[#3c3c3c] border border-transparent'
                    : 'bg-transparent border border-transparent cursor-pointer hover:bg-[#3c3c3c]/30'
                    }`}
                >
                  {/* Left Side Search Icon (Always visible) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (!isSearchExpanded) {
                        setIsSearchExpanded(true);
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center text-accent hover:text-white shrink-0 outline-none transition-colors"
                  >
                    <Search size={16} />
                  </button>

                  {/* Collapsible Text Input */}
                  <input
                    type="text"
                    placeholder="Search settings"
                    className="w-full bg-transparent text-[13px] text-white outline-none border-none placeholder:text-gray-500 h-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) {
                        setIsSearchExpanded(false);
                      }
                    }}
                    style={{
                      width: isSearchExpanded ? '100%' : '0px',
                      opacity: isSearchExpanded ? 1 : 0,
                      pointerEvents: isSearchExpanded ? 'auto' : 'none',
                      paddingLeft: isSearchExpanded ? '4px' : '0px',
                      paddingRight: isSearchExpanded ? '12px' : '0px',
                      transition: 'width 0.4s ease, opacity 0.3s ease, padding 0.4s ease'
                    }}
                    autoFocus={isSearchExpanded}
                  />

                  {/* Dedicated Close Button on the Right (Visible only when expanded!) */}
                  {isSearchExpanded && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent re-opening if already open
                        setIsSearchExpanded(false);
                        setSearchQuery(''); // clear search when closing
                      }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 shrink-0 outline-none transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Settings Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-8 bg-[#1e1e1e]">
              {searchQuery ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2b2b2b]">
                    <h3 className="text-white text-[14px] font-bold">Search Results for "{searchQuery}"</h3>
                    <button onClick={() => setSearchQuery('')} className="text-accent hover:underline text-[12px]">Clear Search</button>
                  </div>

                  {matchingSettings.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                      <h3 className="text-md font-bold text-gray-400">No settings matched your search</h3>
                      <p className="text-xs mt-1 text-gray-500">Try searching for other terms like 'capacity', 'plans', 'whatsapp', or 'salary'.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {matchingSettings.map(result => (
                        <button
                          key={result.id}
                          onClick={() => {
                            setActiveTab(result.tabId);
                            setSearchQuery(''); // Clear search so they can view the tab!

                            // Optional: Auto-focus the corresponding element after switching tab
                            setTimeout(() => {
                              if (result.id.startsWith('profile-')) {
                                const fieldName = result.id.replace('profile-', '');
                                const input = document.querySelector(`input[placeholder*="${fieldName}"], textarea[placeholder*="${fieldName}"]`);
                                if (input) input.focus();
                              }
                            }, 100);
                          }}
                          className="w-full text-left p-4 bg-[#252526] hover:bg-[#2d2d30] border border-[#2b2b2b] rounded-lg transition-all flex flex-col gap-1 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-white group-hover:text-accent transition-colors">{result.label}</span>
                            <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded font-mono uppercase tracking-wider">{result.path.split(' > ').pop()}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">{result.path}</span>
                          <p className="text-[12px] text-gray-400 mt-1">{result.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {activeTab.startsWith('profile') && (
                    <div className="space-y-8">
                      {/* Save Block Moved to Bottom */}

                      <div className="pb-12 max-w-4xl">
                        {/* General & Security Page */}
                        {activeTab === 'profile-general' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

                            <div className="space-y-0 divide-y divide-[#2b2b2b] bg-[#252526] px-5 rounded-lg border border-[#2b2b2b] shadow-sm">

                              {/* Avatar */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Avatar</div>
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-[#1e1e1e] border-2 border-dashed border-accent/30 flex items-center justify-center shrink-0">
                                    {user?.avatar ? (
                                      <img src={user.avatar} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      <User size={20} className="text-gray-600" />
                                    )}
                                  </div>
                                  <button className="text-[11px] text-accent font-bold hover:underline">Upload Photo</button>
                                </div>
                              </div>

                              {/* Full Name */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Full Name</div>
                                <input
                                  className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                  value={profileForm.name}
                                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                  placeholder="Your full name"
                                />
                              </div>

                              {/* Email Address */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Email Address</div>
                                <input
                                  disabled
                                  className="w-full max-w-sm bg-[#1e1e1e]/50 border border-[#3c3c3c]/50 p-2 text-[12px] outline-none text-gray-500 cursor-not-allowed rounded"
                                  value={profileForm.email}
                                />
                              </div>

                              {/* Gym Brand Name */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Gym Brand Name</div>
                                <input
                                  className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                  value={profileForm.gymName}
                                  onChange={e => setProfileForm({ ...profileForm, gymName: e.target.value })}
                                  placeholder="Name of your gym"
                                />
                              </div>

                              {/* Contact Phone */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Contact Phone</div>
                                <input
                                  className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                  type="text"
                                  pattern="[0-9]{10}"
                                  maxLength={10}
                                  onInvalid={e => e.target.setCustomValidity('Phone number must be exactly 10 digits (no spaces, letters, or special characters).')}
                                  onInput={e => e.target.setCustomValidity('')}
                                  value={profileForm.phone}
                                  onChange={e => setProfileForm({ ...profileForm, phone: cleanPhone(e.target.value) })}
                                  placeholder="Phone number"
                                />
                              </div>

                              {/* Authentication Form */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-start gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-2">
                                  Password
                                </div>
                                <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-sm">
                                  <div className="relative">
                                    <input
                                      type={showPasswords ? 'text' : 'password'}
                                      required
                                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded pr-8"
                                      value={passwordForm.currentPassword}
                                      onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                      placeholder="Current Password"
                                    />
                                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                      {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      type={showPasswords ? 'text' : 'password'}
                                      required minLength={8}
                                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                      value={passwordForm.newPassword}
                                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                      placeholder="New Password"
                                    />
                                    <input
                                      type={showPasswords ? 'text' : 'password'}
                                      required
                                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                      value={passwordForm.confirmPassword}
                                      onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                      placeholder="Confirm Password"
                                    />
                                  </div>
                                  <div className="flex justify-end pt-1">
                                    <button type="submit" disabled={isSaving} className="bg-accent hover:bg-[#a3e635] text-black px-3 py-1 rounded text-[10px] font-bold transition-colors disabled:opacity-50">
                                      Update
                                    </button>
                                  </div>
                                </form>
                              </div>

                            </div>
                          </div>
                        )}

                        {/* Reach & Location Page */}
                        {activeTab === 'profile-location' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

                            <div className="space-y-0 divide-y divide-[#2b2b2b] bg-[#252526] px-5 rounded-lg border border-[#2b2b2b] shadow-sm">

                              {/* Physical Location */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-start gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-2">
                                  Address
                                </div>
                                <div className="space-y-3 max-w-sm">
                                  <textarea
                                    rows={2}
                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all resize-none rounded"
                                    value={profileForm.address}
                                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                                    placeholder="e.g. 123 Fitness Ave, Suite 101"
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                      value={profileForm.city}
                                      onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                                      placeholder="City / Region"
                                    />
                                    <button onClick={fetchCurrentLocation} disabled={isLocating} type="button" className="flex items-center justify-center bg-[#1e1e1e] border border-[#3c3c3c] hover:border-accent text-white p-2 rounded text-[11px] font-bold transition-all w-full">
                                      {isLocating ? 'Locating...' : 'Auto-fill'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Website */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Website URL</div>
                                <div className="relative max-w-sm w-full">
                                  <input
                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded pr-14"
                                    value={profileForm.website}
                                    onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                                    placeholder="https://yourgym.com"
                                  />
                                  <button onClick={() => verifySocialLink('website', profileForm.website)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-accent hover:underline font-bold uppercase tracking-widest">
                                    Check
                                  </button>
                                </div>
                              </div>

                              {/* WhatsApp */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">WhatsApp</div>
                                <div className="relative max-w-sm w-full">
                                  <input
                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded pr-14"
                                    value={profileForm.whatsapp}
                                    onChange={e => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                                    placeholder="+91 98765 43210"
                                  />
                                  <button onClick={() => verifySocialLink('whatsapp', profileForm.whatsapp)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-accent hover:underline font-bold uppercase tracking-widest">
                                    Check
                                  </button>
                                </div>
                              </div>

                              {/* Instagram */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Instagram</div>
                                <div className="relative max-w-sm w-full">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[12px]">@</span>
                                  <input
                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent pl-6 p-2 text-[12px] outline-none text-white transition-all rounded pr-14"
                                    value={profileForm.instagram}
                                    onChange={e => setProfileForm({ ...profileForm, instagram: e.target.value })}
                                    placeholder="username"
                                  />
                                  <button onClick={() => verifySocialLink('instagram', profileForm.instagram)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-accent hover:underline font-bold uppercase tracking-widest">
                                    Check
                                  </button>
                                </div>
                              </div>

                              {/* Facebook */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Facebook</div>
                                <div className="relative max-w-sm w-full">
                                  <input
                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded pr-14"
                                    value={profileForm.facebook}
                                    onChange={e => setProfileForm({ ...profileForm, facebook: e.target.value })}
                                    placeholder="facebook.com/yourgym"
                                  />
                                  <button onClick={() => verifySocialLink('facebook', profileForm.facebook)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-accent hover:underline font-bold uppercase tracking-widest">
                                    Check
                                  </button>
                                </div>
                              </div>

                              {/* Twitter */}
                              <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Twitter / X</div>
                                <div className="relative max-w-sm w-full">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[12px]">@</span>
                                  <input
                                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent pl-6 p-2 text-[12px] outline-none text-white transition-all rounded pr-14"
                                    value={profileForm.twitter}
                                    onChange={e => setProfileForm({ ...profileForm, twitter: e.target.value })}
                                    placeholder="yourgym"
                                  />
                                  <button onClick={() => verifySocialLink('twitter', profileForm.twitter)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-accent hover:underline font-bold uppercase tracking-widest">
                                    Check
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}

                        {activeTab === 'profile-timeslots' && (
                          <div className="space-y-6">
                            <div className="mb-6">
                              <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Operating Time Slots</h3>
                            </div>

                            <div className="border border-[#2b2b2b] bg-[#252526] overflow-hidden max-w-[1000px]">
                              <div className="p-4 bg-[#1e1e1e] border-b border-[#2b2b2b] flex justify-between items-center">
                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Manage Time Slots</span>
                                <button
                                  type="button"
                                  onClick={() => setSlotFormState({
                                    index: -1,
                                    data: {
                                      name: '',
                                      startTime: '06:00',
                                      endTime: '08:00',
                                      activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                                      slotType: 'Batch',
                                      status: 'Active',
                                      capacity: ''
                                    }
                                  })}
                                  className="bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1 rounded text-[11px] font-bold transition-all"
                                >
                                  Add Slot
                                </button>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12px]">
                                  <thead>
                                    <tr className="bg-[#1e1e1e] border-b border-[#2b2b2b]">
                                      <th className="px-4 py-3 font-medium text-gray-500 min-w-[140px]">SLOT NAME *</th>
                                      <th className="px-4 py-3 font-medium text-gray-500">TIMINGS *</th>
                                      <th className="px-4 py-3 font-medium text-gray-500 min-w-[200px]">ACTIVE DAYS *</th>
                                      <th className="px-4 py-3 font-medium text-gray-500">TYPE</th>
                                      <th className="px-4 py-3 font-medium text-gray-500">CAPACITY</th>
                                      <th className="px-4 py-3 font-medium text-gray-500">STATUS</th>
                                      <th className="px-4 py-3 font-medium text-gray-500 text-right">ACTIONS</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#2b2b2b]">
                                    {(!profileForm.timeSlots || profileForm.timeSlots.length === 0) ? (
                                      <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">No time slots configured. Add your first slot.</td>
                                      </tr>
                                    ) : (
                                      profileForm.timeSlots.map((slot, index) => {
                                        const updateSlot = (key, value) => {
                                          const newSlots = [...profileForm.timeSlots];
                                          newSlots[index] = { ...newSlots[index], [key]: value };
                                          setProfileForm({ ...profileForm, timeSlots: newSlots });
                                        };

                                        return (
                                          <tr key={index} className="hover:bg-[#2a2d2e] transition-colors group">
                                            <td className="px-4 py-3 font-bold text-white">
                                              {slot.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 font-mono">
                                              {formatTime12(slot.startTime)} <span className="text-gray-500 text-[10px] mx-1">TO</span> {formatTime12(slot.endTime)}
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex flex-wrap gap-1">
                                                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => {
                                                  const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                                                  const fullDay = fullDays[['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].indexOf(day)];
                                                  const isActive = (slot.activeDays || []).includes(fullDay);
                                                  return (
                                                    <div
                                                      key={day}
                                                      className={`w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center transition-all ${isActive ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-[#1e1e1e] text-gray-600 border border-[#2b2b2b]'
                                                        }`}
                                                      title={fullDay}
                                                    >
                                                      {day}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </td>
                                            <td className="px-4 py-3">
                                              <span className="bg-[#1e1e1e] border border-[#2b2b2b] px-2 py-1 rounded text-gray-300">
                                                {slot.slotType || 'Batch'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-400 font-mono">
                                              {slot.capacity ? slot.capacity : '∞'}
                                            </td>
                                            <td className="px-4 py-3">
                                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${slot.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                }`}
                                              >
                                                {slot.status || 'Active'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3">
                                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                  type="button"
                                                  onClick={() => setSlotFormState({ index, data: { ...slot } })}
                                                  className="w-7 h-7 rounded bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                                                >
                                                  <Edit3 size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setDeleteConfirmState({
                                                    title: 'Delete Time Slot',
                                                    message: `Are you sure you want to delete the "${slot.name || 'Unnamed'}" time slot? You must save settings to persist this change.`,
                                                    onConfirm: async () => {
                                                      const newSlots = profileForm.timeSlots.filter((_, i) => i !== index);
                                                      setProfileForm({ ...profileForm, timeSlots: newSlots });
                                                    }
                                                  })}
                                                  className="w-7 h-7 rounded bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center text-gray-400 hover:text-danger hover:border-danger/30 transition-all"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <AnimatePresence>
                              {slotFormState && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                                >
                                  <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-full">
                                    <div className="p-4 border-b border-[#2b2b2b] flex justify-between items-center bg-[#252526]">
                                      <h4 className="text-white font-bold tracking-wide">
                                        {slotFormState.index === -1 ? 'Add New Time Slot' : 'Edit Time Slot'}
                                      </h4>
                                      <button type="button" onClick={() => setSlotFormState(null)} className="text-gray-400 hover:text-white transition-colors">
                                        <X size={18} />
                                      </button>
                                    </div>
                                    <div className="p-5 space-y-4 overflow-y-auto no-scrollbar">
                                      <div className="space-y-1">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Slot Name *</label>
                                        <input
                                          className="w-full bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded"
                                          value={slotFormState.data.name}
                                          onChange={e => setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, name: e.target.value } })}
                                          placeholder="e.g. Morning Batch"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Start Time *</label>
                                          <div className="flex items-center gap-1.5">
                                            <select
                                              className="flex-1 bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded cursor-pointer"
                                              value={parseTime24(slotFormState.data.startTime).hour}
                                              onChange={e => {
                                                const { minute, period } = parseTime24(slotFormState.data.startTime);
                                                const newTime = formatTime24(e.target.value, minute, period);
                                                setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, startTime: newTime } });
                                              }}
                                            >
                                              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                              ))}
                                            </select>
                                            <span className="text-gray-400 font-bold text-sm">:</span>
                                            <select
                                              className="flex-1 bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded cursor-pointer"
                                              value={parseTime24(slotFormState.data.startTime).minute}
                                              onChange={e => {
                                                const { hour, period } = parseTime24(slotFormState.data.startTime);
                                                const newTime = formatTime24(hour, e.target.value, period);
                                                setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, startTime: newTime } });
                                              }}
                                            >
                                              {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                                                <option key={m} value={m}>{m}</option>
                                              ))}
                                            </select>
                                            <select
                                              className="bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded cursor-pointer w-[70px]"
                                              value={parseTime24(slotFormState.data.startTime).period}
                                              onChange={e => {
                                                const { hour, minute } = parseTime24(slotFormState.data.startTime);
                                                const newTime = formatTime24(hour, minute, e.target.value);
                                                setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, startTime: newTime } });
                                              }}
                                            >
                                              <option value="AM">AM</option>
                                              <option value="PM">PM</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">End Time *</label>
                                          <div className="flex items-center gap-1.5">
                                            <select
                                              className="flex-1 bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded cursor-pointer"
                                              value={parseTime24(slotFormState.data.endTime).hour}
                                              onChange={e => {
                                                const { minute, period } = parseTime24(slotFormState.data.endTime);
                                                const newTime = formatTime24(e.target.value, minute, period);
                                                setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, endTime: newTime } });
                                              }}
                                            >
                                              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                              ))}
                                            </select>
                                            <span className="text-gray-400 font-bold text-sm">:</span>
                                            <select
                                              className="flex-1 bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded cursor-pointer"
                                              value={parseTime24(slotFormState.data.endTime).minute}
                                              onChange={e => {
                                                const { hour, period } = parseTime24(slotFormState.data.endTime);
                                                const newTime = formatTime24(hour, e.target.value, period);
                                                setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, endTime: newTime } });
                                              }}
                                            >
                                              {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                                                <option key={m} value={m}>{m}</option>
                                              ))}
                                            </select>
                                            <select
                                              className="bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded cursor-pointer w-[70px]"
                                              value={parseTime24(slotFormState.data.endTime).period}
                                              onChange={e => {
                                                const { hour, minute } = parseTime24(slotFormState.data.endTime);
                                                const newTime = formatTime24(hour, minute, e.target.value);
                                                setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, endTime: newTime } });
                                              }}
                                            >
                                              <option value="AM">AM</option>
                                              <option value="PM">PM</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Days *</label>
                                        <div className="flex flex-wrap gap-2">
                                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                            const isActive = slotFormState.data.activeDays.includes(day);
                                            return (
                                              <button
                                                key={day}
                                                type="button"
                                                onClick={() => {
                                                  const newDays = isActive
                                                    ? slotFormState.data.activeDays.filter(d => d !== day)
                                                    : [...slotFormState.data.activeDays, day];
                                                  setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, activeDays: newDays } });
                                                }}
                                                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all ${isActive ? 'bg-accent text-black shadow-[0_0_10px_rgba(163,230,53,0.3)]' : 'bg-[#141414] text-gray-400 border border-[#3c3c3c] hover:border-gray-500'
                                                  }`}
                                              >
                                                {day.substring(0, 3)}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Slot Type</label>
                                          <select
                                            className="w-full bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded"
                                            value={slotFormState.data.slotType}
                                            onChange={e => setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, slotType: e.target.value } })}
                                          >
                                            <option value="Batch">Batch</option>
                                            <option value="Full Day">Full Day</option>
                                            <option value="24/7">24/7</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</label>
                                          <select
                                            className="w-full bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded"
                                            value={slotFormState.data.status}
                                            onChange={e => setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, status: e.target.value } })}
                                          >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                          </select>
                                        </div>
                                      </div>

                                      <div className="space-y-1 pt-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                                          <span>Capacity <span className="text-gray-600 font-normal ml-1">(Optional)</span></span>
                                          <span className="text-[9px] font-normal text-gray-500">Leave blank for unlimited</span>
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          className="w-full bg-[#141414] border border-[#3c3c3c] focus:border-accent p-2.5 text-[13px] outline-none text-white transition-all rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          value={slotFormState.data.capacity || ''}
                                          onChange={e => setSlotFormState({ ...slotFormState, data: { ...slotFormState.data, capacity: e.target.value === '' ? '' : Number(e.target.value) } })}
                                          placeholder="e.g. 80"
                                        />
                                      </div>

                                    </div>
                                    <div className="p-4 border-t border-[#2b2b2b] bg-[#252526] flex justify-end gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setSlotFormState(null)}
                                        className="px-4 py-2 text-[12px] font-bold text-gray-400 hover:text-white transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!slotFormState.data.name || !slotFormState.data.startTime || !slotFormState.data.endTime || slotFormState.data.activeDays.length === 0) {
                                            alert('Please fill out all required fields.');
                                            return;
                                          }
                                          const newSlots = [...(profileForm.timeSlots || [])];
                                          if (slotFormState.index === -1) {
                                            newSlots.push(slotFormState.data);
                                          } else {
                                            newSlots[slotFormState.index] = slotFormState.data;
                                          }
                                          setProfileForm({ ...profileForm, timeSlots: newSlots });
                                          setSlotFormState(null);
                                        }}
                                        className="px-6 py-2 rounded text-[12px] font-bold bg-accent text-black hover:bg-[#a3e635] shadow-[0_0_15px_rgba(163,230,53,0.3)] transition-all"
                                      >
                                        {slotFormState.index === -1 ? 'Add Slot' : 'Save Changes'}
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                          </div>
                        )}

                        {activeTab === 'profile-whatsapp' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                            {/* Automated WhatsApp Messaging (First) */}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Automated WhatsApp Messaging</h3>
                                <button
                                  type="button"
                                  onClick={handleResetAutomations}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer select-none"
                                >
                                  <RotateCcw size={12} /> Reset to Defaults
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 bg-[#252526] p-5 rounded-lg border border-[#2b2b2b] shadow-sm">
                                {/* Left Side: Automation Selector */}
                                <div className="space-y-2 lg:border-r lg:border-[#3c3c3c] lg:pr-4">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-3">Automations</p>
                                  {[
                                    { id: 'welcomeMessage', label: 'Welcome Message', desc: 'When new member joins' },
                                    { id: 'birthdayWish', label: 'Birthday Wishes', desc: 'On member birthday' },
                                    { id: 'paymentReminder', label: 'Payment Reminder', desc: 'Before plan expiry' },
                                    { id: 'comebackNudge', label: 'Comeback Nudge', desc: 'For inactive members' },
                                    { id: 'newLeadNudge', label: 'Lead Attention Grabber', desc: 'When new lead is added' },
                                    { id: 'leadFollowup', label: 'Lead Inactivity Follow-Up', desc: 'If lead is inactive for X days' },
                                    { id: 'leadFollowupReminder', label: 'Lead Follow-Up Date Nudge', desc: 'On scheduled follow-up date' },
                                    { id: 'salaryPayout', label: 'Salary Payout Alert', desc: 'When salary is paid to trainer/staff' }
                                  ].map((item) => {
                                    const isEnabled = profileForm.whatsappConfig?.automations?.[item.id]?.enabled ?? true;
                                    const isActive = activeAutomationTab === item.id;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActiveAutomationTab(item.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-center justify-between ${
                                          isActive 
                                            ? 'bg-accent/10 border-accent text-white shadow-sm' 
                                            : 'bg-[#1e1e1e]/60 border-[#3c3c3c] hover:border-gray-500 text-gray-400 hover:text-white'
                                        }`}
                                      >
                                        <div className="min-w-0 pr-2">
                                          <p className="text-[12px] font-bold truncate">{item.label}</p>
                                          <p className="text-[9px] text-gray-500 truncate mt-0.5">{item.desc}</p>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isEnabled ? 'bg-accent' : 'bg-gray-600'}`} />
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Right Side: Settings Editor & Live Preview */}
                                <div className="space-y-6">
                                  {(() => {
                                    const tab = activeAutomationTab;
                                    const automationData = profileForm.whatsappConfig?.automations?.[tab] || {};
                                    const isEnabled = automationData.enabled ?? true;
                                    
                                    const WHATSAPP_PRESETS = {
                                      welcomeMessage: {
                                        default: "Hello {member_name}! Welcome to {gym_name}. We're excited to have you on board! Let's smash those fitness goals together! 🚀",
                                        friendly: "Hey {member_name}! Welcome to the {gym_name} family! ❤️ So glad to have you train with us. Let's make every session count! 💪🏋️",
                                        professional: "Dear {member_name}, thank you for registering with {gym_name}. We look forward to assisting you in achieving your fitness goals. Best regards, Team {gym_name}."
                                      },
                                      birthdayWish: {
                                        default: "Happy Birthday {member_name}! 🎂 Wishing you a fantastic day and a year full of strength and health from {gym_name}! 💪",
                                        friendly: "Happy Birthday {member_name}! 🎉🎂 Wishing you a wonderful day filled with fun and laughter. Keep pushing your limits! Have a great one! – {gym_name}",
                                        professional: "On behalf of the entire team at {gym_name}, we wish you a very Happy Birthday, {member_name}. May the year ahead bring you success and good health."
                                      },
                                      paymentReminder: {
                                        default: "Hello {member_name}, this is a reminder from {gym_name} that your membership expires in {days_left} days ({expiry_date}). Renew now to keep training without interruptions! 💳",
                                        friendly: "Hey {member_name}! Just a quick heads up that your plan at {gym_name} is expiring in {days_left} days. Don't lose your streak, renew today! 🏃‍♂️⚡",
                                        urgent: "URGENT: Hello {member_name}, your membership at {gym_name} will expire in {days_left} days on {expiry_date}. Please renew immediately to avoid interruption in gym access. ⚠️"
                                      },
                                      comebackNudge: {
                                        default: "Hey {member_name}! We missed you at {gym_name}. It's been {days_inactive} days since your last session. Let's get back on track! When are you coming in? 🏋️",
                                        friendly: "Hey {member_name}! Your dumbbells are missing you at {gym_name}! 🥺 It's been {days_inactive} days. Let's hit the gym tomorrow and restart the progress!",
                                        urgent: "Hello {member_name}. Consistency is key to your goals. You've been inactive for {days_inactive} days. Let's overcome the hurdle and make a comeback at {gym_name} today! 💪"
                                      },
                                      newLeadNudge: {
                                        default: "Hi {member_name}! Thanks for checking out {gym_name}. 🏋️ Claim your FREE 1-day pass today and start your journey! Respond to book your slot. 💪",
                                        friendly: "Hey {member_name}! Thanks for showing interest in {gym_name}. ❤️ We'd love to invite you for a free trial workout! When would you like to drop by? 🏋️✨",
                                        promotion: "Hurry {member_name}! Get a free trial session at {gym_name} + 20% discount on sign-up if you join this week. Book your free pass now! 🎁💪"
                                      },
                                      leadFollowup: {
                                        default: "Hi {member_name}! Just checking back in. Did you have any questions about {gym_name}? We have a special discount if you sign up this week! 💸💪",
                                        friendly: "Hey {member_name}! It's been {days_inactive} days since you reached out to {gym_name}. Still want to smash those goals? Let's book a trial slot! 🏃‍♂️⚡",
                                        urgent: "Limited Spot Offer: Hi {member_name}! Just {days_inactive} days left of our special package at {gym_name}. Join today and save big! ⚠️💸"
                                      },
                                      leadFollowupReminder: {
                                        default: "Hello {member_name}! This is a reminder for your scheduled follow-up session/call with {gym_name} today. Let's discuss your fitness goals! 📅🏋️",
                                        friendly: "Hey {member_name}! Can't wait for our chat today to discuss your training plans at {gym_name}. See you soon! 🤝😊",
                                        professional: "Dear {member_name}, this is to confirm your scheduled consultation with {gym_name} today. We look forward to speaking with you. Best regards, Team {gym_name}."
                                      },
                                      salaryPayout: {
                                        default: "Hello {staff_name}!\n\nYour salary for {month} has been paid successfully!\n\nPayment Details:\n{payment_details}\n\nThank you for your dedication and hard work! 💪\n- {gym_name}",
                                        friendly: "Hey {staff_name}! 🎉\n\nYour payroll for {month} has been successfully disbursed!\n\nReceipt:\n{payment_details}\n\nAwesome job this month, keep rocking! 🚀⚡\n- {gym_name}",
                                        formal: "Dear {staff_name},\n\nWe are pleased to inform you that your salary for the month of {month} has been paid.\n\nTransaction Summary:\n{payment_details}\n\nThank you for your valuable contribution.\n\nBest regards,\n{gym_name}"
                                      }
                                    };

                                    const updateAutomationField = (field, val) => {
                                      setProfileForm({
                                        ...profileForm,
                                        whatsappConfig: {
                                          ...(profileForm.whatsappConfig || {}),
                                          automations: {
                                            ...(profileForm.whatsappConfig?.automations || {}),
                                            [tab]: {
                                              ...(profileForm.whatsappConfig?.automations?.[tab] || {}),
                                              [field]: val
                                            }
                                          }
                                        }
                                      });
                                    };

                                    const applyPreset = (presetKey) => {
                                      const text = WHATSAPP_PRESETS[tab]?.[presetKey];
                                      if (text) {
                                        updateAutomationField('templateText', text);
                                      }
                                    };

                                    // Preview Variable replacement helper
                                    const getPreviewText = () => {
                                      const text = automationData.templateText || '';
                                      const gymName = profileForm.gymName || user?.gymName || 'Apex Gym';
                                      let preview = text
                                        .replace(/{member_name}/g, 'John Doe')
                                        .replace(/{gym_name}/g, gymName);
                                      
                                      if (tab === 'paymentReminder') {
                                        const days = automationData.daysBefore ?? 3;
                                        const expiry = new Date();
                                        expiry.setDate(expiry.getDate() + days);
                                        preview = preview
                                          .replace(/{days_left}/g, days.toString())
                                          .replace(/{expiry_date}/g, expiry.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
                                      }
                                      if (tab === 'comebackNudge' || tab === 'leadFollowup') {
                                        const days = tab === 'leadFollowup' ? (automationData.daysInactive ?? 2) : (automationData.daysInactive ?? 5);
                                        preview = preview.replace(/{days_inactive}/g, days.toString());
                                      }
                                      if (tab === 'salaryPayout') {
                                        preview = preview
                                          .replace(/{staff_name}/g, 'Alex Carter')
                                          .replace(/{month}/g, new Date().toLocaleString('en-US', { month: 'long' }))
                                          .replace(/{payment_details}/g, '- Fixed Salary: ₹15,000\n- Commission: ₹2,500\n- Total Amount: ₹17,500\n- Notes: Monthly Payout Disbursed');
                                      }
                                      return preview;
                                    };

                                    return (
                                      <div className="space-y-5 animate-in fade-in duration-200">
                                        {/* Toggle Active */}
                                        <div className="flex items-center justify-between pb-3 border-b border-[#3c3c3c]">
                                          <div>
                                            <p className="text-[13px] font-bold text-white uppercase tracking-wider">
                                              {tab === 'welcomeMessage' && 'Welcome Message Automation'}
                                              {tab === 'birthdayWish' && 'Birthday Greetings Automation'}
                                              {tab === 'paymentReminder' && 'Payment Expiry Reminders'}
                                              {tab === 'comebackNudge' && 'Comeback Nudges (Re-engagement)'}
                                              {tab === 'newLeadNudge' && 'Lead Attention Grabber'}
                                              {tab === 'leadFollowup' && 'Lead Inactivity Follow-Up'}
                                              {tab === 'leadFollowupReminder' && 'Lead Follow-Up Date Nudge'}
                                              {tab === 'salaryPayout' && 'Salary Payout Alerts'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                              {tab === 'welcomeMessage' && 'Triggers immediately when a new member is added.'}
                                              {tab === 'birthdayWish' && 'Sends automatically at 9:00 AM on a member\'s birthday.'}
                                              {tab === 'paymentReminder' && 'Triggers automatically a few days prior to plan expiry.'}
                                              {tab === 'comebackNudge' && 'Triggers when a member hasn\'t checked in for several days.'}
                                              {tab === 'newLeadNudge' && 'Triggers immediately when a new lead is added.'}
                                              {tab === 'leadFollowup' && 'Triggers automatically if a lead remains inactive for several days.'}
                                              {tab === 'leadFollowupReminder' && 'Triggers automatically on a lead\'s scheduled follow-up date.'}
                                              {tab === 'salaryPayout' && 'Sends automatically when a salary payment is recorded for a trainer or staff member.'}
                                            </p>
                                          </div>
                                          <label className="relative inline-flex items-center cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              className="sr-only peer"
                                              checked={isEnabled}
                                              onChange={e => updateAutomationField('enabled', e.target.checked)}
                                            />
                                            <div className="w-9 h-5 bg-[#1e1e1e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-black peer-checked:after:border-black"></div>
                                          </label>
                                        </div>

                                        {isEnabled ? (
                                          <div className="space-y-5">
                                            {/* Trigger Configuration (if reminder or nudge) */}
                                            {(tab === 'paymentReminder' || tab === 'comebackNudge' || tab === 'leadFollowup') && (
                                              <div className="bg-[#1e1e1e]/60 p-3 rounded-lg border border-[#3c3c3c] flex items-center gap-3">
                                                <Clock size={16} className="text-accent" />
                                                <span className="text-[11px] text-gray-400">
                                                  {tab === 'paymentReminder' ? 'Send reminder' : 'Send nudge/follow-up after'}
                                                </span>
                                                <input
                                                  type="number"
                                                  min="1"
                                                  max={tab === 'paymentReminder' ? 30 : 90}
                                                  className="w-16 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-1 text-[11px] text-center text-white rounded outline-none"
                                                  value={tab === 'paymentReminder' ? (automationData.daysBefore ?? 3) : (tab === 'leadFollowup' ? (automationData.daysInactive ?? 2) : (automationData.daysInactive ?? 5))}
                                                  onChange={e => updateAutomationField(tab === 'paymentReminder' ? 'daysBefore' : 'daysInactive', Number(e.target.value))}
                                                />
                                                <span className="text-[11px] text-gray-400">
                                                  {tab === 'paymentReminder' ? 'days before membership expires' : 'days of inactivity'}
                                                </span>
                                              </div>
                                            )}
 
                                            {/* Editor block */}
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                              {/* Left: Custom text template editor */}
                                              <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Custom Message Template</span>
                                                  <div className="flex gap-1.5">
                                                    {Object.keys(WHATSAPP_PRESETS[tab] || {}).map((preset) => (
                                                      <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => applyPreset(preset)}
                                                        className="text-[9px] font-bold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 px-2 py-0.5 rounded capitalize"
                                                      >
                                                        {preset}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                                
                                                <textarea
                                                  rows={5}
                                                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-3 text-[12px] text-white rounded outline-none resize-none font-sans leading-relaxed"
                                                  placeholder="Type your custom WhatsApp template..."
                                                  value={automationData.templateText || ''}
                                                  onChange={e => updateAutomationField('templateText', e.target.value)}
                                                />
                                                
                                                {/* Variable helper tags */}
                                                <div>
                                                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Available Variables (Click to Insert)</p>
                                                  <div className="flex flex-wrap gap-1.5 font-sans">
                                                    {[
                                                      { placeholder: '{member_name}', label: 'Member Name' },
                                                      { placeholder: '{gym_name}', label: 'Gym Name' },
                                                      ...(tab === 'paymentReminder' ? [
                                                        { placeholder: '{days_left}', label: 'Days Remaining' },
                                                        { placeholder: '{expiry_date}', label: 'Expiry Date' }
                                                      ] : []),
                                                      ...((tab === 'comebackNudge' || tab === 'leadFollowup') ? [
                                                        { placeholder: '{days_inactive}', label: 'Days Inactive' }
                                                      ] : []),
                                                      ...(tab === 'salaryPayout' ? [
                                                        { placeholder: '{staff_name}', label: 'Staff/Trainer Name' },
                                                        { placeholder: '{month}', label: 'Payment Month' },
                                                        { placeholder: '{payment_details}', label: 'Breakdown Details' }
                                                      ] : [])
                                                    ].map((v) => (
                                                      <button
                                                        key={v.placeholder}
                                                        type="button"
                                                        onClick={() => {
                                                          const text = automationData.templateText || '';
                                                          updateAutomationField('templateText', text + v.placeholder);
                                                        }}
                                                        className="text-[9px] font-mono text-gray-400 bg-[#1e1e1e] border border-[#3c3c3c] hover:border-gray-500 hover:text-white px-2 py-1 rounded"
                                                      >
                                                        {v.placeholder} ({v.label})
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Right: Live Chat Bubble Mockup */}
                                              <div className="flex flex-col rounded-lg border border-[#2b2b2b] bg-[#0c141a] overflow-hidden min-h-[220px]">
                                                {/* WhatsApp Mock Header */}
                                                <div className="bg-[#1f2c34] px-4 py-2.5 flex items-center gap-2 border-b border-[#2b2b2b] select-none">
                                                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[11px] font-bold">
                                                    W
                                                  </div>
                                                  <div>
                                                    <p className="text-[11px] font-bold text-white leading-none">WhatsApp Automation Engine</p>
                                                    <p className="text-[8px] text-accent leading-none mt-0.5">Online</p>
                                                  </div>
                                                </div>
                                                
                                                {/* WhatsApp Chat Body */}
                                                <div className="flex-1 p-4 bg-[#0b141a] bg-opacity-95 flex flex-col justify-end space-y-4 font-sans relative" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                                                  {/* WhatsApp Chat Bubble */}
                                                  <div className="bg-[#005c4b] text-white p-3 rounded-lg rounded-tr-none max-w-[85%] self-end shadow relative text-[11.5px] leading-relaxed break-words whitespace-pre-wrap">
                                                    <p className="pr-8">{getPreviewText() || 'Type template message to see live preview...'}</p>
                                                    <div className="absolute bottom-1 right-2 flex items-center gap-0.5 select-none">
                                                      <span className="text-[8px] text-[#ffffff99]">10:15 AM</span>
                                                      <span className="text-accent text-[10px] font-bold">✓✓</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center py-10 bg-[#1e1e1e]/40 rounded-lg border border-dashed border-[#3c3c3c] text-center">
                                            <p className="text-xs text-gray-500 italic">This automated message is currently disabled.</p>
                                            <button
                                              type="button"
                                              onClick={() => updateAutomationField('enabled', true)}
                                              className="mt-2.5 text-[10px] font-bold text-accent hover:underline"
                                            >
                                              Click to Enable Automation
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* WhatsApp Business API (Second) */}
                            <div className="pt-8 border-t border-[#2b2b2b] space-y-6">
                              <div>
                                <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">WhatsApp Business API</h3>
                                <p className="text-[11px] text-gray-500 mt-1">Configure your own WhatsApp Business Cloud API credentials to enable automated messaging to gym members.</p>
                              </div>

                              {/* Warning / Unlock Override Card */}
                              {!isApiUnlocked ? (
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <Lock size={18} className="text-yellow-500 shrink-0 animate-pulse" />
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-wide text-white">API Credentials Locked</p>
                                      <p className="text-[11px] text-zinc-400 mt-0.5">To prevent accidental disruption of automated messages to your members, editing these details is restricted.</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowUnlockWarning(true)}
                                    className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                                  >
                                    Unlock API Details
                                  </button>
                                </div>
                              ) : (
                                <div className="p-4 bg-[#b8f175]/10 border border-[#b8f175]/20 text-[#b8f175] rounded-lg flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-[#b8f175] shrink-0" />
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-wide">API Editing Enabled</p>
                                      <p className="text-[11px] text-zinc-400 mt-0.5">You can now modify the Phone Number ID, Access Token, and Business Account ID below. Be extremely careful.</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsApiUnlocked(false)}
                                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                                  >
                                    Lock API Details
                                  </button>
                                </div>
                              )}

                              {showUnlockWarning && !isApiUnlocked && (
                                <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5 animate-bounce" />
                                    <div className="space-y-1">
                                      <p className="text-xs font-bold uppercase tracking-wide text-white">CRITICAL WARNING: API Override Action Required</p>
                                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                                        Modifying these API settings will immediately affect how GoJim delivers automated WhatsApp messages (Welcome Messages, Birthday Wishes, Reminders, and Comeback Nudges) to your members. 
                                      </p>
                                      <p className="text-[11px] text-red-400/90 font-bold leading-relaxed">
                                        If you enter incorrect values, ALL automated message notifications will fail silently and your customers will not receive any updates.
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-3 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowUnlockWarning(false)}
                                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsApiUnlocked(true);
                                        setShowUnlockWarning(false);
                                      }}
                                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
                                    >
                                      Yes, I want to Override
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-0 divide-y divide-[#2b2b2b] bg-[#252526] px-5 rounded-lg border border-[#2b2b2b] shadow-sm">
                                {/* Phone Number ID */}
                                <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Phone Number ID</div>
                                  <input
                                    className="w-full max-w-sm bg-[#1e1e1e] disabled:bg-[#1e1e1e]/40 disabled:text-gray-500 disabled:cursor-not-allowed border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                    disabled={!isApiUnlocked}
                                    value={profileForm.whatsappConfig?.phoneNumberId || ''}
                                    onChange={e => setProfileForm({
                                      ...profileForm,
                                      whatsappConfig: {
                                        ...(profileForm.whatsappConfig || {}),
                                        phoneNumberId: e.target.value
                                      }
                                    })}
                                    placeholder="e.g. 109482901847120"
                                  />
                                </div>

                                {/* Access Token */}
                                <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Access Token</div>
                                  <div className="relative w-full max-w-sm">
                                    <input
                                      type="text"
                                      className="w-full bg-[#1e1e1e] disabled:bg-[#1e1e1e]/40 disabled:text-gray-500 disabled:cursor-not-allowed border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded pr-10"
                                      disabled={!isApiUnlocked}
                                      value={profileForm.whatsappConfig?.accessToken || ''}
                                      onChange={e => setProfileForm({
                                        ...profileForm,
                                        whatsappConfig: {
                                          ...(profileForm.whatsappConfig || {}),
                                          accessToken: e.target.value
                                        }
                                      })}
                                      placeholder="EAAB..."
                                    />
                                  </div>
                                </div>

                                {/* Business Account ID */}
                                <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Business Account ID</div>
                                  <input
                                    className="w-full max-w-sm bg-[#1e1e1e] disabled:bg-[#1e1e1e]/40 disabled:text-gray-500 disabled:cursor-not-allowed border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white transition-all rounded"
                                    disabled={!isApiUnlocked}
                                    value={profileForm.whatsappConfig?.businessAccountId || ''}
                                    onChange={e => setProfileForm({
                                      ...profileForm,
                                      whatsappConfig: {
                                        ...(profileForm.whatsappConfig || {}),
                                        businessAccountId: e.target.value
                                      }
                                    })}
                                    placeholder="e.g. 102948291048294"
                                  />
                                </div>

                                {/* Verification Status */}
                                <div className="py-3 grid grid-cols-[180px_1fr] items-center gap-4">
                                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">API Verification</div>
                                  <div className="flex items-center gap-3">
                                    <label className={`relative inline-flex items-center ${!isApiUnlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                      <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        disabled={!isApiUnlocked}
                                        checked={profileForm.whatsappConfig?.isVerified || false}
                                        onChange={e => setProfileForm({
                                          ...profileForm,
                                          whatsappConfig: {
                                            ...(profileForm.whatsappConfig || {}),
                                            isVerified: e.target.checked
                                          }
                                        })}
                                      />
                                      <div className="w-9 h-5 bg-[#1e1e1e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-black peer-checked:after:border-black"></div>
                                    </label>
                                    <span className={`text-[11px] font-bold ${profileForm.whatsappConfig?.isVerified ? 'text-accent' : 'text-gray-500'}`}>
                                      {profileForm.whatsappConfig?.isVerified ? 'Enabled & Verified' : 'Disabled (Mocked Mode)'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}


                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#2b2b2b]">
                          {saveStatus === 'success' && (
                            <span className="text-[12px] text-accent font-bold flex items-center gap-1 mr-4">
                              <Check size={14} /> Saved Successfully
                            </span>
                          )}
                          <button type="button" onClick={onClose} className="text-[12px] text-gray-400 hover:text-white px-4 transition-colors">Cancel</button>
                          <button type="button" disabled={isSaving} onClick={handleSaveProfile} className="bg-accent hover:bg-[#a3e635] disabled:bg-gray-700 disabled:text-gray-500 text-black px-6 py-2 rounded text-[12px] font-bold transition-colors">
                            {isSaving ? 'Saving...' : 'Save Profile Settings'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {false && (
                    <div className="space-y-8">
                      <div className="pb-12 max-w-4xl">
                        {activeTab === 'categories-equipment' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                            <div className="mb-6 flex items-center justify-between">
                              <div>
                                <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Equipment Categories</h3>
                                <p className="text-[11px] text-gray-500 mt-1">Configure default category dropdown choices for gym equipment listing.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleResetEquipmentCategories}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                              >
                                <RotateCcw size={12} /> Reset to Defaults
                              </button>
                            </div>

                            <div className="space-y-4 max-w-xl">
                              <div className="bg-[#252526] p-5 rounded-lg border border-[#2b2b2b] shadow-sm space-y-4">
                                <div className="flex gap-2">
                                  <input
                                    placeholder="Add new category (e.g. Cardio, Strength)"
                                    className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white rounded transition-all"
                                    id="new-category-input"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.target.value.trim();
                                        if (val) {
                                          const current = profileForm.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories'];
                                          if (current.includes(val)) {
                                            showToast('Category already exists!', 'warning');
                                            return;
                                          }
                                          const updated = [...current, val];
                                          setProfileForm({ ...profileForm, equipmentCategories: updated });
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('new-category-input');
                                      const val = input.value.trim();
                                      if (val) {
                                        const current = profileForm.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories'];
                                        if (current.includes(val)) {
                                          showToast('Category already exists!', 'warning');
                                          return;
                                        }
                                        const updated = [...current, val];
                                        setProfileForm({ ...profileForm, equipmentCategories: updated });
                                        input.value = '';
                                      }
                                    }}
                                    className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2 rounded text-[11px] font-bold transition-all"
                                  >
                                    Add
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Categories</p>
                                  <div className="flex flex-col gap-1 divide-y divide-[#2b2b2b]">
                                    {(profileForm.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories']).map((cat, idx) => (
                                      <div key={idx} className="flex items-center justify-between py-2 text-[12px] text-white">
                                        <span>{cat}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = profileForm.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories'];
                                            if (current.length <= 1) {
                                              showToast('Must have at least one category!', 'warning');
                                              return;
                                            }
                                            const updated = current.filter(c => c !== cat);
                                            setProfileForm({ ...profileForm, equipmentCategories: updated });
                                          }}
                                          className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                                          title="Remove Category"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'categories-expense' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                            <div className="mb-6 flex items-center justify-between">
                              <div>
                                <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Expense Categories & Titles</h3>
                                <p className="text-[11px] text-gray-500 mt-1">Configure dynamic category dropdown choices and dependent titles for recording expenses.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleResetExpenseCategories}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                              >
                                <RotateCcw size={12} /> Reset to Defaults
                              </button>
                            </div>

                            {loadingExpenseCats && expenseCategories.length === 0 ? (
                              <div className="text-[12px] text-gray-400 py-10">Loading expense categories...</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                {/* Left side: Categories List */}
                                <div className="md:col-span-5 bg-[#252526] p-5 rounded-lg border border-[#2b2b2b] shadow-sm space-y-4">
                                  <div className="flex gap-2">
                                    <input
                                      placeholder="New Category (e.g. Office)"
                                      className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white rounded transition-all"
                                      value={newExpenseCatName}
                                      onChange={(e) => setNewExpenseCatName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleCreateExpenseCategory();
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCreateExpenseCategory()}
                                      className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2 rounded text-[11px] font-bold transition-all"
                                    >
                                      Add
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Categories</p>
                                    <div className="flex flex-col gap-1 divide-y divide-[#2b2b2b] max-h-[300px] overflow-y-auto pr-1">
                                      {expenseCategories.map((cat) => {
                                        const isSelected = selectedExpenseCategory?._id === cat._id;
                                        const isEditing = editingExpenseCatId === cat._id;

                                        return (
                                          <div
                                            key={cat._id}
                                            onClick={() => !isEditing && setSelectedExpenseCategory(cat)}
                                            className={`flex items-center justify-between py-2.5 px-2 text-[12px] rounded cursor-pointer transition-all ${isSelected
                                                ? 'bg-accent/10 text-accent font-bold'
                                                : 'text-white hover:bg-white/[0.03]'
                                              }`}
                                          >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              {isEditing ? (
                                                <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                                                  <input
                                                    type="text"
                                                    value={editingExpenseCatName}
                                                    onChange={e => setEditingExpenseCatName(e.target.value)}
                                                    className="bg-[#1e1e1e] border border-accent/40 rounded px-2 py-0.5 text-[11px] text-white outline-none w-full"
                                                    autoFocus
                                                  />
                                                  <button
                                                    onClick={() => handleUpdateExpenseCategoryName(cat._id)}
                                                    className="p-1 rounded bg-success/20 hover:bg-success/30 text-success transition-all border-none cursor-pointer"
                                                  >
                                                    <Check size={10} />
                                                  </button>
                                                  <button
                                                    onClick={() => setEditingExpenseCatId(null)}
                                                    className="p-1 rounded bg-danger/20 hover:bg-danger/30 text-danger transition-all border-none cursor-pointer"
                                                  >
                                                    <X size={10} />
                                                  </button>
                                                </div>
                                              ) : (
                                                <span className="truncate">{cat.name}</span>
                                              )}
                                            </div>

                                            {!isEditing && (
                                              <div className="flex items-center gap-1.5 ml-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingExpenseCatId(cat._id);
                                                    setEditingExpenseCatName(cat.name);
                                                  }}
                                                  className="text-gray-400 hover:text-accent p-0.5"
                                                  title="Rename Category"
                                                >
                                                  <Edit3 size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteExpenseCategory(cat._id, cat.name)}
                                                  className="text-red-500 hover:text-red-400 p-0.5"
                                                  title="Remove Category"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Right side: Selected Category Titles */}
                                <div className="md:col-span-7 bg-[#252526] p-5 rounded-lg border border-[#2b2b2b] shadow-sm space-y-4 min-h-[300px]">
                                  {selectedExpenseCategory ? (
                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-[10px] text-accent font-bold uppercase tracking-wider">Titles for "{selectedExpenseCategory.name}"</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">Define choice selections when this category is selected.</p>
                                      </div>

                                      <div className="flex gap-2">
                                        <input
                                          placeholder="New Title (e.g. Paper Supplies)"
                                          className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white rounded transition-all"
                                          value={newExpenseTitleName}
                                          onChange={(e) => setNewExpenseTitleName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleAddExpenseTitle();
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddExpenseTitle()}
                                          className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2 rounded text-[11px] font-bold transition-all"
                                        >
                                          Add
                                        </button>
                                      </div>

                                      <div className="space-y-2">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Dependent Titles</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                                          {selectedExpenseCategory.titles.map((title, index) => (
                                            <div
                                              key={index}
                                              className="flex items-center justify-between p-2 bg-[#1e1e1e] border border-[#2b2b2b] rounded text-[12px] text-white"
                                            >
                                              <span className="truncate">{title}</span>
                                              {title !== 'Other' && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteExpenseTitle(title)}
                                                  className="text-red-500 hover:text-red-400 p-0.5"
                                                  title="Remove Title"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                      <p className="text-[12px]">Select an expense category from the left list to edit its sub-titles.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'categories-staff' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                            <div className="mb-6 flex items-center justify-between">
                              <div>
                                <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Staff Role Categories</h3>
                                <p className="text-[11px] text-gray-500 mt-1">Configure default category dropdown choices for your gym staff roles.</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleResetStaffRoles}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                              >
                                <RotateCcw size={12} /> Reset to Defaults
                              </button>
                            </div>

                            <div className="space-y-4 max-w-xl">
                              <div className="bg-[#252526] p-5 rounded-lg border border-[#2b2b2b] shadow-sm space-y-4">
                                <div className="flex gap-2">
                                  <input
                                    placeholder="Add new role category (e.g. Nutritionist, Receptionist)"
                                    className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white rounded transition-all"
                                    id="new-role-input"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.target.value.trim();
                                        if (val) {
                                          const current = profileForm.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin'];
                                          if (current.includes(val)) {
                                            showToast('Role category already exists!', 'warning');
                                            return;
                                          }
                                          const updated = [...current, val];
                                          setProfileForm({ ...profileForm, staffRoles: updated });
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('new-role-input');
                                      const val = input.value.trim();
                                      if (val) {
                                        const current = profileForm.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin'];
                                        if (current.includes(val)) {
                                          showToast('Role category already exists!', 'warning');
                                          return;
                                        }
                                        const updated = [...current, val];
                                        setProfileForm({ ...profileForm, staffRoles: updated });
                                        input.value = '';
                                      }
                                    }}
                                    className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2 rounded text-[11px] font-bold transition-all"
                                  >
                                    Add
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Staff Roles</p>
                                  <div className="flex flex-col gap-1 divide-y divide-[#2b2b2b]">
                                    {(profileForm.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin']).map((role, idx) => (
                                      <div key={idx} className="flex items-center justify-between py-2 text-[12px] text-white">
                                        <span>{role}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = profileForm.staffRoles || ['Trainer', 'Manager', 'Staff', 'Admin'];
                                            if (current.length <= 1) {
                                              showToast('Must have at least one role category!', 'warning');
                                              return;
                                            }
                                            const updated = current.filter(r => r !== role);
                                            setProfileForm({ ...profileForm, staffRoles: updated });
                                          }}
                                          className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                                          title="Remove Role"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeTab === 'categories-specializations' && (
                          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                            <div className="mb-6 flex items-center justify-between">
                              <div>
                                <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">What he trains / Specializations</h3>
                                <p className="text-[11px] text-gray-500 mt-1">Configure dynamic trainer specialization categories / what they train (e.g. Weight Loss, CrossFit).</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleResetSpecializations}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                              >
                                <RotateCcw size={12} /> Reset to Defaults
                              </button>
                            </div>

                            <div className="space-y-4 max-w-xl">
                              <div className="bg-[#252526] p-5 rounded-lg border border-[#2b2b2b] shadow-sm space-y-4">
                                <div className="flex gap-2">
                                  <input
                                    placeholder="Add new specialization (e.g. Yoga, CrossFit)"
                                    className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-accent p-2 text-[12px] outline-none text-white rounded transition-all"
                                    id="new-specialization-input"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.target.value.trim();
                                        if (val) {
                                          const current = profileForm.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'];
                                          if (current.includes(val)) {
                                            showToast('Specialization already exists!', 'warning');
                                            return;
                                          }
                                          const updated = [...current, val];
                                          setProfileForm({ ...profileForm, specializations: updated });
                                          e.target.value = '';
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('new-specialization-input');
                                      const val = input.value.trim();
                                      if (val) {
                                        const current = profileForm.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'];
                                        if (current.includes(val)) {
                                          showToast('Specialization already exists!', 'warning');
                                          return;
                                        }
                                        const updated = [...current, val];
                                        setProfileForm({ ...profileForm, specializations: updated });
                                        input.value = '';
                                      }
                                    }}
                                    className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2 rounded text-[11px] font-bold transition-all"
                                  >
                                    Add
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Specializations</p>
                                  <div className="flex flex-col gap-1 divide-y divide-[#2b2b2b]">
                                    {(profileForm.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit']).map((spec, idx) => (
                                      <div key={idx} className="flex items-center justify-between py-2 text-[12px] text-white">
                                        <span>{spec}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = profileForm.specializations || ['Weight Loss', 'Muscle Building', 'Cardio Training', 'Yoga', 'Zumba', 'CrossFit'];
                                            if (current.length <= 1) {
                                              showToast('Must have at least one specialization category!', 'warning');
                                              return;
                                            }
                                            const updated = current.filter(s => s !== spec);
                                            setProfileForm({ ...profileForm, specializations: updated });
                                          }}
                                          className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                                          title="Remove Specialization"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#2b2b2b]">
                          {saveStatus === 'success' && (
                            <span className="text-[12px] text-accent font-bold flex items-center gap-1 mr-4">
                              <Check size={14} /> Saved Successfully
                            </span>
                          )}
                          <button type="button" onClick={onClose} className="text-[12px] text-gray-400 hover:text-white px-4 transition-colors">Cancel</button>
                          <button type="button" disabled={isSaving} onClick={handleSaveProfile} className="bg-accent hover:bg-[#a3e635] disabled:bg-gray-700 disabled:text-gray-500 text-black px-6 py-2 rounded text-[12px] font-bold transition-colors">
                            {isSaving ? 'Saving...' : 'Save Category Settings'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'membership' && (
                    <div className="max-w-4xl space-y-10">
                      {/* Header Section */}
                      {/* Header Section Removed */}

                      {/* Plan Management Interface */}
                      <div className="space-y-12">
                        {/* Action Bar */}
                        <div className="flex items-center justify-between bg-[#252526] p-4 border border-[#2b2b2b]">
                          <div className="flex items-center gap-4">
                            <span className="text-[11px] font-bold uppercase text-gray-500 tracking-widest">Active Packages</span>
                            <div className="h-4 w-px bg-white/10" />
                            <span className="text-[11px] text-accent">{filteredPlans.length} plans configured</span>
                          </div>
                          {!showPlanForm && (
                            <button
                              onClick={() => { setShowPlanForm(true); setEditingPlan(null); setPlanForm({ name: '', durationMonths: 1, actualPrice: '', discountedPrice: '', hasPtPricing: false, ptActualPrice: '', ptDiscountedPrice: '' }); }}
                              className="bg-accent hover:bg-[#a3e635] text-black px-4 py-1.5 rounded text-[11px] font-bold transition-all"
                            >
                              New Membership Plan
                            </button>
                          )}
                        </div>

                        {showPlanForm ? (
                          <div className="bg-[#252526] p-8 border border-[#b8f175]/30">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                              {editingPlan ? 'Configure Existing Plan' : 'Define New Configuration'}
                            </h3>
                            <form onSubmit={handlePlanSubmit} className="space-y-8">
                              <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-3">
                                  <label className="text-[12px] text-white">Plan Name</label>
                                  <input
                                    required
                                    className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-white transition-all"
                                    value={planForm.name}
                                    onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                                  />
                                  <p className="text-[11px] text-gray-500">Controls the display name of the package across member check-ins.</p>
                                </div>
                                <div className="space-y-3">
                                  <label className="text-[12px] text-white">Duration (Months)</label>
                                  <input
                                    type="number"
                                    required
                                    className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={planForm.durationMonths}
                                    onChange={e => {
                                      const val = parseInt(e.target.value);
                                      setPlanForm({ ...planForm, durationMonths: isNaN(val) ? '' : val });
                                    }}
                                  />
                                  <p className="text-[11px] text-gray-500">The total active duration in months after the payment anchor date.</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-3">
                                  <label className="text-[12px] text-white">Market Price (₹)</label>
                                  <input
                                    type="number"
                                    required
                                    className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={planForm.actualPrice}
                                    onChange={e => setPlanForm({ ...planForm, actualPrice: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-3">
                                  <label className="text-[12px] text-white">Discounted Price (₹)</label>
                                  <input
                                    type="number"
                                    required
                                    className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-accent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={planForm.discountedPrice}
                                    onChange={e => setPlanForm({ ...planForm, discountedPrice: e.target.value })}
                                  />
                                </div>
                              </div>

                              {/* Optional PT Add-on Pricing Toggle */}
                              <div className="flex items-center gap-3 py-2 border-t border-[#2b2b2b] pt-4">
                                <button
                                  type="button"
                                  onClick={() => setPlanForm({ ...planForm, hasPtPricing: !planForm.hasPtPricing })}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${planForm.hasPtPricing ? 'bg-accent' : 'bg-[#3c3c3c]'}`}
                                >
                                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${planForm.hasPtPricing ? 'translate-x-2' : '-translate-x-2'}`} />
                                </button>
                                <div>
                                  <label className="text-[12px] text-white font-bold uppercase tracking-wider">Include PT Pricing</label>
                                  <p className="text-[11px] text-gray-500 mt-0.5">Enabling this adds optional, separate personal training add-on pricing to this plan.</p>
                                </div>
                              </div>

                              {/* Conditional PT Section */}
                              {planForm.hasPtPricing && (
                                <div className="grid grid-cols-2 gap-10 border-t border-[#2b2b2b] pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="space-y-3">
                                    <label className="text-[12px] text-white">PT Market Price (₹)</label>
                                    <input
                                      type="number"
                                      required={planForm.hasPtPricing}
                                      className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={planForm.ptActualPrice}
                                      onChange={e => setPlanForm({ ...planForm, ptActualPrice: e.target.value })}
                                      placeholder="e.g. 8000"
                                    />
                                    <p className="text-[11px] text-gray-500">Standalone market price for the PT add-on component.</p>
                                  </div>
                                  <div className="space-y-3">
                                    <label className="text-[12px] text-white">PT Discounted Price (₹)</label>
                                    <input
                                      type="number"
                                      required={planForm.hasPtPricing}
                                      className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-accent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={planForm.ptDiscountedPrice}
                                      onChange={e => setPlanForm({ ...planForm, ptDiscountedPrice: e.target.value })}
                                      placeholder="e.g. 7000"
                                    />
                                    <p className="text-[11px] text-gray-500">The actual add-on price charged to the customer.</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-end gap-3 pt-6">
                                <button type="button" onClick={() => setShowPlanForm(false)} className="text-[12px] text-gray-400 hover:text-white px-4">Cancel</button>
                                <button type="submit" className="bg-accent text-black px-6 py-2 rounded text-[12px] font-bold">{editingPlan ? 'Apply Changes' : 'Initialize Plan'}</button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <div className="border border-[#2b2b2b] bg-[#252526] overflow-hidden">
                            <table className="w-full text-left text-[13px]">
                              <thead>
                                <tr className="bg-[#1e1e1e] border-b border-[#2b2b2b]">
                                  <th className="px-6 py-3 font-medium text-gray-500">PLAN CONFIGURATION</th>
                                  <th className="px-4 py-3 font-medium text-gray-500 text-center">VALIDITY</th>
                                  <th className="px-4 py-3 font-medium text-gray-500 text-center">PRICING</th>
                                  <th className="px-6 py-3 font-medium text-gray-500 text-right">ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#2b2b2b]">
                                {filteredPlans.map(plan => (
                                  <tr key={plan._id} className="group hover:bg-[#2a2d2e] transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="text-white font-medium">{plan.name}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <span className="text-accent font-bold">{plan.durationMonths}m</span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                      <div className="flex flex-col gap-1.5 justify-center items-center">
                                        <div>
                                          <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 uppercase font-black tracking-tight mr-1">Gym</span>
                                          <span className="text-white font-bold">₹{plan.discountedPrice}</span>
                                          <span className="text-[10px] text-gray-500 line-through ml-1">₹{plan.actualPrice}</span>
                                        </div>
                                        {plan.hasPtPricing && (
                                          <div>
                                            <span className="text-[9px] bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded text-accent uppercase font-black tracking-tight mr-1">PT Add-on</span>
                                            <span className="text-accent font-bold">₹{plan.ptDiscountedPrice}</span>
                                            <span className="text-[10px] text-gray-500 line-through ml-1">₹{plan.ptActualPrice}</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                          onClick={() => { setEditingPlan(plan); setPlanForm({ ...plan, hasPtPricing: plan.hasPtPricing || false, ptActualPrice: plan.ptActualPrice || '', ptDiscountedPrice: plan.ptDiscountedPrice || '' }); setShowPlanForm(true); }}
                                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-accent"
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmState({
                                            id: plan._id,
                                            title: 'Delete Package',
                                            message: `Are you sure you want to delete the "${plan.name}" package? This action cannot be undone.`,
                                            onConfirm: async () => {
                                              await plansApi.delete(plan._id);
                                              fetchPlans();
                                            }
                                          })}
                                          className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-red-400"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Auto-Deactivation Setting Subcategory */}
                        <div className="bg-[#252526] p-6 border border-[#2b2b2b]">
                          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                            Auto-Deactivate Inactive Members
                          </h3>
                          <div className="space-y-4">
                            <p className="text-[12px] text-gray-400">
                              If a member has not checked in or registered attendance for a consecutive number of days, the system will automatically mark them as <strong className="text-accent">Inactive (Deactivated)</strong>.
                            </p>
                            <div className="flex items-end gap-4 max-w-sm">
                              <div className="flex-1 space-y-2">
                                <label className="text-[12px] text-white">Days of absence before deactivation</label>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  className="w-full bg-[#3c3c3c] border-b border-transparent focus:border-accent p-2 text-[13px] outline-none text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={profileForm.deactivationThresholdDays !== undefined ? profileForm.deactivationThresholdDays : 60}
                                  onChange={e => {
                                    const val = parseInt(e.target.value);
                                    setProfileForm({ ...profileForm, deactivationThresholdDays: isNaN(val) ? '' : val });
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setIsSaving(true);
                                    const res = await authApi.updateProfile({
                                      deactivationThresholdDays: Number(profileForm.deactivationThresholdDays) || 60
                                    });
                                    if (res.success) {
                                      if (updateUser) updateUser(res.user);
                                      setInitialProfileForm(prev => ({
                                        ...prev,
                                        deactivationThresholdDays: Number(profileForm.deactivationThresholdDays) || 60
                                      }));
                                      showToast('Auto-deactivation settings saved successfully!', 'success');
                                      window.dispatchEvent(new Event('gymSettingsUpdated'));
                                    }
                                  } catch (err) {
                                    showToast(err.message || 'Failed to save settings', 'error');
                                  } finally {
                                    setIsSaving(false);
                                  }
                                }}
                                disabled={isSaving || profileForm.deactivationThresholdDays === initialProfileForm?.deactivationThresholdDays}
                                className="bg-accent hover:bg-[#a3e635] disabled:bg-gray-700 disabled:text-gray-500 text-black px-5 py-2 rounded text-[12px] font-bold transition-all shrink-0"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* VS Code Settings Note Style */}
                        <div className="bg-[#252526] p-6 border-l-2 border-accent">
                          <div className="flex items-start gap-4">
                            <div>
                              <p className="text-[13px] text-gray-300">
                                <span className="font-bold text-accent">Auto-Save Active:</span> Your changes are saved automatically. Any updates to membership plans will reflect across your active member calculations instantly.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#2b2b2b]">
                          <button type="button" onClick={onClose} className="text-[12px] text-gray-400 hover:text-white px-4 transition-colors">Cancel</button>
                          <button type="button" onClick={onClose} className="bg-accent hover:bg-[#a3e635] text-black px-6 py-2 rounded text-[12px] font-bold transition-colors">
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'compensation' && (
                    <div className="max-w-5xl space-y-10">
                      {/* Header Section Removed */}

                      <form onSubmit={handleCompensationSubmit} className="space-y-6">
                        <div className="border border-[#2b2b2b] bg-[#252526] overflow-hidden">
                          <table className="w-full text-left text-[13px]">
                            <thead>
                              <tr className="bg-[#1e1e1e] border-b border-[#2b2b2b]">
                                <th className="px-6 py-3 font-medium text-gray-500">TRAINER TYPE</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-center">DEFAULT BASE SALARY</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-center">DEFAULT PT COMMISSION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2b2b2b]">

                              <tr className="group hover:bg-[#2a2d2e] transition-colors relative">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setCompensationForm({ ...compensationForm, normal: { ...compensationForm.normal, isActive: !(compensationForm.normal?.isActive ?? true) } })}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${(compensationForm.normal?.isActive ?? true) ? 'bg-accent' : 'bg-[#3c3c3c]'}`}
                                    >
                                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(compensationForm.normal?.isActive ?? true) ? 'translate-x-2' : '-translate-x-2'}`} />
                                    </button>
                                    <div>
                                      <div className={`font-medium flex items-center gap-2 ${(compensationForm.normal?.isActive ?? true) ? 'text-white' : 'text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${(compensationForm.normal?.isActive ?? true) ? 'bg-blue-500' : 'bg-gray-600'}`} />
                                        Normal Trainer
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">Fixed monthly salary only. No PT commission.</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-gray-500 font-mono">₹</span>
                                    <input
                                      type="number"
                                      required
                                      className="w-24 bg-[#3c3c3c] border border-transparent focus:border-accent px-2 py-1 text-[13px] font-mono outline-none text-white transition-all rounded text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={compensationForm.normal.baseSalary}
                                      onChange={e => setCompensationForm({ ...compensationForm, normal: { ...compensationForm.normal, baseSalary: e.target.value === '' ? '' : Number(e.target.value) } })}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center text-gray-600 italic text-[11px]">
                                  Not Applicable
                                </td>
                              </tr>

                              <tr className="group hover:bg-[#2a2d2e] transition-colors relative">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setCompensationForm({ ...compensationForm, ptOnly: { ...compensationForm.ptOnly, isActive: !(compensationForm.ptOnly?.isActive ?? true) } })}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${(compensationForm.ptOnly?.isActive ?? true) ? 'bg-accent' : 'bg-[#3c3c3c]'}`}
                                    >
                                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(compensationForm.ptOnly?.isActive ?? true) ? 'translate-x-2' : '-translate-x-2'}`} />
                                    </button>
                                    <div>
                                      <div className={`font-medium flex items-center gap-2 ${(compensationForm.ptOnly?.isActive ?? true) ? 'text-white' : 'text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${(compensationForm.ptOnly?.isActive ?? true) ? 'bg-purple-500' : 'bg-gray-600'}`} />
                                        PT Trainer
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">Earns only through PT commission. No fixed salary.</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center text-gray-600 italic text-[11px]">
                                  Not Applicable
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="number"
                                      required
                                      className="w-20 bg-[#3c3c3c] border border-transparent focus:border-accent px-2 py-1 text-[13px] font-mono outline-none text-white transition-all rounded text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={compensationForm.ptOnly.commission}
                                      onChange={e => setCompensationForm({ ...compensationForm, ptOnly: { ...compensationForm.ptOnly, commission: e.target.value === '' ? '' : Number(e.target.value) } })}
                                    />
                                    <span className="text-gray-500 font-mono">%</span>
                                  </div>
                                </td>
                              </tr>

                              <tr className="group hover:bg-[#2a2d2e] transition-colors relative">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setCompensationForm({ ...compensationForm, ptAndTrainer: { ...compensationForm.ptAndTrainer, isActive: !(compensationForm.ptAndTrainer?.isActive ?? true) } })}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out ${(compensationForm.ptAndTrainer?.isActive ?? true) ? 'bg-accent' : 'bg-[#3c3c3c]'}`}
                                    >
                                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(compensationForm.ptAndTrainer?.isActive ?? true) ? 'translate-x-2' : '-translate-x-2'}`} />
                                    </button>
                                    <div>
                                      <div className={`font-medium flex items-center gap-2 ${(compensationForm.ptAndTrainer?.isActive ?? true) ? 'text-white' : 'text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${(compensationForm.ptAndTrainer?.isActive ?? true) ? 'bg-accent' : 'bg-gray-600'}`} />
                                        PT + Trainer
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-0.5">Fixed salary + PT commission hybrid model.</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-gray-500 font-mono">₹</span>
                                    <input
                                      type="number"
                                      required
                                      className="w-24 bg-[#3c3c3c] border border-transparent focus:border-accent px-2 py-1 text-[13px] font-mono outline-none text-white transition-all rounded text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={compensationForm.ptAndTrainer.baseSalary}
                                      onChange={e => setCompensationForm({ ...compensationForm, ptAndTrainer: { ...compensationForm.ptAndTrainer, baseSalary: e.target.value === '' ? '' : Number(e.target.value) } })}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <input
                                      type="number"
                                      required
                                      className="w-20 bg-[#3c3c3c] border border-transparent focus:border-accent px-2 py-1 text-[13px] font-mono outline-none text-white transition-all rounded text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      value={compensationForm.ptAndTrainer.commission}
                                      onChange={e => setCompensationForm({ ...compensationForm, ptAndTrainer: { ...compensationForm.ptAndTrainer, commission: e.target.value === '' ? '' : Number(e.target.value) } })}
                                    />
                                    <span className="text-gray-500 font-mono">%</span>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center gap-3 bg-[#252526] p-4 border border-[#2b2b2b] rounded-md mt-4">
                          <input
                            type="checkbox"
                            id="customStructure"
                            checked={compensationForm.allowCustomStructure || false}
                            onChange={e => setCompensationForm({ ...compensationForm, allowCustomStructure: e.target.checked })}
                            className="w-4 h-4 accent-accent bg-[#3c3c3c] border-[#2b2b2b] rounded cursor-pointer"
                          />
                          <label htmlFor="customStructure" className="text-[13px] text-white cursor-pointer select-none">
                            <span className="font-bold">Use Custom Salary Structure</span>
                            <span className="text-gray-500 block text-[11px] mt-0.5">If active, you can override default salary and commission rates for individual trainers when updating their profile.</span>
                          </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-[#2b2b2b]">
                          <button type="button" onClick={onClose} className="text-[12px] text-gray-400 hover:text-white px-4">Cancel</button>
                          <button disabled={savingComp} type="submit" className="bg-accent hover:bg-[#a3e635] text-black px-6 py-2 rounded text-[12px] font-bold transition-colors">
                            {savingComp ? 'Saving...' : 'Save Settings'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeTab === 'payment' && (
                    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div>
                        <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Payment Settings</h3>
                        <p className="text-[11px] text-gray-500 mt-1">Configure your merchant UPI ID to receive direct payments from your gym members.</p>
                      </div>

                      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-6 space-y-6">
                        <div className="flex flex-col gap-4">
                          <label className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Add Owner UPI ID *</label>
                          <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                              <input
                                type="text"
                                value={newUpiInput || ''}
                                onChange={e => {
                                  setNewUpiInput(e.target.value);
                                  setUpiError('');
                                }}
                                className="w-full bg-[#3c3c3c] border border-[#2b2b2b] text-[13px] px-4 py-2.5 rounded text-white focus:outline-none focus:border-accent placeholder-gray-500"
                                placeholder="e.g. ownername@upi"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={upiVerifying || !newUpiInput}
                              onClick={() => handleVerifyUpi(newUpiInput)}
                              className={`px-5 py-2.5 rounded text-[12px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
                                upiVerifying 
                                  ? 'bg-[#3c3c3c] text-gray-500 cursor-not-allowed'
                                  : 'bg-accent hover:bg-[#a3e635] text-black hover:shadow-lg active:scale-95 disabled:bg-[#3c3c3c] disabled:text-gray-500 disabled:scale-100 disabled:shadow-none'
                              }`}
                            >
                              {upiVerifying ? (
                                <>
                                  <RefreshCcw size={13} className="animate-spin" />
                                  Adding...
                                </>
                              ) : 'Add'}
                            </button>
                          </div>

                          {upiError && (
                            <div className="flex items-center gap-2 text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md max-w-md animate-in fade-in duration-200">
                              <AlertTriangle size={14} />
                              <span>{upiError}</span>
                            </div>
                          )}

                          {(profileForm.upiIds || []).length > 0 && (
                            <div className="flex flex-col gap-3 mt-2 animate-in fade-in duration-200">
                              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Configured UPI Accounts (Max 5)</label>
                              <div className="space-y-2 max-w-xl">
                                {(profileForm.upiIds || []).map((item, idx) => (
                                  <div key={idx} className={`bg-[#1e1e1e] border ${item.isDefault ? 'border-accent/40' : 'border-[#2b2b2b]'} rounded-lg p-4 flex items-center justify-between transition-all`}>
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg ${item.isDefault ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-white/5 text-gray-400 border border-white/10'} flex items-center justify-center`}>
                                        <Zap size={15} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[13px] font-mono text-white">{item.upiId}</p>
                                          {item.isDefault && (
                                            <span className="text-[9px] font-bold text-black bg-accent px-1.5 py-0.5 rounded uppercase tracking-wider">Default</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {!item.isDefault && (
                                        <button
                                          type="button"
                                          onClick={() => handleMakeDefaultUpi(item.upiId)}
                                          className="text-[11px] text-accent hover:underline font-bold px-2.5 py-1.5 hover:bg-accent/5 rounded transition-all"
                                        >
                                          Make Default
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteUpi(item.upiId)}
                                        className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-colors"
                                        title="Remove UPI ID"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* VS Code Settings Note Style */}
                      <div className="bg-[#252526] p-6 border-l-2 border-accent">
                        <p className="text-[13px] text-gray-300">
                          <span className="font-bold text-accent">Dynamic UPI QR Codes:</span> Adding a valid UPI ID automatically generates personalized payment QR codes for gym members during new payments, plan renewals, and lead-to-client registrations.
                        </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#2b2b2b]">
                        <button type="button" onClick={onClose} className="text-[12px] text-gray-400 hover:text-white px-4 transition-colors">Cancel</button>
                         <button 
                          type="button"
                          disabled={isSaving || !upiVerified || (profileForm.upiIds || []).length === 0} 
                          onClick={handleSaveProfile} 
                          className="bg-accent hover:bg-[#a3e635] disabled:bg-gray-700 disabled:text-gray-500 text-black px-6 py-2 rounded text-[12px] font-bold transition-colors"
                        >
                          {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'subscription' && (
                    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div>
                        <h3 className="text-white text-[13px] font-bold uppercase tracking-wider">Software Subscription & Plans</h3>
                        <p className="text-[11px] text-gray-500 mt-1">Select and manage your software platform features, limits, and billing cycle.</p>
                      </div>

                      <div className="bg-[#252526] border border-[#2b2b2b] rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded font-black">
                              Active Subscription
                            </span>
                            <h4 className="text-white text-lg font-black tracking-wide mt-1">
                              {user?.subscriptionPlan?.name || 'Trial Plan'}
                            </h4>
                          </div>

                          <div className="text-right">
                            {(() => {
                              const end = user?.subscriptionTrialEnds || user?.subscriptionEnd;
                              if (!end) return <span className="text-[11px] text-zinc-500">No expiration configured</span>;
                              const diff = new Date(end) - new Date();
                              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                              const isExpired = days <= 0;
                              return (
                                <div className="space-y-1">
                                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${isExpired ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-accent/10 text-accent border border-accent/20'}`}>
                                    {isExpired ? 'Expired' : `${days} Days Left`}
                                  </span>
                                  <p className="text-[10px] text-zinc-500 mt-1.5">
                                    Ends {new Date(end).toLocaleDateString()}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border-t border-[#2b2b2b] pt-4">
                          <div className="bg-[#1e1e1f] p-3 rounded-lg border border-[#2b2b2b] text-center">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Max Clients</p>
                            <p className="text-white text-lg font-black mt-1">
                              {user?.subscriptionPlan?.maxClients || user?.capacity ? (
                                `${user?.usedClients || 0} / ${user?.subscriptionPlan?.maxClients || user?.capacity}`
                              ) : '—'}
                            </p>
                          </div>
                          <div className="bg-[#1e1e1f] p-3 rounded-lg border border-[#2b2b2b] text-center">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Max Trainers</p>
                            <p className="text-white text-lg font-black mt-1">
                              {user?.subscriptionPlan?.maxTrainers ? (
                                `${user?.usedTrainers || 0} / ${user?.subscriptionPlan?.maxTrainers}`
                              ) : '—'}
                            </p>
                          </div>
                          <div className="bg-[#1e1e1f] p-3 rounded-lg border border-[#2b2b2b] text-center">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Max Staff</p>
                            <p className="text-white text-lg font-black mt-1">
                              {user?.subscriptionPlan?.maxStaff ? (
                                `${user?.usedStaff || 0} / ${user?.subscriptionPlan?.maxStaff}`
                              ) : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-[#2b2b2b] pt-4">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Enabled Core Modules</p>
                          <div className="flex flex-wrap gap-2">
                            {user?.subscriptionPlan?.features?.map((f, i) => (
                              <span key={i} className="text-[10px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                <Check size={10} className="text-accent" /> {f}
                              </span>
                            )) || <span className="text-xs text-zinc-500 italic">No features enabled</span>}
                          </div>
                        </div>

                        {user?.role === 'owner' && (
                          <div className="border-t border-[#2b2b2b] pt-4 flex justify-between items-center gap-4">
                            <div>
                              <p className="text-[11px] font-bold text-zinc-400">TEST RECURRING BILLING</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Force your subscription to expire in 5 seconds to test auto-payment simulation.</p>
                            </div>
                            <button
                              type="button"
                              onClick={handleTestExpiry}
                              disabled={testingExpiry}
                              className="bg-accent/10 border border-accent/20 hover:bg-accent hover:text-black text-accent font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all shrink-0"
                            >
                              {testingExpiry ? 'Processing...' : '⚡ Trigger Expiry (5s)'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <h4 className="text-white text-[12px] font-bold uppercase tracking-wider">Available Software Plans</h4>
                          {user?.role === 'owner' && (
                            <div className="flex bg-[#1e1e1f] border border-[#2b2b2b] p-1 rounded-xl w-fit">
                              <button
                                type="button"
                                onClick={() => setSettingsBillingCycle('monthly')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                                  settingsBillingCycle === 'monthly'
                                    ? 'bg-accent text-black font-black'
                                    : 'text-zinc-500 hover:text-white bg-transparent'
                                }`}
                              >
                                Monthly Billing
                              </button>
                              <button
                                type="button"
                                onClick={() => setSettingsBillingCycle('yearly')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                                  settingsBillingCycle === 'yearly'
                                    ? 'bg-accent text-black font-black'
                                    : 'text-zinc-500 hover:text-white bg-transparent'
                                }`}
                              >
                                Yearly Billing
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {user?.role !== 'owner' ? (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-[12px] text-amber-400 flex items-start gap-3">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <p>Only the gym owner has permission to change or subscribe to the software plans. Staff and trainers can view active status details but cannot switch plans.</p>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {subscriptionPlans.map(plan => {
                            const isActive = user?.subscriptionPlan?._id === plan._id && user?.billingCycle === settingsBillingCycle;
                            const isCurrentPlanDifferentCycle = user?.subscriptionPlan?._id === plan._id && user?.billingCycle !== settingsBillingCycle;
                            return (
                              <div 
                                key={plan._id} 
                                className={`bg-[#252526] border rounded-xl p-5 flex flex-col justify-between transition-all ${
                                  isActive 
                                    ? 'border-accent shadow-lg shadow-accent/5' 
                                    : 'border-[#2b2b2b] hover:border-zinc-700'
                                }`}
                              >
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h5 className="text-white text-sm font-bold tracking-wide">{plan.name}</h5>
                                      <p className="text-[10px] text-zinc-500 mt-0.5">
                                        Trial Period: {plan.trialDays} Days
                                      </p>
                                    </div>
                                    {isActive && (
                                      <span className="text-[9px] uppercase tracking-widest font-black text-black bg-accent px-2 py-0.5 rounded">
                                        Current Plan
                                      </span>
                                    )}
                                    {isCurrentPlanDifferentCycle && (
                                      <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/55">
                                        Active ({user?.billingCycle})
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-white text-xl font-black">
                                      ₹{settingsBillingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                                    </span>
                                    <span className="text-zinc-500 text-[10px]">
                                      / {settingsBillingCycle === 'yearly' ? 'year' : 'month'}
                                    </span>
                                    <span className="text-zinc-600 text-[10px] ml-2">
                                      (₹{settingsBillingCycle === 'yearly' ? plan.monthlyPrice : plan.yearlyPrice}/{settingsBillingCycle === 'yearly' ? 'mo' : 'yr'})
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 text-[11px] text-zinc-400 border-t border-[#2b2b2b] pt-3">
                                    <div className="flex justify-between">
                                      <span>Max Clients:</span>
                                      <span className="text-white font-bold">{plan.maxClients}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Max Trainers:</span>
                                      <span className="text-white font-bold">{plan.maxTrainers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Max Staff:</span>
                                      <span className="text-white font-bold">{plan.maxStaff}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 text-[11px] border-t border-[#2b2b2b] pt-3">
                                    <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Included Features</p>
                                    <div className="grid grid-cols-1 gap-1">
                                      {plan.features?.map((f, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-zinc-300">
                                          <Check size={11} className="text-accent" />
                                          <span className="text-[10px]">{f}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-[#2b2b2b]">
                                  <button
                                    type="button"
                                    disabled={isActive || subscribingPlanId !== null || user?.role !== 'owner'}
                                    onClick={() => handleSubscribePlan(plan._id, settingsBillingCycle)}
                                    className={`w-full py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                                      isActive
                                        ? 'bg-zinc-800 text-zinc-500 cursor-default border border-zinc-700/55'
                                        : user?.role !== 'owner'
                                          ? 'bg-zinc-850 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                          : subscribingPlanId === plan._id
                                            ? 'bg-accent/40 text-black cursor-wait animate-pulse'
                                            : 'bg-accent hover:bg-[#a3e635] text-black shadow-lg shadow-accent/10 active:scale-95'
                                    }`}
                                  >
                                    {isActive ? 'Current Active Plan' : subscribingPlanId === plan._id ? 'Subscribing...' : 'Select Plan'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#2b2b2b]">
                        <button type="button" onClick={onClose} className="text-[12px] text-gray-400 hover:text-white px-4 transition-colors">Cancel</button>
                        <button type="button" onClick={onClose} className="bg-accent hover:bg-[#a3e635] text-black px-6 py-2 rounded text-[12px] font-bold transition-colors">
                          Close Settings
                        </button>
                      </div>
                    </div>
                  )}

                  {!activeTab.startsWith('profile') && !activeTab.startsWith('categories') && !['roles', 'membership', 'compensation', 'payment', 'subscription'].includes(activeTab) && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 mt-32">
                      <h3 className="text-lg font-bold text-gray-400">Under Construction</h3>
                      <p className="text-sm mt-2 max-w-md text-gray-500">This module is currently being configured.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmState && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#2b2b2b] flex justify-between items-center bg-[#252526]">
                  <div className={`flex items-center gap-2 ${deleteConfirmState.type === 'accent' ? 'text-accent' : 'text-red-400'}`}>
                    {deleteConfirmState.type === 'accent' ? <Info size={16} /> : <AlertTriangle size={16} />}
                    <h4 className="font-bold tracking-wide text-white">{deleteConfirmState.title}</h4>
                  </div>
                  <button type="button" onClick={() => setDeleteConfirmState(null)} className="text-gray-400 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 text-[13px] text-gray-300">
                  {deleteConfirmState.message}
                </div>
                <div className="p-4 border-t border-[#2b2b2b] bg-[#252526] flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmState(null)}
                    className="px-4 py-2 text-[12px] font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteConfirmState.onConfirm();
                      setDeleteConfirmState(null);
                    }}
                    className={`px-5 py-2 rounded text-[12px] font-bold border transition-all ${
                      deleteConfirmState.type === 'accent'
                        ? 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                    }`}
                  >
                    {deleteConfirmState.confirmText || 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
