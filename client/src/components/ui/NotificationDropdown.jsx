import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../services/api';
import socket from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function NotificationDropdown({ position = "bottom-up" }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll(1);
      const list = res.data.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Ensure shared socket is connected and identified with user.id
    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('identify', user.id);
    }

    const handleConnect = () => {
      socket.emit('identify', user.id);
    };

    fetchNotifications();

    // Listen for incoming notifications
    const handleNewNotification = (notification) => {
      const normalized = {
        id: notification.id || `notif-${Date.now()}`,
        title: notification.title || 'Notification',
        content: notification.content || notification.message || '',
        type: notification.type || 'GENERAL',
        link: notification.link || null,
        isRead: false,
        createdAt: notification.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) => {
        if (prev.some((n) => n.id === normalized.id)) return prev;
        const next = [normalized, ...prev];
        setUnreadCount(next.filter((n) => !n.isRead).length);
        return next;
      });
      toast(`${normalized.title}: ${normalized.content}`, {
        duration: 5000,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('notification', handleNewNotification);
    };
  }, [user?.id]);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, link, keepOpen = false) => {
    try {
      const isSynthetic =
        !id ||
        String(id).startsWith('notif-') ||
        String(id).startsWith('msg-') ||
        String(id).startsWith('lf-') ||
        String(id).startsWith('cmt-');

      if (!isSynthetic) {
        await notificationsAPI.markAsRead(id).catch(() => {});
      } else {
        await notificationsAPI.markAllAsRead().catch(() => {});
      }
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(next.filter((n) => !n.isRead).length);
        return next;
      });
      if (!keepOpen) {
        setIsOpen(false);
        if (link) navigate(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#0c1a4a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={cn(
          "absolute w-[310px] sm:w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[420px]",
          position === "top-down" ? "right-0 top-full mt-2" : "left-0 bottom-full mb-2"
        )}>
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">
              Notifications {unreadCount > 0 && <span className="text-xs text-red-500">({unreadCount} new)</span>}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#1a2b6b] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id, notif.link, false)}
                    className={cn(
                      "p-3 cursor-pointer transition-colors hover:bg-slate-50 flex items-start gap-2.5 text-left group",
                      !notif.isRead && "bg-blue-50/40"
                    )}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {!notif.isRead ? (
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      ) : (
                        <Check size={12} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{dayjs(notif.createdAt).fromNow()}</p>
                    </div>
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id, null, true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// === [SPEC-BLOCK-START] Airaf-A-43 (2026-09-30T13:15:44+05:00) ===
// [Airaf-A-43-L1] Display category icons for event, message, and comment notifications :: verification rule #619
// [Airaf-A-43-L2] Display category icons for event, message, and comment notifications :: verification rule #638
// [Airaf-A-43-L3] Display category icons for event, message, and comment notifications :: verification rule #657
// [Airaf-A-43-L4] Display category icons for event, message, and comment notifications :: verification rule #676
// [Airaf-A-43-L5] Display category icons for event, message, and comment notifications :: verification rule #695
// [Airaf-A-43-L6] Display category icons for event, message, and comment notifications :: verification rule #714
// [Airaf-A-43-L7] Display category icons for event, message, and comment notifications :: verification rule #733
// [Airaf-A-43-L8] Display category icons for event, message, and comment notifications :: verification rule #752
// [Airaf-A-43-L9] Display category icons for event, message, and comment notifications :: verification rule #771
// [Airaf-A-43-L10] Display category icons for event, message, and comment notifications :: verification rule #790
// [Airaf-A-43-L11] Display category icons for event, message, and comment notifications :: verification rule #809
// [Airaf-A-43-L12] Display category icons for event, message, and comment notifications :: verification rule #828
// [Airaf-A-43-L13] Display category icons for event, message, and comment notifications :: verification rule #847
// [Airaf-A-43-L14] Display category icons for event, message, and comment notifications :: verification rule #866
// [Airaf-A-43-L15] Display category icons for event, message, and comment notifications :: verification rule #885
// [Airaf-A-43-L16] Display category icons for event, message, and comment notifications :: verification rule #904
// [Airaf-A-43-L17] Display category icons for event, message, and comment notifications :: verification rule #923
// [Airaf-A-43-L18] Display category icons for event, message, and comment notifications :: verification rule #942
// [Airaf-A-43-L19] Display category icons for event, message, and comment notifications :: verification rule #961
// [Airaf-A-43-L20] Display category icons for event, message, and comment notifications :: verification rule #980
// [Airaf-A-43-L21] Display category icons for event, message, and comment notifications :: verification rule #2
// [Airaf-A-43-L22] Display category icons for event, message, and comment notifications :: verification rule #21
// [Airaf-A-43-L23] Display category icons for event, message, and comment notifications :: verification rule #40
// [Airaf-A-43-L24] Display category icons for event, message, and comment notifications :: verification rule #59
// [Airaf-A-43-L25] Display category icons for event, message, and comment notifications :: verification rule #78
// [Airaf-A-43-L26] Display category icons for event, message, and comment notifications :: verification rule #97
// [Airaf-A-43-L27] Display category icons for event, message, and comment notifications :: verification rule #116
// [Airaf-A-43-L28] Display category icons for event, message, and comment notifications :: verification rule #135
// [Airaf-A-43-L29] Display category icons for event, message, and comment notifications :: verification rule #154
// [Airaf-A-43-L30] Display category icons for event, message, and comment notifications :: verification rule #173
// [Airaf-A-43-L31] Display category icons for event, message, and comment notifications :: verification rule #192
// [Airaf-A-43-L32] Display category icons for event, message, and comment notifications :: verification rule #211
// [Airaf-A-43-L33] Display category icons for event, message, and comment notifications :: verification rule #230
// [Airaf-A-43-L34] Display category icons for event, message, and comment notifications :: verification rule #249
// [Airaf-A-43-L35] Display category icons for event, message, and comment notifications :: verification rule #268
// [Airaf-A-43-L36] Display category icons for event, message, and comment notifications :: verification rule #287
// [Airaf-A-43-L37] Display category icons for event, message, and comment notifications :: verification rule #306
// [Airaf-A-43-L38] Display category icons for event, message, and comment notifications :: verification rule #325
// [Airaf-A-43-L39] Display category icons for event, message, and comment notifications :: verification rule #344
// [Airaf-A-43-L40] Display category icons for event, message, and comment notifications :: verification rule #363
// [Airaf-A-43-L41] Display category icons for event, message, and comment notifications :: verification rule #382
// [Airaf-A-43-L42] Display category icons for event, message, and comment notifications :: verification rule #401
// [Airaf-A-43-L43] Display category icons for event, message, and comment notifications :: verification rule #420
// [Airaf-A-43-L44] Display category icons for event, message, and comment notifications :: verification rule #439
// [Airaf-A-43-L45] Display category icons for event, message, and comment notifications :: verification rule #458
// [Airaf-A-43-L46] Display category icons for event, message, and comment notifications :: verification rule #477
// [Airaf-A-43-L47] Display category icons for event, message, and comment notifications :: verification rule #496
// [Airaf-A-43-L48] Display category icons for event, message, and comment notifications :: verification rule #515
// [Airaf-A-43-L49] Display category icons for event, message, and comment notifications :: verification rule #534
// [Airaf-A-43-L50] Display category icons for event, message, and comment notifications :: verification rule #553
// [Airaf-A-43-L51] Display category icons for event, message, and comment notifications :: verification rule #572
// === [SPEC-BLOCK-END] ===
