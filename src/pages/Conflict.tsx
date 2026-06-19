import React from 'react';
import { AlertTriangle, CheckCircle, Clock, MapPin, Trash2, RefreshCw, AlertOctagon } from 'lucide-react';
import { useActiveConflicts, useSchedulesWithDetails } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { ScheduleStatus } from '@/types';
import { formatTime } from '@/utils/time';
import { useAppStore } from '@/store/useAppStore';

const Conflict: React.FC = () => {
  const conflicts = useActiveConflicts();
  const schedules = useSchedulesWithDetails();
  const resolveConflict = useAppStore(state => state.resolveConflict);
  const cancelSchedule = useAppStore(state => state.cancelSchedule);
  const checkAllConflicts = useAppStore(state => state.checkAllConflicts);

  const activeConflicts = conflicts.filter(c => c.schedule1 && c.schedule2);

  const handleResolve = (conflictId: string, keepScheduleId: string) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;
    
    const otherId = conflict.scheduleId1 === keepScheduleId ? conflict.scheduleId2 : conflict.scheduleId1;
    
    if (window.confirm('确定取消另一个排期吗？')) {
      cancelSchedule(otherId);
      resolveConflict(conflictId, keepScheduleId);
    }
  };

  const handleRefresh = () => {
    checkAllConflicts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">检测和处理场地赛道时段冲突</p>
        </div>
        <button className="btn-secondary" onClick={handleRefresh}>
          <RefreshCw size={18} />
          重新检测
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-warning" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 font-display">{activeConflicts.length}</p>
              <p className="text-sm text-slate-500">待处理冲突</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-success" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 font-display">
                {schedules.filter(s => s.status === ScheduleStatus.CANCELLED).length}
              </p>
              <p className="text-sm text-slate-500">已取消排期</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <AlertOctagon className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 font-display">
                {schedules.filter(s => s.status !== ScheduleStatus.CANCELLED).length}
              </p>
              <p className="text-sm text-slate-500">有效排期</p>
            </div>
          </div>
        </div>
      </div>

      {activeConflicts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-success" size={48} />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">暂无冲突</h3>
          <p className="text-slate-500">所有排期时段正常，没有发现冲突</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeConflicts.map((conflict, index) => (
            <div 
              key={conflict.id}
              className="card border-warning/30 bg-gradient-to-r from-warning/5 to-transparent border-2 animate-stagger"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="text-warning animate-pulse" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 mb-1">时段冲突</h3>
                    <p className="text-sm text-slate-500">{conflict.description}</p>
                  </div>
                  <StatusBadge type="schedule" status={ScheduleStatus.SCHEDULED} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[conflict.schedule1, conflict.schedule2].map((schedule, sIndex) => (
                    <div key={schedule?.id} className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-500">排期 {sIndex + 1}</span>
                        <StatusBadge type="schedule" status={schedule?.status || ScheduleStatus.SCHEDULED} size="sm" />
                      </div>
                      <h4 className="font-semibold text-slate-800 mb-2">
                        {schedule?.event?.name}
                      </h4>
                      <div className="space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span>
                            {schedule && formatTime(schedule.startTime)} - {schedule && formatTime(schedule.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          <span>{schedule?.track?.name} · {schedule?.venue?.name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResolve(conflict.id, schedule?.id || '')}
                        className="w-full mt-4 btn-success text-sm py-2"
                      >
                        保留此排期
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                      系统检测到 {conflict.schedule1?.track?.name} 在同一时段被两个项目占用
                    </p>
                    <button
                      onClick={() => {
                        if (window.confirm('确定要取消两个排期吗？')) {
                          cancelSchedule(conflict.schedule1?.id || '');
                          cancelSchedule(conflict.schedule2?.id || '');
                        }
                      }}
                      className="btn-danger text-sm py-1.5"
                    >
                      <Trash2 size={16} />
                      全部取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {schedules.filter(s => s.status === ScheduleStatus.CANCELLED).length > 0 && (
        <div className="card p-6 mt-6">
          <h3 className="font-semibold text-slate-800 mb-4">已取消的排期</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">项目</th>
                  <th className="table-header">赛道</th>
                  <th className="table-header">时间</th>
                  <th className="table-header">状态</th>
                </tr>
              </thead>
              <tbody>
                {schedules
                  .filter(s => s.status === ScheduleStatus.CANCELLED)
                  .map(schedule => (
                    <tr key={schedule.id} className="opacity-60">
                      <td className="table-cell">
                        <p className="font-medium text-slate-800">{schedule.event?.name}</p>
                      </td>
                      <td className="table-cell">
                        <p>{schedule.track?.name}</p>
                      </td>
                      <td className="table-cell">
                        <p className="font-mono">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </p>
                      </td>
                      <td className="table-cell">
                        <StatusBadge type="schedule" status={schedule.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conflict;
