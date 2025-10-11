import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import ManagerTableManagement from '../../components/manager/ManagerTableManagement';
import StartOrderButton from '../../components/order/StartOrderButton';

const ManagerTablesPage: React.FC = () => {
  return (
    <>
      <DashboardLayout title="Table Management">
        <ManagerTableManagement />
      </DashboardLayout>
      <StartOrderButton />
    </>
  );
};

export default ManagerTablesPage;