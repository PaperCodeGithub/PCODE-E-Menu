"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const profileSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters.'),
  location: z.string().min(3, 'Location must be at least 3 characters.'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const getProfileDocument = useCallback((uid: string) => doc(db, 'profiles', uid), []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', location: '' },
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
    const loadProfile = async () => {
        setPageLoading(true);
        try {
            const profileDoc = await getDoc(getProfileDocument(user.uid));
            if (profileDoc.exists()) {
                const { name, location, logo } = profileDoc.data();
                setValue('name', name);
                setValue('location', location);
                if (logo) {
                    setImagePreview(logo);
                }
            }
        } catch (error) {
            console.error("Failed to load profile from Firestore:", error);
            toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" });
        } finally {
            setPageLoading(false);
        }
    };
    loadProfile();
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
        const profileData = {
            ...data,
            logo: imagePreview,
        };
        await setDoc(getProfileDocument(user.uid), profileData);
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
  
  if (pageLoading) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                  <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><div className="flex items-center gap-4"><Skeleton className="w-24 h-24 rounded-full" /><Skeleton className="h-10 flex-grow" /></div></div>
                  <Skeleton className="h-10 w-28" />
              </CardContent>
          </Card>
      )
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
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
