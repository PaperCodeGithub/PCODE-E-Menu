
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries } from '@/lib/currencies';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters.'),
  location: z.string().min(3, 'Location must be at least 3 characters.'),
  country: z.string().min(1, 'You must select a country.'),
  orderStyle: z.enum(['table', 'name'], {
    required_error: "You need to select an order style.",
  }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const getProfileDocument = useCallback((uid: string) => doc(db, 'profiles', uid), []);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', location: '', country: 'United States', orderStyle: 'table' },
  });
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setPageLoading(true);
    const unsub = onSnapshot(getProfileDocument(user.uid), (profileDoc) => {
        if (profileDoc.exists()) {
            const { name, location, logo, country, orderStyle } = profileDoc.data();
            setValue('name', name);
            setValue('location', location);
            setValue('country', country);
            setValue('orderStyle', orderStyle || 'table');
            if (logo) {
                setImagePreview(logo);
            }
        }
        setPageLoading(false);
    }, (error) => {
        console.error("Failed to load profile from Firestore:", error);
        toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" });
        setPageLoading(false);
    });
    
    return () => unsub();
  }, [user, setValue, getProfileDocument, toast]);


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setLoading(true);
    
    try {
        const selectedCountry = countries.find(c => c.name === data.country);
        const currency = selectedCountry ? { code: selectedCountry.currency.code, symbol: selectedCountry.currency.symbol } : { code: 'USD', symbol: '$' };

        const profileData = {
            ...data,
            logo: imagePreview,
            currency: currency,
        };
        await setDoc(getProfileDocument(user.uid), profileData, { merge: true });
        toast({
            title: 'Profile Saved!',
            description: 'Your restaurant profile has been updated.',
        });
    } catch (error) {
         toast({
            title: 'Error Saving Profile',
            description: 'Could not save your profile. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (pageLoading) {
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
  }, [pageLoading]);
  
  if (pageLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-40">
            <p className="mb-2">Loading Profile...</p>
            <Progress value={progress} className="w-1/3" />
        </div>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Restaurant Profile</CardTitle>
        <CardDescription>
          This information will be shown to your customers on the menu page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Restaurant Name</Label>
            <Input
              id="restaurantName"
              {...register('name')}
              placeholder="e.g., The Rustic Spoon"
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="restaurantLocation">Location / Address</Label>
            <Input
              id="restaurantLocation"
              {...register('location')}
              placeholder="e.g., 123 Main St, Anytown"
              disabled={loading}
            />
            {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
             <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="restaurantLogo">Restaurant Logo</Label>
            <div className="flex items-center gap-4">
               <div className="w-24 h-24 rounded-full border bg-muted flex-shrink-0 overflow-hidden">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Logo Preview" width={96} height={96} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">
                      Upload Logo
                    </div>
                  )}
                </div>
              <Input id="restaurantLogo" type="file" accept="image/*" onChange={handleImageChange} disabled={loading}/>
            </div>
          </div>
          
          <Separator />

          <div className="space-y-4">
            <Label className="text-base">Order Style</Label>
            <CardDescription>Choose how you want to identify customer orders.</CardDescription>
             <Controller
                control={control}
                name="orderStyle"
                render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        disabled={loading}
                    >
                        <Label htmlFor="style-table" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="table" id="style-table" className="sr-only" />
                             <span className="text-lg font-semibold mb-2">Table Number</span>
                             <p className="text-sm text-center text-muted-foreground">Best for restaurants. Customers enter a table number you provide.</p>
                        </Label>
                        <Label htmlFor="style-name" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                            <RadioGroupItem value="name" id="style-name" className="sr-only" />
                            <span className="text-lg font-semibold mb-2">Customer Name</span>
                             <p className="text-sm text-center text-muted-foreground">Best for stalls, cafes, or bars. Customers enter their name.</p>
                        </Label>
                    </RadioGroup>
                )}
             />
             {errors.orderStyle && <p className="text-sm text-destructive">{errors.orderStyle.message}</p>}
          </div>
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
