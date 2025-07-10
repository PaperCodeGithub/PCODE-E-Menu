"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from "next/image";
import { Plus, Minus, ShoppingBag, Trash2, CheckCircle } from 'lucide-react';
import type { Category, MenuItem, OrderItem, RestaurantProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Logo } from "@/components/icons";
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MenuPage({ params }: { params: { restaurantId: string } }) {
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [menuData, setMenuData] = useState<{categories: Category[], menuItems: MenuItem[]} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isOrderPlaced, setOrderPlaced] = useState(false);
  
  useEffect(() => {
    if (!params.restaurantId) {
        setError("No restaurant ID provided.");
        setIsLoading(false);
        return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const profileDocRef = doc(db, 'profiles', params.restaurantId);
            const menuDocRef = doc(db, 'menus', params.restaurantId);

            const [profileDoc, menuDoc] = await Promise.all([
                getDoc(profileDocRef),
                getDoc(menuDocRef)
            ]);

            if (!profileDoc.exists() && !menuDoc.exists()) {
                setError("This restaurant has not been set up yet.");
            } else {
                setRestaurantProfile(profileDoc.data() as RestaurantProfile || null);
                setMenuData(menuDoc.data() as {categories: Category[], menuItems: MenuItem[]} || { categories: [], menuItems: []});
            }

        } catch (err) {
            console.error("Could not load menu data from Firestore:", err);
            setError("Could not load menu. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchData();
  }, [params.restaurantId]);

  const handleAddToOrder = (item: MenuItem) => {
    setOrder((prevOrder) => {
      const existingItem = prevOrder.find((orderItem) => orderItem.id === item.id);
      if (existingItem) {
        return prevOrder.map((orderItem) =>
          orderItem.id === item.id ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem
        );
      }
      return [...prevOrder, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setOrder((prevOrder) => {
      if (quantity === 0) {
        return prevOrder.filter((item) => item.id !== itemId);
      }
      return prevOrder.map((item) => (item.id === itemId ? { ...item, quantity } : item));
    });
  };

  const handlePlaceOrder = () => {
    // In a real app, this would submit the order to a backend.
    setOrderPlaced(true);
  };
  
  const closeConfirmationDialog = () => {
    setOrderPlaced(false);
    setOrder([]);
  };

  const orderTotal = useMemo(() => {
    return order.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [order]);
  
  const totalItems = useMemo(() => {
    return order.reduce((total, item) => total + item.quantity, 0);
  }, [order]);
  
  const categories = menuData?.categories || [];
  const menuItems = menuData?.menuItems || [];

  if (isLoading) {
    return (
        <div className="container mx-auto max-w-4xl py-8 px-4">
            <header className="text-center mb-10">
                <Skeleton className="w-16 h-16 mx-auto rounded-full" />
                <Skeleton className="w-64 h-10 mx-auto mt-2" />
                <Skeleton className="w-48 h-5 mx-auto mt-1" />
            </header>
            <div className="space-y-12">
                {[1, 2].map(i => (
                    <section key={i}>
                        <Skeleton className="w-1/3 h-9 mb-6" />
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card><Skeleton className="h-48 w-full"/><CardHeader><Skeleton className="h-6 w-3/4 mb-2"/><Skeleton className="h-5 w-1/4"/></CardHeader><CardContent><Skeleton className="h-12 w-full"/></CardContent><div className="p-6 pt-0"><Skeleton className="h-10 w-full"/></div></Card>
                            <Card><Skeleton className="h-48 w-full"/><CardHeader><Skeleton className="h-6 w-3/4 mb-2"/><Skeleton className="h-5 w-1/4"/></CardHeader><CardContent><Skeleton className="h-12 w-full"/></CardContent><div className="p-6 pt-0"><Skeleton className="h-10 w-full"/></div></Card>
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
  }

  if (error) {
    return (
         <div className="container mx-auto max-w-4xl py-8 px-4 text-center">
             <Logo className="w-16 h-16 mx-auto text-destructive" />
             <h1 className="text-4xl font-bold mt-4 font-headline">Something went wrong</h1>
             <p className="text-muted-foreground mt-2">{error}</p>
             <Button asChild className="mt-6">
                <a href="/">Go Home</a>
             </Button>
         </div>
    )
  }

  return (
    <>
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <header className="text-center mb-10">
          {restaurantProfile?.logo ? (
             <Image src={restaurantProfile.logo} alt={restaurantProfile.name} width={64} height={64} className="w-16 h-16 mx-auto rounded-full object-cover" />
          ) : (
            <Logo className="w-16 h-16 mx-auto text-primary" />
          )}
          <h1 className="text-4xl font-bold mt-2 font-headline">{restaurantProfile?.name || 'Restaurant Menu'}</h1>
          <p className="text-muted-foreground mt-1">{restaurantProfile?.location || 'Welcome! Scan, browse, and order.'}</p>
        </header>

        <div className="space-y-12">
          {categories.map((category) => {
            const itemsInCategory = menuItems.filter((item) => item.categoryId === category.id);
            if (itemsInCategory.length === 0) return null;

            return (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-20">
                <h2 className="text-3xl font-bold font-headline border-b-2 border-primary pb-2 mb-6">
                  {category.name}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {itemsInCategory.map((item) => (
                    <Card key={item.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg animate-in fade-in-0 duration-300">
                      {item.image && (
                         <div className="overflow-hidden">
                           <Image
                             data-ai-hint="food meal"
                             src={item.image}
                             alt={item.name}
                             width={600}
                             height={400}
                             className="w-full h-48 object-cover"
                           />
                         </div>
                      )}
                      <CardHeader>
                        <CardTitle className="font-headline">{item.name}</CardTitle>
                        <CardDescription className="text-base text-muted-foreground pt-1">${item.price.toFixed(2)}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p>{item.description}</p>
                      </CardContent>
                      <div className="p-6 pt-0">
                        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleAddToOrder(item)}>
                          <Plus className="mr-2 h-4 w-4"/> Add to Order
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
           {(categories.length === 0 || menuItems.length === 0) && (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">This restaurant hasn't set up their menu yet. Please check back later.</p>
                </div>
            )}
        </div>
      </div>

      {order.length > 0 && (
        <Sheet>
            <SheetTrigger asChild>
                <div className="fixed bottom-6 right-6 z-50">
                    <Button className="rounded-full h-16 w-16 shadow-2xl animate-in zoom-in-50 duration-300" size="icon">
                        <ShoppingBag className="h-7 w-7" />
                        <Badge className="absolute -top-1 -right-1" variant="destructive">{totalItems}</Badge>
                        <span className="sr-only">View Order</span>
                    </Button>
                </div>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle className="font-headline text-2xl">Your Order</SheetTitle>
                </SheetHeader>
                {order.length > 0 ? (
                <div className="flex-grow overflow-y-auto -mx-6 px-6 divide-y">
                    {order.map(item => (
                        <div key={item.id} className="flex items-center gap-4 py-4">
                            <Image src={item.image!} alt={item.name} width={64} height={64} className="rounded-md w-16 h-16 object-cover" data-ai-hint="food meal"/>
                            <div className="flex-grow">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4"/></Button>
                                <span className="w-6 text-center font-bold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleUpdateQuantity(item.id, 0)}>
                               <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-muted-foreground">Your order is empty.</p>
                    </div>
                )}
                <SheetFooter className="mt-auto border-t -mx-6 px-6 pt-4 space-y-4">
                    <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total:</span>
                        <span>${orderTotal.toFixed(2)}</span>
                    </div>
                    <SheetClose asChild>
                      <Button className="w-full" size="lg" onClick={handlePlaceOrder}>
                        Place Order
                      </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={isOrderPlaced} onOpenChange={closeConfirmationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">Order Placed!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Your order has been sent to the kitchen. Please wait for your table number to be called.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeConfirmationDialog} className="w-full">
              Awesome!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
