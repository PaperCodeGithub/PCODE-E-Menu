"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  PlusCircle,
  QrCode,
  Trash2,
  Pencil,
  UtensilsCrossed,
  MenuSquare,
  Shapes,
  X,
  FileUp,
  Search,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { v4 as uuidv4 } from "uuid"; // To generate unique IDs. In a real app, the backend would do this.

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
import { Logo } from "@/components/icons";

// Mock Data
const initialCategories: Category[] = [
  { id: "1", name: "Appetizers" },
  { id: "2", name: "Main Courses" },
  { id: "3", name: "Desserts" },
  { id: "4", name: "Drinks" },
];

const initialMenuItems: MenuItem[] = [
  {
    id: "101",
    name: "Bruschetta",
    description: "Toasted bread with tomatoes, garlic, and basil.",
    price: 8.99,
    categoryId: "1",
    image: "https://placehold.co/600x400.png",
  },
  {
    id: "102",
    name: "Spaghetti Carbonara",
    description: "Pasta with eggs, cheese, pancetta, and pepper.",
    price: 15.5,
    categoryId: "2",
    image: "https://placehold.co/600x400.png",
  },
  {
    id: "103",
    name: "Tiramisu",
    description: "Coffee-flavoured Italian dessert.",
    price: 7.5,
    categoryId: "3",
    image: "https://placehold.co/600x400.png",
  },
];

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
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [menuItemsFilter, setMenuItemsFilter] = useState("");

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

  useEffect(() => {
    // This runs only on the client, avoiding hydration errors
    setMenuUrl(`${window.location.origin}/menu/1`);
  }, []);

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
    setMenuItemDialogOpen(true);
  };

  const handleCategorySubmit = (values: z.infer<typeof categorySchema>) => {
    if (editingCategory) {
      setCategories(
        categories.map((c) =>
          c.id === editingCategory.id ? { ...c, ...values } : c
        )
      );
      toast({ title: "Category Updated", description: `"${values.name}" has been updated.` });
    } else {
      const newCategory = { id: uuidv4(), ...values };
      setCategories([...categories, newCategory]);
      toast({ title: "Category Added", description: `"${values.name}" has been created.` });
    }
    setCategoryDialogOpen(false);
  };

  const handleMenuItemSubmit = (values: z.infer<typeof menuItemSchema>) => {
    if (editingMenuItem) {
      setMenuItems(
        menuItems.map((item) =>
          item.id === editingMenuItem.id ? { ...item, ...values } : item
        )
      );
      toast({ title: "Menu Item Updated", description: `"${values.name}" has been updated.` });
    } else {
      const newItem: MenuItem = { id: uuidv4(), ...values, image: "https://placehold.co/600x400.png" };
      setMenuItems([...menuItems, newItem]);
       toast({ title: "Menu Item Added", description: `"${values.name}" has been created.` });
    }
    setMenuItemDialogOpen(false);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "category") {
      // Also delete menu items in this category
      const categoryName = categories.find(c => c.id === itemToDelete.id)?.name;
      setMenuItems(menuItems.filter((item) => item.categoryId !== itemToDelete.id));
      setCategories(categories.filter((c) => c.id !== itemToDelete.id));
      toast({ title: "Category Deleted", description: `"${categoryName}" and its items were deleted.`, variant: "destructive" });

    } else if (itemToDelete.type === "menuItem") {
      const itemName = menuItems.find(i => i.id === itemToDelete.id)?.name;
      setMenuItems(menuItems.filter((item) => item.id !== itemToDelete.id));
      toast({ title: "Menu Item Deleted", description: `"${itemName}" was deleted.`, variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };
  
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => item.name.toLowerCase().includes(menuItemsFilter.toLowerCase()))
  }, [menuItems, menuItemsFilter]);


  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary"/>
            <h1 className="text-2xl font-headline font-semibold">Dashboard</h1>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setQrDialogOpen(true)} variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            Generate QR Code
          </Button>
        </div>
      </header>

      <main className="p-4 sm:px-6 sm:py-0 grid gap-8">
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
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Search by item name..." 
                            className="pl-8"
                            value={menuItemsFilter}
                            onChange={(e) => setMenuItemsFilter(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => handleOpenMenuItemDialog(null)} disabled={categories.length === 0} className="whitespace-nowrap">
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
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
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
      </main>

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
                <Input id="categoryName" {...categoryForm.register("name")} />
                {categoryForm.formState.errors.name && <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Category</Button>
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
              <Input id="itemName" {...menuItemForm.register("name")} />
              {menuItemForm.formState.errors.name && <p className="text-sm text-destructive">{menuItemForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemDescription">Description</Label>
              <Textarea id="itemDescription" {...menuItemForm.register("description")} />
              {menuItemForm.formState.errors.description && <p className="text-sm text-destructive">{menuItemForm.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemPrice">Price</Label>
                  <Input id="itemPrice" type="number" step="0.01" {...menuItemForm.register("price")} />
                  {menuItemForm.formState.errors.price && <p className="text-sm text-destructive">{menuItemForm.formState.errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemCategory">Category</Label>
                  <Controller
                    control={menuItemForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Item</Button>
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
            {menuUrl ? (
                <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(menuUrl)}`}
                    alt="Menu QR Code"
                    width={250}
                    height={250}
                    className="rounded-lg border"
                 />
            ) : (
                <div className="w-[250px] h-[250px] bg-gray-200 animate-pulse rounded-lg" />
            )}
          </div>
          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
