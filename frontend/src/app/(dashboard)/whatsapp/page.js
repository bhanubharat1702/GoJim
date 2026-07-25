'use client';
import { useState, useEffect } from 'react';
import { whatsappApi, membersApi, leadsApi } from '@/lib/api';
import { PageHeader, Loader, Modal, Select } from '@/components/UI';
import { MessageSquare, List, Send, IndianRupee, Dumbbell, Flame, PartyPopper, Pencil, Mailbox, SendHorizontal, Loader2 } from 'lucide-react';

export default function WhatsAppPage() {
  const [templates, setTemplates] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSend, setShowSend] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState('templates');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tRes, lRes] = await Promise.all([whatsappApi.getTemplates(), whatsappApi.getLog()]);
        if (tRes.success) setTemplates(tRes.data);
        if (lRes.success) setLog(lRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const openSend = async (template) => {
    try {
      const isLeadTemplate = ['new_lead', 'lead_followup', 'lead_followup_reminder'].includes(template.id);
      if (isLeadTemplate) {
        const res = await leadsApi.getAll('limit=200');
        if (res.success) setMembers(res.data);
      } else {
        const res = await membersApi.getAll('limit=200');
        if (res.success) setMembers(res.data);
      }
    } catch (err) { console.error(err); }
    setShowSend(template);
  };

  const handleSend = async () => {
    const isLeadTemplate = ['new_lead', 'lead_followup', 'lead_followup_reminder'].includes(showSend?.id);
    if (!selectedMember) return alert(isLeadTemplate ? 'Select a lead' : 'Select a member');
    setSending(true);
    try {
      const member = members.find(m => m._id === selectedMember);
      if (showSend.id === 'custom') {
        await whatsappApi.sendCustom({ phone: member.phone, message: customMsg });
      } else {
        const vars = {
          name: member.name,
          discount: '20',
          validity: '7 days'
        };
        if (member.planExpiry) {
          vars.expiry = new Date(member.planExpiry).toLocaleDateString();
        }
        if (member.plan) {
          vars.plan = member.plan;
        }
        await whatsappApi.sendTemplate({
          phone: member.phone, templateId: showSend.id,
          variables: vars
        });
      }
      alert('Message sent successfully!');
      setShowSend(null);
      setSelectedMember('');
      const lRes = await whatsappApi.getLog();
      if (lRes.success) setLog(lRes.data);
    } catch (err) { alert(err.message); }
    finally { setSending(false); }
  };

  const categoryIcon = { payment: <IndianRupee size={24} className="text-warning" />, engagement: <Dumbbell size={24} className="text-info" />, promotion: <Flame size={24} className="text-danger" />, onboarding: <PartyPopper size={24} className="text-accent" /> };

  if (loading) return null;

  return (
    <div>
      <PageHeader title="WhatsApp" subtitle="Message automation" />

      <div className="flex gap-2 mb-6 bg-bg-card rounded-xl p-1 max-w-sm">
        <button onClick={() => setView('templates')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${view === 'templates' ? 'bg-accent text-black' : 'text-text-muted'}`}><List size={16} /> Templates</button>
        <button onClick={() => setView('log')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${view === 'log' ? 'bg-accent text-black' : 'text-text-muted'}`}><MessageSquare size={16} /> Log ({log.length})</button>
      </div>

      {view === 'templates' ? (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card !p-4 cursor-pointer hover:!border-accent/30" onClick={() => openSend(t)}>
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center">{categoryIcon[t.category] || <MessageSquare size={24} className="text-text-muted" />}</span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-text-muted capitalize">{t.category}</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary bg-bg-primary p-3 rounded-xl">{t.template}</p>
            </div>
          ))}
          <div className="card !p-4 cursor-pointer hover:!border-accent/30 border-dashed" onClick={() => openSend({ id: 'custom', name: 'Custom Message' })}>
            <div className="flex items-center gap-3">
              <span className="text-text-primary"><Pencil size={24} /></span>
              <p className="text-sm font-semibold">Send Custom Message</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {log.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-center">
              <Mailbox size={48} className="text-text-muted opacity-50 mb-4" />
              <p className="text-text-muted font-medium">No messages sent yet</p>
            </div>
          ) : [...log].reverse().map((m, i) => (
            <div key={i} className="card !p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{m.templateName}</p>
                <span className="badge badge-success">{m.status}</span>
              </div>
              <p className="text-xs text-text-muted mb-1">To: {m.phone}</p>
              <p className="text-xs text-text-secondary bg-bg-primary p-2 rounded-lg">{m.message}</p>
              <p className="text-[10px] text-text-muted mt-2">{new Date(m.sentAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!showSend} onClose={() => setShowSend(null)} title={`Send: ${showSend?.name || ''}`}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">
              {['new_lead', 'lead_followup', 'lead_followup_reminder'].includes(showSend?.id) ? 'Select Lead' : 'Select Member'}
            </p>
            <Select 
              value={selectedMember} 
              options={members.map(m => ({ label: `${m.name} (${m.phone})`, value: m._id }))} 
              onChange={val => setSelectedMember(val)} 
              placeholder={['new_lead', 'lead_followup', 'lead_followup_reminder'].includes(showSend?.id) ? 'Search lead...' : 'Search member...'}
            />
          </div>
          {showSend?.id === 'custom' && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Message Body</p>
              <textarea placeholder="Type your message..." value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={4} className="!rounded-2xl" />
            </div>
          )}
          {showSend?.template && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black ml-1">Template Preview</p>
              <div className="p-4 rounded-2xl bg-bg-primary/50 border border-white/5 text-[13px] text-text-secondary leading-relaxed">{showSend.template}</div>
            </div>
          )}
          <button onClick={handleSend} disabled={sending} className="btn-primary w-full !py-4 font-black uppercase tracking-widest shadow-xl shadow-accent/20">
            {sending ? 'Sending...' : <><SendHorizontal size={18} /> Send Message</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}
