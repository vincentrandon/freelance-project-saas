import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Transition from '../utils/Transition';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../api/hooks';

function DropdownNotifications({ align }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const trigger = useRef(null);
  const dropdown = useRef(null);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useNotifications({
    enabled: !!localStorage.getItem('access_token'),
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = notificationsData?.results || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target) || trigger.current.contains(target)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate if link provided
    if (notification.link) {
      navigate(notification.link);
    }

    setDropdownOpen(false);
  };

  const handleMarkAllRead = (e) => {
    e.preventDefault();
    e.stopPropagation();
    markAllReadMutation.mutate();
  };

  const getNotificationIcon = (notification) => {
    if (notification.is_success) {
      return '✅';
    } else if (notification.is_error) {
      return '❌';
    } else {
      return '📣';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full ${dropdownOpen && 'bg-gray-200 dark:bg-gray-800'}`}
        aria-haspopup="true"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">Notifications</span>
        <svg
          className="fill-current text-gray-500/80 dark:text-gray-400/80"
          width={16}
          height={16}
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6.5 0C2.91 0 0 2.462 0 5.5c0 1.075.37 2.074 1 2.922V12l2.699-1.542A7.454 7.454 0 0 0 6.5 11c3.59 0 6.5-2.462 6.5-5.5S10.09 0 6.5 0Z" />
          <path d="M16 9.5c0-.987-.429-1.897-1.147-2.639C14.124 10.348 10.66 13 6.5 13c-.103 0-.202-.018-.305-.021C7.231 13.617 8.556 14 10 14c.449 0 .886-.04 1.307-.11L15 16v-4h-.012C15.627 11.285 16 10.425 16 9.5Z" />
        </svg>
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-gray-100 dark:border-gray-900 rounded-full"></div>
        )}
      </button>

      <Transition
        className={`origin-top-right z-10 absolute top-full -mr-48 sm:mr-0 min-w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
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
          <div className="flex items-center justify-between pt-1.5 pb-2 px-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-violet-500 hover:text-violet-600 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <li
                  key={notification.id}
                  className="border-b border-gray-200 dark:border-gray-700/60 last:border-0"
                >
                  <button
                    className={`w-full text-left block py-2 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors ${
                      !notification.read ? 'bg-violet-50 dark:bg-violet-900/10' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-800 dark:text-gray-100`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                          {notification.message}
                        </p>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Transition>
    </div>
  );
}

export default DropdownNotifications;
