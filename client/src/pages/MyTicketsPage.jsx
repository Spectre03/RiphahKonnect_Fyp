import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../services/api';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Badge, Button, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket as TicketIcon, Calendar, MapPin,
  Loader2, ArrowRight, Clock, ShieldCheck, AlertTriangle, Eye, CheckCircle2,
} from 'lucide-react';

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewSlipTicket, setViewSlipTicket] = useState(null);

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
              Track your payment slip verification and present your private Unique Ticket ID on event day
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
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Request a ticket on any campus event and attach your payment slip for Event Manager approval.
            </p>
            <Link to="/events">
              <Button icon={ArrowRight}>Browse Events</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket) => {
              const isPastEvent = new Date(ticket.event.startDate) < new Date();
              const isPending = ticket.status === 'PENDING';
              const isValid = ticket.status === 'VALID';
              const isUsed = ticket.status === 'USED';
              const isRejected = ticket.status === 'REJECTED';
              const isCancelled = ticket.status === 'CANCELLED';
              const isApproved = (isValid || isUsed) && Boolean(ticket.code);

              return (
                <Card key={ticket.id} padding="p-0" className="overflow-hidden relative">
                  {/* Status Ribbon */}
                  <div className="absolute top-4 right-4 z-10">
                    {isPending && <Badge variant="amber" size="sm">Pending Verification</Badge>}
                    {isValid && <Badge variant="green" size="sm">Approved</Badge>}
                    {isUsed && <Badge variant="blue" size="sm">Checked In</Badge>}
                    {isRejected && <Badge variant="red" size="sm">Slip Rejected</Badge>}
                    {isCancelled && <Badge variant="slate" size="sm">Cancelled</Badge>}
                  </div>

                  {/* Top Half - Event Info */}
                  <div
                    className={cn(
                      'p-5 pb-6 relative',
                      isRejected || isCancelled ? 'bg-slate-100' : 'text-white'
                    )}
                    style={
                      !isRejected && !isCancelled
                        ? { background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-28">
                        <p className={cn('text-xs font-bold uppercase tracking-wider mb-1', isRejected || isCancelled ? 'text-slate-400' : 'text-[#c9973a]')}>
                          {isPastEvent ? 'Past Event' : 'Campus Event Pass'}
                        </p>
                        <h3 className={cn('text-lg font-bold leading-tight', isRejected || isCancelled ? 'text-slate-700' : 'text-white')}>
                          {ticket.event.title}
                        </h3>
                      </div>
                    </div>

                    <div className={cn('space-y-2 text-sm', isRejected || isCancelled ? 'text-slate-500' : 'text-slate-300')}>
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

                  {/* Bottom Half - Unique Ticket ID / Pending / Rejected Status */}
                  <div className="p-5 bg-white">
                    {isApproved ? (
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          'p-2 rounded-xl border-2 flex-shrink-0',
                          isUsed ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-indigo-100'
                        )}>
                          <QRCodeSVG
                            value={JSON.stringify({
                              code: ticket.code,
                              ticketId: ticket.id,
                              userId: user?.id,
                              name: user?.name,
                              event: ticket.eventId,
                            })}
                            size={92}
                            level="M"
                            fgColor={isUsed ? '#64748b' : '#0f172a'}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                            <ShieldCheck size={12} /> Unique Ticket ID
                          </div>
                          <p className="text-base font-mono font-extrabold tracking-wider text-slate-900 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block">
                            {ticket.code}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-2 truncate">
                            Issued to: <span className="font-bold text-slate-700">{user?.name}</span>
                          </p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Fee: <strong className="text-slate-700">{ticket.pricePaid > 0 ? `Rs. ${ticket.pricePaid}` : 'Free'}</strong>
                            </span>
                            {ticket.paymentSlipUrl && (
                              <button
                                type="button"
                                onClick={() => setViewSlipTicket(ticket)}
                                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={12} /> Slip
                              </button>
                            )}
                          </div>
                          {isUsed && ticket.usedAt && (
                            <p className="text-[10px] font-bold text-blue-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 size={11} /> Checked in at {new Date(ticket.usedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : isPending ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                          <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs leading-relaxed">
                            <p className="font-bold">Awaiting Event Manager Verification</p>
                            <p className="text-amber-700 mt-0.5">
                              Your attached payment slip is being verified. Once approved, your private <strong>Unique Ticket ID</strong> &amp; QR code will appear here.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Fee: <strong className="text-slate-700">{ticket.pricePaid > 0 ? `Rs. ${ticket.pricePaid}` : 'Free'}</strong>
                            {ticket.paymentRef ? ` · Ref: ${ticket.paymentRef}` : ''}
                          </span>
                          {ticket.paymentSlipUrl && (
                            <button
                              type="button"
                              onClick={() => setViewSlipTicket(ticket)}
                              className="font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={13} /> View Attached Slip
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
                          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs leading-relaxed">
                            <p className="font-bold">Payment Slip Not Approved</p>
                            <p className="text-red-700 mt-0.5">
                              {ticket.rejectionReason || 'Please go to the Events page to upload a clear payment receipt.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Link to="/events">
                            <Button size="sm" variant="secondary">Go to Events to Re-Upload</Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Attached Payment Slip Modal */}
        {viewSlipTicket && (
          <Modal
            open={!!viewSlipTicket}
            onClose={() => setViewSlipTicket(null)}
            title={`Attached Payment Slip — ${viewSlipTicket.event?.title}`}
            subtitle={viewSlipTicket.paymentRef ? `Reference: ${viewSlipTicket.paymentRef}` : 'Your uploaded payment proof'}
            icon={Eye}
            iconColor="bg-indigo-600"
          >
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 max-h-[65vh] flex items-center justify-center">
              <img
                src={viewSlipTicket.paymentSlipUrl}
                alt="Payment Slip"
                className="max-h-[62vh] w-auto object-contain"
              />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
