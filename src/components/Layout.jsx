import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import useDataStore from '../store/dataStore';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { startPolling, stopPolling } = useDataStore();

  useEffect(() => {
    startPolling(30000);
    return () => stopPolling();
  }, []);
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  return (
    <div className="flex h-[100dvh] bg-white overflow-hidden">

      {/* Sidebar - Fixed on desktop, sliding on mobile */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-36 transition-all h-[100dvh]">

        {/* Header - Sticky */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />

        <main className="flex-1 flex flex-col p-2 sm:p-2 lg:p-2 overflow-hidden pb-[50px] md:pb-0 relative z-0 min-h-0">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col animate-in fade-in duration-500 min-h-0 md:mb-[35px]">
            <Outlet />
          </div>
        </main>

        <Footer />

      </div>
    </div>
  );
};

export default Layout;