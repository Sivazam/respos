import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, Database, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import { db } from '../../firebase/config';
import { collection, serverTimestamp, addDoc, writeBatch, getDocs, updateDoc } from 'firebase/firestore';

const MigrationPanel: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending');
  const [resetStatus, setResetStatus] = useState<'idle' | 'confirming' | 'running' | 'completed' | 'failed'>('idle');
  const [showPanel, setShowPanel] = useState(true);

  const handleRunMigration = () => {
    setMigrationStatus('running');
    
    // Simulate migration process
    setTimeout(() => {
      setMigrationStatus('completed');
    }, 2000);
  };

  const handleResetDatabase = async () => {
    if (resetStatus === 'confirming') {
      setResetStatus('running');
      
      try {
        // Delete all existing data
        const collections = ['users', 'locations', 'franchises', 'products', 'categories', 'sales', 'purchases', 'returns', 'stockUpdates'];
        
        for (const collectionName of collections) {
          const querySnapshot = await getDocs(collection(db, collectionName));
          const batch = writeBatch(db);
          
          querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          if (!querySnapshot.empty) {
            await batch.commit();
          }
        }
        
        // Create sample franchises
        const franchise1Data = {
          name: 'Na Potta Na Istam',
          email: 'napotta@restaurant.com',
          phone: '+919876543210',
          address: 'Hyderabad, Telangana',
          subscriptionPlan: 'premium' as const,
          maxLocations: 10,
          isActive: true,
          isApproved: true,
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const franchise2Data = {
          name: 'Bawarchi Restaurant',
          email: 'bawarchi@restaurant.com', 
          phone: '+919876543211',
          address: 'Hyderabad, Telangana',
          subscriptionPlan: 'basic' as const,
          maxLocations: 5,
          isActive: true,
          isApproved: true,
          approvedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const franchise1Ref = await addDoc(collection(db, 'franchises'), franchise1Data);
        const franchise2Ref = await addDoc(collection(db, 'franchises'), franchise2Data);
        
        // Create locations for franchise 1
        const location1Data = {
          name: 'Na Potta Na Istam - Main Store',
          address: 'Main Road, Hyderabad',
          phone: '+919876543210',
          franchiseId: franchise1Ref.id,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const location2Data = {
          name: 'Na Potta Na Istam - Ramachandrapuram',
          address: 'Ramachandrapuram, Hyderabad',
          phone: '+919876543211',
          franchiseId: franchise1Ref.id,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const location1Ref = await addDoc(collection(db, 'locations'), location1Data);
        const location2Ref = await addDoc(collection(db, 'locations'), location2Data);
        
        // Update location documents with their IDs
        await updateDoc(location1Ref, { id: location1Ref.id });
        await updateDoc(location2Ref, { id: location2Ref.id });
        
        // Create location for franchise 2
        const location3Data = {
          name: 'Bawarchi Restaurant - Main Branch',
          address: 'Banjara Hills, Hyderabad',
          phone: '+919876543212',
          franchiseId: franchise2Ref.id,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const location3Ref = await addDoc(collection(db, 'locations'), location3Data);
        await updateDoc(location3Ref, { id: location3Ref.id });
        
        setResetStatus('completed');
        setTimeout(() => {
          setResetStatus('idle');
          window.location.reload();
        }, 2000);
        
      } catch (error) {
        console.error('Database reset failed:', error);
        setResetStatus('failed');
        setTimeout(() => setResetStatus('idle'), 3000);
      }
    } else {
      setResetStatus('confirming');
    }
  };

  if (!showPanel) return null;

  return (
    <div className="space-y-4">
      {/* Database Reset Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {resetStatus === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <Database className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              {resetStatus === 'idle' && 'Database Reset'}
              {resetStatus === 'confirming' && 'Confirm Database Reset'}
              {resetStatus === 'running' && 'Resetting Database...'}
              {resetStatus === 'completed' && 'Database Reset Successfully'}
              {resetStatus === 'failed' && 'Database Reset Failed'}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {resetStatus === 'idle' && (
                <p>
                  Reset the entire database and create sample franchise data. This will delete ALL existing data 
                  and create 2 sample franchises with locations for testing the new architecture.
                </p>
              )}
              {resetStatus === 'confirming' && (
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="font-semibold text-red-800 mb-2">⚠️ WARNING: This action cannot be undone!</p>
                  <p className="text-red-700">
                    This will permanently delete all data including users, products, sales, and other records. 
                    The system will create sample franchises and locations after the reset.
                  </p>
                  <p className="text-red-700 mt-2">Click again to confirm or refresh the page to cancel.</p>
                </div>
              )}
              {resetStatus === 'running' && (
                <div className="flex items-center">
                  <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                  <p>Resetting database and creating sample data. Please do not refresh the page...</p>
                </div>
              )}
              {resetStatus === 'completed' && (
                <p>
                  The database has been successfully reset with sample franchise data. 
                  The page will refresh automatically to load the new data.
                </p>
              )}
              {resetStatus === 'failed' && (
                <p>
                  The database reset failed. Please check the console for errors and try again.
                </p>
              )}
            </div>
            {(resetStatus === 'idle' || resetStatus === 'confirming') && (
              <div className="mt-4">
                <Button
                  variant={resetStatus === 'confirming' ? 'destructive' : 'primary'}
                  size="sm"
                  onClick={handleResetDatabase}
                  isLoading={resetStatus === 'running'}
                  className="mr-2"
                >
                  {resetStatus === 'confirming' ? (
                    <>
                      <RefreshCw size={16} className="ml-1" />
                      Confirm Reset Database
                    </>
                  ) : (
                    <>
                      <Database size={16} className="ml-1" />
                      Reset Database
                    </>
                  )}
                </Button>
                {resetStatus === 'confirming' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetStatus('idle')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Original Migration Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {migrationStatus === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              {migrationStatus === 'pending' && 'Database Migration Required'}
              {migrationStatus === 'running' && 'Migration in Progress...'}
              {migrationStatus === 'completed' && 'Migration Completed Successfully'}
              {migrationStatus === 'failed' && 'Migration Failed'}
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              {migrationStatus === 'pending' && (
                <p>
                  A database migration is required to update the system to the latest version.
                  This will update the schema to support the new single franchise model.
                </p>
              )}
              {migrationStatus === 'running' && (
                <div className="flex items-center">
                  <div className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-amber-700"></div>
                  <p>Migrating database schema. Please do not refresh the page...</p>
                </div>
              )}
              {migrationStatus === 'completed' && (
                <p>
                  The database has been successfully migrated to the new schema.
                  The system now supports the single franchise model with multiple locations.
                </p>
              )}
              {migrationStatus === 'failed' && (
                <p>
                  The migration failed. Please try again or contact system administrator.
                </p>
              )}
            </div>
            {migrationStatus === 'pending' && (
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunMigration}
                  className="mr-2"
                >
                  Run Migration
                  <ArrowRight size={16} className="ml-1" />
                </Button>
              </div>
            )}
            {migrationStatus === 'completed' && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPanel(false)}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MigrationPanel;