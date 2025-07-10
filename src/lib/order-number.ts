
'use server';
import { db } from './firebase';
import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

// A function to get the current date in YYYY-MM-DD format for the document ID.
const getTodayString = () => {
    const now = new Date();
    // Adjust for timezone to ensure the date is correct for the server's location or a target timezone.
    // This example uses a simple UTC-based date string.
    return now.toISOString().split('T')[0];
};

export const getNextOrderNumber = async (restaurantId: string): Promise<number> => {
    const today = getTodayString();
    const counterRef = doc(db, 'orderCounters', `${restaurantId}_${today}`);
    
    try {
        const newOrderNumber = await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            
            if (!counterDoc.exists()) {
                // If the counter for today doesn't exist, create it and start at 1.
                transaction.set(counterRef, { count: 1, updatedAt: serverTimestamp() });
                return 1;
            } else {
                // If it exists, increment the count.
                const newCount = counterDoc.data().count + 1;
                transaction.update(counterRef, { count: newCount, updatedAt: serverTimestamp() });
                return newCount;
            }
        });
        
        return newOrderNumber;

    } catch (e) {
        console.error("Transaction failed: ", e);
        // Fallback or error handling strategy.
        // For simplicity, we'll throw an error, which the caller should catch.
        throw new Error("Could not generate a new order number.");
    }
};
