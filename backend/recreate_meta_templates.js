const dotenv = require('dotenv');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

const templates = [
  {
    name: 'payment_reminder',
    category: 'UTILITY',
    text: 'Hi {{1}}! Your gym membership plan expires on {{2}}. Please renew to continue your fitness journey. Visit us or pay online. 💪',
    examples: ['John', '25/06/2026']
  },
  {
    name: 'comeback_message',
    category: 'MARKETING',
    text: "Hey {{1}}! We miss you at the gym! 🏋️ It's been a while since your last visit. Come back and let's crush those goals together!",
    examples: ['John']
  },
  {
    name: 'offer_message',
    category: 'MARKETING',
    text: '🔥 Special Offer for {{1}}! Get {{2}}% off on your next membership renewal. Valid till {{3}}. Hurry, limited slots!',
    examples: ['John', '20', '3 days']
  },
  {
    name: 'welcome_message',
    category: 'UTILITY',
    text: "Welcome to GoJim, {{1}}! 🎉 Your {{2}} membership is now active. Valid till {{3}}. Let's start your fitness journey!",
    examples: ['John', 'Premium Gold Plan', '25/06/2026']
  },
  {
    name: 'attendance_reminder',
    category: 'MARKETING',
    text: "Hi {{1}}, just a friendly reminder to hit the gym today! 💪 Consistency is key to reaching your goals. See you there!",
    examples: ['John']
  },
  {
    name: 'birthday_wish',
    category: 'MARKETING',
    text: 'Happy Birthday, {{1}}! 🎉 Wishing you a year of strength, good health, and crushing your fitness goals. Have a fantastic day! 💪🎂',
    examples: ['John']
  }
];

async function run() {
  console.log('Starting template recreation...');

  for (const t of templates) {
    // 1. Delete existing template
    console.log(`\nDeleting template: ${t.name}...`);
    const deleteUrl = `https://graph.facebook.com/v19.0/${BUSINESS_ACCOUNT_ID}/message_templates?name=${t.name}`;
    try {
      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });
      const delData = await delRes.json();
      console.log(`Delete response:`, delData);
    } catch (err) {
      console.error(`Error deleting ${t.name}:`, err.message);
    }

    // 2. Create template with examples
    console.log(`Creating template with examples: ${t.name}...`);
    const createUrl = `https://graph.facebook.com/v19.0/${BUSINESS_ACCOUNT_ID}/message_templates`;
    const payload = {
      name: t.name,
      category: t.category,
      language: 'en_US', // Standard language
      components: [
        {
          type: 'BODY',
          text: t.text,
          example: {
            body_text: [t.examples]
          }
        }
      ]
    };

    try {
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Success! Created template '${t.name}' (ID: ${data.id})`);
      } else {
        console.error(`❌ Failed:`, data.error?.message || JSON.stringify(data));
      }
    } catch (err) {
      console.error(`Error creating ${t.name}:`, err.message);
    }
  }
}

run();
