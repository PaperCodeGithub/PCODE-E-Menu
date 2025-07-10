
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PlusCircle,
  QrCode,
  Trash2,
  Pencil,
  Shapes,
  MenuSquare,
  Search,
  Download,
  Eye,
  Loader2,
  Sparkles,
  ImagePlus,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category, MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { generateDescription } from "@/ai/flows/generate-description-flow";
import { generateImage } from "@/ai/flows/generate-image-flow";
import { useDashboard } from "./layout";


// Zod Schemas for Validation
const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
});

const menuItemSchema = z.object({
  name: z.string().min(2, "Item name must be at least 2 characters."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  price: z.coerce.number().min(0.01, "Price must be a positive number."),
  categoryId: z.string().min(1, "You must select a category."),
});

export default function DashboardPage() {
  const { toast } = useToast();
  const { user, profile, loading: dashboardLoading } = useDashboard();
  
  const [menuLoading, setMenuLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [progress, setProgress] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuItemsFilter, setMenuItemsFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: "category" | "menuItem";
  } | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isQrDialogOpen, setQrDialogOpen] = useState(false);
  const [menuUrl, setMenuUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const getMenuDocument = useCallback((uid: string) => doc(db, 'menus', uid), []);
  const currencySymbol = useMemo(() => profile?.currency?.symbol || '$', [profile]);

  useEffect(() => {
    if (user?.uid) {
        setMenuUrl(`${window.location.origin}/menu/${user.uid}`);
    }
  }, [user]);

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
        setMenuLoading(true);
        try {
            const menuDocRef = getMenuDocument(user.uid);
            const menuDoc = await getDoc(menuDocRef);

            if (menuDoc.exists()) {
                const data = menuDoc.data();
                setCategories(data.categories || []);
                setMenuItems(data.menuItems || []);
            } else {
                setCategories([]);
                setMenuItems([]);
            }
        } catch (error) {
            console.error("Failed to load data from Firestore:", error);
            toast({ title: "Could not load data", description: "There was an error fetching your menu from the database.", variant: "destructive" });
        } finally {
            setMenuLoading(false);
        }
    };
    
    loadData();
  }, [user, toast, getMenuDocument]);
  
  // Save data to Firestore
  const saveData = useCallback(async (currentCategories: Category[], currentMenuItems: MenuItem[]) => {
      if (!user) return;
      try {
        const menuDocRef = getMenuDocument(user.uid);
        await setDoc(menuDocRef, { 
          categories: currentCategories, 
          menuItems: currentMenuItems 
        }, { merge: true });
      } catch (error) {
        console.error("Failed to save to Firestore:", error);
        toast({ title: "Could not save data", description: "Your changes could not be saved to the database.", variant: "destructive" });
        throw error; // re-throw error to be caught by caller
      }
  }, [user, getMenuDocument, toast]);

  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const menuItemForm = useForm<z.infer<typeof menuItemSchema>>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      categoryId: "",
    },
  });

  const handleOpenCategoryDialog = (category: Category | null) => {
    setEditingCategory(category);
    categoryForm.reset(category ? { name: category.name } : { name: "" });
    setCategoryDialogOpen(true);
  };

  const handleOpenMenuItemDialog = (menuItem: MenuItem | null) => {
    setEditingMenuItem(menuItem);
    setImagePreview(menuItem?.image || null);
    menuItemForm.reset(
      menuItem
        ? {
            name: menuItem.name,
            description: menuItem.description,
            price: menuItem.price,
            categoryId: menuItem.categoryId,
          }
        : { name: "", description: "", price: 0, categoryId: "" }
    );
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setMenuItemDialogOpen(true);
  };

  const handleCategorySubmit = async (values: z.infer<typeof categorySchema>) => {
    setIsSaving(true);
    let updatedCategories;
    if (editingCategory) {
      updatedCategories = categories.map((c) =>
        c.id === editingCategory.id ? { ...c, ...values } : c
      );
    } else {
      const newCategory = { id: uuidv4(), ...values };
      updatedCategories = [...categories, newCategory];
    }
    
    try {
      await saveData(updatedCategories, menuItems);
      setCategories(updatedCategories);
      if (editingCategory) {
        toast({ title: "Category Updated", description: `"${values.name}" has been updated.` });
      } else {
        toast({ title: "Category Added", description: `"${values.name}" has been created.` });
      }
      setCategoryDialogOpen(false);
    } catch (e) {
      // Error toast is shown in saveData
    } finally {
      setIsSaving(false);
    }
  };

  const handleMenuItemSubmit = async (values: z.infer<typeof menuItemSchema>) => {
    setIsSaving(true);
    const image = imagePreview || "https://placehold.co/600x400.png";
    let updatedMenuItems;

    if (editingMenuItem) {
      updatedMenuItems = menuItems.map((item) =>
        item.id === editingMenuItem.id ? { ...item, ...values, image } : item
      );
    } else {
      const newItem: MenuItem = { id: uuidv4(), ...values, image };
      updatedMenuItems = [...menuItems, newItem];
    }

    try {
      await saveData(categories, updatedMenuItems);
      setMenuItems(updatedMenuItems);
      if (editingMenuItem) {
          toast({ title: "Menu Item Updated", description: `"${values.name}" has been updated.` });
      } else {
          toast({ title: "Menu Item Added", description: `"${values.name}" has been created.` });
      }
      setMenuItemDialogOpen(false);
      setImagePreview(null);
    } catch (e) {
        // Error toast is shown in saveData
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    let updatedCategories = [...categories];
    let updatedMenuItems = [...menuItems];
    let categoryName = "";
    let itemName = "";

    if (itemToDelete.type === "category") {
      categoryName = categories.find(c => c.id === itemToDelete.id)?.name || "";
      updatedMenuItems = menuItems.filter((item) => item.categoryId !== itemToDelete.id);
      updatedCategories = categories.filter((c) => c.id !== itemToDelete.id);
    } else if (itemToDelete.type === "menuItem") {
      itemName = menuItems.find(i => i.id === itemToDelete.id)?.name || "";
      updatedMenuItems = menuItems.filter((item) => item.id !== itemToDelete.id);
    }
    
    try {
      await saveData(updatedCategories, updatedMenuItems);
      setCategories(updatedCategories);
      setMenuItems(updatedMenuItems);

      if (itemToDelete.type === 'category') {
        toast({ title: "Category Deleted", description: `"${categoryName}" and its items were deleted.`, variant: "destructive" });
      } else {
        toast({ title: "Menu Item Deleted", description: `"${itemName}" was deleted.`, variant: "destructive" });
      }
    } catch (e) {
        // Error toast is shown in saveData
    } finally {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    }
  };
  
  const handleGenerateDescription = async () => {
    const itemName = menuItemForm.getValues("name");
    if (!itemName) {
      toast({
        title: "Please enter an item name first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const description = await generateDescription(itemName);
      menuItemForm.setValue("description", description, { shouldValidate: true });
    } catch (error) {
      console.error("Failed to generate description:", error);
      toast({
        title: "AI Generation Failed",
        description: "Could not generate a description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };
  
  const handleGenerateImage = async () => {
    const itemName = menuItemForm.getValues('name');
    if (!itemName) {
      toast({
        title: 'Please enter an item name first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateImage(itemName);
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast({
        title: 'AI Image Generation Failed',
        description: 'Could not generate an image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(menuItemsFilter.toLowerCase());
        const categoryMatch = categoryFilter === 'all' || item.categoryId === categoryFilter;
        return nameMatch && categoryMatch;
    });
  }, [menuItems, menuItemsFilter, categoryFilter]);
  
  const qrCodeUrl = useMemo(() => {
      if (!menuUrl) return "";
      return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(menuUrl)}`;
  }, [menuUrl]);

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
  
  const isLoading = dashboardLoading || menuLoading;

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
            <p className="mb-2">Loading Menu...</p>
            <Progress value={progress} className="w-1/3" />
        </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-semibold">Menu Dashboard</h1>
          <p className="text-muted-foreground">Manage your categories and menu items.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline">
                <Link href={menuUrl} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    View as customer
                </Link>
            </Button>
            <Button onClick={() => setQrDialogOpen(true)} variant="outline">
                <QrCode className="mr-2 h-4 w-4" />
                View QR Code
            </Button>
        </div>
      </div>
      
        {/* Category Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Shapes className="h-6 w-6" />
              <CardTitle className="text-xl font-headline">Manage Categories</CardTitle>
            </div>
            <Button onClick={() => handleOpenCategoryDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="group flex items-center justify-between rounded-lg border bg-card p-3">
                  <span className="font-medium text-card-foreground">{category.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenCategoryDialog(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                        setItemToDelete({ id: category.id, type: "category" });
                        setDeleteDialogOpen(true);
                      }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-muted-foreground col-span-full">No categories yet. Add one to get started!</p>}
            </div>
          </CardContent>
        </Card>

        {/* Menu Item Management */}
        <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 self-start">
                  <MenuSquare className="h-6 w-6" />
                  <CardTitle className="text-xl font-headline">Manage Menu Items</CardTitle>
                </div>
                <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
                    <div className="relative w-full sm:w-auto sm:flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Search by item name..." 
                            className="pl-8 w-full"
                            value={menuItemsFilter}
                            onChange={(e) => setMenuItemsFilter(e.target.value)}
                        />
                    </div>
                     <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => handleOpenMenuItemDialog(null)} disabled={categories.length === 0} className="whitespace-nowrap sm:flex-grow-0">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMenuItems.length > 0 ? (
                  filteredMenuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{categories.find(c => c.id === item.categoryId)?.name || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenMenuItemDialog(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                              setItemToDelete({ id: item.id, type: "menuItem" });
                              setDeleteDialogOpen(true);
                            }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                       {menuItems.length > 0 ? 'No items match your search.' : 'No menu items yet.'}
                       {categories.length === 0 && ' First, create a category.'}
                       {menuItems.length === 0 && categories.length > 0 && ' Add one to get started!'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit" : "Add"} Category</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the name of your category."
                : "Create a new category for your menu items."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="categoryName">Category Name</Label>
                <Input id="categoryName" {...categoryForm.register("name")} disabled={isSaving} />
                {categoryForm.formState.errors.name && <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Menu Item Dialog */}
      <Dialog open={isMenuItemDialogOpen} onOpenChange={setMenuItemDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "Edit" : "Add"} Menu Item</DialogTitle>
            <DialogDescription>
              {editingMenuItem
                ? "Update the details of your menu item."
                : "Add a new delicious item to your menu."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={menuItemForm.handleSubmit(handleMenuItemSubmit)} className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input id="itemName" {...menuItemForm.register("name")} disabled={isSaving}/>
              {menuItemForm.formState.errors.name && <p className="text-sm text-destructive">{menuItemForm.formState.errors.name.message}</p>}
            </div>
             <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="itemImage">Item Image</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || isSaving}
                  >
                    {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                    Generate Image
                  </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-md border bg-muted flex-shrink-0">
                  {imagePreview ? <Image src={imagePreview} alt="Preview" width={96} height={96} className="w-full h-full object-cover rounded-md" /> : null}
                </div>
                <Input id="itemImage" type="file" accept="image/*" onChange={handleImageChange} ref={imageInputRef} disabled={isSaving}/>
              </div>
            </div>
            <div className="space-y-2">
               <div className="flex items-center justify-between">
                <Label htmlFor="itemDescription">Description</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription || isSaving}
                >
                  {isGeneratingDescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea id="itemDescription" {...menuItemForm.register("description")} disabled={isSaving} />
              {menuItemForm.formState.errors.description && <p className="text-sm text-destructive">{menuItemForm.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemPrice">Price</Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">{currencySymbol}</span>
                    <Input id="itemPrice" type="number" step="0.01" {...menuItemForm.register("price")} disabled={isSaving} className="pl-7"/>
                  </div>
                  {menuItemForm.formState.errors.price && <p className="text-sm text-destructive">{menuItemForm.formState.errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemCategory">Category</Label>
                  <Controller
                    control={menuItemForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                        <SelectTrigger id="itemCategory">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {menuItemForm.formState.errors.categoryId && <p className="text-sm text-destructive">{menuItemForm.formState.errors.categoryId.message}</p>}
                </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              {itemToDelete?.type === 'category' ? ' category and all items within it.' : ' menu item.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Menu QR Code</DialogTitle>
            <DialogDescription>
              Customers can scan this code with their phone to view your digital menu.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {qrCodeUrl ? (
                <Image
                    src={qrCodeUrl}
                    alt="Menu QR Code"
                    width={250}
                    height={250}
                    className="rounded-lg border"
                 />
            ) : (
                <div className="w-[250px] h-[250px] bg-gray-200 animate-pulse rounded-lg" />
            )}
          </div>
          <DialogFooter className="sm:justify-start gap-2">
             <Button asChild variant="ghost" disabled={!qrCodeUrl} className="flex-1">
                <a href={`${qrCodeUrl}&download=1`} download="menu-qr-code.png">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="flex-1">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
