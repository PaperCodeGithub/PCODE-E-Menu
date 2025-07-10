import React from 'react';
import { MenuClient } from '@/components/menu-client';

export default function MenuPage({ params }: { params: { restaurantId: string } }) {
  return <MenuClient restaurantId={params.restaurantId} />;
}
