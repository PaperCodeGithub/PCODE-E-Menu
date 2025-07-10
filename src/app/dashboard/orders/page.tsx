// src/app/dashboard/orders/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useDashboard } from '../layout';

const statusColors: { [key in OrderStatus]: string } = {
  Received: "bg-blue-500",
  Ongoing: "bg-yellow-500 animate-pulse",
  Finishing: "bg-orange-500",
  "On the Way": "bg-purple-500",
  Served: "bg-green-500",
  Canceled: "bg-red-500",
};

export default function OrdersPage() {
  const { user, profile, loading: dashboardLoading } = useDashboard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const currencySymbol = useMemo(() => profile?.currency?.symbol || '$', [profile]);

  useEffect(() => {
    if (!user) return;

    setOrdersLoading(true);
    const q = query(
      collection(db, 'orders'), 
      where('restaurantId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to JS Date for date-fns
        createdAt: doc.data().createdAt?.toDate() 
      })) as Order[];
      
      // Sort orders by creation date descending
      fetchedOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setOrders(fetchedOrders);
      setOrdersLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setOrdersLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating order status: ", error);
    }
  };
  
  const activeOrders = orders.filter(o => o.status !== 'Served' && o.status !== 'Canceled');
  const pastOrders = orders.filter(o => o.status === 'Served' || o.status === 'Canceled');

  const isLoading = dashboardLoading || ordersLoading;

  useEffect(() => {
    if (isLoading) {
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          if (oldProgress >= 95) {
            return 95;
          }
          return oldProgress + 10;
        });
      }, 200);
      return () => {
        clearInterval(timer);
      };
    } else {
        setProgress(100);
    }
  }, [isLoading]);
  
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-40">
            <p className="mb-2">Loading Orders...</p>
            <Progress value={progress} className="w-1/3" />
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-headline font-semibold">Active Orders</h1>
        <p className="text-muted-foreground">Manage incoming and ongoing customer orders.</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {activeOrders.length > 0 ? activeOrders.map(order => (
                <Card key={order.id} className="flex flex-col">
                    <CardHeader className="flex-row items-start justify-between">
                        <div>
                            <CardTitle>Table #{order.tableNumber}</CardTitle>
                            <CardDescription className="flex items-center gap-1.5 pt-1">
                                <Clock className="w-3 h-3"/>
                                {order.createdAt ? formatDistanceToNow(order.createdAt, { addSuffix: true }) : 'just now'}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="whitespace-nowrap">
                            {currencySymbol}{order.total.toFixed(2)}
                        </Badge>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                        <ul className="text-sm list-disc pl-5 text-muted-foreground">
                            {order.items.map(item => (
                                <li key={item.id}>{item.quantity}x {item.name}</li>
                            ))}
                        </ul>
                    </CardContent>
                    <div className="p-6 pt-0">
                         <Select value={order.status} onValueChange={(value) => handleStatusChange(order.id, value as OrderStatus)}>
                            <SelectTrigger className="w-full">
                                <SelectValue>
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${statusColors[order.status]}`}></span>
                                        {order.status}
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(statusColors).map(status => (
                                <SelectItem key={status} value={status}>
                                     <div className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status as OrderStatus]}`}></span>
                                        {status}
                                    </div>
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </Card>
            )) : (
                 <div className="md:col-span-2 lg:col-span-3 text-center py-10">
                    <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No active orders right now.</p>
                </div>
            )}
        </div>
      </div>

       <div>
        <h2 className="text-2xl font-headline font-semibold">Completed & Canceled Orders</h2>
        <p className="text-muted-foreground">A history of past orders.</p>
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {pastOrders.length > 0 ? pastOrders.map(order => (
                <Card key={order.id} className="opacity-70">
                     <CardHeader className="flex-row items-start justify-between">
                        <div>
                            <CardTitle>Table #{order.tableNumber}</CardTitle>
                            <CardDescription className="flex items-center gap-1.5 pt-1">
                                <Clock className="w-3 h-3"/>
                                {order.createdAt ? formatDistanceToNow(order.createdAt, { addSuffix: true }) : 'a while ago'}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="whitespace-nowrap">
                            {currencySymbol}{order.total.toFixed(2)}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                         <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${statusColors[order.status]}`}></span>
                            <span className="text-sm font-medium">{order.status}</span>
                        </div>
                    </CardContent>
                </Card>
            )) : (
                 <div className="md:col-span-2 lg:col-span-3 text-center py-10">
                    <p className="text-muted-foreground">No past orders yet.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
