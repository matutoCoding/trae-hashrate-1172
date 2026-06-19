import React, { useState } from 'react';
import { Crown, Zap, User, ArrowUp, ArrowDown, UserPlus, Trash2, Info } from 'lucide-react';
import { useAppStore, useQueueWithDetails } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Priority as PriorityEnum, QueueStatus, Event } from '@/types';
import { formatRelativeTime } from '@/utils/time';

const Priority: React.FC = () => {
  const queueEntries = useQueueWithDetails();
  const insertWithPriority = useAppStore(state => state.insertWithPriority);
  const removeFromQueue = useAppStore(state => state.removeFromQueue);
  const moveQueueEntryUp = useAppStore(state => state.moveQueueEntryUp);
  const moveQueueEntryDown = useAppStore(state => state.moveQueueEntryDown);
  const changeEntryPriority = useAppStore(state => state.changeEntryPriority);
  const events = useAppStore(state => state.events);
  const athletes = useAppStore(state => state.athletes);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<PriorityEnum>(PriorityEnum.URGENT);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');

  const waitingEntries = queueEntries.filter(q => q.status === QueueStatus.WAITING);
  const vipEntries = waitingEntries.filter(q => q.priority === PriorityEnum.VIP);
  const urgentEntries = waitingEntries.filter(q => q.priority === PriorityEnum.URGENT);
  const normalEntries = waitingEntries.filter(q => q.priority === PriorityEnum.NORMAL);

  const handleInsertWithPriority = () => {
    const athlete = athletes.find(a => a.id === selectedAthlete);
    if (!athlete || !selectedEvent) return;
    
    insertWithPriority({
      eventId: selectedEvent,
      athleteId: athlete.id,
      athlete,
      priority: selectedPriority
    }, selectedPriority);
    
    setIsAddModalOpen(false);
    setSelectedAthlete('');
  };

  const handleMoveUp = (entryId: string) => {
    moveQueueEntryUp(entryId);
  };

  const handleMoveDown = (entryId: string) => {
    moveQueueEntryDown(entryId);
  };

  const handleChangePriority = (entryId: string, newPriority: PriorityEnum) => {
    changeEntryPriority(entryId, newPriority);
  };

  const handleRemove = (entryId: string) => {
    if (window.confirm('确定要将该运动员移出队列吗？')) {
      removeFromQueue(entryId);
    }
  };

  const getEventName = (event: Event) => {
    const genderLabel = event.gender === 'male' ? '男子' : event.gender === 'female' ? '女子' : '混合';
    return `${genderLabel} ${event.name}`;
  };

  const canMoveUp = (entry: typeof waitingEntries[0]) => {
    const waitingIndex = waitingEntries.findIndex(e => e.id === entry.id);
    if (waitingIndex <= 0) return false;
    const prevEntry = waitingEntries[waitingIndex - 1];
    return prevEntry ? prevEntry.priority === entry.priority : false;
  };

  const canMoveDown = (entry: typeof waitingEntries[0]) => {
    const waitingIndex = waitingEntries.findIndex(e => e.id === entry.id);
    if (waitingIndex >= waitingEntries.length - 1) return false;
    const nextEntry = waitingEntries[waitingIndex + 1];
    return nextEntry ? nextEntry.priority === entry.priority : false;
  };

  const priorityRules = [
    { level: PriorityEnum.VIP, label: 'VIP', color: 'from-amber-400 to-yellow-500', icon: Crown, description: '最高优先级，优先处理' },
    { level: PriorityEnum.URGENT, label: '加急', color: 'from-red-500 to-rose-500', icon: Zap, description: '紧急情况，优先排队首' },
    { level: PriorityEnum.NORMAL, label: '普通', color: 'from-blue-500 to-sky-500', icon: User, description: '正常排队，按顺序' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">管理检录队列优先级管理，支持VIP插队和加急处理</p>
        </div>
        <button className="btn-accent" onClick={() => setIsAddModalOpen(true)}>
          <UserPlus size={18} />
          临时加项
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {priorityRules.map(rule => {
          const Icon = rule.icon;
          const count = rule.level === PriorityEnum.VIP 
            ? vipEntries.length 
            : rule.level === PriorityEnum.URGENT 
              ? urgentEntries.length 
              : normalEntries.length;
          
          return (
            <div key={rule.level} className="card p-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${rule.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-800 font-display">{count}</span>
                    <span className="text-lg text-slate-500">人</span>
                  </div>
                  <p className="text-sm text-slate-500">{rule.label}优先级</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{rule.description}</p>
            </div>
          );
        })}
      </div>

      <div className="card p-6 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">优先级规则说明</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• <strong>VIP</strong> 优先于所有其他优先级，按加入时间排序</li>
                <li>• <strong>加急</strong> 优先于普通，按加入时间排序</li>
                <li>• <strong>普通</strong> 按加入时间顺序排列</li>
                <li>• 同优先级内可手动调整顺序，不会被加入时间覆盖</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">当前队列</h3>
          <span className="text-sm text-slate-500">
            共 {waitingEntries.length} 人等待
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header w-16">序号</th>
                <th className="table-header">优先级</th>
                <th className="table-header">运动员</th>
                <th className="table-header">项目</th>
                <th className="table-header">代表队</th>
                <th className="table-header">加入时间</th>
                <th className="table-header text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {waitingEntries.map((entry, index) => (
                <tr 
                  key={entry.id} 
                  className="hover:bg-slate-50 transition-colors animate-stagger"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td className="table-cell">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      entry.position === 1 
                        ? 'bg-accent text-white' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {entry.position}
                    </div>
                  </td>
                  <td className="table-cell">
                    <StatusBadge type="priority" status={entry.priority} />
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-slate-800">{entry.athlete.name}</p>
                      <p className="text-xs text-slate-500">{entry.athlete.bibNumber}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-slate-700">{entry.event?.name}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-slate-600">{entry.athlete.team}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-slate-500 text-sm">{formatRelativeTime(entry.joinTime)}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => handleMoveUp(entry.id)}
                          disabled={!canMoveUp(entry)}
                          className="p-2 hover:bg-slate-50 text-slate-500 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title={canMoveUp(entry) ? '上移' : '无法上移（已到同优先级顶部）'}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <div className="w-px bg-slate-200 h-full" />
                        <button 
                          onClick={() => handleMoveDown(entry.id)}
                          disabled={!canMoveDown(entry)}
                          className="p-2 hover:bg-slate-50 text-slate-500 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title={canMoveDown(entry) ? '下移' : '无法下移（已到同优先级底部）'}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                      <select 
                        value={entry.priority}
                        onChange={e => handleChangePriority(entry.id, e.target.value as PriorityEnum)}
                        className="ml-2 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value={PriorityEnum.VIP}>VIP</option>
                        <option value={PriorityEnum.URGENT}>加急</option>
                        <option value={PriorityEnum.NORMAL}>普通</option>
                      </select>
                      <button 
                        onClick={() => handleRemove(entry.id)}
                        className="ml-1 p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-warning transition-colors"
                        title="移出队列"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {waitingEntries.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">暂无等待人员</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setSelectedAthlete(''); }}
        title="临时加项 / 插队"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">优先级说明</h4>
                <p className="text-sm text-slate-600">
                  临时加项或加急处理的运动员将根据所选优先级插入到队列的对应位置。
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">选择优先级</label>
            <div className="grid grid-cols-3 gap-3">
              {priorityRules.map(rule => {
                const Icon = rule.icon;
                return (
                  <button
                    key={rule.level}
                    onClick={() => setSelectedPriority(rule.level)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedPriority === rule.level
                        ? `border-transparent bg-gradient-to-br ${rule.color} text-white shadow-lg`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon size={24} className="mx-auto mb-2" />
                    <p className="font-semibold">{rule.label}</p>
                    <p className={`text-xs ${selectedPriority === rule.level ? 'text-white/80' : 'text-slate-500'}`}>
                      {rule.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">选择项目</label>
            <select 
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
              className="input"
            >
              <option value="">请选择项目</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {getEventName(event)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">选择运动员</label>
            <select 
              value={selectedAthlete}
              onChange={e => setSelectedAthlete(e.target.value)}
              className="input"
            >
              <option value="">请选择运动员</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.bibNumber} - {athlete.name} ({athlete.team})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsAddModalOpen(false); setSelectedAthlete(''); }}
              className="btn-secondary"
            >
              取消
            </button>
            <button 
              onClick={handleInsertWithPriority}
              disabled={!selectedEvent || !selectedAthlete}
              className="btn-accent"
            >
              确认插队
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Priority;
