import { useState } from 'react';
import Button from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { createTestData, checkExistingData } from '../../lib/createTestData';

export function TestDataCreator() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dataCounts, setDataCounts] = useState<Record<string, number> | null>(null);

  const handleCheckData = async () => {
    try {
      const counts = await checkExistingData();
      setDataCounts(counts);
    } catch (error) {
      console.error('Error checking data:', error);
    }
  };

  const handleCreateTestData = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const result = await createTestData();
      setResult(result);
      
      // Refresh data counts after creation
      if (result.success) {
        setTimeout(() => {
          handleCheckData();
        }, 1000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check data on mount
  useState(() => {
    handleCheckData();
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Creator
        </CardTitle>
        <CardDescription>
          Create sample data for testing the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dataCounts && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Current Data:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>Categories: {dataCounts.categories || 0}</div>
              <div>Menu Items: {dataCounts.menuItems || 0}</div>
              <div>Sales: {dataCounts.sales || 0}</div>
              <div>Orders: {dataCounts.orders || 0}</div>
            </div>
          </div>
        )}

        {result && (
          <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Button 
          onClick={handleCreateTestData}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Test Data...
            </>
          ) : (
            'Create Test Data'
          )}
        </Button>

        <Button 
          onClick={handleCheckData}
          variant="outline"
          className="w-full"
        >
          Refresh Data Counts
        </Button>
      </CardContent>
    </Card>
  );
}