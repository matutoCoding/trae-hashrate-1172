import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Search, Settings } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const initializeMockData = useAppStore(state => state.initializeMockData);
  const conflicts = useAppStore(state => state.conflicts);

  useEffect(() => {
    initializeMockData();
  }, [initializeMockData]);

  const pageTitle = {
    '/': '仪表板',
    '/schedule': '赛道排期',
    '/conflict': '冲突中心',
    '/checkin': '检录大厅',
    '/priority': '优先级管理',
    '/results': '成绩管理'
  }[location.pathname] || '系统';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 font-display">{pageTitle}</h2>
            <p className="text-sm text-slate-500">
              {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="搜索项目、运动员..." 
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-64 transition-all"
              />
            </div>
            
            <button className="relative p-2.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              <Bell size={20} />
              {conflicts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full animate-pulse" />
              )}
            </button>
            
            <button className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-8">
          <div className="animate-fade-in">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
