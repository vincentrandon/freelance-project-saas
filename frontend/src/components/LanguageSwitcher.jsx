import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Transition from '../utils/Transition';

function LanguageSwitcher({ align = 'right' }) {
  const { i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdown = useRef(null);
  const trigger = useRef(null);

  const currentLanguage = i18n.language || 'en';

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // Close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setDropdownOpen(false);
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className="inline-flex justify-center items-center group"
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="flex items-center truncate">
          <span className="text-2xl mr-2">{currentLang.flag}</span>
          <span className="truncate ml-2 text-sm font-medium dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-200">
            {currentLang.name}
          </span>
          <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
        </span>
      </button>

      <Transition
        className={`origin-top-${align} z-10 absolute top-full min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
        show={dropdownOpen}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div
          ref={dropdown}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => setDropdownOpen(false)}
        >
          <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
            <div className="font-medium text-gray-800 dark:text-gray-100">Select Language</div>
          </div>
          <ul>
            {languages.map((lang) => (
              <li key={lang.code}>
                <button
                  className={`font-medium text-sm flex items-center w-full py-1 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/20 ${
                    currentLanguage === lang.code ? 'text-violet-500' : 'text-gray-600 dark:text-gray-300'
                  }`}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="text-2xl mr-3">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <svg className="w-3 h-3 shrink-0 fill-current text-violet-500 ml-auto" viewBox="0 0 12 12">
                      <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Transition>
    </div>
  );
}

export default LanguageSwitcher;
