import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export type UserCategory = 'stranger' | 'friend' | 'tracker';

export type PermissionLevel = {
  canSeeProfile: boolean;
  canSeePhoto: boolean;
  canSeeDriverName: boolean;
  canSeeVehicleName: boolean;
  canSeeVehicleNumber: boolean;
  canSeeMobileNumber: boolean;
  canSeeLocation: boolean;
  canSeeLiveRoute: boolean;
  canChat: boolean;
  canAddToGroup: boolean;
  canTrackRoute: boolean;
  canFollowRide: boolean;
  canReceiveSOS: boolean;
  canSendSOS: boolean;
};

export type UserVisibility = {
  uid: string;
  category: UserCategory;
  permissions: PermissionLevel;
  lastSeen?: any;
  isOnline?: boolean;
};

// Permission configurations for each user category
const PERMISSION_CONFIGS: Record<UserCategory, PermissionLevel> = {
  stranger: {
    canSeeProfile: false,
    canSeePhoto: false,
    canSeeDriverName: false,
    canSeeVehicleName: true,
    canSeeVehicleNumber: true,
    canSeeMobileNumber: false,
    canSeeLocation: false,
    canSeeLiveRoute: false,
    canChat: false,
    canAddToGroup: false,
    canTrackRoute: false,
    canFollowRide: false,
    canReceiveSOS: false,
    canSendSOS: false,
  },
  friend: {
    canSeeProfile: true,
    canSeePhoto: true,
    canSeeDriverName: true,
    canSeeVehicleName: true,
    canSeeVehicleNumber: false,
    canSeeMobileNumber: false,
    canSeeLocation: false,
    canSeeLiveRoute: false,
    canChat: true,
    canAddToGroup: true,
    canTrackRoute: false,
    canFollowRide: false,
    canReceiveSOS: false,
    canSendSOS: false,
  },
  tracker: {
    canSeeProfile: true,
    canSeePhoto: true,
    canSeeDriverName: true,
    canSeeVehicleName: true,
    canSeeVehicleNumber: true,
    canSeeMobileNumber: false, // Can be toggled in settings
    canSeeLocation: true,
    canSeeLiveRoute: true,
    canChat: true,
    canAddToGroup: true,
    canTrackRoute: true,
    canFollowRide: true,
    canReceiveSOS: true,
    canSendSOS: true,
  },
};

export class PermissionsService {
  private static instance: PermissionsService;
  private currentUser: string | null = null;
  private userCategories: Map<string, UserCategory> = new Map();
  private trackerRequests: Map<string, boolean> = new Map();

  static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  async initialize(userId: string) {
    this.currentUser = userId;
    await this.loadUserCategories();
    await this.loadTrackerRequests();
  }

  private async loadUserCategories() {
    if (!this.currentUser) return;

    try {
      // Load friends (mutually accepted)
      const friendsRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('friends');
      
      const friendsSnap = await friendsRef.where('status', '==', 'accepted').get();
      
      friendsSnap.forEach((doc) => {
        this.userCategories.set(doc.id, 'friend');
      });

      // Load tracker relationships
      const trackerRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('trackers');
      
      const trackerSnap = await trackerRef.where('status', '==', 'accepted').get();
      
      trackerSnap.forEach((doc) => {
        this.userCategories.set(doc.id, 'tracker');
      });

    } catch (error) {
      console.error('Error loading user categories:', error);
    }
  }

  private async loadTrackerRequests() {
    if (!this.currentUser) return;

    try {
      const requestsRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('trackerRequests');
      
      const requestsSnap = await requestsRef.get();
      
      requestsSnap.forEach((doc) => {
        this.trackerRequests.set(doc.id, doc.data().status === 'pending');
      });

    } catch (error) {
      console.error('Error loading tracker requests:', error);
    }
  }

  getUserCategory(targetUserId: string): UserCategory {
    return this.userCategories.get(targetUserId) || 'stranger';
  }

  getPermissions(targetUserId: string): PermissionLevel {
    const category = this.getUserCategory(targetUserId);
    return { ...PERMISSION_CONFIGS[category] };
  }

  async sendFriendRequest(targetUserId: string) {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      // Add to current user's outgoing requests
      const outgoingRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('outgoingRequests')
        .doc(targetUserId);
      
      batch.set(outgoingRef, {
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Add to target user's incoming requests
      const incomingRef = firestore()
        .collection('connections')
        .doc(targetUserId)
        .collection('incomingRequests')
        .doc(this.currentUser);
      
      batch.set(incomingRef, {
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async sendTrackerRequest(targetUserId: string) {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      // Add to current user's outgoing tracker requests
      const outgoingRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('outgoingTrackerRequests')
        .doc(targetUserId);
      
      batch.set(outgoingRef, {
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // Add to target user's incoming tracker requests
      const incomingRef = firestore()
        .collection('connections')
        .doc(targetUserId)
        .collection('incomingTrackerRequests')
        .doc(this.currentUser);
      
      batch.set(incomingRef, {
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      this.trackerRequests.set(targetUserId, true);
      return true;
    } catch (error) {
      console.error('Error sending tracker request:', error);
      return false;
    }
  }

  async acceptFriendRequest(requesterId: string) {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      // Remove from incoming requests
      const incomingRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('incomingRequests')
        .doc(requesterId);
      
      batch.delete(incomingRef);

      // Remove from requester's outgoing requests
      const outgoingRef = firestore()
        .collection('connections')
        .doc(requesterId)
        .collection('outgoingRequests')
        .doc(this.currentUser);
      
      batch.delete(outgoingRef);

      // Add to both users' friends list
      const myFriendRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('friends')
        .doc(requesterId);
      
      batch.set(myFriendRef, {
        status: 'accepted',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      const theirFriendRef = firestore()
        .collection('connections')
        .doc(requesterId)
        .collection('friends')
        .doc(this.currentUser);
      
      batch.set(theirFriendRef, {
        status: 'accepted',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      
      // Update local cache
      this.userCategories.set(requesterId, 'friend');
      
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  async acceptTrackerRequest(requesterId: string) {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      // Remove from incoming tracker requests
      const incomingRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('incomingTrackerRequests')
        .doc(requesterId);
      
      batch.delete(incomingRef);

      // Remove from requester's outgoing tracker requests
      const outgoingRef = firestore()
        .collection('connections')
        .doc(requesterId)
        .collection('outgoingTrackerRequests')
        .doc(this.currentUser);
      
      batch.delete(outgoingRef);

      // Add to both users' trackers list
      const myTrackerRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('trackers')
        .doc(requesterId);
      
      batch.set(myTrackerRef, {
        status: 'accepted',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      const theirTrackerRef = firestore()
        .collection('connections')
        .doc(requesterId)
        .collection('trackers')
        .doc(this.currentUser);
      
      batch.set(theirTrackerRef, {
        status: 'accepted',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      
      // Update local cache
      this.userCategories.set(requesterId, 'tracker');
      this.trackerRequests.set(requesterId, false);
      
      return true;
    } catch (error) {
      console.error('Error accepting tracker request:', error);
      return false;
    }
  }

  async rejectRequest(requesterId: string, requestType: 'friend' | 'tracker') {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      if (requestType === 'friend') {
        // Remove friend request
        const incomingRef = firestore()
          .collection('connections')
          .doc(this.currentUser)
          .collection('incomingRequests')
          .doc(requesterId);
        
        batch.delete(incomingRef);

        const outgoingRef = firestore()
          .collection('connections')
          .doc(requesterId)
          .collection('outgoingRequests')
          .doc(this.currentUser);
        
        batch.delete(outgoingRef);
      } else {
        // Remove tracker request
        const incomingRef = firestore()
          .collection('connections')
          .doc(this.currentUser)
          .collection('incomingTrackerRequests')
          .doc(requesterId);
        
        batch.delete(incomingRef);

        const outgoingRef = firestore()
          .collection('connections')
          .doc(requesterId)
          .collection('outgoingTrackerRequests')
          .doc(this.currentUser);
        
        batch.delete(outgoingRef);
      }

      await batch.commit();
      
      if (requestType === 'tracker') {
        this.trackerRequests.set(requesterId, false);
      }
      
      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      return false;
    }
  }

  async removeFriend(friendId: string) {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      // Remove from both users' friends list
      const myFriendRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('friends')
        .doc(friendId);
      
      batch.delete(myFriendRef);

      const theirFriendRef = firestore()
        .collection('connections')
        .doc(friendId)
        .collection('friends')
        .doc(this.currentUser);
      
      batch.delete(theirFriendRef);

      await batch.commit();
      
      // Update local cache
      this.userCategories.delete(friendId);
      
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  }

  async removeTracker(trackerId: string) {
    if (!this.currentUser) return false;

    try {
      const batch = firestore().batch();
      
      // Remove from both users' trackers list
      const myTrackerRef = firestore()
        .collection('connections')
        .doc(this.currentUser)
        .collection('trackers')
        .doc(trackerId);
      
      batch.delete(myTrackerRef);

      const theirTrackerRef = firestore()
        .collection('connections')
        .doc(trackerId)
        .collection('trackers')
        .doc(this.currentUser);
      
      batch.delete(theirTrackerRef);

      await batch.commit();
      
      // Update local cache - downgrade to friend if they were a friend
      this.userCategories.set(trackerId, 'friend');
      
      return true;
    } catch (error) {
      console.error('Error removing tracker:', error);
      return false;
    }
  }

  hasPendingTrackerRequest(targetUserId: string): boolean {
    return this.trackerRequests.get(targetUserId) || false;
  }

  // Helper method to get filtered user data based on permissions
  getFilteredUserData(userData: any, targetUserId: string): any {
    const permissions = this.getPermissions(targetUserId);
    const filtered = { ...userData };

    if (!permissions.canSeePhoto) {
      filtered.photoURL = null;
    }
    
    if (!permissions.canSeeDriverName) {
      filtered.driverName = null;
    }
    
    if (!permissions.canSeeVehicleName) {
      filtered.vehicleName = null;
    }
    
    if (!permissions.canSeeVehicleNumber) {
      filtered.vehicleNumber = null;
    }
    
    if (!permissions.canSeeMobileNumber) {
      filtered.phone = null;
    }
    
    if (!permissions.canSeeLocation) {
      filtered.location = null;
    }

    return filtered;
  }

  // Helper method to check if a feature is available
  canUseFeature(targetUserId: string, feature: keyof PermissionLevel): boolean {
    const permissions = this.getPermissions(targetUserId);
    return permissions[feature];
  }
}

export default PermissionsService.getInstance();
