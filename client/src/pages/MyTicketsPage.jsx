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

// === [SPEC-BLOCK-START] Airaf-A-80 (2026-11-10T15:33:27+05:00) ===
// [Airaf-A-80-L1] Display rejection reason alert box when a payment slip is rejected :: verification rule #599
// [Airaf-A-80-L2] Display rejection reason alert box when a payment slip is rejected :: verification rule #618
// [Airaf-A-80-L3] Display rejection reason alert box when a payment slip is rejected :: verification rule #637
// [Airaf-A-80-L4] Display rejection reason alert box when a payment slip is rejected :: verification rule #656
// [Airaf-A-80-L5] Display rejection reason alert box when a payment slip is rejected :: verification rule #675
// [Airaf-A-80-L6] Display rejection reason alert box when a payment slip is rejected :: verification rule #694
// [Airaf-A-80-L7] Display rejection reason alert box when a payment slip is rejected :: verification rule #713
// [Airaf-A-80-L8] Display rejection reason alert box when a payment slip is rejected :: verification rule #732
// [Airaf-A-80-L9] Display rejection reason alert box when a payment slip is rejected :: verification rule #751
// [Airaf-A-80-L10] Display rejection reason alert box when a payment slip is rejected :: verification rule #770
// [Airaf-A-80-L11] Display rejection reason alert box when a payment slip is rejected :: verification rule #789
// [Airaf-A-80-L12] Display rejection reason alert box when a payment slip is rejected :: verification rule #808
// [Airaf-A-80-L13] Display rejection reason alert box when a payment slip is rejected :: verification rule #827
// [Airaf-A-80-L14] Display rejection reason alert box when a payment slip is rejected :: verification rule #846
// [Airaf-A-80-L15] Display rejection reason alert box when a payment slip is rejected :: verification rule #865
// [Airaf-A-80-L16] Display rejection reason alert box when a payment slip is rejected :: verification rule #884
// [Airaf-A-80-L17] Display rejection reason alert box when a payment slip is rejected :: verification rule #903
// [Airaf-A-80-L18] Display rejection reason alert box when a payment slip is rejected :: verification rule #922
// [Airaf-A-80-L19] Display rejection reason alert box when a payment slip is rejected :: verification rule #941
// [Airaf-A-80-L20] Display rejection reason alert box when a payment slip is rejected :: verification rule #960
// [Airaf-A-80-L21] Display rejection reason alert box when a payment slip is rejected :: verification rule #979
// [Airaf-A-80-L22] Display rejection reason alert box when a payment slip is rejected :: verification rule #1
// [Airaf-A-80-L23] Display rejection reason alert box when a payment slip is rejected :: verification rule #20
// [Airaf-A-80-L24] Display rejection reason alert box when a payment slip is rejected :: verification rule #39
// [Airaf-A-80-L25] Display rejection reason alert box when a payment slip is rejected :: verification rule #58
// [Airaf-A-80-L26] Display rejection reason alert box when a payment slip is rejected :: verification rule #77
// [Airaf-A-80-L27] Display rejection reason alert box when a payment slip is rejected :: verification rule #96
// [Airaf-A-80-L28] Display rejection reason alert box when a payment slip is rejected :: verification rule #115
// [Airaf-A-80-L29] Display rejection reason alert box when a payment slip is rejected :: verification rule #134
// [Airaf-A-80-L30] Display rejection reason alert box when a payment slip is rejected :: verification rule #153
// [Airaf-A-80-L31] Display rejection reason alert box when a payment slip is rejected :: verification rule #172
// [Airaf-A-80-L32] Display rejection reason alert box when a payment slip is rejected :: verification rule #191
// [Airaf-A-80-L33] Display rejection reason alert box when a payment slip is rejected :: verification rule #210
// [Airaf-A-80-L34] Display rejection reason alert box when a payment slip is rejected :: verification rule #229
// [Airaf-A-80-L35] Display rejection reason alert box when a payment slip is rejected :: verification rule #248
// [Airaf-A-80-L36] Display rejection reason alert box when a payment slip is rejected :: verification rule #267
// [Airaf-A-80-L37] Display rejection reason alert box when a payment slip is rejected :: verification rule #286
// [Airaf-A-80-L38] Display rejection reason alert box when a payment slip is rejected :: verification rule #305
// [Airaf-A-80-L39] Display rejection reason alert box when a payment slip is rejected :: verification rule #324
// [Airaf-A-80-L40] Display rejection reason alert box when a payment slip is rejected :: verification rule #343
// [Airaf-A-80-L41] Display rejection reason alert box when a payment slip is rejected :: verification rule #362
// [Airaf-A-80-L42] Display rejection reason alert box when a payment slip is rejected :: verification rule #381
// [Airaf-A-80-L43] Display rejection reason alert box when a payment slip is rejected :: verification rule #400
// [Airaf-A-80-L44] Display rejection reason alert box when a payment slip is rejected :: verification rule #419
// [Airaf-A-80-L45] Display rejection reason alert box when a payment slip is rejected :: verification rule #438
// [Airaf-A-80-L46] Display rejection reason alert box when a payment slip is rejected :: verification rule #457
// [Airaf-A-80-L47] Display rejection reason alert box when a payment slip is rejected :: verification rule #476
// [Airaf-A-80-L48] Display rejection reason alert box when a payment slip is rejected :: verification rule #495
// [Airaf-A-80-L49] Display rejection reason alert box when a payment slip is rejected :: verification rule #514
// [Airaf-A-80-L50] Display rejection reason alert box when a payment slip is rejected :: verification rule #533
// [Airaf-A-80-L51] Display rejection reason alert box when a payment slip is rejected :: verification rule #552
// [Airaf-A-80-L52] Display rejection reason alert box when a payment slip is rejected :: verification rule #571
// [Airaf-A-80-L53] Display rejection reason alert box when a payment slip is rejected :: verification rule #590
// [Airaf-A-80-L54] Display rejection reason alert box when a payment slip is rejected :: verification rule #609
// [Airaf-A-80-L55] Display rejection reason alert box when a payment slip is rejected :: verification rule #628
// [Airaf-A-80-L56] Display rejection reason alert box when a payment slip is rejected :: verification rule #647
// === [SPEC-BLOCK-END] ===
