// WhatsApp Mock Service - Simulates sending messages
const messageLog = [];

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
  }
};

const sendMessage = async (phone, templateId, variables = {}) => {
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }

  let message = template.template;
  Object.keys(variables).forEach(key => {
    message = message.replace(`{{${key}}}`, variables[key]);
  });

  const log = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    phone,
    templateId,
    templateName: template.name,
    message,
    variables,
    status: 'sent',
    sentAt: new Date(),
    deliveredAt: new Date(Date.now() + 2000) // Simulate 2s delivery
  };

  messageLog.push(log);
  console.log(`📱 [WhatsApp Mock] Message sent to ${phone}: ${message.substring(0, 50)}...`);

  return log;
};

const sendCustomMessage = async (phone, message) => {
  const log = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    phone,
    templateId: 'custom',
    templateName: 'Custom Message',
    message,
    status: 'sent',
    sentAt: new Date(),
    deliveredAt: new Date(Date.now() + 2000)
  };

  messageLog.push(log);
  console.log(`📱 [WhatsApp Mock] Custom message sent to ${phone}: ${message.substring(0, 50)}...`);

  return log;
};

const getMessageLog = () => messageLog;
const getTemplates = () => Object.values(templates);

module.exports = {
  sendMessage,
  sendCustomMessage,
  getMessageLog,
  getTemplates,
  templates
};
