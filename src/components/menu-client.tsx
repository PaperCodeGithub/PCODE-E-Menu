
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from "next/image";
import Link from 'next/link';
import { Plus, Minus, ShoppingBag, Trash2, Loader2, Utensils, History, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import type { Category, MenuItem, OrderItem, RestaurantProfile, Order, OrderStyle } from '@/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Logo } from "@/components/icons";
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getNextOrderNumber } from '@/lib/order-number';

const sampleProfile: RestaurantProfile = {
  name: 'The Demo Cafe',
  location: '123 Sample Street, Webville',
  logo: 'https://placehold.co/128x128.png',
  country: 'United States',
  currency: { code: 'USD', symbol: '$' },
  orderStyle: 'table',
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

export function MenuClient({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [menuData, setMenuData] = useState<{categories: Category[], menuItems: MenuItem[]} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [isPlacingOrder, setPlacingOrder] = useState(false);
  const [isIdentifierDialog, setIdentifierDialog] = useState(false);
  const [customerIdentifier, setCustomerIdentifier] = useState("");
  const [customerOrders, setCustomerOrders] = useState<string[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const currencySymbol = useMemo(() => restaurantProfile?.currency?.symbol || '$', [restaurantProfile]);
  const orderStyle = useMemo(() => restaurantProfile?.orderStyle || 'table', [restaurantProfile]);

  const isDemo = restaurantId === 'sample';

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

    if (!restaurantId) {
        setError("No restaurant ID provided.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const profileDocRef = doc(db, 'profiles', restaurantId);
    const menuDocRef = doc(db, 'menus', restaurantId);

    const unsubProfile = onSnapshot(profileDocRef, (doc) => {
        if (!doc.exists()) {
            setError("This restaurant's profile could not be found.");
        } else {
            setRestaurantProfile(doc.data() as RestaurantProfile);
        }
    }, (err) => {
        console.error("Error fetching profile:", err);
        setError("Could not load restaurant profile.");
    });
    
    const unsubMenu = onSnapshot(menuDocRef, (doc) => {
        if (!doc.exists()) {
            setError("This restaurant has not set up their menu yet.");
        } else {
            setMenuData(doc.data() as {categories: Category[], menuItems: MenuItem[]});
        }
        setIsLoading(false);
    }, (err) => {
        console.error("Error fetching menu:", err);
        setError("Could not load the menu.");
        setIsLoading(false);
    });

    return () => {
        unsubProfile();
        unsubMenu();
    };

  }, [restaurantId, isDemo]);

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
        setIdentifierDialog(false);
        return;
    }

    if (!customerIdentifier) {
        toast({ title: orderStyle === 'table' ? "Table number is required." : "Name is required.", variant: "destructive" });
        return;
    }
    setPlacingOrder(true);
    try {
        const orderId = uuidv4();
        const orderNumber = await getNextOrderNumber(restaurantId);
        
        // Clean up items for Firestore
        const itemsToSave = order.map(item => {
            const { description, image, ...rest } = item;
            return rest;
        });
        
        const newOrder: Omit<Order, 'createdAt' | 'id'> = {
            restaurantId: restaurantId,
            items: itemsToSave,
            total: orderTotal,
            customerIdentifier: customerIdentifier,
            status: "Received",
            orderNumber: orderNumber
        };

        const finalOrder = { ...newOrder, createdAt: serverTimestamp() };
        
        await setDoc(doc(db, "orders", orderId), finalOrder);
        
        // Save order ID to local storage to track
        const updatedCustomerOrders = [...customerOrders, orderId];
        localStorage.setItem('customerOrders', JSON.stringify(updatedCustomerOrders));
        setCustomerOrders(updatedCustomerOrders);

        setIdentifierDialog(false);
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
  
  const filteredMenuItems = useMemo(() => {
    const menuItems = menuData?.menuItems || [];
    return menuItems.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const categoryMatch = categoryFilter === 'all' || item.categoryId === categoryFilter;
        return nameMatch && categoryMatch;
    });
  }, [menuData, searchQuery, categoryFilter]);
  
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

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 sticky top-4 z-10 bg-background/80 backdrop-blur-sm p-4 rounded-lg border shadow-sm">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="search"
                    placeholder="Search for a dish..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="sm:w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

        <main className="space-y-12">
          {categories.map((category) => {
            const itemsInCategory = filteredMenuItems.filter((item) => item.categoryId === category.id);
            if (itemsInCategory.length === 0) return null;

            return (
              <section key={category.id} id={`category-${category.id}`} aria-labelledby={`category-title-${category.id}`} className="scroll-mt-40">
                <h2 id={`category-title-${category.id}`} className="text-3xl font-bold font-headline border-b-2 border-primary pb-2 mb-6">
                  {category.name}
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {itemsInCategory.map((item) => (
                    <Card key={item.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg animate-in fade-in-0 duration-300">
                      {item.image && (
                         <div className="overflow-hidden h-48 w-full relative">
                           <Image
                             data-ai-hint="food meal"
                             src={item.image}
                             alt={item.name}
                             fill
                             sizes="(max-width: 768px) 100vw, 50vw"
                             className="object-cover"
                           />
                         </div>
                      )}
                      <CardHeader>
                        <CardTitle className="font-headline">{item.name}</CardTitle>
                        <CardDescription className="text-base text-muted-foreground pt-1">{currencySymbol}{item.price.toFixed(2)}</CardDescription>
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
           {filteredMenuItems.length === 0 && (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">
                        {menuData?.menuItems.length === 0 
                            ? "This restaurant hasn't set up their menu yet. Please check back later."
                            : "No dishes match your search. Try different keywords or filters."
                        }
                    </p>
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
                            <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                                <Image src={item.image || `https://placehold.co/64x64.png`} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint="food meal"/>
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{currencySymbol}{item.price.toFixed(2)}</p>
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
                        <span>{currencySymbol}{orderTotal.toFixed(2)}</span>
                    </div>
                    <SheetClose asChild>
                       <Button className="w-full" size="lg" onClick={() => setIdentifierDialog(true)}>
                            Place Order
                        </Button>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>
        </Sheet>
      )}

      <Dialog open={isIdentifierDialog} onOpenChange={setIdentifierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Your {orderStyle === 'table' ? 'Table Number' : 'Name'}</DialogTitle>
            <DialogDescription>
              Please enter your {orderStyle === 'table' ? 'table number' : 'name'} so we know where to bring your order.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-identifier" className="text-right">
                {orderStyle === 'table' ? 'Table No.' : 'Name'}
              </Label>
              <Input
                id="customer-identifier"
                value={customerIdentifier}
                onChange={(e) => setCustomerIdentifier(e.target.value)}
                className="col-span-3"
                placeholder={orderStyle === 'table' ? "e.g. 14" : "e.g. John Doe"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIdentifierDialog(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={isPlacingOrder || !customerIdentifier}>
              {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Utensils className="mr-2 h-4 w-4" />}
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
