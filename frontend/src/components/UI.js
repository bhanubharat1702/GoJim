'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Search, X, AlertCircle, ArrowLeft } from 'lucide-react';

export function Modal({ isOpen, onClose, onBack, title, children, size = 'md', variant = 'bottom', overflowVisible = false, className = '', titleClassName = '!text-[20px] !font-normal' }) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      document.body.classList.add('modal-open');
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  // Support closing on Escape key press
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Cleanup on final unmount
  useEffect(() => {
    return () => {
      const remainingModals = document.querySelectorAll('.modal-instance').length;
      if (remainingModals <= 1) {
        document.body.classList.remove('modal-open');
      }
    };
  }, []);

  if (!shouldRender) return null;

  const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  const animationClass = isClosing
    ? (variant === 'right' ? 'animate-fade-out' : 'animate-scale-down')
    : (variant === 'right' ? 'animate-fade-in' : 'animate-scale-up');

  return (
    <div className={`fixed inset-0 z-[100] flex items-end lg:items-start lg:pt-16 justify-center px-4 modal-instance overflow-y-auto py-6 lg:py-16 transition-opacity duration-300 ${isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Background Overlay */}
      <div
        className={`fixed inset-0 bg-black/80 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className={`relative w-full ${sizeClass} bg-bg-card border border-white/10 rounded-t-2xl lg:rounded-2xl p-5 md:p-6 ${overflowVisible ? 'overflow-visible' : 'max-h-[90vh] overflow-y-auto no-scrollbar'} shadow-[0_0_80px_rgba(0,0,0,0.8)] ${animationClass} transition-all duration-300 ease-out ${className}`}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-all cursor-pointer">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className={`text-xl font-bold text-text-primary ${titleClassName}`}>{title}</h2>
          </div>
          {!onBack && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-all cursor-pointer">✕</button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title = "Are you sure?", message, loading }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-bg-card border border-white/10 rounded-2xl p-8 shadow-[0_0_100px_rgba(255,82,82,0.2)]">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center text-danger mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">{title}</h2>
          <p className="text-sm text-text-muted mb-8 leading-relaxed">{message}</p>

          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-white/5 text-text-muted font-bold text-sm hover:bg-white/10 transition-all">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-danger text-white font-black text-sm hover:bg-danger-hover transition-all shadow-lg shadow-danger/20 disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatCard({ icon, label, value, trend, trendUp, color = 'accent', subtitle, onClick, size = 'md', className = "", flyInDirection = "right" }) {
  const isSmall = size === 'sm';
  const isExtraSmall = size === 'xs';

  const flyInClasses = {
    top: 'opacity-0 -translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto',
    bottom: 'opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto',
    left: 'opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto',
    right: 'opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto',
  }[flyInDirection] || 'opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto';

  // Determine if trend is neutral (e.g. 0%, 0.0%, or 0)
  const isNeutral = trend !== undefined && (
    trend === '0%' || 
    trend === '0.0%' || 
    parseFloat(trend) === 0
  );

  // Format trend arrow if not present and not neutral
  let displayTrend = trend;
  if (trend && typeof trend === 'string' && !trend.startsWith('↑') && !trend.startsWith('↓')) {
    if (!isNeutral) {
      displayTrend = `${trendUp !== false ? '↑' : '↓'}${trend}`;
    }
  }

  if (isExtraSmall || isSmall) {
    return (
      <div
        onClick={onClick}
        className={`bg-bg-card border border-white/5 relative overflow-hidden
          ${isExtraSmall ? 'rounded-xl p-3' : 'rounded-2xl p-4'} 
          hover:border-white/10 transition-all duration-300 group 
          ${onClick ? 'cursor-pointer hover:bg-bg-card-hover active:scale-95' : ''} ${className}`}
      >
        <div className={`flex items-center gap-2 ${isExtraSmall ? 'mb-1' : 'mb-2'}`}>
          <div className={`rounded-xl bg-white/5 flex items-center justify-center text-text-muted group-hover:text-white transition-colors 
            ${isExtraSmall ? 'w-6 h-6 p-1' : 'w-8 h-8 p-1.5'}`}>
            {icon && (typeof icon === 'object' && 'type' in icon ? { ...icon, props: { ...icon.props, size: isExtraSmall ? 14 : 18 } } : icon)}
          </div>
          <span className={`${isExtraSmall ? 'text-[7px]' : 'text-[8px]'} font-black text-text-secondary uppercase tracking-[0.2em] transition-all duration-300 group-hover:text-white transform group-hover:scale-[1.08] origin-left inline-block`}>{label}</span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <h3 className={`${isExtraSmall ? 'text-xl' : 'text-3xl'} font-black text-white tracking-tight transition-all duration-300 transform group-hover:scale-[0.88] origin-left whitespace-nowrap`}>
            {value ?? 0}
          </h3>
          {trend && (
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${flyInClasses}`}>
              {typeof trend === 'string' || typeof trend === 'number' ? (
                <div className={`flex items-center gap-1 whitespace-nowrap flex-nowrap px-1.5 py-0.5 rounded-lg ${isExtraSmall ? 'text-[9px]' : 'text-[10px]'} font-black uppercase tracking-tighter ${
                  isNeutral
                    ? 'bg-info/10 text-info border border-info/20'
                    : trendUp !== false 
                      ? 'bg-success/10 text-success border border-success/20' 
                      : 'bg-danger/10 text-danger border border-danger/20'
                }`}>
                  {displayTrend}
                </div>
              ) : (
                trend
              )}
            </div>
          )}
        </div>

        {subtitle && (
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${flyInClasses}`}>
            {typeof subtitle === 'string' || typeof subtitle === 'number' ? (
              <p className={`${isExtraSmall ? 'text-[9px]' : 'text-[10px]'} font-bold text-text-muted uppercase tracking-[0.15em] mt-1`}>{subtitle}</p>
            ) : (
              subtitle
            )}
          </div>
        )}
      </div>
    );
  }

  // Premium colors matching the dark theme system
  const colorSchemes = {
    accent: 'bg-accent/10 text-accent group-hover:bg-accent/20',
    info: 'bg-info/10 text-info group-hover:bg-info/20',
    warning: 'bg-warning/10 text-warning group-hover:bg-warning/20',
    success: 'bg-success/10 text-success group-hover:bg-success/20',
  };

  const schemeClass = colorSchemes[color] || colorSchemes.accent;

  return (
    <div
      onClick={onClick}
      className={`bg-bg-card border border-white/5 rounded-[22px] p-4 transition-all duration-300 group hover:border-white/10 hover:bg-bg-card-hover relative overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
    >
      {/* Top row: Label on left, Circular wrapped Icon on right */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.18em] transition-all duration-300 group-hover:text-white transform group-hover:scale-[1.08] origin-left inline-block">{label}</span>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${schemeClass}`}>
          {icon && (typeof icon === 'object' && 'type' in icon ? { ...icon, props: { ...icon.props, size: 16 } } : icon)}
        </div>
      </div>

      {/* Middle row: Large Value & Trend Badge */}
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-3xl font-black text-white tracking-tight transition-all duration-300 transform group-hover:scale-[0.88] origin-left whitespace-nowrap">
          {value ?? 0}
        </h3>
        {trend && (
          <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${flyInClasses}`}>
            {typeof trend === 'string' || typeof trend === 'number' ? (
              <div 
                className={`flex items-center gap-0.5 whitespace-nowrap flex-nowrap px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                  isNeutral 
                    ? 'bg-info/10 text-info border-info/20'
                    : trendUp !== false 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-danger/10 text-danger border-danger/20'
                }`}
              >
                {displayTrend}
              </div>
            ) : (
              trend
            )}
          </div>
        )}
      </div>

      {/* Bottom row: Subtitle */}
      {subtitle && (
        <div className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${flyInClasses}`}>
          {typeof subtitle === 'string' || typeof subtitle === 'number' ? (
            <div className="flex items-center">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em]">
                {subtitle}
              </span>
            </div>
          ) : (
            subtitle
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted mb-6 max-w-sm">{description}</p>
      {action && (
        <button onClick={onAction} className="btn-primary">{action}</button>
      )}
    </div>
  );
}

export function Loader() {
  return null;
}

export function Input({ label, type = 'text', ...props }) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">{label}</label>}
      <input
        type={type}
        {...props}
        className="w-full px-4 py-3.5 bg-bg-card/40 border border-white/5 rounded-2xl hover:border-white/10 focus:border-accent/50 focus:bg-bg-card/60 transition-all outline-none text-text-primary placeholder:text-text-muted"
      />
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const onChangeRef = useRef(onChange);

  // Keep ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
        if (onChangeRef.current) onChangeRef.current(''); // Clear the query on clicking outside
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  return (
    <div ref={containerRef} className={`relative flex items-center justify-end transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'w-full md:w-64 opacity-100' : 'w-10'}`}>
      <button
        onClick={() => {
          if (isExpanded) {
            if (onChangeRef.current) onChangeRef.current(''); // Clear search query when close button clicked
          }
          setIsExpanded(!isExpanded);
        }}
        className={`absolute right-0 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-all ${isExpanded ? 'text-text-muted hover:text-white' : 'bg-bg-card border border-white/5 text-text-muted hover:border-accent/50 hover:text-accent shadow-lg'}`}
      >
        {isExpanded ? <X size={18} /> : <Search size={18} />}
      </button>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={isExpanded ? placeholder : ''}
        className={`bg-bg-card/40 border border-white/5 rounded-full py-2.5 pr-10 text-sm transition-all duration-500 outline-none
          ${isExpanded ? 'w-full pl-4 opacity-100 border-white/20 focus:border-white/40' : 'w-0 pl-0 opacity-0 border-transparent pointer-events-none'}`}
      />
    </div>
  );
}

export function Badge({ variant = 'accent', children, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[12px]';
  return <span className={`badge badge-${variant} ${sizeClass}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, action, onAction, actionIcon }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-2">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={onAction} className="btn-primary text-sm">
          {actionIcon && <span>{actionIcon}</span>} {action}
        </button>
      )}
    </div>
  );
}
export function DatePicker({ value, onChange, placeholder = "Select Date", clearable = false, className = "", align = "left", direction = "down", minDate }) {
  const [show, setShow] = useState(false);
  const containerRef = useRef(null);
  const [openUpward, setOpenUpward] = useState(false);
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(new Date());
  const [showMonthSel, setShowMonthSel] = useState(false);
  const [showYearSel, setShowYearSel] = useState(false);

  const handleToggle = () => {
    if (!show && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Height of compact calendar is ~280px with margins
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
    setShow(!show);
  };

  useEffect(() => {
    if (value) setViewDate(new Date(value));
  }, [value]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(new Date(year, month, i));
    return arr;
  }, [viewDate]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = currentYear; i >= currentYear - 80; i--) arr.push(i);
    return arr;
  }, []);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const CustomDropdown = ({ label, value, options, onSelect, isOpen, setIsOpen }) => (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold bg-white/5 border border-white/5 rounded-xl hover:border-accent/30 transition-all text-text-primary"
      >
        <span>{label}</span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[130]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1.5 z-[140] bg-[#121212] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto no-scrollbar backdrop-blur-3xl p-1 dropdown-options-list">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onSelect(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[11px] rounded-lg transition-all hover:bg-white/10 hover:text-white ${value === opt.value ? 'bg-white/10 text-white font-black' : 'text-text-muted'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={handleToggle}
        className="flex items-center justify-between gap-2.5 px-4 py-2 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 hover:border-white/10 transition-all group min-w-[150px]"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className="text-text-muted group-hover:text-accent transition-colors" />
          <span className={`text-[10px] font-black uppercase tracking-wider ${value ? "text-white" : "text-text-muted"}`}>
            {value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : placeholder}
          </span>
        </div>
        {clearable && value && (
          <X
            size={14}
            className="text-text-muted hover:text-white cursor-pointer transition-colors ml-1"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          />
        )}
      </div>

      {show && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setShow(false)} />
          <div className={`absolute ${openUpward ? 'bottom-full mb-3' : 'top-full mt-1.5'} z-[120] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 rounded-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl min-w-[260px] ${align === 'right' ? 'right-0' : 'left-0'}`}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <CustomDropdown
                label={months[viewDate.getMonth()]}
                value={viewDate.getMonth()}
                options={months.map((m, i) => ({ label: m, value: i }))}
                isOpen={showMonthSel}
                setIsOpen={setShowMonthSel}
                onSelect={(m) => setViewDate(new Date(viewDate.setMonth(m)))}
              />
              <CustomDropdown
                label={viewDate.getFullYear().toString()}
                value={viewDate.getFullYear()}
                options={years.map(y => ({ label: y.toString(), value: y }))}
                isOpen={showYearSel}
                setIsOpen={setShowYearSel}
                onSelect={(y) => setViewDate(new Date(viewDate.setFullYear(y)))}
              />
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center mb-1 px-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <span key={d} className="text-[9px] font-black text-text-muted uppercase tracking-[0.1em]">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((date, i) => {
                const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';
                const todayObj = new Date();
                const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                const isSelected = date && value === dateStr;
                const isToday = date && todayStr === dateStr;
                let isDisabled = !date;
                if (date && minDate) {
                  const minDateObj = new Date(minDate);
                  minDateObj.setHours(0, 0, 0, 0);
                  const compareDate = new Date(date);
                  compareDate.setHours(0, 0, 0, 0);
                  if (compareDate < minDateObj) {
                    isDisabled = true;
                  }
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { if (date && !isDisabled) { onChange(dateStr); setShow(false); } }}
                    disabled={isDisabled}
                    className={`h-8 w-full rounded-lg text-[11px] font-bold transition-all flex items-center justify-center
                      ${!date ? 'opacity-0 cursor-default' : isDisabled ? 'opacity-20 cursor-not-allowed text-text-muted hover:bg-transparent' : 'hover:bg-accent/20 hover:text-accent'}
                      ${isSelected ? 'bg-accent !text-black shadow-lg shadow-accent/40' : 'text-text-secondary'}
                      ${isToday && !isSelected ? 'border border-accent/30 text-accent' : ''}
                    `}
                  >
                    {date ? date.getDate() : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export function Select({ value, options, onChange, placeholder = "Select Option", className = "", searchable = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-1.5 bg-bg-card/40 border border-white/5 rounded-xl hover:border-white/10 transition-all text-left group"
      >
        <div className="flex items-center gap-3 w-full">
          {selectedOption?.icon && <span className="text-accent">{selectedOption.icon}</span>}
          <span className={`text-[15px] ${value ? "text-text-primary" : "text-text-muted"} w-full`}>
            {selectedOption ? (selectedOption.displayText || selectedOption.label) : placeholder}
          </span>
        </div>
        <ChevronDown size={18} className={`text-text-muted group-hover:text-accent transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-[120] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl max-h-64 flex flex-col backdrop-blur-3xl p-1.5 dropdown-options-list">
            {searchable && (
              <div className="p-2 border-b border-white/5 mb-1">
                <input
                  autoFocus
                  placeholder="Search..."
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-text-primary focus:border-accent/50 outline-none transition-all"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="overflow-y-auto no-scrollbar flex-1">
              {options
                .filter(opt => {
                  const labelText = typeof opt.label === 'string' ? opt.label : (opt.searchText || opt.value || '');
                  const query = searchQuery.toLowerCase();
                  return labelText.toLowerCase().includes(query) || (opt.value && String(opt.value).toLowerCase().includes(query));
                })
                .map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearchQuery(''); }}
                    className={`w-full text-left px-4 py-3 text-[13px] rounded-xl transition-all flex items-center justify-between gap-3 
                      ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10 hover:text-white'} 
                      ${value === opt.value ? 'bg-white/10 text-white font-bold' : 'text-text-muted'}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="flex-1 w-full text-left">{opt.label}</div>
                    </div>
                    {opt.disabled && <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">Inactive</span>}
                  </button>
                ))}
              {options.filter(opt => {
                const labelText = typeof opt.label === 'string' ? opt.label : (opt.searchText || opt.value || '');
                return labelText.toLowerCase().includes(searchQuery.toLowerCase());
              }).length === 0 && (
                <p className="p-4 text-center text-xs text-text-muted">No results found</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
