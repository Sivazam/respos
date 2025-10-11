import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import StaffTableManagement from '../../components/staff/StaffTableManagement';
import StartOrderButton from '../../components/order/StartOrderButton';

const StaffTablesPage: React.FC = () => {
  return (
    <>
      <DashboardLayout title="Tables">
        <StaffTableManagement />
      </DashboardLayout>
      <StartOrderButton />
    </>
  );
};

export default StaffTablesPage;