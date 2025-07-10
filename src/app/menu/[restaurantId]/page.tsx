"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { Plus, Minus, ShoppingBag, Trash2, Loader2, Utensils, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import type { Category, MenuItem, OrderItem, RestaurantProfile, Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Logo } from "@/components/icons";
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const sampleProfile: RestaurantProfile = {
  name: 'The Demo Cafe',
  location: '123 Sample Street, Webville',
  logo: 'https://placehold.co/128x128.png',
};

const sampleCategories: Category[] = [
  { id: 'cat1', name: 'Appetizers' },
  { id: 'cat2', name: 'Main Courses' },
  { id: 'cat3', name: 'Desserts' },
  { id: 'cat4', name: 'Beverages' },
];

const sampleMenuItems: MenuItem[] = [
  { id: 'item1', categoryId: 'cat1', name: 'Bruschetta', description: 'Grilled bread with tomatoes, garlic, basil, and olive oil.', price: 8.99, image: 'https://placehold.co/600x400.png' },
  { id: 'item2', categoryId: 'cat1', name: 'Spinach Dip', description: 'Creamy spinach and artichoke dip served with tortilla chips.', price: 10.50, image: 'https://placehold.co/600x400.png' },
  { id: 'item3', categoryId: 'cat2', name: 'Margherita Pizza', description: 'Classic pizza with fresh mozzarella, tomatoes, and basil.', price: 14.00, image: 'https://placehold.co/600x400.png' },
  { id: 'item4', categoryId: 'cat2', name: 'Classic Burger', description: 'Juicy beef patty with lettuce, tomato, and our special sauce.', price: 12.99, image: 'https://placehold.co/600x400.png' },
  { id: 'item5', categoryId: 'cat3', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey molten center.', price: 7.50, image: 'https://placehold.co/600x400.png' },
  { id: 'item6', categoryId: 'cat4', name: 'Iced Coffee', description: 'Chilled coffee served over ice, with milk and sugar options.', price: 4.50, image: 'https://placehold.co/600x400.png' },
];

export default function MenuPage({ params }: { params: { restaurantId: string } }) {
  const { toast } = useToast();
  const router = useRouter();
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [menuData, setMenuData] = useState<{categories: Category[], menuItems: MenuItem[]} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isPlacingOrder, setPlacingOrder] = useState(false);
  const [isTableDialog, setTableDialog] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [customerOrders, setCustomerOrders] = useState<string[]>([]);
  
  const isDemo = params.restaurantId === 'sample';

  useEffect(() => {
    if (isDemo) return;
    if (typeof window !== 'undefined') {
      const storedOrders = JSON.parse(localStorage.getItem('customerOrders') || '[]');
      setCustomerOrders(storedOrders);
    }
  }, [isDemo]);
  
  useEffect(() => {
    if (isDemo) {
        setRestaurantProfile(sampleProfile);
        setMenuData({ categories: sampleCategories, menuItems: sampleMenuItems });
        setIsLoading(false);
        return;
    }

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
  }, [params.restaurantId, isDemo]);

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
      if (quantity <= 0) {
        return prevOrder.filter((item) => item.id !== itemId);
      }
      return prevOrder.map((item) => (item.id === itemId ? { ...item, quantity } : item));
    });
  };

  const handlePlaceOrder = async () => {
    if (isDemo) {
        toast({ title: "This is a demo!", description: "Ordering is disabled in the demo view." });
        setTableDialog(false);
        return;
    }

    if (!tableNumber) {
        toast({ title: "Table number is required.", variant: "destructive" });
        return;
    }
    setPlacingOrder(true);
    try {
        const orderId = uuidv4();
        const newOrder: Order = {
            id: orderId,
            restaurantId: params.restaurantId,
            items: order,
            total: orderTotal,
            tableNumber: tableNumber,
            status: "Received",
            createdAt: serverTimestamp() as any, // Firestore will convert this
        };
        
        await setDoc(doc(db, "orders", orderId), newOrder);
        
        // Save order ID to local storage to track
        const updatedCustomerOrders = [...customerOrders, orderId];
        localStorage.setItem('customerOrders', JSON.stringify(updatedCustomerOrders));
        setCustomerOrders(updatedCustomerOrders);

        setTableDialog(false);
        setOrder([]);
        router.push(`/order-status/${orderId}`);

    } catch (error) {
        console.error("Failed to place order:", error);
        toast({ title: "Order Failed", description: "Could not place your order. Please try again.", variant: "destructive" });
    } finally {
        setPlacingOrder(false);
    }
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
            <main className="space-y-12">
                {[1, 2].map(i => (
                    <section key={i}>
                        <Skeleton className="w-1/3 h-9 mb-6" />
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card><Skeleton className="h-48 w-full"/><CardHeader><Skeleton className="h-6 w-3/4 mb-2"/><Skeleton className="h-5 w-1/4"/></CardHeader><CardContent><Skeleton className="h-12 w-full"/></CardContent><div className="p-6 pt-0"><Skeleton className="h-10 w-full"/></div></Card>
                            <Card><Skeleton className="h-48 w-full"/><CardHeader><Skeleton className="h-6 w-3/4 mb-2"/><Skeleton className="h-5 w-1/4"/></CardHeader><CardContent><Skeleton className="h-12 w-full"/></CardContent><div className="p-6 pt-0"><Skeleton className="h-10 w-full"/></div></Card>
                        </div>
                    </section>
                ))}
            </main>
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
             <Image src={restaurantProfile.logo} alt={`${restaurantProfile.name} logo`} width={64} height={64} className="w-16 h-16 mx-auto rounded-full object-cover" />
          ) : (
            <Logo className="w-16 h-16 mx-auto text-primary" />
          )}
          <h1 className="text-4xl font-bold mt-2 font-headline">{restaurantProfile?.name || 'Restaurant Menu'}</h1>
          <p className="text-muted-foreground mt-1">{restaurantProfile?.location || 'Welcome! Scan, browse, and order.'}</p>
        </header>

        {customerOrders.length > 0 && (
           <Alert className="mb-8">
            <History className="h-4 w-4" />
              <AlertTitle>Welcome Back!</AlertTitle>
              <AlertDescription>
                You have previous orders here. <Link href={`/order-status/${customerOrders[customerOrders.length - 1]}`} className="font-bold underline">Check your latest order status.</Link>
              </AlertDescription>
            </Alert>
        )}

        <main className="space-y-12">
          {categories.map((category) => {
            const itemsInCategory = menuItems.filter((item) => item.categoryId === category.id);
            if (itemsInCategory.length === 0) return null;

            return (
              <section key={category.id} id={`category-${category.id}`} aria-labelledby={`category-title-${category.id}`} className="scroll-mt-20">
                <h2 id={`category-title-${category.id}`} className="text-3xl font-bold font-headline border-b-2 border-primary pb-2 mb-6">
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
        </main>
      </div>

      {order.length > 0 && (
        <Sheet>
            <SheetTrigger asChild>
                <div className="fixed bottom-6 right-6 z-50">
                    <Button className="rounded-full h-16 w-16 shadow-2xl animate-in zoom-in-50 duration-300" size="icon" aria-label={`View Order, ${totalItems} items`}>
                        <ShoppingBag className="h-7 w-7" />
                        <Badge className="absolute -top-1 -right-1" variant="destructive" aria-hidden="true">{totalItems}</Badge>
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
                            <Image src={item.image!} alt="" width={64} height={64} className="rounded-md w-16 h-16 object-cover" data-ai-hint="food meal"/>
                            <div className="flex-grow">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} aria-label={`Decrease quantity of ${item.name}`}><Minus className="h-4 w-4"/></Button>
                                <span className="w-6 text-center font-bold" aria-label={`Current quantity ${item.quantity}`}>{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} aria-label={`Increase quantity of ${item.name}`}><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleUpdateQuantity(item.id, 0)} aria-label={`Remove ${item.name} from order`}>
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
                       <Button className="w-full" size="lg" onClick={() => setTableDialog(true)}>
                            Place Order
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
      )}

      <Dialog open={isTableDialog} onOpenChange={setTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your Table Number</DialogTitle>
            <DialogDescription>
              Please enter your table number so we know where to bring your order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="table-number" className="text-right">
                Table No.
              </Label>
              <Input
                id="table-number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="col-span-3"
                placeholder="e.g. 14"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={isPlacingOrder || !tableNumber}>
              {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Utensils className="mr-2 h-4 w-4" />}
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
