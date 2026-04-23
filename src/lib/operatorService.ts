import { firebaseService } from './firebaseService';
import { db } from './firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, where } from 'firebase/firestore';

export interface SubAdminLog {
  subAdminId: string;
  actionType: string;
  orderId: string;
  userId: string;
  amount: number;
  status: 'approved' | 'rejected' | 'completed';
  timestamp: string;
}

export const operatorService = {
  async logAction(log: SubAdminLog) {
    try {
      await addDoc(collection(db, 'sub_admin_logs'), {
        ...log,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging sub-admin action:', error);
    }
  },

  async processOrder(
    operatorId: string, 
    orderId: string, 
    action: 'approved' | 'rejected' | 'completed'
  ) {
    try {
      const orderRef = doc(db, 'transactions', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) throw new Error('Order not found');
      const orderData = orderSnap.data();
      
      // Update order status
      await updateDoc(orderRef, {
        status: action === 'approved' ? 'completed' : action === 'rejected' ? 'failed' : 'completed',
        updatedAt: new Date().toISOString(),
        processedBy: operatorId
      });

      // Update balance if completed or approved
      if (action === 'approved' || action === 'completed') {
        const walletSnap = await firebaseService.getCollection('wallets', [
          where('uid', '==', orderData.uid),
          where('currency', '==', orderData.currency)
        ]);

        if (walletSnap.length > 0) {
          const walletId = walletSnap[0].id;
          const walletRef = doc(db, 'wallets', walletId);
          
          let balanceChange = 0;
          if (orderData.type === 'deposit' || orderData.type === 'add_money' || orderData.type === 'cash_in' || orderData.type === 'receive') {
            balanceChange = orderData.amount;
          } else if (orderData.type === 'withdraw' || orderData.type === 'cash_out' || orderData.type === 'send' || orderData.type === 'recharge') {
            balanceChange = -orderData.amount;
          }

          if (balanceChange !== 0) {
            await updateDoc(walletRef, {
              balance: increment(balanceChange),
              updatedAt: new Date().toISOString()
            });
          }
        }

        // Send notification to user
        await addDoc(collection(db, 'notifications'), {
          uid: orderData.uid,
          title: `Order ${action === 'approved' ? 'Approved' : 'Completed'}`,
          message: `Your ${orderData.type} request of ${orderData.amount} ${orderData.currency} has been ${action === 'approved' ? 'approved' : 'completed'}.`,
          type: 'alert',
          createdAt: new Date().toISOString(),
          read: false
        });
      }

      // Log the action
      await this.logAction({
        subAdminId: operatorId,
        actionType: orderData.type,
        orderId: orderId,
        userId: orderData.uid,
        amount: orderData.amount,
        status: action,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error processing order:', error);
      throw error;
    }
  }
};
