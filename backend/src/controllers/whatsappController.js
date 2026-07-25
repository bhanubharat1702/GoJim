const { sendMessage, sendCustomMessage, getTemplates } = require('../utils/whatsappService');
const WhatsappLog = require('../models/WhatsappLog');
const { supabase } = require('../config/supabase');

exports.sendTemplate = async (req, res) => {
  try {
    const { phone, templateId, variables } = req.body;
    const result = await sendMessage(req.user.id, phone, templateId, variables);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendCustom = async (req, res) => {
  try {
    const { phone, message } = req.body;
    const result = await sendCustomMessage(req.user.id, phone, message);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLog = async (req, res) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user.id : req.user.gymOwner;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: 'Gym owner not found for this user' });
    }

    // Attempt to retrieve logs from Supabase first
    try {
      const { data: supabaseLogs, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('gym_owner_id', ownerId.toString())
        .order('sent_at', { ascending: true });

      if (!error && supabaseLogs) {
        const mappedLogs = supabaseLogs.map(log => ({
          _id: log.id,
          gymOwner: log.gym_owner_id,
          phone: log.phone,
          templateId: log.template_id,
          templateName: log.template_name,
          message: log.message,
          variables: log.variables,
          status: log.status,
          errorMessage: log.error_message,
          sentAt: log.sent_at,
          deliveredAt: log.delivered_at,
          createdAt: log.created_at
        }));
        return res.status(200).json({ success: true, count: mappedLogs.length, data: mappedLogs });
      }
      if (error) {
        console.error('⚠️ Supabase error in getLog:', error.message);
      }
    } catch (supabaseErr) {
      console.error('⚠️ Failed to load logs from Supabase, falling back to Mongo:', supabaseErr.message);
    }

    // Fallback to MongoDB logs
    const log = await WhatsappLog.find({ gymOwner: ownerId }).sort({ sentAt: 1 });
    res.status(200).json({ success: true, count: log.length, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listTemplates = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: getTemplates() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyWebhook = (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'gojim';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('📡 [WhatsApp Webhook] Verification successful!');
      return res.status(200).send(challenge);
    } else {
      console.error('📡 [WhatsApp Webhook] Verification failed: Token mismatch');
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
};

exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log('📡 [WhatsApp Webhook] Event received:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.statuses) {
            for (const statusObj of change.value.statuses) {
              const messageId = statusObj.id;
              const status = statusObj.status; // 'delivered', 'read', 'failed' etc.
              
              if (['delivered', 'read', 'failed'].includes(status)) {
                // Update MongoDB log
                const log = await WhatsappLog.findOneAndUpdate(
                  { messageId },
                  { 
                    status: status === 'read' ? 'delivered' : status,
                    deliveredAt: ['delivered', 'read'].includes(status) ? new Date() : undefined
                  },
                  { new: true }
                );

                if (log) {
                  console.log(`📡 [WhatsApp Webhook Log Update] Updated log ${log._id} to status: ${status}`);
                  
                  // Update Supabase log as well
                  try {
                    await supabase
                      .from('whatsapp_logs')
                      .update({ 
                        status: status === 'read' ? 'delivered' : status,
                        delivered_at: ['delivered', 'read'].includes(status) ? new Date().toISOString() : undefined
                      })
                      .eq('message_id', messageId);
                  } catch (supabaseErr) {
                    console.error('⚠️ Supabase error updating log status:', supabaseErr.message);
                  }
                }
              }
            }
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('❌ [WhatsApp Webhook Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
