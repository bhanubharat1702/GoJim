'use client';
import { useState, useEffect, useMemo } from 'react';
import { membersApi, leadsApi, whatsappApi } from '@/lib/api';
import { PageHeader, Loader, Modal } from '@/components/UI';
import { 
  Bell, Users, CreditCard, PhoneCall, Gift, Search, MessageCircle, Check, X, Send, AlertCircle
} from 'lucide-react';

export default function RedesignedNotificationCenter() {
  const [members, setMembers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal confirm state
  const [activeAlertCampaign, setActiveAlertCampaign] = useState(null); 
  const [sending, setSending] = useState(false);
  const [viewingAudienceCampaign, setViewingAudienceCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null); 

  // Custom message state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]); 
  const [customMessage, setCustomMessage] = useState('Hi {name}, friendly reminder from the gym! 💪');

  // Load active member and lead data
  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, leadsRes] = await Promise.all([
        membersApi.getAll('limit=1000'),
        leadsApi.getAll()
      ]);
      if (membersRes.success) setMembers(membersRes.data || []);
      if (leadsRes.success) setLeads(leadsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute suggested alerts segment list
  const alertsData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringIn7Days = members.filter(m => {
      if (m.status !== 'active' || !m.planExpiry) return false;
      const diff = new Date(m.planExpiry) - today;
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    });

    const dropouts = members.filter(m => {
      if (m.status !== 'active') return false;
      if (!m.lastAttendance) return true;
      const diff = today - new Date(m.lastAttendance);
      return diff >= 5 * 24 * 60 * 60 * 1000;
    });

    const todayLeads = leads.filter(l => {
      if (['joined', 'lost'].includes(l.status) || !l.followUpDate) return false;
      return new Date(l.followUpDate) <= today;
    });

    const birthdays = members.filter(m => {
      if (m.status !== 'active' || !m.dob) return false;
      const dobDate = new Date(m.dob);
      return dobDate.getDate() === today.getDate() && dobDate.getMonth() === today.getMonth();
    });

    return [
      {
        id: 'payment_reminder',
        label: 'Upcoming Plan Expiries',
        count: expiringIn7Days.length,
        description: 'Active member accounts expiring in next 7 days.',
        icon: <CreditCard size={20} />,
        colorClass: 'text-danger bg-danger/10 border-danger/20',
        recipients: expiringIn7Days,
        templateText: 'Hi {name}, your membership plan expires on {expiryDate}. Please renew to continue your training uninterrupted. 💪'
      },
      {
        id: 'we_miss_you',
        label: 'Inactive Member Risks',
        count: dropouts.length,
        description: 'Active accounts with no check-in entries logged in past 5 days.',
        icon: <Users size={20} />,
        colorClass: 'text-warning bg-warning/10 border-warning/20',
        recipients: dropouts,
        templateText: 'Hey {name}, we miss you at the gym! 🏋️ It has been a while since your last check-in. Let\'s get back on track!'
      },
      {
        id: 'lead_followup',
        label: 'Leads Follow-Up Due',
        count: todayLeads.length,
        description: 'Outreach scheduled for pending leads today or earlier.',
        icon: <PhoneCall size={20} />,
        colorClass: 'text-info bg-info/10 border-info/20',
        recipients: todayLeads,
        templateText: 'Hi {name}, checking in from the gym! Did you have any questions about our packages? Let us know! 📞💪'
      },
      {
        id: 'birthday_wish',
        label: 'Birthdays Celebrating Today',
        count: birthdays.length,
        description: 'Birthdays celebrating today. Reach out to wish them.',
        icon: <Gift size={20} />,
        colorClass: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
        recipients: birthdays,
        templateText: 'Happy Birthday, {name}! 🎉 Wishing you a year of strength, good health, and crushing your fitness goals. 🎂💪'
      }
    ];
  }, [members, leads]);

  // Handle suggested alert dispatch
  const handleSendCampaign = async (campaign) => {
    setSending(true);
    let success = 0;
    let failed = 0;

    for (const person of campaign.recipients) {
      try {
        const formattedMsg = campaign.templateText
          .replace(/{name}/g, person.name || 'Member')
          .replace(/{expiryDate}/g, person.planExpiry ? new Date(person.planExpiry).toLocaleDateString('en-GB') : 'N/A');

        await whatsappApi.sendCustom({
          phone: person.phone,
          message: formattedMsg
        });
        success++;
      } catch (err) {
        console.error(err);
        failed++;
      }
    }

    alert(`WhatsApp campaign complete!\nDelivered: ${success}\nFailed: ${failed}`);
    setSending(false);
    setActiveAlertCampaign(null);
    setEditingCampaign(null);
    loadData(); 
  };

  // Custom broadcast member search filter
  const filteredSearchMembers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return members.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.phone.includes(searchQuery)
    ).slice(0, 5);
  }, [searchQuery, members]);

  // Handle custom broadcast dispatch
  const handleSendCustomBroadcast = async () => {
    if (selectedRecipients.length === 0) {
      alert('Please add at least one recipient.');
      return;
    }
    setSending(true);
    let success = 0;
    let failed = 0;

    for (const m of selectedRecipients) {
      try {
        const parsedText = customMessage.replace(/{name}/g, m.name);
        await whatsappApi.sendCustom({
          phone: m.phone,
          message: parsedText
        });
        success++;
      } catch (err) {
        console.error(err);
        failed++;
      }
    }

    alert(`Broadcast complete!\nDelivered: ${success}\nFailed: ${failed}`);
    setSending(false);
    setSelectedRecipients([]);
    setSearchQuery('');
  };

  if (loading) {
    return <div className="py-24 flex justify-center"><Loader /></div>;
  }

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto px-2">
      {/* Title */}
      <PageHeader 
        title="Communication Control Center" 
        subtitle="Manage automated member reminders on the left, or compose custom text broadcasts on the right." 
      />

      {/* Two Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Suggested Alerts (Col Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <h3 className="text-xs font-black uppercase text-white tracking-widest">Suggested Reminders</h3>
          </div>

          <div className="space-y-4">
            {alertsData.map((item) => (
              <div 
                key={item.id}
                className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-white/10 transition-all"
              >
                <div className="flex gap-4 items-start flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${item.colorClass}`}>
                    {item.icon}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-black text-white truncate">{item.label}</h3>
                    <p className="text-xs text-text-muted leading-relaxed">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                  <span 
                    onClick={() => item.count > 0 && setViewingAudienceCampaign(item)}
                    className={`text-[11px] font-black px-3.5 py-2 rounded-xl transition-all ${item.count > 0 ? 'bg-white/5 text-accent hover:bg-white/10 cursor-pointer' : 'bg-white/5 text-text-muted'}`}
                    title={item.count > 0 ? "Click to view recipient names" : ""}
                  >
                    {item.count} Members
                  </span>
                  <button
                    disabled={item.count === 0}
                    onClick={() => setEditingCampaign({ ...item })}
                    className="px-4 py-2 border border-white/5 bg-transparent hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98]"
                  >
                    Edit Text
                  </button>
                  <button
                    disabled={item.count === 0}
                    onClick={() => setActiveAlertCampaign(item)}
                    className="px-5 py-2 bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98]"
                  >
                    Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Custom Message Broadcast (Col Span 5) */}
        <div className="lg:col-span-5 bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <MessageCircle size={16} className="text-accent" />
            <h3 className="text-xs font-black uppercase text-white tracking-widest">Custom Broadcast Message</h3>
          </div>

          <div className="space-y-4">
            {/* Search recipients */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-text-muted font-bold ml-1">Search & Select Recipients</label>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-text-muted" />
                <input 
                  type="text"
                  placeholder="Search member name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121214] border border-white/5 rounded-xl pl-9 pr-4 py-3 text-xs text-white outline-none focus:border-accent"
                />
              </div>

              {searchQuery.trim() && (
                <div className="border border-white/5 rounded-xl divide-y divide-white/5 bg-[#121214] overflow-hidden mt-1 shadow-lg max-h-[180px] overflow-y-auto no-scrollbar">
                  {filteredSearchMembers.length === 0 ? (
                    <div className="p-3.5 text-center text-text-muted text-xs">No member found</div>
                  ) : (
                    filteredSearchMembers.map(m => (
                      <div 
                        key={m._id}
                        onClick={() => {
                          if (!selectedRecipients.some(x => x._id === m._id)) {
                            setSelectedRecipients([...selectedRecipients, m]);
                          }
                          setSearchQuery('');
                        }}
                        className="p-3.5 hover:bg-white/5 cursor-pointer flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-white">{m.name}</span>
                        <span className="text-text-muted">{m.phone}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Recipient tags checklist */}
            {selectedRecipients.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-widest text-text-muted font-bold ml-1 font-mono">Recipients Selected ({selectedRecipients.length})</p>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-[#121214] border border-white/5 rounded-xl">
                  {selectedRecipients.map(m => (
                    <div key={m._id} className="bg-white/5 text-white pl-2.5 pr-1 py-1 rounded-lg text-xs flex items-center gap-1.5 font-medium border border-white/5">
                      <span>{m.name}</span>
                      <button 
                        onClick={() => setSelectedRecipients(selectedRecipients.filter(x => x._id !== m._id))}
                        className="w-4.5 h-4.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-text-muted hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editor Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-text-muted font-bold ml-1">Write Broadcast Message</label>
              <textarea
                rows={5}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type message here. Type {name} to personalize."
                className="w-full bg-[#121214] border border-white/5 rounded-xl p-3.5 text-xs text-white outline-none focus:border-accent leading-relaxed font-mono"
              />
              <p className="text-[9px] text-text-muted ml-1 font-mono">Use <strong>{'{name}'}</strong> to personalize names inside the text.</p>
            </div>

            <button
              onClick={handleSendCustomBroadcast}
              disabled={sending || selectedRecipients.length === 0}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-accent/10"
            >
              {sending ? 'Sending...' : <><Send size={13} /> Send Broadcast Campaign</>}
            </button>
          </div>
        </div>

      </div>

      {/* Confirm Suggested Campaign Modal */}
      {activeAlertCampaign && (
        <Modal
          isOpen={!!activeAlertCampaign}
          onClose={() => setActiveAlertCampaign(null)}
          title="Confirm WhatsApp Campaign"
          size="sm"
        >
          <div className="space-y-4 p-1 text-left text-xs">
            <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-2">
              <p className="font-bold text-white uppercase text-[10px] tracking-wider text-accent font-mono">Campaign Recipients</p>
              <p className="text-text-secondary">You are sending automated WhatsApp reminders to <strong>{activeAlertCampaign.count} members</strong> matching <strong>{activeAlertCampaign.label}</strong>.</p>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-white uppercase text-[10px] tracking-wider text-text-muted font-mono">Message Output Preview</p>
              <div className="bg-[#121214] border border-white/5 p-3.5 rounded-xl font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                {activeAlertCampaign.templateText
                  .replace(/{name}/g, activeAlertCampaign.recipients[0]?.name || 'Member')
                  .replace(/{expiryDate}/g, activeAlertCampaign.recipients[0]?.planExpiry ? new Date(activeAlertCampaign.recipients[0].planExpiry).toLocaleDateString('en-GB') : 'N/A')}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => setActiveAlertCampaign(null)}
                className="px-4 py-2 border border-white/5 bg-transparent hover:bg-white/5 text-xs text-white font-bold rounded-lg uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendCampaign(activeAlertCampaign)}
                disabled={sending}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-black text-xs font-black rounded-lg uppercase tracking-wider transition-all"
              >
                {sending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Selected Recipients Detail checklist Modal */}
      {viewingAudienceCampaign && (
        <Modal
          isOpen={!!viewingAudienceCampaign}
          onClose={() => setViewingAudienceCampaign(null)}
          title={`${viewingAudienceCampaign.label}`}
          size="md"
        >
          <div className="space-y-3 p-1 text-left">
            <p className="text-[10px] text-text-muted uppercase tracking-widest font-black mb-2">Recipient Members ({viewingAudienceCampaign.count})</p>
            <div className="border border-white/5 rounded-xl divide-y divide-white/5 bg-[#121214] max-h-[300px] overflow-y-auto pr-1 no-scrollbar shadow-inner">
              {viewingAudienceCampaign.recipients.map(m => (
                <div key={m._id} className="p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{m.name}</span>
                    <span className="text-[10px] text-text-muted mt-0.5">{m.phone}</span>
                  </div>
                  <div className="text-right">
                    {m.planExpiry && (
                      <span className="text-[10px] text-text-muted block">Expires: {new Date(m.planExpiry).toLocaleDateString('en-GB')}</span>
                    )}
                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-accent font-black uppercase mt-0.5 inline-block">{m.status || 'Active'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => setViewingAudienceCampaign(null)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-black text-xs font-black rounded-lg uppercase tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customize alert message inline template modal */}
      {editingCampaign && (
        <Modal
          isOpen={!!editingCampaign}
          onClose={() => setEditingCampaign(null)}
          title={`Customize Alert Message`}
          size="md"
        >
          <div className="space-y-4 p-1 text-left text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-black">Campaign Category</span>
              <p className="font-bold text-white text-xs">{editingCampaign.label} ({editingCampaign.count} Recipients)</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-text-muted uppercase tracking-widest font-black ml-1">Edit Message Template</label>
              <textarea
                rows={5}
                value={editingCampaign.templateText}
                onChange={(e) => setEditingCampaign({ ...editingCampaign, templateText: e.target.value })}
                placeholder="Type message here. Use {name} and {expiryDate} placeholders."
                className="w-full bg-[#121214] border border-white/5 rounded-xl p-3 text-xs text-white outline-none focus:border-accent leading-relaxed font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-white uppercase text-[10px] tracking-wider text-text-muted">Live Preview (First Recipient)</p>
              <div className="bg-[#121214] border border-white/5 p-3.5 rounded-xl font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                {editingCampaign.templateText
                  .replace(/{name}/g, editingCampaign.recipients[0]?.name || 'Member')
                  .replace(/{expiryDate}/g, editingCampaign.recipients[0]?.planExpiry ? new Date(editingCampaign.recipients[0].planExpiry).toLocaleDateString('en-GB') : 'N/A')}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => setEditingCampaign(null)}
                className="px-4 py-2 border border-white/5 bg-transparent hover:bg-white/5 text-xs text-white font-bold rounded-lg uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendCampaign(editingCampaign)}
                disabled={sending}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-black text-xs font-black rounded-lg uppercase tracking-wider transition-all"
              >
                {sending ? 'Sending...' : 'Send WhatsApp Campaign'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
