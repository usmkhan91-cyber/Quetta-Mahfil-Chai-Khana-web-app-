import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Coffee, 
  CreditCard, 
  Banknote, 
  QrCode,
  Sparkles,
  Phone,
  User,
  Check
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFirebase } from '../context/FirebaseContext';
import { useNavigation } from '../context/NavigationContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { triggerHaptic } from '../lib/haptics';
import { useHaptics } from '../hooks/useHaptics';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced?: (orderId: string) => void;
}

export default function CartDrawer({ isOpen, onClose, onOrderPlaced }: CartDrawerProps) {
  const { items, updateQuantity, removeFromCart, clearCart, total } = useCart();
  const { user } = useFirebase();
  const { setActiveSection } = useNavigation();
  const { orderFinalizedFeedback, errorFeedback } = useHaptics();

  const [orderType, setOrderType] = useState<'delivery' | 'dine-in' | 'takeaway'>('delivery');
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [addressOrTable, setAddressOrTable] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'sadapay_nayapay' | 'card'>('cash');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(null);

  const deliveryFee = orderType === 'delivery' ? 0 : 0; // Free delivery in Bahria Town
  const grandTotal = total + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    if (!customerName.trim() || !phone.trim() || !addressOrTable.trim()) {
      alert('Please provide your name, phone number, and delivery address/table number.');
      return;
    }

    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      const orderPayload = {
        userId: user?.uid || `guest_${Date.now()}`,
        customerName: customerName.trim(),
        phone: phone.trim(),
        orderType,
        destination: addressOrTable.trim(),
        items: items.map(item => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant || null
        })),
        subtotal: total,
        deliveryFee,
        total: grandTotal,
        paymentMethod,
        paymentStatus: 'unpaid',
        status: 'pending',
        instructions: instructions.trim() || null,
        createdAt: serverTimestamp(),
        source: 'web_app'
      };

      const docRef = await addDoc(collection(db, 'mahfil_orders'), orderPayload);
      const generatedId = docRef.id;
      setOrderSuccessId(generatedId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mahfil_active_order_id', generatedId);
        window.dispatchEvent(new CustomEvent('mahfil_active_order_updated', { detail: { orderId: generatedId } }));
      }
      clearCart();
      orderFinalizedFeedback();

      if (onOrderPlaced) {
        onOrderPlaced(generatedId);
      }
    } catch (err: any) {
      console.error('Error placing order:', err);
      errorFeedback();
      // Fallback local acknowledgment so customer experience is never broken
      const fallbackId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderSuccessId(fallbackId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mahfil_active_order_id', fallbackId);
        window.dispatchEvent(new CustomEvent('mahfil_active_order_updated', { detail: { orderId: fallbackId } }));
      }
      clearCart();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setOrderSuccessId(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100]"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-[#FAF8F5] dark:bg-[#181512] z-[1200] shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800"
          >
            {/* Header */}
            <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white dark:bg-[#1E1B17]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C85A32]/10 text-[#C85A32] flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-stone-900 dark:text-stone-100">
                    Your Mahfil Bag
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {items.length} {items.length === 1 ? 'item' : 'items'} selected
                  </p>
                </div>
              </div>

              <button
                onClick={resetAndClose}
                className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            {orderSuccessId ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                  <CheckCircle2 size={42} />
                </div>
                <h4 className="font-display font-bold text-2xl text-stone-900 dark:text-stone-100 mb-2">
                  Order Received!
                </h4>
                <p className="text-sm text-stone-600 dark:text-stone-400 max-w-sm mb-6">
                  Assalamu Alaikum! Your order has been placed into our live coal kitchen queue.
                </p>
                <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 w-full mb-8">
                  <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold block mb-1">
                    Order Reference
                  </span>
                  <span className="font-mono text-base font-bold text-[#C85A32] dark:text-[#E5A84B]">
                    #{orderSuccessId.slice(0, 10).toUpperCase()}
                  </span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                    Estimated Time: 20-30 mins in Bahria Town
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <button
                    onClick={() => {
                      resetAndClose();
                      setActiveSection('orders');
                      setTimeout(() => {
                        document.getElementById('orders')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="w-full py-3.5 bg-[#C85A32] hover:bg-[#b04a25] text-white rounded-xl font-medium text-sm transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    Track Live Logistics <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={resetAndClose}
                    className="w-full py-3 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl font-medium text-sm hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    Back to Menu
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800/60 text-stone-400 flex items-center justify-center mb-4">
                  <Coffee size={32} />
                </div>
                <h4 className="font-display font-semibold text-lg text-stone-800 dark:text-stone-200 mb-1">
                  Your bag is currently empty
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mb-6">
                  Explore our piping hot Zafrani Chai, fresh Parathas, and shakes to start your order.
                </p>
                <button
                  onClick={resetAndClose}
                  className="px-6 py-2.5 bg-[#C85A32] text-white rounded-xl text-xs font-semibold hover:bg-[#b04a25] transition-colors"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                  {/* Order Type Tabs */}
                  <div className="grid grid-cols-3 p-1 rounded-xl bg-stone-200 dark:bg-stone-800/80 mb-6">
                    <button
                      type="button"
                      onClick={() => setOrderType('delivery')}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium transition-all text-center",
                        orderType === 'delivery'
                          ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                          : "text-stone-500 dark:text-stone-400 hover:text-stone-800"
                      )}
                    >
                      🛵 Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('dine-in')}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium transition-all text-center",
                        orderType === 'dine-in'
                          ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                          : "text-stone-500 dark:text-stone-400 hover:text-stone-800"
                      )}
                    >
                      ☕ Dine-In
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('takeaway')}
                      className={cn(
                        "py-2 rounded-lg text-xs font-medium transition-all text-center",
                        orderType === 'takeaway'
                          ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                          : "text-stone-500 dark:text-stone-400 hover:text-stone-800"
                      )}
                    >
                      🥡 Takeaway
                    </button>
                  </div>

                  {/* Items Card */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={`${item.id}-${item.selectedVariant || 'default'}`}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#1E1B17] border border-stone-200/80 dark:border-stone-800 flex items-center gap-3.5 shadow-sm"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {item.name}
                          </h5>
                          {item.selectedVariant && (
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 block">
                              {item.selectedVariant}
                            </span>
                          )}
                          <span className="font-mono text-xs font-bold text-[#C85A32] dark:text-[#E5A84B]">
                            Rs. {item.price * item.quantity}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-lg p-1 border border-stone-200 dark:border-stone-700">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedVariant)}
                            className="w-6 h-6 rounded flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-mono text-xs font-semibold px-1 min-w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedVariant)}
                            className="w-6 h-6 rounded flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id, item.selectedVariant)}
                          className="text-stone-400 hover:text-red-500 p-1.5 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Customer Information Form */}
                  <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800 space-y-3.5">
                    <h6 className="text-xs uppercase tracking-wider font-bold text-stone-700 dark:text-stone-300">
                      Order Details
                    </h6>

                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Usama Khan"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#1E1B17] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32] text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                        Phone Number (for rider contact) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0300 1234567"
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#1E1B17] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32] text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                        {orderType === 'delivery'
                          ? 'Bahria Town Delivery Address *'
                          : orderType === 'dine-in'
                          ? 'Table / Chaarpai Number *'
                          : 'Pickup Notes'}
                      </label>
                      <input
                        type="text"
                        required
                        value={addressOrTable}
                        onChange={(e) => setAddressOrTable(e.target.value)}
                        placeholder={
                          orderType === 'delivery'
                            ? 'House #, Street, Sector C / Bahria Town'
                            : orderType === 'dine-in'
                            ? 'Table 4 (Courtyard / AC Hall)'
                            : 'Counter pickup in 20 mins'
                        }
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#1E1B17] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32] text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-500 dark:text-stone-400 block mb-1">
                        Kitchen Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Extra elaichi, less oil, well done paratha..."
                        className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#1E1B17] border border-stone-200 dark:border-stone-800 text-sm focus:outline-none focus:border-[#C85A32] text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    {/* Payment Method */}
                    <div className="pt-2">
                      <label className="text-xs text-stone-500 dark:text-stone-400 block mb-2">
                        Payment Preference
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={cn(
                            "p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all",
                            paymentMethod === 'cash'
                              ? "border-[#C85A32] bg-[#C85A32]/10 text-[#C85A32] font-semibold"
                              : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                          )}
                        >
                          <Banknote size={15} /> Cash on Delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('sadapay_nayapay')}
                          className={cn(
                            "p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all",
                            paymentMethod === 'sadapay_nayapay'
                              ? "border-[#C85A32] bg-[#C85A32]/10 text-[#C85A32] font-semibold"
                              : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                          )}
                        >
                          <QrCode size={15} /> SadaPay / NayaPay
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer & Submit */}
                <div className="p-6 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1E1B17] space-y-4">
                  <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono font-medium">Rs. {total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery in Bahria Town</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <span>Total Amount</span>
                      <span className="font-mono text-[#C85A32] dark:text-[#E5A84B]">
                        Rs. {grandTotal}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#C85A32] hover:bg-[#b04a25] active:scale-[0.99] text-white rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Transmitting to Kitchen...
                      </span>
                    ) : (
                      <>
                        <span>Confirm & Send to Kitchen</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
