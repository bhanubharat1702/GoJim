const User = require('../models/User');
const Member = require('../models/Member');
const { sendMessage } = require('./whatsappService');

const runDailyAutomations = async () => {
  console.log(`⏰ [WhatsApp Scheduler] Starting daily automation check...`);
  try {
    const owners = await User.find({ role: 'owner' });
    const today = new Date();

    for (const owner of owners) {
      const config = owner.whatsappConfig;
      if (!config) continue;

      const automations = config.automations || {};

      // 1. Welcome message is triggered immediately on member creation, no background batch needed.

      // 2. Birthday Wishes
      if (automations.birthdayWish?.enabled) {
        try {
          const membersWithDob = await Member.find({
            gymOwner: owner._id,
            status: 'active',
            dob: { $ne: null }
          });

          const birthdayMembers = membersWithDob.filter(m => {
            const dobDate = new Date(m.dob);
            return dobDate.getDate() === today.getDate() && dobDate.getMonth() === today.getMonth();
          });

          if (birthdayMembers.length > 0) {
            console.log(`🎂 [WhatsApp Scheduler] Found ${birthdayMembers.length} birthday(s) for Gym Owner ${owner.gymName || owner.name}`);
            for (const member of birthdayMembers) {
              if (member.phone) {
                await sendMessage(owner._id, member.phone, 'birthday_wish', {
                  name: member.name
                });
              }
            }
          }
        } catch (birthErr) {
          console.error(`❌ [WhatsApp Scheduler] Error processing birthday wishes for owner ${owner._id}:`, birthErr.message);
        }
      }

      // 3. Payment Reminders
      if (automations.paymentReminder?.enabled) {
        try {
          const daysBefore = automations.paymentReminder.daysBefore || 3;
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysBefore);
          
          const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

          const expiringMembers = await Member.find({
            gymOwner: owner._id,
            status: 'active',
            planExpiry: { $gte: startOfDay, $lte: endOfDay }
          });

          if (expiringMembers.length > 0) {
            console.log(`💳 [WhatsApp Scheduler] Found ${expiringMembers.length} expiring plans in ${daysBefore} days for Gym Owner ${owner.gymName || owner.name}`);
            for (const member of expiringMembers) {
              if (member.phone) {
                const formattedExpiry = new Date(member.planExpiry).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                await sendMessage(owner._id, member.phone, 'payment_reminder', {
                  name: member.name,
                  expiry: formattedExpiry
                });
              }
            }
          }
        } catch (payErr) {
          console.error(`❌ [WhatsApp Scheduler] Error processing payment reminders for owner ${owner._id}:`, payErr.message);
        }
      }

      // 4. Comeback Nudges
      if (automations.comebackNudge?.enabled) {
        try {
          const daysInactive = automations.comebackNudge.daysInactive || 5;
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - daysInactive);
          
          const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

          const inactiveMembers = await Member.find({
            gymOwner: owner._id,
            status: 'active',
            $or: [
              { lastAttendance: { $gte: startOfDay, $lte: endOfDay } },
              { lastAttendance: null, joinDate: { $gte: startOfDay, $lte: endOfDay } }
            ]
          });

          if (inactiveMembers.length > 0) {
            console.log(`🏋️ [WhatsApp Scheduler] Found ${inactiveMembers.length} inactive members for exactly ${daysInactive} days for Gym Owner ${owner.gymName || owner.name}`);
            for (const member of inactiveMembers) {
              if (member.phone) {
                await sendMessage(owner._id, member.phone, 'comeback_message', {
                  name: member.name
                });
              }
            }
          }
        } catch (comebackErr) {
          console.error(`❌ [WhatsApp Scheduler] Error processing comeback nudges for owner ${owner._id}:`, comebackErr.message);
        }
      }

      // 5. Lead Inactivity Follow-Up
      if (automations.leadFollowup?.enabled) {
        try {
          const daysInactive = automations.leadFollowup.daysInactive || 2;
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - daysInactive);
          
          const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

          const Lead = require('../models/Lead');
          const inactiveLeads = await Lead.find({
            gymOwner: owner._id,
            status: { $in: ['new', 'contacted'] },
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          });

          if (inactiveLeads.length > 0) {
            console.log(`✉️ [WhatsApp Scheduler] Found ${inactiveLeads.length} inactive lead(s) for exactly ${daysInactive} days for Gym Owner ${owner.gymName || owner.name}`);
            for (const lead of inactiveLeads) {
              if (lead.phone) {
                await sendMessage(owner._id, lead.phone, 'lead_followup', {
                  name: lead.name
                });
              }
            }
          }
        } catch (leadErr) {
          console.error(`❌ [WhatsApp Scheduler] Error processing lead follow-up nudges for owner ${owner._id}:`, leadErr.message);
        }
      }

      // 6. Lead Follow-Up Date Reminder
      if (automations.leadFollowupReminder?.enabled) {
        try {
          const startOfToday = new Date(today.setHours(0, 0, 0, 0));
          const endOfToday = new Date(today.setHours(23, 59, 59, 999));

          const Lead = require('../models/Lead');
          const scheduledLeads = await Lead.find({
            gymOwner: owner._id,
            status: { $nin: ['joined', 'lost'] },
            followUpDate: { $gte: startOfToday, $lte: endOfToday }
          });

          if (scheduledLeads.length > 0) {
            console.log(`📅 [WhatsApp Scheduler] Found ${scheduledLeads.length} follow-up reminder(s) for today for Gym Owner ${owner.gymName || owner.name}`);
            for (const lead of scheduledLeads) {
              if (lead.phone) {
                await sendMessage(owner._id, lead.phone, 'lead_followup_reminder', {
                  name: lead.name
                });
              }
            }
          }
        } catch (schedLeadErr) {
          console.error(`❌ [WhatsApp Scheduler] Error processing scheduled lead reminders for owner ${owner._id}:`, schedLeadErr.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ [WhatsApp Scheduler] Global automation check failed:', err.message);
  }
};

const startScheduler = () => {
  // Run scheduler once on startup (after database connection is established)
  setTimeout(() => {
    runDailyAutomations();
  }, 10000); // 10 seconds delay after startup

  // Run scheduler every 12 hours
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    runDailyAutomations();
  }, TWELVE_HOURS);

  console.log('⏰ [WhatsApp Scheduler] Background automation scheduler started.');
};

module.exports = {
  startScheduler,
  runDailyAutomations
};
