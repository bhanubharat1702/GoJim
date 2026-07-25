'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { attendanceApi, membersApi, trainersApi, staffApi } from '@/lib/api';
import { Loader, Badge, EmptyState, DatePicker, StatCard, SearchBar, Modal } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { 
  Check, X, Search, Calendar, Users, 
  UserCheck, UserMinus, Activity, Clock, AlertCircle,
  LogIn, LogOut
} from 'lucide-react';

function AttendanceContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const currentRole = searchParams.get('role') || 'clients';

  const [people, setPeople] = useState([]);
  const [statusMap, setStatusMap] = useState({}); // Stores { [personId]: full_record_object }
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'unmarked'
  const [actionLoading, setActionLoading] = useState({});

  // Calendar Modal States
  const [viewingPerson, setViewingPerson] = useState(null);
  const [attendanceWarningState, setAttendanceWarningState] = useState(null);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showSpentTime, setShowSpentTime] = useState(false); // Toggle to show duration

  const getLocalYYYYMMDD = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setSelectedDate(getLocalYYYYMMDD());
  }, []);

  const todayStr = getLocalYYYYMMDD();
  const isPastDate = selectedDate < todayStr;
  const isFutureDate = selectedDate > todayStr;

  // Add Escape key handler to close popup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setViewingPerson(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all people and selected day's attendance
  const fetchData = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      setStatusFilter('all'); // Reset filter on role or date change

      let peopleRes;
      if (currentRole === 'clients') {
        peopleRes = await membersApi.getAll('limit=1000&excludeInactive=true');
      } else if (currentRole === 'trainers') {
        peopleRes = await trainersApi.getAll('limit=1000');
      } else if (currentRole === 'staff') {
        peopleRes = await staffApi.getAll('limit=1000');
      }
      
      // Filter out inactive / exited / deactivated roster — check BOTH status fields
      if (peopleRes && peopleRes.success) {
        const activeOrExpired = peopleRes.data.filter(p => {
          const statusVal = (p.status || '').toLowerCase();
          const membershipStatusVal = (p.membershipStatus || '').toLowerCase();
          
          // If EITHER field indicates inactive, deactivated, or exited — exclude this person
          const isInactive =
            statusVal.includes('inact') || membershipStatusVal.includes('inact') ||
            statusVal.includes('deact') || membershipStatusVal.includes('deact') ||
            statusVal.includes('exit')  || membershipStatusVal.includes('exit');

          if (isInactive) return false;

          // Only include if the primary status is explicitly active or expired
          return statusVal === 'active' || statusVal === 'expired';
        });
        setPeople(activeOrExpired);
      }
      
      const todayRes = await attendanceApi.getAll(`startDate=${selectedDate}&endDate=${selectedDate}`);
      if (todayRes.success) {
        const map = {};
        todayRes.data.forEach(record => {
          if (record.member?._id) {
            map[record.member._id] = record; // Store full record
          }
        });
        setStatusMap(map);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentRole, selectedDate]);

  // Fetch viewing person's month history when modal or month changes
  const fetchHistory = async () => {
    if (!viewingPerson) return;
    try {
      setHistoryLoading(true);
      const year = historyMonth.getFullYear();
      const month = historyMonth.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      let queryStr = `startDate=${startDate}&endDate=${endDate}`;
      if (currentRole === 'clients') queryStr += `&memberId=${viewingPerson._id}`;
      else if (currentRole === 'trainers') queryStr += `&trainerId=${viewingPerson._id}`;
      else if (currentRole === 'staff') queryStr += `&staffId=${viewingPerson._id}`;
      
      const res = await attendanceApi.getAll(queryStr);
      if (res.success) {
        setHistoryRecords(res.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [viewingPerson, historyMonth]);

  const proceedMarkPresent = async (person) => {
    setActionLoading(prev => ({ ...prev, [person._id]: 'yes' }));
    try {
      const res = await attendanceApi.checkIn({ 
        memberId: person._id, 
        markedBy: 'staff', 
        date: selectedDate,
        role: currentRole 
      });
      if (res.success) {
        setStatusMap(prev => ({ ...prev, [person._id]: res.data || { status: 'present', checkInTime: new Date() } }));
        fetchData(); // Reload fully to sync dates
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [person._id]: null }));
    }
  };

  const handleConfirmWarning = async () => {
    if (!attendanceWarningState) return;
    const { type, person } = attendanceWarningState;
    setAttendanceWarningState(null); // Clear first

    if (type === 'expired' || type === 'expiring') {
      // After confirming plan warnings, check if there is also a slot mismatch warning next
      const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
      const hasSlots = activeSlots.length > 0;

      if (hasSlots) {
        const assignedSlot = person.timeSlot;
        const currentSlot = getCurrentSlotName();
        
        if (assignedSlot && assignedSlot !== currentSlot) {
          setTimeout(() => {
            setAttendanceWarningState({
              type: 'mismatch',
              person,
              assignedSlot,
              currentSlot
            });
          }, 100);
          return;
        }
      }
    }

    await proceedMarkPresent(person);
  };

  // Handle Check-in / Yes
  const handleMarkPresent = async (person) => {
    if (isPastDate || isFutureDate) return; // Date restrictions
    
    const currentRecord = statusMap[person._id];

    // Toggle off: If already present, unmark them! (Only for non-trainers now!)
    if (currentRecord?.status === 'present') {
      if (currentRole === 'trainers') return; // NO double-click untoggle allowed for Trainer In button!
      
      setActionLoading(prev => ({ ...prev, [person._id]: 'yes' }));
      try {
        const res = await attendanceApi.unmark({ 
          memberId: person._id, 
          date: selectedDate,
          role: currentRole 
        });
        if (res.success) {
          setStatusMap(prev => {
            const copy = { ...prev };
            delete copy[person._id];
            return copy;
          });
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setActionLoading(prev => ({ ...prev, [person._id]: null }));
      }
      return;
    }

    // Warnings Check for clients
    if (currentRole === 'clients') {
      // 1. Check Plan Expiration first (High/Moderate financial warning)
      if (person.planExpiry) {
        const now = new Date();
        now.setHours(0,0,0,0);
        const expiry = new Date(person.planExpiry);
        expiry.setHours(0,0,0,0);
        
        const isExpired = expiry < now;
        const diffTime = Math.abs(expiry - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // exact days difference

        if (isExpired) {
          // High level danger warning
          setAttendanceWarningState({
            type: 'expired',
            person,
            expiryDate: expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            diffDays
          });
          return;
        } else if (diffDays <= 3) {
          // Moderate level warning
          setAttendanceWarningState({
            type: 'expiring',
            person,
            expiryDate: expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            diffDays
          });
          return;
        }
      }

      // 2. Check Time Slot Mismatch next
      const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
      const hasSlots = activeSlots.length > 0;

      if (hasSlots) {
        const assignedSlot = person.timeSlot;
        const currentSlot = getCurrentSlotName();
        
        if (assignedSlot && assignedSlot !== currentSlot) {
          setAttendanceWarningState({
            type: 'mismatch',
            person,
            assignedSlot,
            currentSlot
          });
          return;
        }
      }
    }

    await proceedMarkPresent(person);
  };

  // Handle Checkout / No (Absent)
  const handleMarkAbsent = async (person) => {
    if (isPastDate || isFutureDate) return; // Date restrictions
    
    const currentRecord = statusMap[person._id];

    // If Trainer Role: No button behaves as Out (Checkout)
    if (currentRole === 'trainers') {
      if (!currentRecord) return; // Must be checked-in first
      if (currentRecord.checkOutTime) return; // NO double-click untoggle allowed for Trainer Out button!
      
      setActionLoading(prev => ({ ...prev, [person._id]: 'no' }));
      try {
        const res = await attendanceApi.checkOut({
          memberId: person._id,
          date: selectedDate,
          role: currentRole
        });
        if (res.success) {
          setStatusMap(prev => ({ ...prev, [person._id]: res.data }));
          fetchData(); // Reload fully to sync checkout
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setActionLoading(prev => ({ ...prev, [person._id]: null }));
      }
      return;
    }
    
    // Default Clients/Staff: behave as Absent toggle
    if (currentRecord?.status === 'absent') {
      setActionLoading(prev => ({ ...prev, [person._id]: 'no' }));
      try {
        const res = await attendanceApi.unmark({ 
          memberId: person._id, 
          date: selectedDate,
          role: currentRole 
        });
        if (res.success) {
          setStatusMap(prev => {
            const copy = { ...prev };
            delete copy[person._id];
            return copy;
          });
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setActionLoading(prev => ({ ...prev, [person._id]: null }));
      }
      return;
    }

    setActionLoading(prev => ({ ...prev, [person._id]: 'no' }));
    try {
      const res = await attendanceApi.markAbsent({ 
        memberId: person._id, 
        date: selectedDate,
        role: currentRole 
      });
      if (res.success) {
        setStatusMap(prev => ({ ...prev, [person._id]: { status: 'absent' } }));
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [person._id]: null }));
    }
  };

  // In-memory instant filtering
  const baseFiltered = people.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  const presentCount = baseFiltered.filter(p => statusMap[p._id]?.status === 'present').length;
  const absentCount = baseFiltered.filter(p => {
    const s = statusMap[p._id]?.status;
    return s === 'absent' || (!s && isPastDate);
  }).length;
  const unmarkedCount = baseFiltered.length - presentCount - absentCount;

  // Final filtered list
  const filteredPeople = baseFiltered.filter(p => {
    let status = statusMap[p._id]?.status;
    if (!status && isPastDate) status = 'absent';
    
    if (statusFilter === 'present') return status === 'present';
    if (statusFilter === 'absent') return status === 'absent';
    if (statusFilter === 'unmarked') return status !== 'present' && status !== 'absent';
    return true; // 'all'
  }).sort((a, b) => {
    let statusA = statusMap[a._id]?.status;
    if (!statusA && isPastDate) statusA = 'absent';
    
    let statusB = statusMap[b._id]?.status;
    if (!statusB && isPastDate) statusB = 'absent';
    
    const isMarkedA = statusA === 'present' || statusA === 'absent';
    const isMarkedB = statusB === 'present' || statusB === 'absent';

    if (!isMarkedA && isMarkedB) return -1;
    if (isMarkedA && !isMarkedB) return 1;
    return 0;
  });

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const cleanStr = timeStr.trim().toUpperCase();
    
    // Check for AM/PM format (e.g. "06:00 AM" or "6:00 PM")
    const ampmMatch = cleanStr.match(/^(\d+):(\d+)\s*(AM|PM)$/);
    if (ampmMatch) {
      let hrs = parseInt(ampmMatch[1], 10);
      const mins = parseInt(ampmMatch[2], 10);
      const suffix = ampmMatch[3];
      if (suffix === 'PM' && hrs !== 12) hrs += 12;
      if (suffix === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    }
    
    // Check for 24h format (e.g. "18:30" or "06:00")
    const standardMatch = cleanStr.match(/^(\d+):(\d+)$/);
    if (standardMatch) {
      const hrs = parseInt(standardMatch[1], 10);
      const mins = parseInt(standardMatch[2], 10);
      return hrs * 60 + mins;
    }
    
    return null;
  };

  const getCheckInMinutes = (checkInTimeStr) => {
    if (!checkInTimeStr) return null;
    const d = new Date(checkInTimeStr);
    return d.getHours() * 60 + d.getMinutes();
  };

  const getCurrentSlotName = () => {
    const d = new Date();
    const checkInMins = d.getHours() * 60 + d.getMinutes();

    const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    
    for (const slot of activeSlots) {
      const startMins = parseTimeToMinutes(slot.startTime);
      const endMins = parseTimeToMinutes(slot.endTime);
      
      if (startMins !== null && endMins !== null) {
        if (checkInMins >= startMins && checkInMins <= endMins) {
          return slot.name;
        }
      }
    }
    return null;
  };

  const getVisitedSlot = (checkInTimeStr) => {
    if (!checkInTimeStr) return '-';
    const checkInMins = getCheckInMinutes(checkInTimeStr);
    if (checkInMins === null) return '-';

    const activeSlots = (user?.timeSlots || []).filter(s => s.status === 'Active' || s.status === 'active' || !s.status);
    
    for (const slot of activeSlots) {
      const startMins = parseTimeToMinutes(slot.startTime);
      const endMins = parseTimeToMinutes(slot.endTime);
      
      if (startMins !== null && endMins !== null) {
        if (checkInMins >= startMins && checkInMins <= endMins) {
          return slot.name;
        }
      }
    }
    
    // Fallback: nicely format check-in time if no slot matched
    return new Date(checkInTimeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helpers for labels
  const getRoleHeader = () => {
    if (currentRole === 'clients') return 'Visited Slot';
    if (currentRole === 'trainers') return 'Specialties';
    return 'Staff Role';
  };

  const getPersonDetail = (p, currentRecord) => {
    if (currentRole === 'clients') {
      if (currentRecord?.status === 'present') {
        return getVisitedSlot(currentRecord.checkInTime);
      }
      return '-';
    }
    if (currentRole === 'trainers') return p.specialties?.join(', ') || 'General';
    return p.role || 'Staff';
  };

  const getStatusColumnHeader = () => {
    if (currentRole === 'clients') return 'Payment Status';
    return 'Status';
  };

  const getPaymentStatusBadge = (person) => {
    if (currentRole === 'clients') {
      const now = new Date();
      if (person.status === 'inactive') {
        return <Badge variant="secondary" size="sm">Inactive</Badge>;
      }

      const expiry = new Date(person.planExpiry);
      const joinDate = new Date(person.joinDate || person.createdAt);

      const isJoinedToday = joinDate.toDateString() === now.toDateString();
      if (isJoinedToday) {
        return <Badge variant="info" size="sm">Joined Today</Badge>;
      }

      const isExpired = expiry < now;
      const diffTime = Math.abs(now - expiry);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (isExpired) {
        return <Badge variant="danger" size="sm">Expired {diffDays === 0 ? 'Today' : `${diffDays} days ago`}</Badge>;
      }

      if (diffDays <= 3) {
        return (
          <Badge variant="warning" size="sm">
            {diffDays === 0 ? 'Expiring Today' : `Expiring in ${diffDays} day${diffDays > 1 ? 's' : ''}`}
          </Badge>
        );
      }

      return <Badge variant="success" size="sm">Paid</Badge>;
    }
    
    return <Badge variant="success" size="sm">Active</Badge>;
  };

  const displayTitle = currentRole === 'clients' ? 'Clients' : currentRole === 'trainers' ? 'Trainers' : 'Staff';

  const formatTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSpentDuration = (checkIn, checkOut) => {
    if (!checkIn) return '';
    if (!checkOut) return 'Active';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  const getSpentDurationCompact = (checkIn, checkOut) => {
    if (!checkIn) return '';
    if (!checkOut) return 'Act';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hrs = (diff / (1000 * 60 * 60)).toFixed(1);
    return `${hrs}h`;
  };

  // Calendar math
  const year = historyMonth.getFullYear();
  const month = historyMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const daysGrid = [];
  for (let i = 0; i < firstDayIndex; i++) daysGrid.push(null);
  for (let d = 1; d <= totalDays; d++) daysGrid.push(d);

  const calculateTotals = () => {
    let presents = 0;
    let absents = 0;
    
    if (!viewingPerson) return { presents, absents };
    
    const joinDateVal = viewingPerson.joinDate || viewingPerson.createdAt;
    const joinDateStr = joinDateVal ? new Date(joinDateVal).toISOString().split('T')[0] : '1970-01-01';
    
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dayStr > todayStr) continue;
      
      const matched = historyRecords.find(r => r.date === dayStr);
      if (matched?.status === 'present') {
        presents++;
      } else if (matched?.status === 'absent') {
        absents++;
      } else if (dayStr >= joinDateStr) {
        // Do not automatically count today as absent since the day is still ongoing
        if (dayStr === todayStr) continue;
        absents++;
      }
    }
    return { presents, absents };
  };

  const { presents: totalPresents, absents: totalAbsents } = calculateTotals();

  const handlePrevMonth = () => {
    setHistoryMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setHistoryMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="pb-2">
      {/* Main Bundle Card */}
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col overflow-visible relative z-30">
        
        {/* Top Header & Stats Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">{displayTitle} Attendance</h1>
              
              {/* Dynamic Status/Restriction Label */}
              {isPastDate ? (
                <div className="flex items-center gap-2 text-[10px] font-black text-warning uppercase tracking-widest mt-1">
                  <AlertCircle size={12} className="text-warning animate-pulse" />
                  Modifications locked for past dates
                </div>
              ) : isFutureDate ? (
                <div className="flex items-center gap-2 text-[10px] font-black text-danger uppercase tracking-widest mt-1">
                  <AlertCircle size={12} className="text-danger animate-pulse" />
                  Check-ins disabled for future dates
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">
                  <Activity size={12} className="text-accent" />
                  Active tracking: modifications are enabled
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={`Search ${currentRole}...`} />
              <div className="w-40">
                <DatePicker 
                  value={selectedDate} 
                  onChange={(val) => setSelectedDate(val || todayStr)} 
                  placeholder="Select Date"
                  clearable={selectedDate !== todayStr}
                  className="w-full"
                  align="right"
                />
              </div>
            </div>
          </div>

          {/* Interactive Stats Bar */}
          <div className="grid grid-cols-4 gap-5">
            <StatCard
              icon={<Users />}
              label="Total Listed"
              value={baseFiltered.length}
              size="xs"
              className={`cursor-pointer transition-all duration-300 ${
                statusFilter === 'all' 
                  ? 'border-accent/40 bg-accent/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
              onClick={() => setStatusFilter('all')}
            />
            <StatCard
              icon={<UserCheck />}
              label="Present"
              value={presentCount}
              size="xs"
              className={`cursor-pointer transition-all duration-300 text-success ${
                statusFilter === 'present'
                  ? 'border-success/40 bg-success/15 shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
                  : 'border-success/10 bg-success/5 hover:bg-success/10'
              }`}
              onClick={() => setStatusFilter('present')}
            />
            <StatCard
              icon={<UserMinus />}
              label="Absent"
              value={absentCount}
              size="xs"
              className={`cursor-pointer transition-all duration-300 text-danger ${
                statusFilter === 'absent'
                  ? 'border-danger/40 bg-danger/15 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                  : 'border-danger/10 bg-danger/5 hover:bg-danger/10'
              }`}
              onClick={() => setStatusFilter('absent')}
            />
            <StatCard
              icon={<Clock />}
              label="Unmarked"
              value={unmarkedCount}
              size="xs"
              className={`cursor-pointer transition-all duration-300 text-text-muted ${
                statusFilter === 'unmarked'
                  ? 'border-white/20 bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
              onClick={() => setStatusFilter('unmarked')}
            />
          </div>
        </div>

        {/* Content Listing Area */}
        {loading ? null : filteredPeople.length === 0 ? (
          <EmptyState 
            icon={<Clock size={48} className="text-text-muted opacity-50" />} 
            title="No records match filter" 
            description={searchQuery ? "Try clearing your search query" : "No entries fit the selected criteria"} 
          />
        ) : (
          <div className="max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12">#</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Name</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{getStatusColumnHeader()}</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{getRoleHeader()}</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-3.5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-center w-64">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPeople.map((person, idx) => {
                  const currentRecord = statusMap[person._id];
                  let currentStatus = currentRecord?.status;
                  if (!currentStatus && isPastDate) {
                    currentStatus = 'absent';
                  }
                  const isMale = person.gender === 'male';
                  const isFemale = person.gender === 'female';

                  return (
                    <tr 
                      key={person._id} 
                      onClick={() => { setViewingPerson(person); setHistoryMonth(new Date()); }}
                      className="group hover:bg-white/[0.02] border-b border-white/5 transition-all cursor-pointer"
                    >
                      <td className="px-8 py-3">
                        <span className="text-[11px] font-black text-text-muted group-hover:text-accent transition-colors">{idx + 1}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform ${
                            isFemale ? 'bg-gradient-to-br from-pink-500/20 to-pink-500/5 text-pink-200 border border-pink-500/10' :
                            isMale ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-200 border border-blue-500/10' :
                            'bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5'
                          }`}>
                            {person.name[0]}
                          </div>
                          <p className={`text-xs font-black transition-colors ${
                            isFemale ? 'text-pink-200 group-hover:text-pink-100' :
                            isMale ? 'text-blue-200 group-hover:text-blue-100' :
                            'text-white group-hover:text-accent'
                          }`}>{person.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {getPaymentStatusBadge(person)}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[9px] font-black text-white px-2.5 py-0.5 bg-white/5 rounded-md border border-white/5 uppercase tracking-widest">
                          {getPersonDetail(person, currentRecord)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {currentStatus === 'present' ? (
                          currentRole === 'trainers' ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="success" size="sm">Present</Badge>
                              {currentRecord?.checkInTime && (
                                <span className="text-[7.5px] font-black text-success uppercase tracking-widest opacity-80">
                                  In: {formatTimeLocal(currentRecord.checkInTime)}
                                </span>
                              )}
                              {currentRecord?.checkOutTime && (
                                <span className="text-[7.5px] font-black text-danger uppercase tracking-widest opacity-80">
                                  Out: {formatTimeLocal(currentRecord.checkOutTime)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="success" size="sm">Present</Badge>
                          )
                        ) : currentStatus === 'absent' ? (
                          <Badge variant="danger" size="sm">Absent</Badge>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-black text-amber-300 uppercase tracking-widest px-2.5 py-0.5 bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/20 rounded-full shadow-inner shadow-amber-500/10">
                            Unmarked
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* IN / YES Button */}
                          <button
                            disabled={
                              actionLoading[person._id] || 
                              isPastDate || 
                              isFutureDate ||
                              (currentRole === 'trainers' && currentStatus === 'present') // Disabled once clicked (Strict one click)
                            }
                            onClick={(e) => { e.stopPropagation(); handleMarkPresent(person); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              currentStatus === 'present'
                                ? 'bg-success/20 border-success/30 text-success shadow-[0_0_15px_rgba(34,197,94,0.15)] cursor-default' 
                                : (isPastDate || isFutureDate)
                                  ? 'bg-white/5 border-white/5 text-text-muted/40 cursor-not-allowed opacity-50'
                                  : 'bg-white/5 border-white/5 text-text-muted hover:border-success/20 hover:text-success'
                            }`}
                          >
                            {currentRole === 'trainers' ? (
                              <>
                                <LogIn size={12} strokeWidth={3} />
                                In
                              </>
                            ) : (
                              <>
                                <Check size={12} strokeWidth={3} />
                                Yes
                              </>
                            )}
                          </button>
                          
                          {/* OUT / NO Button */}
                          <button
                            disabled={
                              actionLoading[person._id] || 
                              isPastDate || 
                              isFutureDate || 
                              (currentRole === 'trainers' && !currentRecord) || // Must check in first
                              (currentRole === 'trainers' && currentRecord?.checkOutTime) // Disabled once clicked (Strict one click)
                            }
                            onClick={(e) => { e.stopPropagation(); handleMarkAbsent(person); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              currentRole === 'trainers' && currentRecord?.checkOutTime
                                ? 'bg-danger/20 border-danger/30 text-danger shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-default'
                                : currentStatus === 'absent'
                                  ? 'bg-danger/20 border-danger/30 text-danger shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                  : (isPastDate || isFutureDate || (currentRole === 'trainers' && !currentRecord))
                                    ? 'bg-white/5 border-white/5 text-text-muted/40 cursor-not-allowed opacity-50'
                                    : 'bg-white/5 border-white/5 text-text-muted hover:border-danger/20 hover:text-danger'
                            }`}
                          >
                            {currentRole === 'trainers' ? (
                              <>
                                <LogOut size={12} strokeWidth={3} />
                                Out
                              </>
                            ) : (
                              <>
                                <X size={12} strokeWidth={3} />
                                No
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simplified, Compact Monthly Attendance Calendar Modal */}
      {viewingPerson && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Clickable Background Overlay */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-200" 
            onClick={() => setViewingPerson(null)} 
          />
          
          {/* Modal Card Content */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full ${
              currentRole === 'trainers' ? 'max-w-[420px]' : 'max-w-[340px]'
            } bg-[#121214] border border-white/10 rounded-2xl p-5 flex flex-col shadow-2xl transition-all`}
          >
            {/* Close Button */}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewingPerson(null); }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-text-muted hover:text-white transition-colors z-20 cursor-pointer"
            >
              <X size={14} />
            </button>

            {/* Modal Header */}
            <div className="mb-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center font-black text-[10px] text-white">
                {viewingPerson.name[0]}
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary tracking-tight">{viewingPerson.name}</h3>
                <p className="text-[9px] font-black text-accent uppercase tracking-widest leading-none mt-0.5">Attendance History</p>
              </div>
            </div>

            {/* Month Selector & Optional Hours Toggle */}
            <div className="space-y-2 mb-3.5">
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-1.5">
                <button 
                  onClick={handlePrevMonth}
                  className="px-2 py-0.5 text-[10px] font-black rounded hover:bg-white/5 text-text-muted hover:text-white transition-all"
                >
                  &larr;
                </button>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  {historyMonth.toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="px-2 py-0.5 text-[10px] font-black rounded hover:bg-white/5 text-text-muted hover:text-white transition-all"
                >
                  &rarr;
                </button>
              </div>

              {/* Show Spent Time Checkbox specifically for Trainer role */}
              {currentRole === 'trainers' && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="showSpentTime" 
                    checked={showSpentTime} 
                    onChange={(e) => setShowSpentTime(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/10 bg-[#0d0d0d] text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                  <label htmlFor="showSpentTime" className="text-[9px] font-black text-text-secondary hover:text-white uppercase tracking-widest cursor-pointer select-none">
                    Show hours spent on calendar tiles
                  </label>
                </div>
              )}
            </div>

            {/* Calendar Grid */}
            {historyLoading ? (
              <div className="h-48 flex items-center justify-center"><Loader /></div>
            ) : (
              <div className="space-y-3.5">
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-text-muted uppercase tracking-wider">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {daysGrid.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="w-8 h-8" />;
                    }
                    
                    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const matched = historyRecords.find(r => r.date === dayStr);
                    
                    const joinDateVal = viewingPerson.joinDate || viewingPerson.createdAt;
                    const joinDateStr = joinDateVal ? new Date(joinDateVal).toISOString().split('T')[0] : '1970-01-01';

                    const isJoined = dayStr >= joinDateStr;
                    const isPastOrToday = dayStr <= todayStr;

                    let tileClass = "w-8 h-8 rounded-lg flex flex-col items-center justify-center text-[10px] font-black transition-all border ";
                    
                    if (matched?.status === 'present') {
                      tileClass += "bg-success/20 border-success/35 text-success shadow-[0_0_10px_rgba(34,197,94,0.1)]";
                    } else if (matched?.status === 'absent' || (isJoined && dayStr < todayStr && !matched)) {
                      tileClass += "bg-danger/20 border-danger/35 text-danger shadow-[0_0_10px_rgba(239,68,68,0.1)]";
                    } else if (isJoined && dayStr === todayStr && !matched) {
                      tileClass += "bg-amber-500/15 border-amber-500/35 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)] animate-pulse";
                    } else {
                      const isDayFuture = dayStr > todayStr;
                      if (isDayFuture) {
                        tileClass += "bg-white/[0.01] border-dashed border-white/5 text-text-muted/40 opacity-40";
                      } else {
                        tileClass += "bg-white/[0.02] border-white/5 text-text-muted/30 cursor-default";
                      }
                    }

                    return (
                      <div key={`day-${day}`} className={tileClass}>
                        <span>{day}</span>
                        {/* Dynamic spent hours show up when checkbox is active */}
                        {currentRole === 'trainers' && showSpentTime && matched?.status === 'present' && (
                          <span className="text-[6.5px] font-black opacity-85 mt-0.5">
                            {getSpentDurationCompact(matched.checkInTime, matched.checkOutTime)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Trainer Hours details below calendar */}
                {currentRole === 'trainers' && showSpentTime && historyRecords.filter(r => r.status === 'present').length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Spent Hours Log</p>
                    <div className="max-h-24 overflow-y-auto no-scrollbar space-y-1">
                      {historyRecords
                        .filter(r => r.status === 'present')
                        .map(r => (
                          <div key={r._id} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.01] border border-white/5 rounded-lg text-[8.5px] font-bold text-text-secondary">
                            <span>{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                            <div className="flex gap-2">
                              <span className="text-success/90">In: {formatTimeLocal(r.checkInTime)}</span>
                              <span className="text-danger/90">Out: {r.checkOutTime ? formatTimeLocal(r.checkOutTime) : 'Active'}</span>
                            </div>
                            <span className="text-accent font-black">{getSpentDuration(r.checkInTime, r.checkOutTime)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Simplified Totals Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 text-[9px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span>Present: <span className="text-white font-extrabold">{totalPresents} days</span></span>
                  </div>
                  {currentRole !== 'trainers' && (
                    <div className="flex items-center gap-1.5 text-danger">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                      <span>Absent: <span className="text-white font-extrabold">{totalAbsents} days</span></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {attendanceWarningState && (
        <Modal 
          isOpen={!!attendanceWarningState} 
          onClose={() => setAttendanceWarningState(null)} 
          title={
            attendanceWarningState.type === 'expired' ? "Plan Expired" :
            attendanceWarningState.type === 'expiring' ? "Plan Expiring Soon" :
            "Slot Mismatch Warning"
          } 
          size="sm"
        >
          <div className="space-y-6">
            {/* Warning Message Card */}
            {attendanceWarningState.type === 'expired' && (
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-danger/5 border border-danger/10 text-danger animate-pulse">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[12px] font-black uppercase tracking-wider">Critical: Membership Expired</h4>
                  <p className="text-[11px] text-text-secondary font-bold mt-2 leading-relaxed">
                    <span className="text-white font-extrabold">{attendanceWarningState.person.name}</span>'s membership plan expired on <span className="underline text-danger">{attendanceWarningState.expiryDate}</span>.
                  </p>
                </div>
              </div>
            )}

            {attendanceWarningState.type === 'expiring' && (
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-warning/5 border border-warning/10 text-warning">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[12px] font-black uppercase tracking-wider">Warning: Plan Expiring</h4>
                  <p className="text-[11px] text-text-secondary font-bold mt-2 leading-relaxed">
                    <span className="text-white font-extrabold">{attendanceWarningState.person.name}</span>'s membership is expiring in <span className="text-warning font-black">{attendanceWarningState.diffDays} day{attendanceWarningState.diffDays > 1 ? 's' : ''}</span> (on {attendanceWarningState.expiryDate}).
                  </p>
                </div>
              </div>
            )}

            {attendanceWarningState.type === 'mismatch' && (
              <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-warning/5 border border-warning/10 text-warning">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[12px] font-black uppercase tracking-wider">Warning: Different Time Slot</h4>
                  <p className="text-[11px] text-text-secondary font-bold mt-2 leading-relaxed">
                    <span className="text-white font-extrabold">{attendanceWarningState.person.name}</span> is assigned to the <span className="text-accent">"{attendanceWarningState.assignedSlot}"</span> slot, but is attending during <span className="text-warning">"{attendanceWarningState.currentSlot || 'an unassigned slot'}"</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Description Subtext */}
            <p className="text-[11px] text-text-muted font-medium leading-relaxed px-1">
              {attendanceWarningState.type === 'expired' 
                ? "Attending with an expired membership is highly discouraged. Are you sure you want to take their attendance?" 
                : "Would you like to proceed with marking their attendance for today?"}
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAttendanceWarningState(null)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWarning}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 active:scale-[0.98] border ${
                  attendanceWarningState.type === 'expired' 
                    ? "bg-danger/15 text-danger hover:bg-danger/25 border-danger/20" 
                    : "bg-warning/15 text-warning hover:bg-warning/25 border-warning/20"
                }`}
              >
                Yes, Check In
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<Loader />}>
      <AttendanceContent />
    </Suspense>
  );
}
