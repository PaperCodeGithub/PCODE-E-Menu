
"use client";

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import type { RestaurantProfile } from '@/types';
import { Progress } from '@/components/ui/progress';

interface DashboardContextType {
  user: User | null;
  profile: RestaurantProfile | null;
  loading: boolean;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/login');
      }
    });
  
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;
  
    setLoading(true);
    const profileRef = doc(db, 'profiles', user.uid);
  
    const unsubscribeProfile = onSnapshot(profileRef, (profileDoc) => {
      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as RestaurantProfile);
      } else {
        if (pathname !== '/dashboard/profile') {
          router.push('/dashboard/profile');
        }
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch profile:", error);
      setLoading(false);
    });
  
    return () => unsubscribeProfile();
  }, [user, router, pathname]);
  
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
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed', error);
      setIsLoggingOut(false);
    }
  };

  if (loading && pathname !== '/dashboard/profile') {
    return (
        <div className="flex items-center justify-center h-screen">
            <p>Loading Dashboard...</p>
        </div>
    );
  }
  
  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <p className="text-lg font-semibold mb-4">Logging you out...</p>
        <Progress value={50} className="w-1/4" />
      </div>
    );
  }


  const navItems = [
    { href: "/dashboard/orders", icon: <ShoppingBag />, label: "Orders", badge: pendingOrderCount > 0 ? pendingOrderCount : null, disabled: !profile },
    { href: "/dashboard", icon: <MenuSquare />, label: "Menu", disabled: !profile },
    { href: "/dashboard/statistics", icon: <BarChart3 />, label: "Statistics", disabled: !profile },
    { href: "/dashboard/profile", icon: <UserIcon />, label: "Profile", disabled: false },
  ];

  return (
    <DashboardContext.Provider value={{ user, profile, loading }}>
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
                {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                        asChild 
                        isActive={item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href)}
                        disabled={item.disabled} 
                        className="group-data-[collapsible=icon]:justify-center">
                    <Link href={item.href} aria-disabled={item.disabled} tabIndex={item.disabled ? -1 : undefined}>
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
            </SidebarMenu>
            </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="ml-auto flex items-center gap-4">
                {pendingOrderCount > 0 && (
                    <Button asChild variant="ghost" size="icon" className="relative h-8 w-8">
                      <Link href="/dashboard/orders" aria-label="View Orders">
                        <Bell className="h-5 w-5 animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                      </Link>
                    </Button>
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
    </DashboardContext.Provider>
  );
}
