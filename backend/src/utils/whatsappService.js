const WhatsappLog = require('../models/WhatsappLog');
const User = require('../models/User');
const { supabase } = require('../config/supabase');
const { encrypt, decrypt } = require('./crypto');

const templates = {
  payment_reminder: {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    template: 'Hi {{name}}! Your gym membership plan expires on {{expiry}}. Please renew to continue your fitness journey. Visit us or pay online. 💪',
    category: 'payment'
  },
  comeback_message: {
    id: 'comeback_message',
    name: 'Comeback Message',
    template: "Hey {{name}}! We miss you at the gym! 🏋️ It's been a while since your last visit. Come back and let's crush those goals together!",
    category: 'engagement'
  },
  offer_message: {
    id: 'offer_message',
    name: 'Special Offer',
    template: '🔥 Special Offer for {{name}}! Get {{discount}}% off on your next membership renewal. Valid till {{validity}}. Hurry, limited slots!',
    category: 'promotion'
  },
  welcome_message: {
    id: 'welcome_message',
    name: 'Welcome Message',
    template: 'Welcome to GoJim, {{name}}! 🎉 Your {{plan}} membership is now active. Valid till {{expiry}}. Let\'s start your fitness journey!',
    category: 'onboarding'
  },
  attendance_reminder: {
    id: 'attendance_reminder',
    name: 'Attendance Reminder',
    template: "Hi {{name}}, just a friendly reminder to hit the gym today! 💪 Consistency is key to reaching your goals. See you there!",
    category: 'engagement'
  },
  birthday_wish: {
    id: 'birthday_wish',
    name: 'Birthday Wish',
    template: 'Happy Birthday, {{name}}! 🎉 Wishing you a year of strength, good health, and crushing your fitness goals. Have a fantastic day! 💪🎂',
    category: 'engagement'
  },
  new_lead: {
    id: 'new_lead',
    name: 'New Lead Attention Grabber',
    template: 'Hi {{name}}! Thanks for checking out {{gymName}}. 🏋️ Claim your FREE 1-day pass today and start your journey! Respond to book your slot. 💪',
    category: 'promotion'
  },
  lead_followup: {
    id: 'lead_followup',
    name: 'Lead Inactivity Follow-Up',
    template: 'Hi {{name}}! Just checking back in. Did you have any questions about {{gymName}}? We have a special discount if you sign up this week! 💸💪',
    category: 'promotion'
  },
  lead_followup_reminder: {
    id: 'lead_followup_reminder',
    name: 'Lead Follow-Up Date Nudge',
    template: "Hello {{name}}! This is a reminder for your scheduled follow-up session/call with {{gymName}} today. Let's discuss your fitness goals! 📅🏋️",
    category: 'engagement'
  },
  hello_world: {
    id: 'hello_world',
    name: 'Hello World Test',
    template: 'Hello World! This is a test message from GoJim.',
    category: 'test'
  }
};

const getOwnerConfig = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let owner;
  if (user.role !== 'owner' && user.gymOwner) {
    owner = await User.findById(user.gymOwner);
  } else {
    owner = user;
  }
  if (!owner) return null;

  // Try to fetch WhatsApp configuration from Supabase
  try {
    const { data: supabaseConfig, error } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('gym_owner_id', owner._id.toString())
      .maybeSingle();

    if (supabaseConfig) {
      console.log(`📡 [Supabase Config] Loaded & Decrypted WhatsApp configuration for owner ${owner._id}`);
      return {
        whatsappConfig: {
          phoneNumberId: supabaseConfig.phone_number_id,
          accessToken: decrypt(supabaseConfig.access_token),
          businessAccountId: supabaseConfig.business_account_id,
          isVerified: supabaseConfig.is_verified,
          automations: supabaseConfig.automations
        },
        ownerId: owner._id
      };
    } else {
      // If not in Supabase, sync from Mongo to Supabase so it exists there
      const automations = owner.whatsappConfig?.automations || {
        paymentReminder: { enabled: true, daysBefore: 3 },
        comebackNudge: { enabled: true, daysInactive: 5 },
        welcomeMessage: { enabled: true },
        birthdayWish: { enabled: true },
        newLeadNudge: { enabled: true },
        leadFollowup: { enabled: true, daysInactive: 2 },
        leadFollowupReminder: { enabled: true },
        salaryPayout: { enabled: true }
      };
      
      console.log(`📡 [Supabase Config Sync] Syncing & Encrypting WhatsApp config for owner ${owner._id} to Supabase...`);
      const { error: insertErr } = await supabase
        .from('whatsapp_configs')
        .insert({
          gym_owner_id: owner._id.toString(),
          phone_number_id: owner.whatsappConfig?.phoneNumberId || '',
          access_token: encrypt(owner.whatsappConfig?.accessToken || ''),
          business_account_id: owner.whatsappConfig?.businessAccountId || '',
          is_verified: owner.whatsappConfig?.isVerified || false,
          automations
        });
      if (insertErr) {
        console.warn('⚠️ Could not sync WhatsApp config to Supabase:', insertErr.message);
      }
    }
  } catch (supabaseErr) {
    console.error('⚠️ Supabase error fetching whatsapp_config:', supabaseErr.message);
  }

  // Fallback to MongoDB config
  return { whatsappConfig: owner.whatsappConfig, ownerId: owner._id };
};

const callMetaApi = async (phoneNumberId, accessToken, payload) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  let url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  
  if (appSecret) {
    const appsecretProof = require('crypto')
      .createHmac('sha256', appSecret)
      .update(accessToken)
      .digest('hex');
    url += `?appsecret_proof=${appsecretProof}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Meta API request failed');
    }
    return data;
  } catch (error) {
    console.error('Meta API Error:', error.message);
    throw error;
  }
};

const getMetaTemplateParams = (templateId, variables) => {
  const mapping = {
    payment_reminder: ['name', 'expiry'],
    comeback_message: ['name'],
    offer_message: ['name', 'discount', 'validity'],
    welcome_message: ['name', 'plan', 'expiry'],
    attendance_reminder: ['name'],
    birthday_wish: ['name'],
    new_lead: ['name', 'gymName'],
    lead_followup: ['name', 'gymName'],
    lead_followup_reminder: ['name', 'gymName'],
    hello_world: []
  };

  const keys = mapping[templateId] || [];
  return keys.map(key => ({
    type: 'text',
    text: String(variables[key] || '')
  }));
};

const sendMessage = async (userId, phone, templateId, variables = {}) => {
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }

  const configInfo = await getOwnerConfig(userId);
  if (!configInfo) {
    throw new Error('Gym owner configuration not found');
  }

  const { whatsappConfig, ownerId } = configInfo;

  const templateIdToAutomationKey = {
    welcome_message: 'welcomeMessage',
    birthday_wish: 'birthdayWish',
    payment_reminder: 'paymentReminder',
    comeback_message: 'comebackNudge',
    new_lead: 'newLeadNudge',
    lead_followup: 'leadFollowup',
    lead_followup_reminder: 'leadFollowupReminder'
  };

  const automationKey = templateIdToAutomationKey[templateId];
  if (automationKey) {
    const isEnabled = whatsappConfig?.automations?.[automationKey]?.enabled ?? true;
    if (!isEnabled) {
      console.log(`📱 [WhatsApp Service] Automation '${automationKey}' is disabled for owner ${ownerId}. Skipping message to ${phone}.`);
      return null;
    }
  }
  let message = '';

  if (automationKey && whatsappConfig?.automations?.[automationKey]?.templateText) {
    message = whatsappConfig.automations[automationKey].templateText;

    // Get gymName
    let gymName = variables.gymName;
    if (!gymName && ownerId) {
      const owner = await User.findById(ownerId).select('gymName');
      gymName = owner?.gymName;
    }
    gymName = gymName || 'Gym';

    message = message
      .replace(/{member_name}/g, variables.name || 'Member')
      .replace(/{gym_name}/g, gymName)
      .replace(/{expiry_date}/g, variables.expiry || '')
      .replace(/{days_left}/g, (whatsappConfig?.automations?.paymentReminder?.daysBefore ?? 3).toString())
      .replace(/{days_inactive}/g, (automationKey === 'leadFollowup'
        ? (whatsappConfig?.automations?.leadFollowup?.daysInactive ?? 2)
        : (whatsappConfig?.automations?.comebackNudge?.daysInactive ?? 5)).toString());
  } else {
    message = template.template;
    Object.keys(variables).forEach(key => {
      message = message.replace(`{{${key}}}`, variables[key]);
    });
  }

  const phoneNumberId = whatsappConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  
  const isVerified = (whatsappConfig?.phoneNumberId && whatsappConfig?.accessToken)
    ? (whatsappConfig?.isVerified ?? true)
    : true;
  const useRealApi = !!(phoneNumberId && accessToken && isVerified);

  let status = 'sent';
  let errorMessage = '';
  let messageId = null;

  if (useRealApi) {
    try {
      const metaParams = getMetaTemplateParams(templateId, variables);
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.replace(/\D/g, ''), // strip non-numeric characters
        type: 'template',
        template: {
          name: templateId,
          language: { code: 'en_US' }
        }
      };
      if (metaParams && metaParams.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: metaParams
          }
        ];
      }
      const resData = await callMetaApi(phoneNumberId, accessToken, payload);
      messageId = resData?.messages?.[0]?.id;
      console.log(`📱 [WhatsApp Cloud API] Message sent via template '${templateId}' to ${phone}`);
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      console.error(`❌ [WhatsApp Cloud API] Failed to send to ${phone}:`, err.message);
    }
  } else {
    console.log(`📱 [WhatsApp Mock] Message sent via template '${templateId}' to ${phone}: ${message}`);
  }

  // Save to MongoDB
  const log = new WhatsappLog({
    gymOwner: ownerId,
    phone,
    templateId,
    templateName: template.name,
    message,
    variables,
    status,
    messageId,
    errorMessage: errorMessage || undefined,
    sentAt: new Date(),
    deliveredAt: status === 'sent' ? new Date(Date.now() + 2000) : undefined
  });
  await log.save();

  // Save to Supabase
  try {
    const { error: supabaseErr } = await supabase
      .from('whatsapp_logs')
      .insert({
        gym_owner_id: ownerId.toString(),
        phone,
        template_id: templateId,
        template_name: template.name,
        message,
        variables,
        status,
        error_message: errorMessage || null,
        sent_at: new Date().toISOString(),
        delivered_at: status === 'sent' ? new Date(Date.now() + 2000).toISOString() : null
      });
    if (supabaseErr) {
      console.error('⚠️ Failed to save WhatsApp log to Supabase:', supabaseErr.message);
    } else {
      console.log('✅ WhatsApp log saved to Supabase');
    }
  } catch (supabaseErr) {
    console.error('⚠️ Supabase error saving WhatsApp log:', supabaseErr.message);
  }

  return log;
};

const sendCustomMessage = async (userId, phone, message) => {
  const configInfo = await getOwnerConfig(userId);
  if (!configInfo) {
    throw new Error('Gym owner configuration not found');
  }

  const { whatsappConfig, ownerId } = configInfo;
  const phoneNumberId = whatsappConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = whatsappConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  
  const isVerified = (whatsappConfig?.phoneNumberId && whatsappConfig?.accessToken)
    ? (whatsappConfig?.isVerified ?? true)
    : true;
  const useRealApi = !!(phoneNumberId && accessToken && isVerified);

  let status = 'sent';
  let errorMessage = '';
  let messageId = null;

  if (useRealApi) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.replace(/\D/g, ''),
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      };
      const resData = await callMetaApi(phoneNumberId, accessToken, payload);
      messageId = resData?.messages?.[0]?.id;
      console.log(`📱 [WhatsApp Cloud API] Custom message sent to ${phone}`);
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      console.error(`❌ [WhatsApp Cloud API] Failed to send custom to ${phone}:`, err.message);
    }
  } else {
    console.log(`📱 [WhatsApp Mock] Custom message sent to ${phone}: ${message}`);
  }

  // Save to MongoDB
  const log = new WhatsappLog({
    gymOwner: ownerId,
    phone,
    templateId: 'custom',
    templateName: 'Custom Message',
    message,
    status,
    messageId,
    errorMessage: errorMessage || undefined,
    sentAt: new Date(),
    deliveredAt: status === 'sent' ? new Date(Date.now() + 2000) : undefined
  });
  await log.save();

  // Save to Supabase
  try {
    const { error: supabaseErr } = await supabase
      .from('whatsapp_logs')
      .insert({
        gym_owner_id: ownerId.toString(),
        phone,
        template_id: 'custom',
        template_name: 'Custom Message',
        message,
        variables: {},
        status,
        error_message: errorMessage || null,
        sent_at: new Date().toISOString(),
        delivered_at: status === 'sent' ? new Date(Date.now() + 2000).toISOString() : null
      });
    if (supabaseErr) {
      console.error('⚠️ Failed to save Custom WhatsApp log to Supabase:', supabaseErr.message);
    } else {
      console.log('✅ Custom WhatsApp log saved to Supabase');
    }
  } catch (supabaseErr) {
    console.error('⚠️ Supabase error saving Custom WhatsApp log:', supabaseErr.message);
  }

  return log;
};

const getTemplates = () => Object.values(templates);

module.exports = {
  sendMessage,
  sendCustomMessage,
  getTemplates,
  templates
};
