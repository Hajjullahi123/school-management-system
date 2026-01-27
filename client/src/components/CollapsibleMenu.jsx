import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

const CollapsibleMenu = ({ icon, label, items, badge }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Check if any child route is active
  const isAnyChildActive = items.some(item => location.pathname === item.path);

  // Auto-expand if a child is active
  React.useEffect(() => {
    if (isAnyChildActive) {
      setIsOpen(true);
    }
  }, [isAnyChildActive]);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isAnyChildActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-gray-700 hover:bg-gray-100'
          }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0">{icon}</span>
          <span>{label}</span>
          {badge && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <FiChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <FiChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
          {items.map((item, idx) => (
            <Link
              key={idx}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${location.pathname === item.path
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollapsibleMenu;
