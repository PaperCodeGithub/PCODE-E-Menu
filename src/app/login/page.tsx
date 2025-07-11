
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  type UserCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg">
      <title>Google</title>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-4.27 0-7.75-3.5-7.75-7.75s3.48-7.75 7.75-7.75c2.43 0 3.86.95 4.73 1.82l2.73-2.73C18.74 1.94 15.96 0 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c7.28 0 12.1-5.14 12.1-12.36 0-.8-.08-1.48-.2-2.16H12.48z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Redirect if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setPageLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const setupNewUser = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    const menuDocRef = doc(db, 'menus', user.uid);
    const menuDoc = await getDoc(menuDocRef);

    // Only set up default menu if it doesn't exist
    if (!menuDoc.exists()) {
      const defaultCategories = [
        { id: uuidv4(), name: 'Starters' },
        { id: uuidv4(), name: 'Main Course' },
        { id: uuidv4(), name: 'Desserts' },
        { id: uuidv4(), name: 'Beverages' },
      ];
      await setDoc(menuDocRef, { categories: defaultCategories, menuItems: [] });
    }
  };


  const handleAuthAction = async (action: 'login' | 'signup') => {
    setLoading(true);
    try {
      let userCredential;
      if (action === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setupNewUser(userCredential);
      }
      toast({ title: "Success", description: "You're now logged in." });
      router.push('/dashboard/profile');
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      await setupNewUser(userCredential); // This will only run for new users.
      toast({ title: "Success", description: "You're now logged in with Google." });
      router.push('/dashboard/profile');
    } catch (error: any) {
      toast({
        title: 'Google Sign-In Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (pageLoading) {
    return <div className="flex min-h-screen items-center justify-center p-4">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center">
          <Link href="/" className="inline-block mx-auto">
            <Logo className="w-12 h-12 text-primary" />
          </Link>
          <CardTitle className="text-2xl font-headline">Welcome to E-Menu</CardTitle>
          <CardDescription>Login or create an account to manage your menu.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-login">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="owner@restaurant.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-login">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button onClick={() => handleAuthAction('login')} className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="signup">
               <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="owner@restaurant.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button onClick={() => handleAuthAction('signup')} className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-card px-2 text-sm text-muted-foreground">OR</span>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
            <GoogleIcon className="mr-2 h-5 w-5 fill-foreground" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
