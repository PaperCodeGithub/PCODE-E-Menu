
// src/app/order-status/[orderId]/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus, RestaurantProfile } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Utensils, ChefHat, CookingPot, Car, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Logo } from '@/components/icons';

const statusMap: { [key in OrderStatus]: { step: number; label: string; Icon: React.ElementType } } = {
  Received: { step: 1, label: "Order Received", Icon: Utensils },
  Ongoing: { step: 2, label: "In the Kitchen", Icon: CookingPot },
  Finishing: { step: 3, label: "Finishing Touches", Icon: ChefHat },
  "On the Way": { step: 4, label: "On the Way", Icon: Car },
  Served: { step: 5, label: "Order Served!", Icon: CheckCircle2 },
  Canceled: { step: 0, label: "Order Canceled", Icon: XCircle }
};
const TOTAL_STEPS = 5;

export default function OrderStatusPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = useMemo(() => profile?.currency?.symbol || '$', [profile]);
  const orderStyle = useMemo(() => profile?.orderStyle || 'table', [profile]);
  
  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided.");
      setLoading(false);
      return;
    }

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Omit<Order, 'id' | 'createdAt'> & { createdAt: any };
        const orderData = {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate()
        } as Order;
        
        setOrder(orderData);

        if (orderData.restaurantId && !profile) {
            const profileRef = doc(db, 'profiles', orderData.restaurantId);
            const profileDoc = await getDoc(profileRef);
            if (profileDoc.exists()) {
                setProfile(profileDoc.data() as RestaurantProfile);
            }
        }
      } else {
        setError("Order not found. It may have been deleted.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching order status:", err);
      setError("Could not load order status.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, profile]);

  const currentStatusInfo = order ? statusMap[order.status] : null;
  const progressPercentage = currentStatusInfo ? (currentStatusInfo.step / TOTAL_STEPS) * 100 : 0;

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader><Skeleton className="h-8 w-3/4 mx-auto" /><Skeleton className="h-5 w-1/2 mx-auto mt-2" /></CardHeader>
                <CardContent className="text-center space-y-6">
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <Skeleton className="h-6 w-1/3 mx-auto" />
                    <Skeleton className="h-4 w-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-5/6 mx-auto" />
                        <Skeleton className="h-4 w-4/6 mx-auto" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (error) {
    return (
         <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
             <Logo className="w-16 h-16 mx-auto text-destructive" />
             <h1 className="text-2xl font-bold mt-4 font-headline">Something went wrong</h1>
             <p className="text-muted-foreground mt-2">{error}</p>
         </div>
    )
  }

  if (!order || !currentStatusInfo) {
    return null; // Should be covered by error state
  }

  const isCanceled = order.status === 'Canceled';
  const isServed = order.status === 'Served';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Order Status</CardTitle>
          <CardDescription>
            {orderStyle === 'table' ? `For Table #${order.customerIdentifier}` : `For ${order.customerIdentifier}`}
             - Placed at {order.createdAt ? format(order.createdAt, 'p') : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex justify-center">
            <div className={`flex items-center justify-center w-20 h-20 rounded-full ${isCanceled ? 'bg-red-100' : 'bg-green-100'}`}>
                <currentStatusInfo.Icon className={`w-10 h-10 ${isCanceled ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
          <div className="space-y-1">
              <p className="text-xl font-semibold">{currentStatusInfo.label}</p>
              <p className="text-muted-foreground text-sm">
                {isCanceled ? "Please contact staff for assistance." : isServed ? "Enjoy your meal!" : "We're working on it!"}
              </p>
          </div>
          {!isCanceled && (
             <div>
                <Progress value={progressPercentage} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>Received</span>
                    <span>In Kitchen</span>
                    <span>Served</span>
                </div>
            </div>
          )}
           <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <ul className="text-sm text-left list-disc pl-5 text-muted-foreground space-y-1">
                    {order.items.map(item => (
                        <li key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t">
                    <span>Total:</span>
                    <span>{currencySymbol}{order.total.toFixed(2)}</span>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
