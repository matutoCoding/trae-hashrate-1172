import React, { useState, useMemo } from 'react';
import { Users, Check, X, Volume2, SkipForward, UserPlus, Maximize2, CheckSquare, Square, ListChecks, ArrowUpCircle } from 'lucide-react';
import { useAppStore, useQueueWithDetails } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { QueueStatus, Priority, Event, Athlete } from '@/types';
import { formatRelativeTime } from '@/utils/time';

const CheckIn: React.FC = () => {
  const queueEntries = useQueueWithDetails();
  const callNextNumber = useAppStore(state => state.callNextNumber);
  const updateQueueStatus = useAppStore(state => state.updateQueueStatus);
  const addToQueue = useAppStore(state => state.addToQueue);
  const events = useAppStore(state => state.events);
  const athletes = useAppStore(state => state.athletes);
  const currentCalledEntry = useAppStore(state => state.currentCalledEntry);
  
  const [selectedEvent, setSelectedEvent] = useState<string>(events[0]?.id || '');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [selectedSubstituteAthlete, setSelectedSubstituteAthlete] = useState<string>('');

  const waitingEntries = queueEntries.filter(q => 
    q.status === QueueStatus.WAITING && 
    (!selectedEvent || q.eventId === selectedEvent)
  );

  const calledEntries = queueEntries.filter(q => 
    q.status === QueueStatus.CALLED &&
    (!selectedEvent || q.eventId === selectedEvent)
  );

  const checkedInEntries = queueEntries.filter(q => 
    q.status === QueueStatus.CHECKED_IN &&
    (!selectedEvent || q.eventId === selectedEvent)
  );

  const handleCallNext = () => {
    const firstWaitingEvent = waitingEntries[0]?.eventId || selectedEvent;
    if (firstWaitingEvent) {
      callNextNumber(firstWaitingEvent);
    }
  };

  const handleCheckIn = (entryId: string) => {
    updateQueueStatus(entryId, QueueStatus.CHECKED_IN);
  };

  const handleMissed = (entryId: string) => {
    updateQueueStatus(entryId, QueueStatus.MISSED);
  };

  const handleAddToQueue = () => {
    const athlete = athletes.find(a => a.id === selectedAthlete);
    if (!athlete || !selectedEvent) return;
    
    addToQueue({
      eventId: selectedEvent,
      athleteId: athlete.id,
      athlete,
      priority: Priority.NORMAL
    });
    
    setIsAddModalOpen(false);
    setSelectedAthlete('');
  };

  const currentEventEntries = useMemo(() => {
    if (!selectedEvent) return queueEntries;
    return queueEntries.filter(q => q.eventId === selectedEvent);
  }, [queueEntries, selectedEvent]);

  const availableSubstituteAthletes = useMemo(() => {
    if (!selectedEvent) return [];
    const inQueueIds = new Set(queueEntries.filter(q => q.eventId === selectedEvent).map(q => q.athleteId));
    return athletes.filter(a => !inQueueIds.has(a.id)).slice(0, 50);
  }, [athletes, queueEntries, selectedEvent]);

  const toggleEntrySelection = (entryId: string) => {
    const newSelection = new Set(selectedEntryIds);
    if (newSelection.has(entryId)) {
      newSelection.delete(entryId);
    } else {
      newSelection.add(entryId);
    }
    setSelectedEntryIds(newSelection);
  };

  const toggleSelectAll = () => {
    const waitingIds = currentEventEntries.filter(e => e.status === QueueStatus.WAITING).map(e => e.id);
    if (waitingIds.every(id => selectedEntryIds.has(id))) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(waitingIds));
    }
  };

  const batchMarkCheckedIn = () => {
    selectedEntryIds.forEach(id => {
      updateQueueStatus(id, QueueStatus.CHECKED_IN);
    });
    setSelectedEntryIds(new Set());
  };

  const batchMarkMissed = () => {
    selectedEntryIds.forEach(id => {
      updateQueueStatus(id, QueueStatus.MISSED);
    });
    setSelectedEntryIds(new Set());
  };

  const handleSubstitute = () => {
    const athlete = athletes.find(a => a.id === selectedSubstituteAthlete);
    if (!athlete || !selectedEvent) return;
    
    addToQueue({
      eventId: selectedEvent,
      athleteId: athlete.id,
      athlete,
      priority: Priority.NORMAL
    });
    
    setIsSubstituteModalOpen(false);
    setSelectedSubstituteAthlete('');
  };

  const getEventName = (event: Event) => {
    const genderLabel = event.gender === 'male' ? '男子' : event.gender === 'female' ? '女子' : '混合';
    return `${genderLabel} ${event.name}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">现场检录管理，按优先级叫号</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedEvent}
            onChange={e => setSelectedEvent(e.target.value)}
            className="input text-sm w-auto"
          >
            <option value="">全部项目</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {getEventName(event)}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={toggleFullscreen}>
            <Maximize2 size={18} />
            大屏模式
          </button>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={18} />
            取号入队
          </button>
        </div>
      </div>

      {currentCalledEntry && (
        <div className="bg-gradient-to-r from-deep to-primary-700 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-blue-200 mb-2">当前叫号</p>
                <div className="text-8xl font-bold font-display animate-number-pop">
                  {currentCalledEntry.athlete.bibNumber}
                </div>
              </div>
              <div className="h-32 w-px bg-white/20" />
              <div>
                <p className="text-3xl font-semibold mb-2">{currentCalledEntry.athlete.name}</p>
                <p className="text-blue-200 text-lg mb-1">{currentCalledEntry.athlete.team}</p>
                <p className="text-blue-200">{currentCalledEntry.event?.name}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <StatusBadge type="priority" status={currentCalledEntry.priority} />
              <div className="flex gap-2">
                <button 
                  onClick={() => handleCheckIn(currentCalledEntry.id)}
                  className="bg-success hover:bg-success-light text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <Check size={20} />
                  检录完成
                </button>
                <button 
                  onClick={() => handleMissed(currentCalledEntry.id)}
                  className="bg-warning hover:bg-warning-light text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <X size={20} />
                  未到
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Users className="text-slate-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{waitingEntries.length}</p>
              <p className="text-sm text-slate-500">等待中</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <Volume2 className="text-accent" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{calledEntries.length}</p>
              <p className="text-sm text-slate-500">已叫号</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <Check className="text-success" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{checkedInEntries.length}</p>
              <p className="text-sm text-slate-500">已检录</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <SkipForward className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">
                {queueEntries.filter(q => q.status === QueueStatus.MISSED).length}
              </p>
              <p className="text-sm text-slate-500">未到</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800">等待队列</h3>
            <button 
              onClick={handleCallNext}
              disabled={waitingEntries.length === 0}
              className="btn-accent"
            >
              <Volume2 size={18} />
              叫下一号
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {waitingEntries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500">暂无等待人员</p>
              </div>
            ) : (
              waitingEntries.map((entry, index) => (
                <div 
                  key={entry.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors animate-stagger"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    entry.position === 1 
                      ? 'bg-accent text-white' 
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}>
                    {entry.position}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800">{entry.athlete.bibNumber}</span>
                      <span className="font-medium text-slate-800">{entry.athlete.name}</span>
                      <StatusBadge type="priority" status={entry.priority} size="sm" />
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {entry.athlete.team} · {entry.event?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{formatRelativeTime(entry.joinTime)}</p>
                    <StatusBadge type="queue" status={entry.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">已叫号</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {calledEntries.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm">暂无</p>
              ) : (
                calledEntries.map(entry => (
                  <div 
                    key={entry.id}
                    className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg border border-accent/20"
                  >
                    <span className="font-mono font-bold text-accent">{entry.athlete.bibNumber}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{entry.athlete.name}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleCheckIn(entry.id)}
                        className="p-1.5 rounded hover:bg-success/10 text-success"
                        title="检录完成"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => handleMissed(entry.id)}
                        className="p-1.5 rounded hover:bg-warning/10 text-warning"
                        title="未到"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">已检录</h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {checkedInEntries.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm">暂无</p>
              ) : (
                checkedInEntries.slice(0, 10).map(entry => (
                  <div 
                    key={entry.id}
                    className="flex items-center gap-3 p-3 bg-success/5 rounded-lg border border-success/20"
                  >
                    <span className="font-mono font-bold text-success">{entry.athlete.bibNumber}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{entry.athlete.name}</span>
                    <Check className="text-success" size={16} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ListChecks className="text-primary-600" size={24} />
            <h3 className="font-semibold text-slate-800 text-lg">
              分组名单
              {selectedEvent && events.find(e => e.id === selectedEvent) && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  - {getEventName(events.find(e => e.id === selectedEvent)!)}
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleSelectAll}
              className="btn-secondary !py-1.5 !px-3 !text-xs"
            >
              {currentEventEntries.filter(e => e.status === QueueStatus.WAITING).every(id => selectedEntryIds.has(id.id)) && currentEventEntries.some(e => e.status === QueueStatus.WAITING) ? (
                <><CheckSquare size={14} /> 取消全选</>
              ) : (
                <><Square size={14} /> 全选等待中</>
              )}
            </button>
            <button 
              onClick={batchMarkCheckedIn}
              disabled={selectedEntryIds.size === 0}
              className="btn-primary !py-1.5 !px-3 !text-xs"
            >
              <Check size={14} />
              批量标记到场 ({selectedEntryIds.size})
            </button>
            <button 
              onClick={batchMarkMissed}
              disabled={selectedEntryIds.size === 0}
              className="btn-secondary !py-1.5 !px-3 !text-xs"
            >
              <X size={14} />
              批量标记缺席
            </button>
            <button 
              onClick={() => { setIsSubstituteModalOpen(true); setSelectedSubstituteAthlete(''); }}
              className="btn-secondary !py-1.5 !px-3 !text-xs"
            >
              <ArrowUpCircle size={14} />
              替补上场
            </button>
          </div>
        </div>

        {!selectedEvent ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <Users className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">请先在顶部选择一个项目查看分组名单</p>
          </div>
        ) : currentEventEntries.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <Users className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">该项目暂无检录人员</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 border-b border-slate-200 w-12">选择</th>
                  <th className="text-left p-3 border-b border-slate-200 w-20">序号</th>
                  <th className="text-left p-3 border-b border-slate-200 w-28">号码</th>
                  <th className="text-left p-3 border-b border-slate-200">运动员</th>
                  <th className="text-left p-3 border-b border-slate-200">代表队</th>
                  <th className="text-left p-3 border-b border-slate-200 w-24">优先级</th>
                  <th className="text-left p-3 border-b border-slate-200 w-28">状态</th>
                  <th className="text-left p-3 border-b border-slate-200 w-48">入队时间</th>
                  <th className="text-left p-3 border-b border-slate-200 w-32 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {currentEventEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`hover:bg-slate-50 transition-colors ${selectedEntryIds.has(entry.id) ? 'bg-primary-50' : ''}`}>
                    <td className="p-3 border-b border-slate-100">
                      {entry.status === QueueStatus.WAITING && (
                        <button 
                          onClick={() => toggleEntrySelection(entry.id)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {selectedEntryIds.has(entry.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      )}
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <span className="font-mono text-slate-600">{entry.position || idx + 1}</span>
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <span className="font-mono font-bold text-slate-800">{entry.athlete.bibNumber}</span>
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <span className="font-medium text-slate-800">{entry.athlete.name}</span>
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <span className="text-slate-600">{entry.athlete.team}</span>
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <StatusBadge type="priority" status={entry.priority} size="sm" />
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <StatusBadge type="queue" status={entry.status} size="sm" />
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <span className="text-slate-500 text-xs">{formatRelativeTime(entry.joinTime)}</span>
                    </td>
                    <td className="p-3 border-b border-slate-100">
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === QueueStatus.WAITING && (
                          <>
                            <button 
                              onClick={() => updateQueueStatus(entry.id, QueueStatus.CHECKED_IN)}
                              className="p-1.5 rounded hover:bg-success/10 text-success"
                              title="到场"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => updateQueueStatus(entry.id, QueueStatus.MISSED)}
                              className="p-1.5 rounded hover:bg-warning/10 text-warning"
                              title="缺席"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        {entry.status === QueueStatus.CALLED && (
                          <button 
                            onClick={() => updateQueueStatus(entry.id, QueueStatus.CHECKED_IN)}
                            className="p-1.5 rounded hover:bg-success/10 text-success"
                            title="检录"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setSelectedAthlete(''); }}
        title="取号入队"
      >
        <div className="space-y-4">
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
              onClick={handleAddToQueue}
              disabled={!selectedEvent || !selectedAthlete}
              className="btn-primary"
            >
              确认入队
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isSubstituteModalOpen} 
        onClose={() => { setIsSubstituteModalOpen(false); setSelectedSubstituteAthlete(''); }}
        title="替补上场"
      >
        <div className="space-y-4">
          {!selectedEvent ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">请先在顶部选择一个项目，再添加替补运动员</p>
            </div>
          ) : (
            <>
              <div>
                <label className="label">当前项目</label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm font-medium text-slate-800">
                  {events.find(e => e.id === selectedEvent) ? getEventName(events.find(e => e.id === selectedEvent)!) : '-'}
                </div>
              </div>
              <div>
                <label className="label">选择替补运动员</label>
                <select 
                  value={selectedSubstituteAthlete}
                  onChange={e => setSelectedSubstituteAthlete(e.target.value)}
                  className="input"
                >
                  <option value="">请选择替补运动员</option>
                  {availableSubstituteAthletes.map(athlete => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.bibNumber} - {athlete.name} ({athlete.team})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  仅显示未在该项目检录队列中的运动员
                </p>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsSubstituteModalOpen(false); setSelectedSubstituteAthlete(''); }}
              className="btn-secondary"
            >
              取消
            </button>
            <button 
              onClick={handleSubstitute}
              disabled={!selectedEvent || !selectedSubstituteAthlete}
              className="btn-primary"
            >
              <ArrowUpCircle size={18} />
              确认替补
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CheckIn;
