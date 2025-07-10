import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/icons";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center justify-center w-full max-w-md text-center">
        <Logo className="w-24 h-24 text-primary" />
        <h1 className="text-5xl font-bold mt-4 font-headline">E-Menu</h1>
        <p className="text-muted-foreground mt-2">
          The simplest way to create a digital menu for your restaurant, cafe, bar, or stall.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button asChild className="w-full sm:w-auto" size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
        Built with modern technology. Instantly accessible.
      </footer>
    </main>
  );
}
