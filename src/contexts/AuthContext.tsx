import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, serverTimestamp, collection, query, orderBy, limit, addDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, UserRole } from '../types';
import { SetupService } from '../services/setupService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  needsSetup: boolean;
  login: (email: string, password: string, locationId?: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole, franchiseId?: string, locationId?: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  approveUser: (userId: string, locationId?: string) => Promise<void>;
  rejectUser: (userId: string, reason?: string) => Promise<void>;
  completeSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);

  const clearError = () => setError(null);

  const getUserWithRole = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      // Force refresh the user token to get latest data
      await firebaseUser.reload();
      
      // Add multiple attempts to get the latest user data with exponential backoff
      let userDoc;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          break;
        }
        
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 200));
        attempts++;
      }
      
      if (!userDoc?.exists()) {
        console.warn('User document not found after retries:', firebaseUser.uid);
        return null;
      }
      
      const userData = userDoc.data();
      
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || userData.email,
        displayName: firebaseUser.displayName || userData.displayName,
        role: userData.role as UserRole,
        isActive: userData.isActive !== undefined ? userData.isActive : false,
        isApproved: userData.isApproved !== undefined ? userData.isApproved : false,
        locationId: userData.locationId,
        locationIds: userData.locationIds,
        franchiseId: userData.franchiseId,
        phone: userData.phone,
        createdAt: userData.createdAt?.toDate() || new Date(),
        lastLogin: userData.lastLogin?.toDate() || new Date()
      };

      // Check if user needs setup (for admin/manager roles with location)
      if ((user.role === 'admin' || user.role === 'manager') && user.locationId) {
        try {
          const setupResult = await SetupService.checkUserSetupStatus(user.uid);
          
          // User needs setup if they haven't completed their personal setup yet
          // Location settings are created by admin during restaurant setup, so we don't need to check them here
          const needsGlobalSetup = !setupResult.success || !setupResult.hasCompletedSetup;
          
          setNeedsSetup(needsGlobalSetup);
        } catch (error) {
          console.warn('Failed to check setup status:', error);
          setNeedsSetup(false);
        }
      } else {
        setNeedsSetup(false);
      }

      return user;
    } catch (err) {
      console.error('Error getting user data:', err);
      setNeedsSetup(false);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userWithRole = await getUserWithRole(firebaseUser);
          if (userWithRole) {
            // Auth state change should trust the login validation
            // Don't re-check isActive/isApproved here to avoid race conditions
            setCurrentUser(userWithRole);
            try {
              const userRef = doc(db, 'users', firebaseUser.uid);
              await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
            } catch (updateError) {
              console.warn('Failed to update last login time:', updateError);
              // Don't fail the login process for this
            }
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError('Failed to authenticate user');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const register = async (
    email: string, 
    password: string, 
    role: UserRole = 'staff', 
    franchiseId?: string,
    locationId?: string
  ): Promise<FirebaseUser> => {
    clearError();
    setLoading(true);
    
    try {
      // For superadmin, we don't need franchiseId
      if (role !== 'superadmin' && !franchiseId) {
        // Try to get the default franchise
        try {
          const franchiseQuery = query(collection(db, 'franchises'), orderBy('createdAt', 'desc'), limit(1));
          const franchiseSnapshot = await getDocs(franchiseQuery);
          
          if (franchiseSnapshot.empty) {
            // Create a default franchise if none exists
            const defaultFranchiseData = {
              name: 'Default Franchise',
              email: 'admin@forkflow.com',
              phone: '+1234567890',
              address: 'Default Address',
              subscriptionPlan: 'basic' as const,
              maxLocations: 10,
              isActive: true,
              isApproved: true,
              approvedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            const franchiseRef = await addDoc(collection(db, 'franchises'), defaultFranchiseData);
            franchiseId = franchiseRef.id;
          } else {
            franchiseId = franchiseSnapshot.docs[0].id;
          }
        } catch (franchiseError) {
          console.error('Error fetching/creating franchise:', franchiseError);
          // Continue without franchiseId for now, will be handled later
        }
      }
      
      // Validate location for staff (now optional, will be assigned by admin/manager)
      // if (role === 'staff' && !locationId) {
      //   throw new Error('Location is required for staff role. Please select a location.');
      // }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Prepare user data object with display name
      const userData: any = {
        email: user.email,
        displayName: email.split('@')[0], // Default display name if none provided
        role,
        isActive: role === 'superadmin', // Only superadmin is active by default
        isApproved: role === 'superadmin', // Only superadmin is approved by default
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      // Handle franchiseId and locationId based on role
      if (role === 'superadmin') {
        // For superadmin, explicitly set franchiseId and locationId to null
        userData.franchiseId = null;
        userData.locationId = null;
      } else {
        // For all other roles, franchiseId is required
        if (!franchiseId) {
          throw new Error('Unable to create user: No franchise available. Please ensure a franchise exists before creating users.');
        }
        userData.franchiseId = franchiseId;
        
        // For staff, locationId is optional (will be assigned by admin/manager)
        // For admin and manager, it's optional
        if (locationId) {
          // For roles that need approval, store as requested location initially
          if (role === 'manager' || role === 'staff') {
            userData.requestedLocationId = locationId;
            userData.locationId = null; // Will be set upon approval
          } else {
            userData.locationId = locationId;
          }
        } else {
          userData.locationId = null;
          userData.requestedLocationId = null;
        }
      }
      
      await setDoc(doc(db, 'users', user.uid), userData);

      // Only set current user if this is the first user being created (superadmin)
      if (role === 'superadmin') {
        const userWithRole = await getUserWithRole(user);
        setCurrentUser(userWithRole);
      }
      
      return user;
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to register';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, locationId?: string) => {
    clearError();
    setLoading(true);
    
    try {
      // Validate inputs
      if (!email?.trim()) {
        throw new Error('Email is required');
      }
      if (!password) {
        throw new Error('Password is required');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // Force reload the user to get the latest token and data
      await user.reload();
      
      // Add a small delay to ensure Firestore is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let userWithRole = await getUserWithRole(user);
      if (!userWithRole) {
        throw new Error('User account not found. Please contact an administrator.');
      }

      // For admin accounts, if they appear inactive, try multiple times with longer delays
      // This handles potential race conditions in Firestore synchronization
      if (userWithRole.role === 'admin' && !userWithRole.isActive) {
        console.log('Admin account appears inactive, performing multiple retries...');
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          await user.reload(); // Reload Firebase user
          const retryUser = await getUserWithRole(user);
          
          if (retryUser && retryUser.isActive) {
            console.log(`Admin account status corrected on attempt ${attempt}`);
            userWithRole = retryUser;
            break;
          }
          
          console.log(`Admin account still inactive on attempt ${attempt}`);
        }
      }

      // For staff, check if they have access to the selected location
      if (userWithRole.role === 'staff') {
        if (userWithRole.locationId && locationId && userWithRole.locationId !== locationId) {
          throw new Error('You do not have access to this location');
        }
      }

      // Only check isActive and isApproved for non-superadmin users
      if (userWithRole.role !== 'superadmin') {
        // Add debugging for admin accounts
        if (userWithRole.role === 'admin') {
          // Silent debug - only log in development
          // Debugging disabled for production
        }
        
        if (!userWithRole.isActive) {
          await signOut(auth);
          throw new Error('Your account is inactive. Please contact an administrator.');
        }
        
        if (!userWithRole.isApproved) {
          await signOut(auth);
          throw new Error('Your account is pending approval. Please contact a super administrator.');
        }
      } else {
        // Superadmin should always be active and approved
        // Debugging disabled for production
      }

      setCurrentUser(userWithRole);
      
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      } catch (updateError) {
        console.warn('Failed to update last login time:', updateError);
        // Don't fail the login process for this
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to log in';
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    clearError();
    setLoading(true);
    
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      const errorMessage = err.message || 'Failed to log out';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    clearError();
    setLoading(true);
    
    try {
      if (!email?.trim()) {
        throw new Error('Email is required');
      }
      
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      let errorMessage = 'Failed to send password reset email';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, locationId?: string) => {
    clearError();
    setLoading(true);
    
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const updateData: any = {
        isApproved: true,
        isActive: true,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Handle location assignment based on role
      if (userData.role === 'admin' || userData.role === 'owner') {
        // For Admin/Owner roles - assign all locations from their franchise
        if (userData.franchiseId) {
          try {
            const locationsQuery = query(
              collection(db, 'locations'),
              where('franchiseId', '==', userData.franchiseId)
            );
            const locationsSnapshot = await getDocs(locationsQuery);
            
            const locationIds = locationsSnapshot.docs.map(doc => doc.id);
            updateData.locationIds = locationIds; // Array of all location IDs
            updateData.locationId = null; // Clear single location ID
          } catch (locationError) {
            console.warn('Could not fetch locations for admin/owner:', locationError);
            // Continue with approval without location assignment
          }
        }
        // Clear any requested location
        updateData.requestedLocationId = null;
      } else if (userData.role === 'superadmin') {
        // Superadmin doesn't need location
        updateData.locationId = null;
        updateData.locationIds = null;
        updateData.requestedLocationId = null;
      } else {
        // For staff, manager, etc.
        if (locationId) {
          // Use provided location
          updateData.locationId = locationId;
          updateData.requestedLocationId = null;
        } else if (userData.requestedLocationId) {
          // Use requested location
          updateData.locationId = userData.requestedLocationId;
          updateData.requestedLocationId = null;
        } else if (!userData.locationId && userData.franchiseId) {
          // Auto-assign first location if none specified
          try {
            const locationsQuery = query(
              collection(db, 'locations'),
              where('franchiseId', '==', userData.franchiseId),
              orderBy('createdAt', 'asc'),
              limit(1)
            );
            const locationsSnapshot = await getDocs(locationsQuery);
            
            if (!locationsSnapshot.empty) {
              const firstLocation = locationsSnapshot.docs[0];
              updateData.locationId = firstLocation.id;
            }
          } catch (locationError) {
            console.warn('Could not fetch locations for auto-assignment:', locationError);
            // Continue with approval without location assignment
          }
        }
      }
      
      await updateDoc(userRef, updateData);
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectUser = async (userId: string, reason?: string) => {
    clearError();
    setLoading(true);
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: false,
        isApproved: false,
        rejectionReason: reason || 'Application rejected',
        updatedAt: serverTimestamp()
      });
      
    } catch (err: any) {
      console.error('Error rejecting user:', err);
      setError(err.message || 'Failed to reject user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    clearError();
    setLoading(true);
    
    try {
      const result = await SetupService.markSetupComplete(currentUser.uid);
      if (result.success) {
        setNeedsSetup(false);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Error completing setup:', err);
      setError(err.message || 'Failed to complete setup');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    needsSetup,
    login,
    register,
    logout,
    resetPassword,
    approveUser,
    rejectUser,
    completeSetup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};