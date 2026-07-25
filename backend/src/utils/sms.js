const sendSMS = async (to, body) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  // Format to standard E.164 if not already present
  let formattedTo = to;
  if (!formattedTo.startsWith('+')) {
    // Default to Indian prefix (+91) if it looks like a 10 digit number
    if (formattedTo.length === 10) {
      formattedTo = `+91${formattedTo}`;
    } else {
      formattedTo = `+${formattedTo}`;
    }
  }

  if (!accountSid || !authToken || !from) {
    console.log(`\n--- [SMS SIMULATOR] ---\nTo: ${formattedTo}\nMessage: ${body}\n-----------------------\n`);
    return {
      success: false,
      isDemo: true,
      message: 'SMS sent to console. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in backend/.env for real-world SMS delivery.'
    };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', formattedTo);
    params.append('From', from);
    params.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Twilio SMS failed');
    }
    return { success: true };
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    return {
      success: false,
      message: `Twilio SMS delivery failed: ${error.message}`
    };
  }
};

module.exports = { sendSMS };
