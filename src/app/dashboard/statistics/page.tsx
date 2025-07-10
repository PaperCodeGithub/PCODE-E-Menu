
// src/app/dashboard/statistics/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, ShoppingBag, BarChart3, User } from 'lucide-react';
import { 
    startOfToday, 
    startOfMonth, 
    startOfYear, 
    isWithinInterval, 
    format
} from 'date-fns';
import { Progress } from "@/components/ui/progress";
import { useDashboard } from "../layout";

type Timeframe = 'day' | 'month' | 'year';

export default function StatisticsPage() {
  const { user, profile, loading: dashboardLoading } = useDashboard();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('day');
  const [progress, setProgress] = useState(0);

  const currencySymbol = useMemo(() => profile?.currency?.symbol || '$', [profile]);
  const orderStyle = useMemo(() => profile?.orderStyle || 'table', [profile]);

  useEffect(() => {
    if (!user) return;

    setOrdersLoading(true);

    const ordersQuery = query(
        collection(db, 'orders'),
        where('restaurantId', '==', user.uid),
        where('status', '==', 'Served')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
        })) as Order[];
        
        fetchedOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAllOrders(fetchedOrders);
        setOrdersLoading(false);
    }, (error) => {
        console.error("Error fetching orders: ", error);
        setOrdersLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let interval;

    if (timeframe === 'day') {
      interval = { start: startOfToday(), end: now };
    } else if (timeframe === 'month') {
      interval = { start: startOfMonth(now), end: now };
    } else { // year
      interval = { start: startOfYear(now), end: now };
    }

    return allOrders.filter(order => isWithinInterval(order.createdAt, interval));
  }, [allOrders, timeframe]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue
    };
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    if (timeframe === 'day') {
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        Revenue: 0,
      }));
      filteredOrders.forEach(order => {
        const hour = order.createdAt.getHours();
        hourlyData[hour].Revenue += order.total;
      });
      return hourlyData;
    }
    if (timeframe === 'month') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: `${i + 1}`,
        Revenue: 0,
      }));
       filteredOrders.forEach(order => {
        const day = order.createdAt.getDate();
        dailyData[day-1].Revenue += order.total;
      });
      return dailyData;
    }
     if (timeframe === 'year') {
        const monthlyData = Array.from({length: 12}, (_, i) => ({
            name: format(new Date(0, i), 'MMM'),
            Revenue: 0
        }));
        filteredOrders.forEach(order => {
            const month = order.createdAt.getMonth();
            monthlyData[month].Revenue += order.total;
        });
        return monthlyData;
    }
    return [];
  }, [filteredOrders, timeframe]);
  
  const recentServedOrders = useMemo(() => {
    return allOrders.slice(0, 5);
  }, [allOrders]);
  
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
            <p className="mb-2">Loading Statistics...</p>
            <Progress value={progress} className="w-1/3" />
        </div>
      );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-headline font-semibold">Statistics</h1>
        <p className="text-muted-foreground">
          Track your restaurant's performance over time.
        </p>
      </div>

      <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
        <TabsList>
          <TabsTrigger value="day">Today</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="year">This Year</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Completed orders for the period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
             <p className="text-xs text-muted-foreground">Number of served orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{stats.averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average revenue per order</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>
            {timeframe === 'day' && 'Revenue per hour for today.'}
            {timeframe === 'month' && 'Revenue per day for this month.'}
            {timeframe === 'year' && 'Revenue per month for this year.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
           <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                 formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Revenue']}
              />
              <Legend />
              <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Recent Served Orders</CardTitle>
              <CardDescription>A list of your 5 most recently completed orders.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>
                            {orderStyle === 'table' ? 'Table No.' : 'Customer'}
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {recentServedOrders.length > 0 ? recentServedOrders.map(order => (
                          <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                  {orderStyle === 'table' ? `#${order.customerIdentifier}` : order.customerIdentifier}
                              </TableCell>
                              <TableCell>{format(order.createdAt, 'PPp')}</TableCell>
                              <TableCell className="text-right">{currencySymbol}{order.total.toFixed(2)}</TableCell>
                          </TableRow>
                      )) : (
                          <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                  No completed orders found.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

    </div>
  );
}
