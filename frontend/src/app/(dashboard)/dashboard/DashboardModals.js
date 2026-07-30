'use client';

import React from 'react';
import Link from 'next/link';
import { Modal, Badge } from '@/components/UI';
import { Users, AlertCircle, Zap, Calendar } from 'lucide-react';

export default function DashboardModals({
  showStatusUpdateModal,
  setShowStatusUpdateModal,
  showFollowupReminderModal,
  setShowFollowupReminderModal,
  showStaleLeadsModal,
  setShowStaleLeadsModal,
  expiringTodayCount,
  inactiveCount,
  todaysFollowupCount,
  staleLeadsCount,
  unpaidPayroll,
  pendingClients,
  handleCloseStatusUpdateModal
}) {
  return (
    <>
      {showStatusUpdateModal && (expiringTodayCount > 0 || inactiveCount > 0) && (
        <Modal
          isOpen={showStatusUpdateModal}
          onClose={handleCloseStatusUpdateModal}
          title="Daily Status Update"
          size="sm"
        >
          <div className="space-y-6 text-center py-2 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/5 animate-pulse">
              <Users size={28} strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">Members Overview</h3>
              <p className="text-xs text-text-muted uppercase tracking-widest font-black">Today's Quick Insights</p>
            </div>

            <div className="space-y-3 mt-4 text-left">
              {/* Expiring Plans Row */}
              <Link
                href="/members?filter=expiring_today"
                onClick={handleCloseStatusUpdateModal}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 hover:bg-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer no-underline block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${expiringTodayCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-text-muted border-white/10'}`}>
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Plan Expirations</h4>
                    <p className="text-[10px] text-text-muted font-bold mt-0.5 font-normal normal-case">
                      {expiringTodayCount > 0 ? expiringTodayCount + " plans require renewal today" : 'No plans expiring today'}
                    </p>
                  </div>
                </div>
                <span className={`text-[13px] font-black px-2.5 py-0.5 rounded-lg border ${expiringTodayCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-text-muted border-white/10'}`}>
                  {expiringTodayCount}
                </span>
              </Link>

              {/* Inactive Members Row */}
              <Link
                href="/members?filter=expired"
                onClick={handleCloseStatusUpdateModal}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 hover:bg-white/[0.06] hover:border-red-500/30 transition-all cursor-pointer no-underline block"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${inactiveCount > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-text-muted border-white/10'}`}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Inactive Members</h4>
                    <p className="text-[10px] text-text-muted font-bold mt-0.5 font-normal normal-case">
                      {inactiveCount > 0 ? inactiveCount + " members currently inactive" : 'All members active'}
                    </p>
                  </div>
                </div>
                <span className={`text-[13px] font-black px-2.5 py-0.5 rounded-lg border ${inactiveCount > 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-white/5 text-text-muted border-white/10'}`}>
                  {inactiveCount}
                </span>
              </Link>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseStatusUpdateModal}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
              <Link
                href="/members"
                onClick={handleCloseStatusUpdateModal}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-accent text-black hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-95 cursor-pointer text-center no-underline"
              >
                View Members
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {showFollowupReminderModal && todaysFollowupCount > 0 && (
        <Modal
          isOpen={showFollowupReminderModal}
          onClose={() => setShowFollowupReminderModal(false)}
          title="Daily Follow-Up Reminder"
          size="sm"
        >
          <div className="space-y-6 text-center py-2 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/5 animate-pulse">
              <Calendar size={28} strokeWidth={2.5} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white tracking-tight">Today's Agenda</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                You have <span className="text-white font-black text-base px-1">{todaysFollowupCount}</span> lead{todaysFollowupCount > 1 ? 's' : ''} scheduled for follow-up today.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFollowupReminderModal(false)}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:scale-95 cursor-pointer"
              >
                Dismiss
              </button>
              <Link
                href="/leads?filter=pending_followups&today=true"
                onClick={() => setShowFollowupReminderModal(false)}
                className="flex-1 py-3 text-xs font-extrabold uppercase tracking-widest rounded-xl transition-all duration-300 bg-accent text-black hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-95 cursor-pointer text-center no-underline"
              >
                Update the Leads
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {showStaleLeadsModal && (staleLeadsCount > 0 || unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0 || pendingClients.count > 0) && (
        <Modal
          isOpen={showStaleLeadsModal}
          onClose={() => setShowStaleLeadsModal(false)}
          title="Previous Month Pending Tasks"
          size="xl"
        >
          <div className="py-2 px-6">
            {(() => {
              const colsCount = (staleLeadsCount > 0 ? 1 : 0) + 
                                (pendingClients.count > 0 ? 1 : 0) + 
                                (unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0 ? 1 : 0);
              return (
                <div className={`grid grid-cols-1 ${colsCount === 3 ? 'md:grid-cols-3' : colsCount === 2 ? 'md:grid-cols-2' : ''} gap-4 text-left`}>
                  {staleLeadsCount > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full min-h-[160px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider whitespace-nowrap">Leads Status</span>
                          <Badge variant="warning" size="sm" className="font-bold border border-amber-500/10 shrink-0">{staleLeadsCount} Pending</Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed normal-case">
                          You have {staleLeadsCount} leads from the previous month whose statuses are not updated.
                        </p>
                      </div>
                      <Link
                        href="/leads?filter=stale"
                        onClick={() => setShowStaleLeadsModal(false)}
                        className="w-full bg-accent hover:bg-accent-hover text-black font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center mt-4"
                      >
                        View Pending Leads
                      </Link>
                    </div>
                  )}

                  {pendingClients.count > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full min-h-[160px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider whitespace-nowrap">Client Payments</span>
                          <Badge variant="success" size="sm" className="font-bold border border-emerald-500/10 shrink-0">{pendingClients.count} Pending</Badge>
                        </div>
                        <p className="text-[11px] text-text-secondary leading-relaxed normal-case">
                          You have {pendingClients.count} clients whose membership expired in the previous month and are pending renewal (Total Value: ₹{pendingClients.amount.toLocaleString()}).
                        </p>
                      </div>
                      <Link
                        href="/members?filter=expired"
                        onClick={() => setShowStaleLeadsModal(false)}
                        className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center mt-4"
                      >
                        View Expired Members
                      </Link>
                    </div>
                  )}

                  {(unpaidPayroll.trainersCount > 0 || unpaidPayroll.staffCount > 0) && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full min-h-[160px]">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider whitespace-nowrap">Salary Payments</span>
                          <Badge variant="danger" size="sm" className="font-bold border border-red-500/10">
                            {unpaidPayroll.trainersCount + unpaidPayroll.staffCount} Unpaid
                          </Badge>
                        </div>
                        <div className="text-[11px] text-text-secondary space-y-1.5 normal-case leading-relaxed">
                          <p>You have unpaid salaries from the previous month:</p>
                          <ul className="list-disc pl-4 space-y-1 text-[11px]">
                            {unpaidPayroll.trainersCount > 0 && (
                              <li>
                                Trainers: <span className="text-white font-bold">{unpaidPayroll.trainersCount}</span> unpaid (Total: ₹{unpaidPayroll.trainersAmount.toLocaleString()})
                              </li>
                            )}
                            {unpaidPayroll.staffCount > 0 && (
                              <li>
                                Staff: <span className="text-white font-bold">{unpaidPayroll.staffCount}</span> unpaid (Total: ₹{unpaidPayroll.staffAmount.toLocaleString()})
                              </li>
                            )}
                          </ul>
                          <p className="pt-1 text-[10px] text-text-muted font-bold">
                            Total Outstanding: ₹{(unpaidPayroll.trainersAmount + unpaidPayroll.staffAmount).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link
                          href="/trainers"
                          onClick={() => setShowStaleLeadsModal(false)}
                          className="flex-1 bg-accent hover:bg-accent-hover text-black font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center"
                        >
                          Pay Trainers
                        </Link>
                        <Link
                          href="/staff"
                          onClick={() => setShowStaleLeadsModal(false)}
                          className="flex-1 bg-[#f58220] hover:bg-[#d46a13] text-white font-black py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-[10px] uppercase tracking-wider no-underline text-center"
                        >
                          Pay Staff
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </>
  );
}
