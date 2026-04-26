'use client';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  color?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, color = '#D4824A', disabled }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className="relative w-11 h-6 rounded-full transition-all disabled:opacity-50"
      style={{ background: checked ? color : '#CCC' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? '22px' : '2px' }}
      />
    </button>
  );
}
