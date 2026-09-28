import React from 'react';
import OrderStatusTracker from './OrderStatusTracker';
import { Truck } from 'lucide-react';

interface OrderTrackerProps {
  userId?: string;
  orderId?: string;
}

export default function OrderTracker({ userId, orderId }: OrderTrackerProps) {
  return (
    <div id="orders" className="space-y-6 max-w-4xl mx-auto my-6 px-4 scroll-mt-24">
      <div className="flex items-center justify-between pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="text-[#C85A32]" size={18} />
            <span className="text-xs uppercase tracking-wider font-bold text-[#C85A32]">
              Live Order Logistics
            </span>
          </div>
          <h3 className="font-display font-bold text-2xl text-stone-900 dark:text-stone-100">
            Active Order Status & Preparation
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Real-time status updates direct from Quetta Mahfil coal stoves & kitchen dispatch
          </p>
        </div>
      </div>

      {/* Main Real-Time Lifecycle Tracker Component */}
      <OrderStatusTracker userId={userId} orderId={orderId} />
    </div>
  );
}

export { OrderStatusTracker };
