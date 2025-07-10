// src/app/dashboard/orders/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusColors: { [key in OrderStatus]: string } = {
  Received: "bg-blue-500",
  Ongoing: "bg-yellow-500 animate-pulse",
  Finishing: "bg-orange-500",
  "On the Way": "bg-purple-500",
  Served: "bg-green-500",
  Canceled: "bg-red-500",
};

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'orders'), 
      where('restaurantId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to JS Date for date-fns
        createdAt: doc.data().createdAt?.toDate() 
      })) as Order[];
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders: ", error);
      setLoading(false);
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


  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
           <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    )
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
                            ${order.total.toFixed(2)}
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
                            ${order.total.toFixed(2)}
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
