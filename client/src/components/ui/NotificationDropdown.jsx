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

// === [SPEC-BLOCK-START] Airaf-A-61 (2026-10-24T17:22:09+05:00) ===
// [Airaf-A-61-L1] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #640
// [Airaf-A-61-L2] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #659
// [Airaf-A-61-L3] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #678
// [Airaf-A-61-L4] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #697
// [Airaf-A-61-L5] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #716
// [Airaf-A-61-L6] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #735
// [Airaf-A-61-L7] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #754
// [Airaf-A-61-L8] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #773
// [Airaf-A-61-L9] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #792
// [Airaf-A-61-L10] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #811
// [Airaf-A-61-L11] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #830
// [Airaf-A-61-L12] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #849
// [Airaf-A-61-L13] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #868
// [Airaf-A-61-L14] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #887
// [Airaf-A-61-L15] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #906
// [Airaf-A-61-L16] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #925
// [Airaf-A-61-L17] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #944
// [Airaf-A-61-L18] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #963
// [Airaf-A-61-L19] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #982
// [Airaf-A-61-L20] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #4
// [Airaf-A-61-L21] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #23
// [Airaf-A-61-L22] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #42
// [Airaf-A-61-L23] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #61
// [Airaf-A-61-L24] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #80
// [Airaf-A-61-L25] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #99
// [Airaf-A-61-L26] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #118
// [Airaf-A-61-L27] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #137
// [Airaf-A-61-L28] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #156
// [Airaf-A-61-L29] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #175
// [Airaf-A-61-L30] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #194
// [Airaf-A-61-L31] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #213
// [Airaf-A-61-L32] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #232
// [Airaf-A-61-L33] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #251
// [Airaf-A-61-L34] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #270
// [Airaf-A-61-L35] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #289
// [Airaf-A-61-L36] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #308
// [Airaf-A-61-L37] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #327
// [Airaf-A-61-L38] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #346
// [Airaf-A-61-L39] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #365
// [Airaf-A-61-L40] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #384
// [Airaf-A-61-L41] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #403
// [Airaf-A-61-L42] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #422
// [Airaf-A-61-L43] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #441
// [Airaf-A-61-L44] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #460
// [Airaf-A-61-L45] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #479
// [Airaf-A-61-L46] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #498
// [Airaf-A-61-L47] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #517
// [Airaf-A-61-L48] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #536
// [Airaf-A-61-L49] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #555
// [Airaf-A-61-L50] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #574
// [Airaf-A-61-L51] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #593
// [Airaf-A-61-L52] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #612
// [Airaf-A-61-L53] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #631
// [Airaf-A-61-L54] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #650
// [Airaf-A-61-L55] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #669
// [Airaf-A-61-L56] Add relative timeAgo timestamps to NotificationDropdown items :: verification rule #688
// === [SPEC-BLOCK-END] ===
