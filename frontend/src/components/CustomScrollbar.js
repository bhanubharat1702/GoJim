'use client';

import { useEffect, useState, useRef } from 'react';

export default function CustomScrollbar() {
  const [scrollRatio, setScrollRatio] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const trackRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);
  const scrollTimeoutRef = useRef(null);

  // Measure scroll layout
  const updateScroll = () => {
    if (typeof window === 'undefined') return;

    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    const scrollableHeight = scrollHeight - clientHeight;
    const isPageScrollable = scrollableHeight > 5;
    setIsScrollable(isPageScrollable);

    if (isPageScrollable) {
      const trackHeight = clientHeight / 3;
      // Thumb height proportional to viewport fraction, clamped between 24px and 60% of track
      const calculatedThumbHeight = Math.max(24, Math.min(trackHeight * 0.6, (clientHeight / scrollHeight) * trackHeight));
      setThumbHeight(calculatedThumbHeight);

      const ratio = scrollTop / scrollableHeight;
      setScrollRatio(ratio);
    }
  };

  useEffect(() => {
    setHasMounted(true);
    updateScroll();

    const handleScrollEvent = () => {
      updateScroll();
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1200);
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });
    window.addEventListener('resize', updateScroll, { passive: true });

    // Periodically check in case of dynamic DOM height updates (e.g. tab switches, image load)
    const interval = setInterval(updateScroll, 1000);

    return () => {
      window.removeEventListener('scroll', handleScrollEvent);
      window.removeEventListener('resize', updateScroll);
      clearInterval(interval);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle Dragging
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    dragStartY.current = clientY;
    dragStartScrollTop.current = window.scrollY || document.documentElement.scrollTop;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e) => {
      if (!isDragging) return;

      const clientHeight = document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollableHeight = scrollHeight - clientHeight;
      const trackHeight = clientHeight / 3;

      const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
      const deltaY = clientY - dragStartY.current;

      // Track height minus thumb height is the active track travel range
      const travelRange = trackHeight - thumbHeight;
      if (travelRange <= 0) return;

      const deltaPercent = deltaY / travelRange;
      const targetScrollTop = dragStartScrollTop.current + deltaPercent * scrollableHeight;

      window.scrollTo(0, Math.max(0, Math.min(scrollableHeight, targetScrollTop)));
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, thumbHeight]);

  // Click on Track directly
  const handleTrackClick = (e) => {
    if (e.target === trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      
      const clientHeight = document.documentElement.clientHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollableHeight = scrollHeight - clientHeight;
      
      const relativeClickPercent = Math.max(0, Math.min(1, (clickY - thumbHeight / 2) / (rect.height - thumbHeight)));
      window.scrollTo({
        top: relativeClickPercent * scrollableHeight,
        behavior: 'smooth'
      });
    }
  };

  if (!hasMounted || !isScrollable) return null;

  const clientHeight = typeof window !== 'undefined' ? document.documentElement.clientHeight : 1000;
  const trackHeight = clientHeight / 3;
  const maxTravel = trackHeight - thumbHeight;
  const thumbTranslateY = scrollRatio * maxTravel;

  const isVisible = isScrolling || isDragging;

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      className="fixed right-0 z-[99999] w-[3px] h-[33.33vh] top-[33.33vh] rounded-none bg-[#333333]"
      style={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(4px)',
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 400ms cubic-bezier(0.25, 1, 0.5, 1), filter 400ms cubic-bezier(0.25, 1, 0.5, 1)'
      }}
    >
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className="w-full rounded-none bg-white"
        style={{
          height: `${thumbHeight}px`,
          transform: `translateY(${thumbTranslateY}px)`,
          transition: isDragging ? 'none' : 'transform 120ms cubic-bezier(0.25, 1, 0.5, 1)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
    </div>
  );
}
