"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

import {
  LogOut,
  MenuSquare,
  User as UserIcon,
  ShoppingBag,
  Bell,
  BarChart3
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import type { RestaurantProfile } from '@/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
          if (profileDoc.exists()) {
            setProfile(profileDoc.data() as RestaurantProfile);
            setLoading(false);
          } else {
             // If no profile exists, redirect to create one
            if (window.location.pathname !== '/dashboard/profile') {
              router.push('/dashboard/profile');
            }
            setLoading(false);
          }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);
  
  // Listen for pending orders
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeOrders = snapshot.docs.filter(doc => {
        const status = doc.data().status;
        return status !== 'Served' && status !== 'Canceled';
      });
      setPendingOrderCount(activeOrders.length);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col gap-4 border-r p-2 bg-muted/40 w-64">
          <div className="p-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="flex flex-col gap-2 px-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1">
          <header className="flex h-14 items-center gap-4 border-b px-4 sm:px-6">
            <div className="ml-auto flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>
          <main className="p-4 sm:p-6">
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Logo className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-headline font-semibold">{profile?.name || 'E-Menu'}</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
             <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={!profile} className="group-data-[collapsible=icon]:justify-center">
                <Link href="/dashboard/orders" aria-disabled={!profile} tabIndex={!profile ? -1 : undefined}>
                  <ShoppingBag />
                  <span>Orders</span>
                   {pendingOrderCount > 0 && <SidebarMenuBadge>{pendingOrderCount}</SidebarMenuBadge>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={!profile} className="group-data-[collapsible=icon]:justify-center">
                <Link href="/dashboard" aria-disabled={!profile} tabIndex={!profile ? -1 : undefined}>
                  <MenuSquare />
                  <span>Menu</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild disabled={!profile} className="group-data-[collapsible=icon]:justify-center">
                <Link href="/dashboard/statistics" aria-disabled={!profile} tabIndex={!profile ? -1 : undefined}>
                  <BarChart3 />
                  <span>Statistics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="group-data-[collapsible=icon]:justify-center">
                <Link href="/dashboard/profile">
                  <UserIcon />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="ml-auto flex items-center gap-4">
             {pendingOrderCount > 0 && (
                <div className="relative">
                  <Bell className="h-5 w-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.photoURL || profile?.logo || ''}
                      alt={user?.displayName || 'User'}
                    />
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto w-full">
                 {children}
            </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
