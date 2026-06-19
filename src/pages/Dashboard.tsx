import React from 'react';
import { 
  Calendar, 
  Users, 
  Trophy, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Timer,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAppStore, useTodaySchedules, useQueueWithDetails, useActiveConflicts } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { ScheduleStatus, QueueStatus } from '@/types';
import { formatTime } from '@/utils/time';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const todaySchedules = useTodaySchedules();
  const queueEntries = useQueueWithDetails();
  const conflicts = useActiveConflicts();
  const results = useAppStore(state => state.results);
  const currentCalledEntry = useAppStore(state => state.currentCalledEntry);

  const stats = [
    { 
      label: '今日项目', 
      value: todaySchedules.length, 
      icon: Calendar, 
      color: 'from-blue-500 to-primary-500',
      change: '+3 较昨日'
    },
    { 
      label: '排队检录', 
      value: queueEntries.filter(q => q.status === QueueStatus.WAITING).length, 
      icon: Users, 
      color: 'from-accent to-orange-400',
      change: '实时更新'
    },
    { 
      label: '已完成项目', 
      value: results.length / 8, 
      icon: Trophy, 
      color: 'from-success to-emerald-400',
      change: '更新于 5 分钟前'
    },
    { 
      label: '待处理冲突', 
      value: conflicts.length, 
      icon: AlertTriangle, 
      color: conflicts.length > 0 ? 'from-warning to-red-400' : 'from-gray-400 to-gray-500',
      change: conflicts.length > 0 ? '需要立即处理' : '全部正常'
    },
  ];

  const inProgressSchedules = todaySchedules.filter(
    s => s.status === ScheduleStatus.IN_PROGRESS
  );

  const upcomingSchedules = todaySchedules
    .filter(s => s.status === ScheduleStatus.SCHEDULED)
    .slice(0, 5);

  const recentQueue = queueEntries
    .filter(q => q.status !== QueueStatus.CHECKED_IN)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {conflicts.length > 0 && (
        <div className="bg-gradient-to-r from-warning/10 to-red-50 border border-warning/30 rounded-xl p-4 flex items-center gap-4 animate-pulse-slow">
          <div className="w-12 h-12 bg-warning/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="text-warning" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-800">检测到 {conflicts.length} 个排期冲突</h4>
            <p className="text-sm text-slate-600">请立即前往冲突中心处理，避免影响比赛进程</p>
          </div>
          <button 
            onClick={() => navigate('/conflict')}
            className="btn-accent"
          >
            立即处理
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {currentCalledEntry && (
        <div className="bg-gradient-to-r from-accent/10 to-orange-50 border border-accent/30 rounded-xl p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center animate-pulse-glow">
                <Timer className="text-accent" size={32} />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">当前叫号</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-accent font-display animate-number-pop">
                    {currentCalledEntry.athlete.bibNumber}
                  </span>
                  <span className="text-xl text-slate-700">{currentCalledEntry.athlete.name}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {currentCalledEntry.event?.name} · {currentCalledEntry.athlete.team}
                </p>
              </div>
            </div>
            <div className="ml-auto flex gap-3">
              <StatusBadge type="priority" status={currentCalledEntry.priority} />
              <StatusBadge type="queue" status={currentCalledEntry.status} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className="card p-6 animate-stagger"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
                <TrendingUp size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800 font-display">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                <p className="text-xs text-slate-400 mt-2">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {inProgressSchedules.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">进行中的项目</h3>
                <span className="flex items-center gap-1.5 text-success text-sm">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  实时更新
                </span>
              </div>
              <div className="space-y-3">
                {inProgressSchedules.map(schedule => (
                  <div 
                    key={schedule.id} 
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-accent/5 to-transparent rounded-xl border border-accent/20"
                  >
                    <div className="w-2 h-12 bg-accent rounded-full animate-pulse" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{schedule.event?.name}</h4>
                      <p className="text-sm text-slate-500">
                        {schedule.track?.name} · {schedule.venue?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-accent font-semibold">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </p>
                      <StatusBadge type="schedule" status={schedule.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">今日赛程</h3>
              <button 
                onClick={() => navigate('/schedule')}
                className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                查看全部 <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingSchedules.length === 0 ? (
                <p className="text-center text-slate-400 py-8">暂无后续赛程</p>
              ) : (
                upcomingSchedules.map((schedule, index) => (
                  <div 
                    key={schedule.id} 
                    className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors animate-stagger"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="w-14 text-center">
                      <p className="font-mono text-lg font-bold text-primary-600">{formatTime(schedule.startTime)}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200" />
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-800">{schedule.event?.name}</h4>
                      <p className="text-sm text-slate-500">{schedule.track?.name}</p>
                    </div>
                    <StatusBadge type="schedule" status={schedule.status} size="sm" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">检录队列</h3>
              <button 
                onClick={() => navigate('/checkin')}
                className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                进入大厅 <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {recentQueue.length === 0 ? (
                <p className="text-center text-slate-400 py-8">暂无排队人员</p>
              ) : (
                recentQueue.map((entry, index) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors animate-stagger"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      entry.position === 1 
                        ? 'bg-accent text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {entry.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{entry.athlete.name}</p>
                      <p className="text-xs text-slate-500">{entry.athlete.bibNumber}</p>
                    </div>
                    <StatusBadge type="priority" status={entry.priority} size="sm" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">今日完成情况</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-success" size={18} />
                  <span className="text-sm text-slate-600">已完成</span>
                </div>
                <span className="font-semibold text-success">
                  {todaySchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length} 项
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-accent" size={18} />
                  <span className="text-sm text-slate-600">进行中</span>
                </div>
                <span className="font-semibold text-accent">
                  {todaySchedules.filter(s => s.status === ScheduleStatus.IN_PROGRESS).length} 项
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="text-warning" size={18} />
                  <span className="text-sm text-slate-600">已取消</span>
                </div>
                <span className="font-semibold text-warning">
                  {todaySchedules.filter(s => s.status === ScheduleStatus.CANCELLED).length} 项
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-success to-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${todaySchedules.length > 0 
                      ? (todaySchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length / todaySchedules.length * 100) 
                      : 0}%` 
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">
                完成进度 {todaySchedules.length > 0 
                  ? Math.round(todaySchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length / todaySchedules.length * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
