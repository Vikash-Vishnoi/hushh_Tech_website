import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import config from '../../resources/config/config';
import { useFooterVisibility } from '../../utils/useFooterVisibility';

// Types
interface TimeSlot { startTime: string; endTime: string; available: boolean; }
interface DayAvailability { date: string; slots: TimeSlot[]; }
interface CalendarData { ceo: { name: string; email: string }; timezone: string; meetingDuration: number; availability: DayAvailability[]; }
type PaymentState = 'loading' | 'not_paid' | 'verifying' | 'paid' | 'booked';
const VALID_COUPON = 'ILOVEHUSHH';

function MeetCeoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentState, setPaymentState] = useState<PaymentState>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hushhCoins, setHushhCoins] = useState(0);
  const isFooterVisible = useFooterVisibility();

  // Coupon state
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Calendar state
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { checkPaymentStatus(); }, []);

  // Handle Stripe callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    if (payment === 'success' && sessionId) verifyPayment(sessionId);
    else if (payment === 'cancel') { setError('Payment cancelled. Try again.'); setPaymentState('not_paid'); }
  }, [searchParams]);

  // Fetch calendar when paid
  useEffect(() => { if (paymentState === 'paid') fetchCalendarSlots(); }, [paymentState]);

  /* ── Send Hushh Coins credit email (fire-and-forget) ── */
  const sendCoinsEmail = async (email: string, name: string, coins: number) => {
    try {
      const { data: { session } } = await config.supabaseClient!.auth.getSession();
      if (!session) return;
      await fetch(`${config.SUPABASE_URL}/functions/v1/coins-credit-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipientEmail: email, recipientName: name, coinsAwarded: coins }),
      });
    } catch (err) { console.error('Coins email failed (non-blocking):', err); }
  };

  /* ── Send Hushh Coins deduction email when meeting is booked (fire-and-forget) ── */
  const sendCoinsDeductionEmail = async (email: string, name: string, coins: number, meetingDate: string, meetingTime: string) => {
    try {
      const { data: { session } } = await config.supabaseClient!.auth.getSession();
      if (!session) return;
      await fetch(`${config.SUPABASE_URL}/functions/v1/coins-deduction-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ recipientEmail: email, recipientName: name, coinsDeducted: coins, meetingDate, meetingTime }),
      });
    } catch (err) { console.error('Deduction email failed (non-blocking):', err); }
  };

  /* ── API Handlers ── */

  const checkPaymentStatus = async () => {
    if (!config.supabaseClient) { setPaymentState('not_paid'); return; }
    try {
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) { navigate('/login'); return; }
      const { data: payment } = await config.supabaseClient
        .from('ceo_meeting_payments').select('*').eq('user_id', user.id).maybeSingle();
      if (payment?.payment_status === 'completed') {
        setHushhCoins(payment.hushh_coins_awarded || 300000);
        setPaymentState(payment.calendly_booked ? 'booked' : 'paid');
      } else { setPaymentState('not_paid'); }
    } catch { setPaymentState('not_paid'); }
  };

  const verifyPayment = async (sessionId: string) => {
    setPaymentState('verifying'); setError(null);
    try {
      const { data: { session } } = await config.supabaseClient!.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${config.SUPABASE_URL}/functions/v1/onboarding-verify-payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ sessionId }),
      });
      const result = await res.json();
      if (result.success) {
        const coins = result.hushhCoinsAwarded || 300000;
        setHushhCoins(coins);
        setPaymentState('paid');
        window.history.replaceState({}, '', '/onboarding/meet-ceo');
        // Send coins credit email after Stripe payment
        const { data: { user } } = await config.supabaseClient!.auth.getUser();
        if (user) sendCoinsEmail(user.email || '', user.user_metadata?.full_name || 'Hushh User', coins);
      } else throw new Error(result.error || 'Verification failed');
    } catch (err: any) { setError(err.message); setPaymentState('not_paid'); }
  };

  const handlePayment = async () => {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await config.supabaseClient!.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${config.SUPABASE_URL}/functions/v1/onboarding-create-checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (result.alreadyPaid) { setPaymentState('paid'); return; }
      if (result.checkoutUrl) window.location.href = result.checkoutUrl;
      else throw new Error(result.error || 'Checkout failed');
    } catch (err: any) { setError(err.message); setLoading(false); }
  };

  const handleCouponRedeem = async () => {
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();
    if (!code) { setCouponError('Please enter a coupon code.'); return; }
    if (code !== VALID_COUPON) { setCouponError('Invalid coupon code. Please try again.'); return; }
    setCouponLoading(true);
    try {
      const { data: { user } } = await config.supabaseClient!.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Upsert payment record with coupon
      await config.supabaseClient!.from('ceo_meeting_payments').upsert({
        user_id: user.id, payment_status: 'completed', payment_method: 'coupon',
        coupon_code: code, hushh_coins_awarded: 300000, amount: 0, currency: 'usd',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setHushhCoins(300000);
      setPaymentState('paid');
      // Send coins credit email notification
      sendCoinsEmail(user.email || '', user.user_metadata?.full_name || 'Hushh User', 300000);
    } catch (err: any) { setCouponError(err.message || 'Failed to redeem coupon'); }
    finally { setCouponLoading(false); }
  };

  const fetchCalendarSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${config.SUPABASE_URL}/functions/v1/ceo-calendar-booking?days=14`);
      const data = await res.json();
      if (data.success) { setCalendarData(data); if (data.availability?.length) setSelectedDate(data.availability[0].date); }
    } catch (err) { console.error('Calendar fetch error:', err); }
    finally { setLoadingSlots(false); }
  };

  const handleBookMeeting = async () => {
    if (!selectedSlot) return;
    setBookingInProgress(true); setError(null);
    try {
      const { data: { session } } = await config.supabaseClient!.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: { user } } = await config.supabaseClient!.auth.getUser();
      const res = await fetch(`${config.SUPABASE_URL}/functions/v1/ceo-calendar-booking`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, attendeeName: user?.user_metadata?.full_name || 'Hushh User' }),
      });
      const result = await res.json();
      if (result.success) {
        setPaymentState('booked');
        // Send coins deduction email after successful booking
        const meetingDate = new Date(selectedSlot.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const meetingTime = `${new Date(selectedSlot.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${new Date(selectedSlot.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        sendCoinsDeductionEmail(user?.email || '', user?.user_metadata?.full_name || 'Hushh User', 300000, meetingDate, meetingTime);
      } else throw new Error(result.error || 'Booking failed');
    } catch (err: any) { setError(err.message); }
    finally { setBookingInProgress(false); }
  };

  const handleContinue = () => navigate('/hushh-user-profile');
  const handleBack = () => navigate('/onboarding/step-13');

  /* ── Shimmer Loader ── */
  if (paymentState === 'loading' || paymentState === 'verifying') {
    return (
      <div className="bg-white min-h-[100dvh] flex items-center justify-center" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
        <div className="text-center px-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-gray-200 border-t-[#007AFF] animate-spin" />
          <p className="text-[17px] text-[#8E8E93] font-medium">{paymentState === 'verifying' ? 'Verifying payment...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  /* ── RENDER ── */
  return (
    <div className="bg-white min-h-[100dvh] flex flex-col" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* iOS Nav Bar */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#C6C6C8]/30 flex items-end justify-between px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 12px) + 4px)', minHeight: '48px' }}>
        <button onClick={handleBack} className="text-[#007AFF] flex items-center -ml-2 active:opacity-50" aria-label="Back">
          <span className="material-symbols-outlined text-3xl -mr-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>chevron_left</span>
          <span className="text-[17px] pb-[2px]">Back</span>
        </button>
        <h1 className="text-[17px] font-semibold text-black absolute left-1/2 -translate-x-1/2">Verification</h1>
        <div className="w-12" />
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 pt-6 pb-52">

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-red-600 text-[15px] text-center font-medium">{error}</p>
          </div>
        )}

        {/* ═══ NOT PAID STATE ═══ */}
        {paymentState === 'not_paid' && (
          <>
            {/* Hero */}
            <div className="text-center mb-6">
              <div className="w-[72px] h-[72px] mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-[36px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>person_celebrate</span>
              </div>
              <h1 className="text-[28px] font-bold text-black tracking-tight leading-tight mb-1">Meet Your Fund Manager</h1>
              <p className="text-[15px] text-[#8E8E93] leading-snug">A private 1-hour session with<br/><span className="font-semibold text-black">Manish Sainani</span>, Hedge Fund Manager</p>
            </div>

            {/* The Story — Why this is special */}
            <div className="mb-5 p-5 bg-gradient-to-br from-[#F0F5FF] to-[#F8F0FF] rounded-2xl border border-[#007AFF]/10">
              <p className="text-[15px] text-[#1D1D1F] leading-relaxed mb-3">
                A personal consultation with Manish typically costs <span className="font-bold">$3,000</span> per session.
              </p>
              <p className="text-[15px] text-[#1D1D1F] leading-relaxed mb-3">
                Because you've completed the full Hushh KYC onboarding, you've unlocked this as an <span className="font-semibold text-[#007AFF]">exclusive benefit</span> — available for just <span className="font-bold text-[#007AFF]">$1</span>.
              </p>
              <p className="text-[13px] text-[#636366] leading-relaxed">
                This is your opportunity to sit down 1-on-1 with a hedge fund manager, ask questions about investment strategies, portfolio allocation, and get personalized guidance.
              </p>
            </div>

            {/* What You Get — iOS Grouped List */}
            <div className="mb-5">
              <p className="text-[13px] uppercase text-[#8E8E93] font-medium tracking-wide px-4 mb-2">Here's what you unlock</p>
              <div className="bg-white rounded-xl border border-[#C6C6C8]/40 overflow-hidden divide-y divide-[#C6C6C8]/30">
                {/* Item 1 */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#007AFF] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-black">1-Hour Private Consultation</p>
                    <p className="text-[13px] text-[#8E8E93]">With Manish Sainani, Hedge Fund Manager</p>
                  </div>
                  <span className="text-[13px] font-medium text-[#8E8E93] line-through shrink-0">$3,000</span>
                </div>
                {/* Item 2 */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#FF9500] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-black">300,000 Hushh Coins</p>
                    <p className="text-[13px] text-[#8E8E93]">Credited instantly — use to book your session</p>
                  </div>
                </div>
                {/* Item 3 */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#34C759]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#34C759] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-black">KYC Verified Badge</p>
                    <p className="text-[13px] text-[#8E8E93]">You've completed identity verification</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price highlight */}
            <div className="mb-5 flex items-center justify-center gap-3 p-4 bg-[#F2F2F7] rounded-xl">
              <div className="text-center">
                <p className="text-[13px] text-[#8E8E93] mb-1">Your price today</p>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-[32px] font-bold text-[#007AFF] leading-none">$1</span>
                  <span className="text-[15px] text-[#C7C7CC] line-through">$3,000</span>
                </div>
                <p className="text-[11px] text-[#8E8E93] mt-1">Exclusive KYC onboarding benefit</p>
              </div>
            </div>

            {/* Coupon Section */}
            <div className="mb-4">
              <button onClick={() => setShowCoupon(!showCoupon)} className="w-full flex items-center justify-center gap-1.5 py-2 text-[15px] text-[#007AFF] font-medium active:opacity-60">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>confirmation_number</span>
                {showCoupon ? 'Hide coupon code' : 'Have a coupon code?'}
              </button>

              {showCoupon && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                      placeholder="Enter coupon code"
                      className="flex-1 h-[44px] px-4 rounded-xl bg-[#F2F2F7] border border-[#C6C6C8]/40 text-[15px] text-black placeholder:text-[#C7C7CC] outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/30 font-mono tracking-widest"
                      autoCapitalize="characters" autoComplete="off"
                    />
                    <button onClick={handleCouponRedeem} disabled={couponLoading || !couponCode.trim()}
                      className="h-[44px] px-5 rounded-xl bg-[#007AFF] text-white text-[15px] font-semibold disabled:bg-[#C7C7CC] active:scale-[0.97] transition-all flex items-center gap-1.5">
                      {couponLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-[13px] text-red-500 text-center font-medium">{couponError}</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ PAID STATE — Calendar Booking ═══ */}
        {paymentState === 'paid' && (
          <>
            <div className="text-center mb-6">
              <div className="w-[72px] h-[72px] mx-auto mb-4 rounded-full bg-[#34C759]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#34C759] text-[40px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check_circle</span>
              </div>
              <h1 className="text-[28px] font-bold text-black tracking-tight mb-1">You're Verified!</h1>
              <p className="text-[15px] text-[#8E8E93]"><span className="font-bold text-black">{hushhCoins.toLocaleString()} Hushh Coins</span> credited</p>
            </div>

            <div className="mb-4 p-4 bg-[#F2F2F7] rounded-xl text-center">
              <p className="text-[15px] font-semibold text-black mb-1">Schedule Your Consultation</p>
              <p className="text-[13px] text-[#8E8E93]">Book a 1-hour session with {calendarData?.ceo.name || 'Manish Sainani'}</p>
              {calendarData?.timezone && <p className="text-[11px] text-[#C7C7CC] mt-1">{calendarData.timezone}</p>}
            </div>

            {loadingSlots && (
              <div className="flex flex-col items-center py-12">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-[#007AFF] rounded-full animate-spin mb-3" />
                <p className="text-[13px] text-[#8E8E93]">Loading times...</p>
              </div>
            )}

            {!loadingSlots && calendarData && (
              <div className="space-y-4">
                {/* Date pills */}
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-2">
                    {calendarData.availability.map((day) => {
                      const d = new Date(day.date);
                      const sel = selectedDate === day.date;
                      const has = day.slots.some(s => s.available);
                      return (
                        <button key={day.date} onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }} disabled={!has}
                          className={`shrink-0 flex flex-col items-center p-2.5 rounded-xl min-w-[62px] border-2 transition-all ${sel ? 'border-[#007AFF] bg-[#007AFF]/5' : has ? 'border-[#C6C6C8]/30 active:bg-gray-50' : 'border-transparent opacity-40'}`}>
                          <span className="text-[10px] font-medium text-[#8E8E93] uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className={`text-[18px] font-bold ${sel ? 'text-[#007AFF]' : 'text-black'}`}>{d.getDate()}</span>
                          <span className="text-[10px] text-[#8E8E93]">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="rounded-xl border border-[#C6C6C8]/30 p-3">
                    <p className="text-[13px] font-semibold text-black mb-2">Available Times</p>
                    <div className="grid grid-cols-3 gap-2">
                      {calendarData.availability.find(d => d.date === selectedDate)?.slots.filter(s => s.available).map(slot => {
                        const t = new Date(slot.startTime);
                        const sel = selectedSlot?.startTime === slot.startTime;
                        return (
                          <button key={slot.startTime} onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-2 rounded-lg text-[13px] font-medium transition-all ${sel ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] text-black active:bg-gray-200'}`}>
                            {t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </button>
                        );
                      })}
                    </div>
                    {calendarData.availability.find(d => d.date === selectedDate)?.slots.filter(s => s.available).length === 0 && (
                      <p className="text-[13px] text-[#C7C7CC] text-center py-4">No slots available</p>
                    )}
                  </div>
                )}

                {/* Selected summary */}
                {selectedSlot && (
                  <div className="p-3 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#007AFF]" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                    <div>
                      <p className="text-[14px] font-semibold text-black">{new Date(selectedSlot.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      <p className="text-[13px] text-[#8E8E93]">{new Date(selectedSlot.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – {new Date(selectedSlot.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══ BOOKED STATE ═══ */}
        {paymentState === 'booked' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[#34C759]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#34C759] text-[44px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>task_alt</span>
            </div>
            <h1 className="text-[28px] font-bold text-black tracking-tight mb-2">All Set!</h1>
            <p className="text-[15px] text-[#8E8E93] mb-1">Your consultation is scheduled with</p>
            <p className="text-[17px] font-semibold text-black">Manish Sainani</p>
            <p className="text-[13px] text-[#8E8E93] mt-1">{hushhCoins.toLocaleString()} Hushh Coins earned 🪙</p>
          </div>
        )}
      </main>

      {/* ═══ FIXED FOOTER ═══ */}
      {!isFooterVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-[#C6C6C8]/30 px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }} data-onboarding-footer>
          <div className="max-w-md mx-auto flex flex-col gap-2.5">

            {paymentState === 'not_paid' && (
              <>
                <button onClick={handlePayment} disabled={loading} data-onboarding-cta
                  className="h-[50px] w-full rounded-xl bg-[#007AFF] text-white text-[17px] font-semibold flex items-center justify-center active:opacity-90 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm">
                  {loading ? <><div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />Redirecting...</> : 'Verify & Unlock — $1'}
                </button>
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="material-symbols-outlined text-[#C7C7CC] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <p className="text-[11px] text-[#C7C7CC]">Secure payment powered by Stripe</p>
                </div>
              </>
            )}

            {paymentState === 'paid' && (
              <>
                <button onClick={handleBookMeeting} disabled={!selectedSlot || bookingInProgress} data-onboarding-cta
                  className="h-[50px] w-full rounded-xl bg-[#007AFF] text-white text-[17px] font-semibold flex items-center justify-center active:opacity-90 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm">
                  {bookingInProgress ? <><div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />Booking...</> : selectedSlot ? 'Confirm Booking' : 'Select a Time'}
                </button>
                <button onClick={handleContinue} disabled={bookingInProgress}
                  className="h-[44px] text-[#007AFF] text-[15px] font-medium active:opacity-60">I'll book later</button>
              </>
            )}

            {paymentState === 'booked' && (
              <button onClick={handleContinue} data-onboarding-cta
                className="h-[50px] w-full rounded-xl bg-[#007AFF] text-white text-[17px] font-semibold flex items-center justify-center active:opacity-90 active:scale-[0.98] shadow-sm">
                Continue to Profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetCeoPage;
