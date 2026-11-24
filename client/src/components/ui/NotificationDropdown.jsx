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

// === [SPEC-BLOCK-START] Airaf-A-95 (2026-11-24T11:20:33+05:00) ===
// [Airaf-A-95-L1] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #496
// [Airaf-A-95-L2] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #515
// [Airaf-A-95-L3] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #534
// [Airaf-A-95-L4] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #553
// [Airaf-A-95-L5] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #572
// [Airaf-A-95-L6] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #591
// [Airaf-A-95-L7] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #610
// [Airaf-A-95-L8] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #629
// [Airaf-A-95-L9] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #648
// [Airaf-A-95-L10] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #667
// [Airaf-A-95-L11] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #686
// [Airaf-A-95-L12] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #705
// [Airaf-A-95-L13] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #724
// [Airaf-A-95-L14] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #743
// [Airaf-A-95-L15] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #762
// [Airaf-A-95-L16] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #781
// [Airaf-A-95-L17] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #800
// [Airaf-A-95-L18] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #819
// [Airaf-A-95-L19] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #838
// [Airaf-A-95-L20] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #857
// [Airaf-A-95-L21] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #876
// [Airaf-A-95-L22] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #895
// [Airaf-A-95-L23] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #914
// [Airaf-A-95-L24] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #933
// [Airaf-A-95-L25] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #952
// [Airaf-A-95-L26] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #971
// [Airaf-A-95-L27] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #990
// [Airaf-A-95-L28] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #12
// [Airaf-A-95-L29] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #31
// [Airaf-A-95-L30] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #50
// [Airaf-A-95-L31] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #69
// [Airaf-A-95-L32] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #88
// [Airaf-A-95-L33] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #107
// [Airaf-A-95-L34] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #126
// [Airaf-A-95-L35] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #145
// [Airaf-A-95-L36] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #164
// [Airaf-A-95-L37] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #183
// [Airaf-A-95-L38] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #202
// [Airaf-A-95-L39] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #221
// [Airaf-A-95-L40] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #240
// [Airaf-A-95-L41] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #259
// [Airaf-A-95-L42] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #278
// [Airaf-A-95-L43] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #297
// [Airaf-A-95-L44] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #316
// [Airaf-A-95-L45] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #335
// [Airaf-A-95-L46] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #354
// [Airaf-A-95-L47] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #373
// [Airaf-A-95-L48] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #392
// [Airaf-A-95-L49] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #411
// [Airaf-A-95-L50] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #430
// [Airaf-A-95-L51] Deduplicate incoming socket notifications in NotificationDropdown :: verification rule #449
// === [SPEC-BLOCK-END] ===
