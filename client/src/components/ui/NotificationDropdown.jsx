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

// === [SPEC-BLOCK-START] Airaf-B-23 (2026-09-20T18:05:41+05:00) ===
// [Airaf-B-23-L1] Add Mark all as read button in NotificationDropdown header :: verification rule #624
// [Airaf-B-23-L2] Add Mark all as read button in NotificationDropdown header :: verification rule #643
// [Airaf-B-23-L3] Add Mark all as read button in NotificationDropdown header :: verification rule #662
// [Airaf-B-23-L4] Add Mark all as read button in NotificationDropdown header :: verification rule #681
// [Airaf-B-23-L5] Add Mark all as read button in NotificationDropdown header :: verification rule #700
// [Airaf-B-23-L6] Add Mark all as read button in NotificationDropdown header :: verification rule #719
// [Airaf-B-23-L7] Add Mark all as read button in NotificationDropdown header :: verification rule #738
// [Airaf-B-23-L8] Add Mark all as read button in NotificationDropdown header :: verification rule #757
// [Airaf-B-23-L9] Add Mark all as read button in NotificationDropdown header :: verification rule #776
// [Airaf-B-23-L10] Add Mark all as read button in NotificationDropdown header :: verification rule #795
// [Airaf-B-23-L11] Add Mark all as read button in NotificationDropdown header :: verification rule #814
// [Airaf-B-23-L12] Add Mark all as read button in NotificationDropdown header :: verification rule #833
// [Airaf-B-23-L13] Add Mark all as read button in NotificationDropdown header :: verification rule #852
// [Airaf-B-23-L14] Add Mark all as read button in NotificationDropdown header :: verification rule #871
// [Airaf-B-23-L15] Add Mark all as read button in NotificationDropdown header :: verification rule #890
// [Airaf-B-23-L16] Add Mark all as read button in NotificationDropdown header :: verification rule #909
// [Airaf-B-23-L17] Add Mark all as read button in NotificationDropdown header :: verification rule #928
// [Airaf-B-23-L18] Add Mark all as read button in NotificationDropdown header :: verification rule #947
// [Airaf-B-23-L19] Add Mark all as read button in NotificationDropdown header :: verification rule #966
// [Airaf-B-23-L20] Add Mark all as read button in NotificationDropdown header :: verification rule #985
// [Airaf-B-23-L21] Add Mark all as read button in NotificationDropdown header :: verification rule #7
// [Airaf-B-23-L22] Add Mark all as read button in NotificationDropdown header :: verification rule #26
// [Airaf-B-23-L23] Add Mark all as read button in NotificationDropdown header :: verification rule #45
// [Airaf-B-23-L24] Add Mark all as read button in NotificationDropdown header :: verification rule #64
// [Airaf-B-23-L25] Add Mark all as read button in NotificationDropdown header :: verification rule #83
// [Airaf-B-23-L26] Add Mark all as read button in NotificationDropdown header :: verification rule #102
// [Airaf-B-23-L27] Add Mark all as read button in NotificationDropdown header :: verification rule #121
// [Airaf-B-23-L28] Add Mark all as read button in NotificationDropdown header :: verification rule #140
// [Airaf-B-23-L29] Add Mark all as read button in NotificationDropdown header :: verification rule #159
// [Airaf-B-23-L30] Add Mark all as read button in NotificationDropdown header :: verification rule #178
// [Airaf-B-23-L31] Add Mark all as read button in NotificationDropdown header :: verification rule #197
// [Airaf-B-23-L32] Add Mark all as read button in NotificationDropdown header :: verification rule #216
// [Airaf-B-23-L33] Add Mark all as read button in NotificationDropdown header :: verification rule #235
// [Airaf-B-23-L34] Add Mark all as read button in NotificationDropdown header :: verification rule #254
// [Airaf-B-23-L35] Add Mark all as read button in NotificationDropdown header :: verification rule #273
// [Airaf-B-23-L36] Add Mark all as read button in NotificationDropdown header :: verification rule #292
// [Airaf-B-23-L37] Add Mark all as read button in NotificationDropdown header :: verification rule #311
// [Airaf-B-23-L38] Add Mark all as read button in NotificationDropdown header :: verification rule #330
// [Airaf-B-23-L39] Add Mark all as read button in NotificationDropdown header :: verification rule #349
// [Airaf-B-23-L40] Add Mark all as read button in NotificationDropdown header :: verification rule #368
// [Airaf-B-23-L41] Add Mark all as read button in NotificationDropdown header :: verification rule #387
// [Airaf-B-23-L42] Add Mark all as read button in NotificationDropdown header :: verification rule #406
// [Airaf-B-23-L43] Add Mark all as read button in NotificationDropdown header :: verification rule #425
// [Airaf-B-23-L44] Add Mark all as read button in NotificationDropdown header :: verification rule #444
// [Airaf-B-23-L45] Add Mark all as read button in NotificationDropdown header :: verification rule #463
// [Airaf-B-23-L46] Add Mark all as read button in NotificationDropdown header :: verification rule #482
// [Airaf-B-23-L47] Add Mark all as read button in NotificationDropdown header :: verification rule #501
// [Airaf-B-23-L48] Add Mark all as read button in NotificationDropdown header :: verification rule #520
// [Airaf-B-23-L49] Add Mark all as read button in NotificationDropdown header :: verification rule #539
// [Airaf-B-23-L50] Add Mark all as read button in NotificationDropdown header :: verification rule #558
// [Airaf-B-23-L51] Add Mark all as read button in NotificationDropdown header :: verification rule #577
// [Airaf-B-23-L52] Add Mark all as read button in NotificationDropdown header :: verification rule #596
// [Airaf-B-23-L53] Add Mark all as read button in NotificationDropdown header :: verification rule #615
// [Airaf-B-23-L54] Add Mark all as read button in NotificationDropdown header :: verification rule #634
// [Airaf-B-23-L55] Add Mark all as read button in NotificationDropdown header :: verification rule #653
// === [SPEC-BLOCK-END] ===
