import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Calendar, Download, Filter, TrendingUp, Users, DollarSign, ShoppingCart, Clock, Star, Trophy, Target, Zap } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Mock data for demonstration
const mockOrders = [
  {
    id: "1",
    orderNumber: "ORD-241014-001",
    staffId: "staff1",
    total: 1500,
    createdAt: new Date("2024-10-14T10:30:00"),
    items: [{ name: "Item 1", quantity: 2 }]
  },
  {
    id: "2", 
    orderNumber: "ORD-241014-002",
    staffId: "staff2",
    total: 800,
    createdAt: new Date("2024-10-14T11:45:00"),
    items: [{ name: "Item 2", quantity: 1 }]
  }
];

const mockStaff = [
  { uid: "staff1", displayName: "John Doe", email: "john@example.com", role: "staff", locationId: "loc1" },
  { uid: "staff2", displayName: "Jane Smith", email: "jane@example.com", role: "staff", locationId: "loc1" }
];

const mockLocations = [
  { id: "loc1", name: "Main Location" }
];

export default function StaffPerformance() {
  const [user] = useState(null);
  const [orders] = useState(mockOrders);
  const [staff] = useState(mockStaff);
  const [locations] = useState(mockLocations);
  const [loading] = useState(false);

  // Filter states
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Get filtered orders
  const getFilteredOrders = () => {
    if (!orders || orders.length === 0) return [];
    
    let filtered = [...orders];
    
    // Filter by date range
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    // Filter by location
    if (selectedLocation !== "all") {
      filtered = filtered.filter(order => order.locationId === selectedLocation);
    }

    // Filter by staff
    if (selectedStaff !== "all") {
      filtered = filtered.filter(order => order.staffId === selectedStaff);
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  // Calculate performance metrics
  const calculateStaffMetrics = (staffId: string) => {
    const staffOrders = filteredOrders.filter(order => order.staffId === staffId);
    
    const totalRevenue = staffOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = staffOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate completion time (simplified - using order data)
    const avgCompletionTime = totalOrders > 0 ? 15 : 0; // placeholder in minutes
    
    // Get top selling items for this staff
    const itemCounts: { [key: string]: number } = {};
    staffOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    
    const topItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      avgCompletionTime,
      topItems,
      orderCount: staffOrders.length
    };
  };

  // Get all staff performance data
  const getStaffPerformanceData = () => {
    if (!staff || staff.length === 0) return [];
    
    return staff
      .filter(staffMember => staffMember.role === "staff")
      .map(staffMember => {
        const metrics = calculateStaffMetrics(staffMember.uid);
        return {
          id: staffMember.uid,
          name: staffMember.displayName || staffMember.email,
          email: staffMember.email,
          location: staffMember.locationId || "Unassigned",
          ...metrics
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const staffPerformanceData = getStaffPerformanceData();

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Staff Name", "Email", "Location", "Total Revenue", "Total Orders", 
      "Avg Order Value", "Top Selling Item"
    ];
    
    const csvData = staffPerformanceData.map(staff => [
      staff.name,
      staff.email,
      locations.find(l => l.id === staff.location)?.name || staff.location,
      staff.totalRevenue.toFixed(2),
      staff.totalOrders.toString(),
      staff.avgOrderValue.toFixed(2),
      staff.topItems[0]?.name || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-performance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Quick date range selection
  const setQuickDateRange = (range: string) => {
    setDateRange(range);
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case "1d":
        startDate = subDays(endDate, 1);
        break;
      case "7d":
        startDate = subDays(endDate, 7);
        break;
      case "30d":
        startDate = subDays(endDate, 30);
        break;
      case "90d":
        startDate = subDays(endDate, 90);
        break;
    }

    setStartDate(format(startDate, "yyyy-MM-dd"));
    setEndDate(format(endDate, "yyyy-MM-dd"));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Performance</h1>
          <p className="text-muted-foreground">
            Monitor and analyze staff performance metrics
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff?.filter(s => s.role === "staff").map(staffMember => (
                    <SelectItem key={staffMember.uid} value={staffMember.uid}>
                      {staffMember.displayName || staffMember.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setQuickDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Custom Date</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffPerformanceData.length}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${staffPerformanceData.reduce((sum, staff) => sum + staff.totalRevenue, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From all staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffPerformanceData.reduce((sum, staff) => sum + staff.totalOrders, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${staffPerformanceData.length > 0 
                ? (staffPerformanceData.reduce((sum, staff) => sum + staff.avgOrderValue, 0) / staffPerformanceData.length).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg order value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Details</CardTitle>
          <CardDescription>
            Detailed performance metrics for each staff member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Staff Member</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Location</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Revenue</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Orders</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Avg Order</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Completion Time</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Top Selling Item</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Performance Score</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformanceData.map((staff) => {
                  const performanceScore = Math.min(100, Math.round(
                    (staff.totalRevenue / 1000) * 0.3 + 
                    (staff.totalOrders / 10) * 0.4 + 
                    (100 - staff.avgCompletionTime) * 0.3
                  ));
                  
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-sm text-gray-500">{staff.email}</div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <Badge variant="outline">
                          {locations.find(l => l.id === staff.location)?.name || staff.location}
                        </Badge>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                        ${staff.totalRevenue.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{staff.totalOrders}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        ${staff.avgOrderValue.toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        {staff.avgCompletionTime}m
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="text-sm">
                          {staff.topItems[0]?.name || "N/A"}
                          {staff.topItems[0]?.quantity && (
                            <span className="text-gray-500">
                              {" "}({staff.topItems[0].quantity} sold)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-sm font-medium">{performanceScore}%</div>
                          {performanceScore >= 80 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          {performanceScore >= 60 && performanceScore < 80 && <Star className="h-4 w-4 text-blue-500" />}
                          {performanceScore < 60 && <Target className="h-4 w-4 text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performers by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {staffPerformanceData.slice(0, 5).map((staff, index) => (
                <div key={staff.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">{staff.totalOrders} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${staff.totalRevenue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      ${staff.avgOrderValue.toFixed(2)} avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Most Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {staffPerformanceData
                .sort((a, b) => b.totalOrders - a.totalOrders)
                .slice(0, 5)
                .map((staff, index) => (
                  <div key={staff.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-blue-100 text-blue-800' :
                        index === 1 ? 'bg-blue-50 text-blue-600' :
                        index === 2 ? 'bg-blue-25 text-blue-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {locations.find(l => l.id === staff.location)?.name || staff.location}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{staff.totalOrders}</div>
                      <div className="text-sm text-muted-foreground">
                        orders
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}