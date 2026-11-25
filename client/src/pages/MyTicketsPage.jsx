import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../services/api';
import { socket } from '../services/socket';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { validateImageFile, fileToDataUrl, checkTextContent } from '../utils/moderation';
import { Card, Badge, Button, Modal, Input } from '../components/ui';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket as TicketIcon, Calendar, MapPin,
  Loader2, ArrowRight, Clock, ShieldCheck, AlertTriangle, Eye, CheckCircle2, Upload, QrCode, Copy,
} from 'lucide-react';

function formatTicketQrValue(ticket, user) {
  const statusText =
    ticket.status === 'USED'
      ? `CHECKED IN (${ticket.usedAt ? new Date(ticket.usedAt).toLocaleString() : 'Verified'})`
      : 'APPROVED - VALID ENTRY PASS';
  const feeText = ticket.pricePaid > 0 ? `Rs. ${ticket.pricePaid}` : 'Free Entry';
  return [
    'RIPHAH KONNECT - OFFICIAL EVENT PASS',
    '====================================',
    `Ticket ID  : ${ticket.code}`,
    `Status     : ${statusText}`,
    `Attendee   : ${user?.name || 'Registered Student'}`,
    user?.email ? `Email      : ${user.email}` : null,
    user?.department ? `Department : ${user.department}${user?.semester ? ` (Sem ${user.semester})` : ''}` : null,
    '------------------------------------',
    `Event      : ${ticket.event?.title || 'Campus Event'}`,
    `Date & Time: ${formatDate(ticket.event?.startDate, true)}`,
    `Venue      : ${ticket.event?.location || 'Campus Grounds'}`,
    `Entry Fee  : ${feeText}`,
    ticket.paymentRef ? `Payment Ref: ${ticket.paymentRef}` : null,
    '====================================',
    'Present this Unique Ticket ID at the event desk for verification.',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewSlipTicket, setViewSlipTicket] = useState(null);
  const [qrModalTicket, setQrModalTicket] = useState(null);
  const [reuploadTicket, setReuploadTicket] = useState(null);
  const [slipDataUrl, setSlipDataUrl] = useState('');
  const [slipFileName, setSlipFileName] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await ticketsAPI.getMyTickets();
      setTickets(res.data.tickets || []);
    } catch {
      toast.error('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time Socket.IO listener so status changes (Approved / Rejected / Checked In) appear instantly
  useEffect(() => {
    const handleTicketUpdated = (payload) => {
      if (!payload) return;
      if (!payload.userId || payload.userId === user?.id) {
        fetchTickets();
        if (payload.action === 'APPROVED' && payload.code) {
          toast.success(`Payment slip approved! Your Ticket ID is ${payload.code}`);
        } else if (payload.action === 'REJECTED') {
          toast.error('Your payment slip was not approved. Please check the reason and re-upload.');
        } else if (payload.action === 'CHECKED_IN') {
          toast.success('Ticket verified & checked in at the event!');
        }
      }
    };
    socket.on('ticketUpdated', handleTicketUpdated);
    return () => socket.off('ticketUpdated', handleTicketUpdated);
  }, [user?.id, fetchTickets]);

  const openReuploadModal = (ticket) => {
    setReuploadTicket(ticket);
    setSlipDataUrl('');
    setSlipFileName('');
    setPaymentRef(ticket.paymentRef || '');
  };

  const handleSlipFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile(file, 3);
    if (!check.valid) {
      toast.error(check.error);
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setSlipDataUrl(dataUrl);
      setSlipFileName(file.name);
    } catch {
      toast.error('Could not read payment slip image.');
    }
  };

  const handleReuploadSubmit = async (e) => {
    e.preventDefault();
    if (!reuploadTicket) return;
    if (!slipDataUrl) {
      toast.error('Please attach a clear screenshot or photo of your payment slip.');
      return;
    }
    if (paymentRef.trim()) {
      const refCheck = checkTextContent(paymentRef, 'Transaction Reference');
      if (!refCheck.clean) {
        toast.error(refCheck.reason);
        return;
      }
    }

    setUploadingSlip(true);
    try {
      await ticketsAPI.buy(reuploadTicket.eventId, {
        paymentSlipUrl: slipDataUrl,
        paymentRef: paymentRef.trim() || undefined,
      });
      toast.success('New payment slip submitted for Event Manager verification!');
      setReuploadTicket(null);
      await fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload payment slip.');
    } finally {
      setUploadingSlip(false);
    }
  };

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
                        <button
                          type="button"
                          onClick={() => setQrModalTicket(ticket)}
                          className={cn(
                            'p-2.5 rounded-xl border-2 flex-shrink-0 bg-white transition-all cursor-pointer group relative shadow-sm hover:shadow-md',
                            isUsed ? 'border-slate-200 opacity-75' : 'border-indigo-100 hover:border-indigo-300'
                          )}
                          title="Click to enlarge QR code for scanning"
                        >
                          <QRCodeSVG
                            value={formatTicketQrValue(ticket, user)}
                            size={100}
                            level="M"
                            bgColor="#ffffff"
                            fgColor={isUsed ? '#475569' : '#0f172a'}
                            marginSize={2}
                          />
                          <span className="block text-[9px] font-bold text-indigo-600 text-center mt-1 group-hover:underline">
                            Tap to Enlarge
                          </span>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                            <ShieldCheck size={12} /> Unique Ticket ID
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-base font-mono font-extrabold tracking-wider text-slate-900 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block">
                              {ticket.code}
                            </p>
                            <button
                              type="button"
                              onClick={() => setQrModalTicket(ticket)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              title="Open full scannable QR Pass"
                            >
                              <QrCode size={12} /> QR Pass
                            </button>
                          </div>
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
                              Your attached payment slip is being verified. Once approved, your private <strong>Unique Ticket ID</strong> &amp; QR code will appear here automatically.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Fee: <strong className="text-slate-700">{ticket.pricePaid > 0 ? `Rs. ${ticket.pricePaid}` : 'Free'}</strong>
                            {ticket.paymentRef ? ` · Ref: ${ticket.paymentRef}` : ''}
                          </span>
                          <div className="flex items-center gap-3">
                            {ticket.paymentSlipUrl && (
                              <button
                                type="button"
                                onClick={() => setViewSlipTicket(ticket)}
                                className="font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={13} /> View Slip
                              </button>
                            )}
                            {!isPastEvent && (
                              <button
                                type="button"
                                onClick={() => openReuploadModal(ticket)}
                                className="font-bold text-slate-600 hover:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Upload size={12} /> Replace Slip
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900">
                          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs leading-relaxed">
                            <p className="font-bold">Payment Slip Not Approved</p>
                            <p className="text-red-700 mt-0.5">
                              {ticket.rejectionReason || 'Please upload a clear payment receipt image for Event Manager verification.'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {ticket.paymentSlipUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewSlipTicket(ticket)}
                              className="text-xs font-bold text-slate-600 hover:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={13} /> View Previous Slip
                            </button>
                          ) : <span />}
                          {!isPastEvent && (
                            <Button
                              size="sm"
                              icon={Upload}
                              onClick={() => openReuploadModal(ticket)}
                            >
                              Re-Upload Payment Slip
                            </Button>
                          )}
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
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 max-h-[60vh] flex items-center justify-center">
                <img
                  src={viewSlipTicket.paymentSlipUrl}
                  alt="Payment Slip"
                  className="max-h-[58vh] w-auto object-contain"
                />
              </div>
              {viewSlipTicket.status === 'REJECTED' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
                  <span><strong>Reason:</strong> {viewSlipTicket.rejectionReason || 'Payment slip could not be verified.'}</span>
                  <Button
                    size="sm"
                    icon={Upload}
                    onClick={() => {
                      const target = viewSlipTicket;
                      setViewSlipTicket(null);
                      openReuploadModal(target);
                    }}
                  >
                    Re-Upload Now
                  </Button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Re-Upload / Replace Payment Slip Modal */}
        {reuploadTicket && (
          <Modal
            open={!!reuploadTicket}
            onClose={() => !uploadingSlip && setReuploadTicket(null)}
            title={`${reuploadTicket.status === 'REJECTED' ? 'Re-Upload' : 'Replace'} Payment Slip`}
            subtitle={reuploadTicket.event?.title}
            icon={Upload}
            iconColor="bg-indigo-600"
          >
            <form onSubmit={handleReuploadSubmit} className="space-y-4">
              {reuploadTicket.status === 'REJECTED' && reuploadTicket.rejectionReason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  <strong>Previous Rejection Reason:</strong> {reuploadTicket.rejectionReason}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Attach Clear Payment Slip / Receipt Image *
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-4 bg-indigo-50/40 cursor-pointer transition-colors">
                  <Upload className="h-6 w-6 text-indigo-500 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-700">
                    {slipFileName || 'Click to choose payment slip screenshot (JPG, PNG, WEBP · max 3MB)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipFileChange}
                    className="hidden"
                  />
                </label>
                {slipDataUrl && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-50 flex items-center justify-center">
                    <img src={slipDataUrl} alt="New Payment Slip Preview" className="max-h-44 object-contain" />
                  </div>
                )}
              </div>

              <Input
                label="Transaction / Reference ID (Optional)"
                placeholder="e.g. JazzCash / EasyPaisa / Bank TID #9384712"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={uploadingSlip}
                  onClick={() => setReuploadTicket(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={uploadingSlip} icon={CheckCircle2}>
                  Submit Slip for Verification
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Full-Size Scannable QR Event Pass Modal */}
        {qrModalTicket && (
          <Modal
            open={!!qrModalTicket}
            onClose={() => setQrModalTicket(null)}
            title="Official Campus Event QR Pass"
            subtitle={qrModalTicket.event?.title}
            icon={QrCode}
            iconColor="bg-gradient-to-br from-[#0c1a4a] to-[#2251b8]"
          >
            <div className="space-y-4">
              {/* High-Contrast Scannable QR Card */}
              <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-indigo-100">
                  <QRCodeSVG
                    value={formatTicketQrValue(qrModalTicket, user)}
                    size={230}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    marginSize={3}
                  />
                </div>

                <div className="mt-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 flex items-center justify-center gap-1">
                    <ShieldCheck size={13} /> Unique Ticket ID
                  </span>
                  <div className="mt-1 inline-flex items-center gap-2 bg-white border border-indigo-200 px-3.5 py-1.5 rounded-xl shadow-xs">
                    <span className="text-lg font-mono font-extrabold tracking-widest text-slate-900">
                      {qrModalTicket.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(qrModalTicket.code);
                        toast.success(`Copied Ticket ID: ${qrModalTicket.code}`);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 cursor-pointer transition-colors"
                      title="Copy Unique Ticket ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Structured Pass Details (What displays when scanned) */}
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
                <div className="px-4 py-2.5 bg-slate-50/70 flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Scanned Pass Details
                  </span>
                  <Badge variant={qrModalTicket.status === 'USED' ? 'blue' : 'green'} size="xs">
                    {qrModalTicket.status === 'USED' ? 'Checked In' : 'Approved · Valid Pass'}
                  </Badge>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Attendee</span>
                  <span className="font-bold text-slate-900 text-right">{user?.name}</span>
                </div>
                {user?.department && (
                  <div className="px-4 py-2.5 flex justify-between gap-4">
                    <span className="text-slate-500">Department</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {user.department}{user?.semester ? ` · Sem ${user.semester}` : ''}
                    </span>
                  </div>
                )}
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Event</span>
                  <span className="font-bold text-slate-900 text-right">{qrModalTicket.event?.title}</span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Date &amp; Time</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {formatDate(qrModalTicket.event?.startDate, true)}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Venue</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {qrModalTicket.event?.location || 'Campus Grounds'}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Entry Fee</span>
                  <span className="font-bold text-slate-900 text-right">
                    {qrModalTicket.pricePaid > 0 ? `Rs. ${qrModalTicket.pricePaid}` : 'Free Entry'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setQrModalTicket(null)}>
                  Close Pass
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
