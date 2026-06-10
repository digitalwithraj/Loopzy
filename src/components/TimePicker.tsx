import { useRef, useEffect, useState, useCallback, type RefObject, type MutableRefObject } from 'react';
import { motion } from 'motion/react';

interface TimePickerProps {
  initialTime: string;
  onSave: (time: string) => void;
  onClose: () => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = ITEM_HEIGHT * 2;

function parseInitialTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const period = h >= 12 ? 'PM' : 'AM';
  return { hour: hour12, minute: m.toString().padStart(2, '0'), period };
}

export default function TimePicker({ initialTime, onSave, onClose }: TimePickerProps) {
  const { hour: initHour, minute: initMinute, period: initPeriod } = parseInitialTime(initialTime);

  const originalHour = initHour;
  const originalMinute = initMinute;
  const originalPeriod = initPeriod;

  const [selectedHour, setSelectedHour] = useState(initHour);
  const [selectedMinute, setSelectedMinute] = useState(initMinute);
  const [selectedPeriod, setSelectedPeriod] = useState(initPeriod);

  const hasChanges =
    selectedHour !== originalHour ||
    selectedMinute !== originalMinute ||
    selectedPeriod !== originalPeriod;

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const hourTicking = useRef(false);
  const minuteTicking = useRef(false);
  const periodTicking = useRef(false);

  const getScrollForIndex = (index: number) => index * ITEM_HEIGHT;

  useEffect(() => {
    const hourIndex = HOURS.indexOf(initHour);
    const minuteIndex = MINUTES.indexOf(initMinute);
    const periodIndex = PERIODS.indexOf(initPeriod);

    if (hourRef.current) hourRef.current.scrollTop = getScrollForIndex(hourIndex);
    if (minuteRef.current) minuteRef.current.scrollTop = getScrollForIndex(minuteIndex);
    if (periodRef.current) periodRef.current.scrollTop = getScrollForIndex(periodIndex);
  }, []);

  const makeScrollHandler = (
    ref: RefObject<HTMLDivElement | null>,
    ticking: MutableRefObject<boolean>,
    items: (string | number)[],
    setter: (v: any) => void,
  ) =>
    useCallback(() => {
      if (ticking.current || !ref.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        if (!ref.current) return;
        const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(idx, items.length - 1));
        setter(items[clamped]);
      });
    }, []);

  const onHourScroll = makeScrollHandler(hourRef, hourTicking, HOURS, setSelectedHour);
  const onMinuteScroll = makeScrollHandler(minuteRef, minuteTicking, MINUTES, setSelectedMinute);
  const onPeriodScroll = makeScrollHandler(periodRef, periodTicking, PERIODS, setSelectedPeriod);

  const handleTap = (
    ref: RefObject<HTMLDivElement | null>,
    items: (string | number)[],
    item: string | number,
    setter: (v: any) => void,
  ) => () => {
    const index = items.indexOf(item);
    if (ref.current) {
      ref.current.scrollTop = getScrollForIndex(index);
    }
    setter(item);
  };

  useEffect(() => {
    console.log({
      originalTime: `${originalHour}:${originalMinute} ${originalPeriod}`,
      selectedHour,
      selectedMinute,
      selectedPeriod,
      hasChanges,
    });
  }, [selectedHour, selectedMinute, selectedPeriod]);

  const handleSave = () => {
    let hour24 = selectedHour as number;
    if (selectedPeriod === 'PM' && hour24 !== 12) hour24 += 12;
    if (selectedPeriod === 'AM' && hour24 === 12) hour24 = 0;
    const timeStr = `${hour24.toString().padStart(2, '0')}:${selectedMinute}`;
    console.log('Reminder Time:', timeStr);
    onSave(timeStr);
  };

  const renderWheel = (
    ref: RefObject<HTMLDivElement | null>,
    items: (string | number)[],
    selected: string | number,
    onScroll: () => void,
    setter: (v: any) => void,
  ) => (
    <div
      ref={ref}
      onScroll={onScroll}
      className="w-[76px] h-[180px] overflow-y-scroll snap-y snap-mandatory touch-action-pan-y overscroll-behavior-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none"
      style={{ paddingTop: PADDING, paddingBottom: PADDING }}
    >
      {items.map((item) => (
        <div
          key={item}
          onClick={handleTap(ref, items, item, setter)}
          className={`h-[36px] flex items-center justify-center snap-center cursor-pointer select-none transition-all duration-200 ${
            item === selected
              ? 'text-white text-[28px] font-bold'
              : 'text-white/40 text-lg font-semibold'
          }`}
        >
          {item.toString().padStart(2, '0')}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="flex flex-col bg-[#1a1a2e] rounded-t-3xl w-full max-w-[400px] max-h-[85vh] shadow-2xl"
      >
        <div className="px-5 pt-5 pb-1">
          <h3 className="text-white text-sm font-bold text-center">Reminder Time</h3>
        </div>

        <div className="relative flex-1 min-h-0 flex items-center justify-center gap-2 py-4">
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[260px] h-[36px] bg-white/10 rounded-[20px]" />

          {renderWheel(hourRef, HOURS, selectedHour, onHourScroll, setSelectedHour)}
          {renderWheel(minuteRef, MINUTES, selectedMinute, onMinuteScroll, setSelectedMinute)}
          {renderWheel(periodRef, PERIODS, selectedPeriod, onPeriodScroll, setSelectedPeriod)}
        </div>

        <div className="sticky bottom-0 backdrop-blur-xl bg-[#1a1a2e]/80 flex items-center justify-end gap-3 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition cursor-pointer ${
              hasChanges
                ? 'bg-brand-600 text-white hover:bg-brand-700'
                : 'bg-white/10 text-white/30 cursor-default'
            }`}
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
