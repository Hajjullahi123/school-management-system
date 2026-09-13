import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

const SYMBOL_CATEGORIES = [
  {
    name: 'Basic Math',
    symbols: [
      { char: '+', label: 'Plus' },
      { char: '-', label: 'Minus' },
      { char: '×', label: 'Multiply' },
      { char: '÷', label: 'Divide' },
      { char: '=', label: 'Equals' },
      { char: '≠', label: 'Not equal' },
      { char: '±', label: 'Plus-minus' },
      { char: '<', label: 'Less than' },
      { char: '>', label: 'Greater than' },
      { char: '≤', label: 'Less than or equal' },
      { char: '≥', label: 'Greater than or equal' },
      { char: '≈', label: 'Approximately equal' },
      { char: '%', label: 'Percent' }
    ]
  },
  {
    name: 'Exponents & Roots',
    symbols: [
      { char: 'x²', label: 'Square' },
      { char: 'x³', label: 'Cube' },
      { char: 'xⁿ', label: 'Power n' },
      { char: 'x₁', label: 'Subscript 1' },
      { char: 'x₂', label: 'Subscript 2' },
      { char: 'xₙ', label: 'Subscript n' },
      { char: '√', label: 'Square root' },
      { char: '∛', label: 'Cube root' },
      { char: '∜', label: 'Fourth root' }
    ]
  },
  {
    name: 'Fractions',
    symbols: [
      { char: '½', label: 'One half' },
      { char: '⅓', label: 'One third' },
      { char: '⅔', label: 'Two thirds' },
      { char: '¼', label: 'One quarter' },
      { char: '¾', label: 'Three quarters' },
      { char: '⅕', label: 'One fifth' }
    ]
  },
  {
    name: 'Greek & Science',
    symbols: [
      { char: 'π', label: 'Pi' },
      { char: 'θ', label: 'Theta' },
      { char: 'α', label: 'Alpha' },
      { char: 'β', label: 'Beta' },
      { char: 'γ', label: 'Gamma' },
      { char: 'Δ', label: 'Delta' },
      { char: 'λ', label: 'Lambda' },
      { char: 'μ', label: 'Mu' },
      { char: 'Ω', label: 'Omega' },
      { char: '∑', label: 'Sigma / Sum' },
      { char: '∫', label: 'Integral' },
      { char: '∞', label: 'Infinity' },
      { char: '°', label: 'Degree' }
    ]
  }
];

const MathToolbar = ({ onInsert, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleSymbolClick = (e, char) => {
    e.preventDefault();
    onInsert(char);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-100 transition-colors font-medium flex items-center gap-1.5 shadow-sm"
        title="Insert Special Math Symbols"
      >
        <Calculator size={14} className="text-indigo-600" />
        <span>Math Symbols</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 right-0 top-full mt-1.5 w-72 max-w-[85vw] sm:max-w-xs bg-white rounded-xl shadow-2xl border border-indigo-100 p-3 text-left animate-in fade-in zoom-in duration-150">
          <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
              <Calculator size={13} className="text-indigo-600" /> Special Characters
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 border-b border-gray-200 pb-1.5 mb-2.5 overflow-x-auto no-scrollbar">
            {SYMBOL_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.name}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(idx);
                }}
                className={`text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap transition-colors ${
                  activeTab === idx
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid of Symbol Buttons */}
          <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto p-0.5">
            {SYMBOL_CATEGORIES[activeTab].symbols.map((item) => (
              <button
                key={item.char}
                type="button"
                onClick={(e) => handleSymbolClick(e, item.char)}
                title={item.label}
                className="h-8 flex items-center justify-center bg-gray-50 border border-gray-200 rounded hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-sm font-semibold text-gray-800 transition-all active:scale-95"
              >
                {item.char}
              </button>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 italic text-center">
            Click any symbol to insert at cursor
          </div>
        </div>
      )}
    </div>
  );
};

export default MathToolbar;
