import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../services/api';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Badge, Button } from '../components/ui';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket as TicketIcon, Calendar, MapPin,
  Loader2, ArrowRight,
} from 'lucide-react';

export default function MyTicketsPage() {
  const { user } = useAuth(); // eslint-disable-line no-unused-vars
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await ticketsAPI.getMyTickets();
        setTickets(res.data.tickets || []);
      } catch {
        toast.error('Failed to load tickets.');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-slate-400 mt-3">Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper min-h-screen bg-slate-50/50">
      {/* ── Header ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 relative z-10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>Campus Events</span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">My Tickets</h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Show these QR codes at the event entrance to verify your pass
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <TicketIcon className="h-5 w-5" style={{ color: '#c9973a' }} />
            <div>
              <span className="text-2xl font-extrabold text-white leading-none">{tickets.length}</span>
              <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Tickets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {tickets.length === 0 ? (
          <Card className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <TicketIcon size={28} className="text-violet-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">No tickets yet</h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">You haven&apos;t acquired any event tickets yet.</p>
            <Link to="/events">
              <Button icon={ArrowRight}>Browse Events</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket) => {
              const isPastEvent = new Date(ticket.event.startDate) < new Date();
              const isUsed = ticket.status === 'USED';
              const isCancelled = ticket.status === 'CANCELLED';
              const isInvalid = isUsed || isCancelled;

              return (
                <Card key={ticket.id} padding="p-0" className="overflow-hidden relative">
                  {/* Status Ribbon */}
                  {isInvalid && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant={isUsed ? 'slate' : 'red'} size="sm">
                        {isUsed ? 'USED' : 'CANCELLED'}
                      </Badge>
                    </div>
                  )}

                  {/* Top Half - Event Info */}
                  <div
                    className={cn(
                      'p-5 pb-6 relative',
                      isInvalid ? 'bg-slate-100' : 'text-white'
                    )}
                    style={!isInvalid ? { background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' } : {}}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-12">
                        <p className={cn('text-xs font-bold uppercase tracking-wider mb-1', isInvalid ? 'text-slate-400' : 'text-[#c9973a]')}>
                          {isPastEvent ? 'Past Event' : 'Upcoming Event'}
                        </p>
                        <h3 className={cn('text-lg font-bold leading-tight', isInvalid ? 'text-slate-700' : 'text-white')}>
                          {ticket.event.title}
                        </h3>
                      </div>
                    </div>

                    <div className={cn('space-y-2 text-sm', isInvalid ? 'text-slate-500' : 'text-slate-300')}>
                      <p className="flex items-center gap-2">
                        <Calendar size={14} className="opacity-70 flex-shrink-0" />
                        {formatDate(ticket.event.startDate, true)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin size={14} className="opacity-70 flex-shrink-0" />
                        {ticket.event.location || 'Campus Grounds'}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Divider (Perforated Effect) */}
                  <div className="relative h-6 bg-white flex items-center">
                    <div className="absolute -left-3 h-6 w-6 rounded-full bg-slate-50 border-r border-slate-100" />
                    <div className="w-full border-t-2 border-dashed border-slate-200" />
                    <div className="absolute -right-3 h-6 w-6 rounded-full bg-slate-50 border-l border-slate-100" />
                  </div>

                  {/* Bottom Half - QR Code & Details */}
                  <div className="p-5 flex items-center gap-5 bg-white">
                    <div className={cn(
                      'p-2 rounded-xl border-2 flex-shrink-0',
                      isInvalid ? 'border-slate-200 bg-slate-50 opacity-50 grayscale' : 'border-indigo-100'
                    )}>
                      <QRCodeSVG
                        value={JSON.stringify({ code: ticket.code, id: ticket.id, event: ticket.eventId })}
                        size={90}
                        level="M"
                        fgColor={isInvalid ? '#94a3b8' : '#0f172a'}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ticket Code</p>
                      <p className={cn(
                        'text-base font-mono font-bold tracking-widest truncate',
                        isInvalid ? 'text-slate-400 line-through' : 'text-slate-900'
                      )}>
                        {ticket.code}
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <p className="text-[10px] text-slate-400">Paid:</p>
                        <p className="text-xs font-bold text-slate-700">
                          {ticket.pricePaid > 0 ? `Rs. ${ticket.pricePaid}` : 'Free Pass'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// === [SPEC-BLOCK-START] Airaf-A-76 (2026-11-05T11:35:09+05:00) ===
// [Airaf-A-76-L1] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #103
// [Airaf-A-76-L2] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #122
// [Airaf-A-76-L3] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #141
// [Airaf-A-76-L4] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #160
// [Airaf-A-76-L5] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #179
// [Airaf-A-76-L6] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #198
// [Airaf-A-76-L7] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #217
// [Airaf-A-76-L8] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #236
// [Airaf-A-76-L9] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #255
// [Airaf-A-76-L10] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #274
// [Airaf-A-76-L11] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #293
// [Airaf-A-76-L12] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #312
// [Airaf-A-76-L13] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #331
// [Airaf-A-76-L14] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #350
// [Airaf-A-76-L15] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #369
// [Airaf-A-76-L16] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #388
// [Airaf-A-76-L17] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #407
// [Airaf-A-76-L18] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #426
// [Airaf-A-76-L19] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #445
// [Airaf-A-76-L20] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #464
// [Airaf-A-76-L21] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #483
// [Airaf-A-76-L22] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #502
// [Airaf-A-76-L23] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #521
// [Airaf-A-76-L24] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #540
// [Airaf-A-76-L25] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #559
// [Airaf-A-76-L26] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #578
// [Airaf-A-76-L27] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #597
// [Airaf-A-76-L28] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #616
// [Airaf-A-76-L29] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #635
// [Airaf-A-76-L30] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #654
// [Airaf-A-76-L31] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #673
// [Airaf-A-76-L32] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #692
// [Airaf-A-76-L33] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #711
// [Airaf-A-76-L34] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #730
// [Airaf-A-76-L35] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #749
// [Airaf-A-76-L36] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #768
// [Airaf-A-76-L37] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #787
// [Airaf-A-76-L38] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #806
// [Airaf-A-76-L39] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #825
// [Airaf-A-76-L40] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #844
// [Airaf-A-76-L41] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #863
// [Airaf-A-76-L42] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #882
// [Airaf-A-76-L43] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #901
// [Airaf-A-76-L44] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #920
// [Airaf-A-76-L45] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #939
// [Airaf-A-76-L46] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #958
// [Airaf-A-76-L47] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #977
// [Airaf-A-76-L48] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #996
// [Airaf-A-76-L49] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #18
// [Airaf-A-76-L50] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #37
// [Airaf-A-76-L51] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #56
// [Airaf-A-76-L52] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #75
// [Airaf-A-76-L53] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #94
// [Airaf-A-76-L54] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #113
// [Airaf-A-76-L55] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #132
// [Airaf-A-76-L56] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #151
// [Airaf-A-76-L57] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #170
// [Airaf-A-76-L58] Add View Attached Slip modal on MyTicketsPage cards :: verification rule #189
// === [SPEC-BLOCK-END] ===
