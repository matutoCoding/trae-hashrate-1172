import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  AlertTriangle, 
  Users, 
  Gauge, 
  Trophy,
  Medal
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表板', icon: LayoutDashboard },
  { path: '/schedule', label: '赛道排期', icon: Calendar },
  { path: '/conflict', label: '冲突中心', icon: AlertTriangle },
  { path: '/checkin', label: '检录大厅', icon: Users },
  { path: '/priority', label: '优先级管理', icon: Gauge },
  { path: '/results', label: '成绩管理', icon: Trophy },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gradient-to-b from-deep to-deep-dark min-h-screen flex flex-col shadow-xl">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-orange-400 rounded-xl flex items-center justify-center shadow-lg">
            <Medal className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-white font-display font-bold text-lg">运动会编排</h1>
            <p className="text-slate-400 text-xs">管理系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.path === '/conflict' && (
                <span className="ml-auto bg-warning text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                  !
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">管</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">管理员</p>
              <p className="text-slate-400 text-xs">admin@sports.com</p>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            今日有 <span className="text-accent font-semibold">12</span> 个项目
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
