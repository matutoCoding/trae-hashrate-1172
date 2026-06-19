import React, { useState } from 'react';
import { Plus, Calendar, Clock, MapPin, Trash2, Edit2, X, Check, AlertCircle, PlusCircle, Building, Target, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore, useSchedulesWithDetails, useTracksWithVenue } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { ScheduleStatus, Event, Venue, Track } from '@/types';
import { formatTime, formatDate, createDateTime } from '@/utils/time';
import { isTimeOverlap } from '@/utils/conflict';

const Schedule: React.FC = () => {
  const schedules = useSchedulesWithDetails();
  const tracks = useTracksWithVenue();
  const venues = useAppStore(state => state.venues);
  const events = useAppStore(state => state.events);
  const createSchedule = useAppStore(state => state.createSchedule);
  const cancelSchedule = useAppStore(state => state.cancelSchedule);
  const addVenue = useAppStore(state => state.addVenue);
  const addTrack = useAppStore(state => state.addTrack);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [expandedVenues, setExpandedVenues] = useState<Set<string>>(new Set(venues.map(v => v.id)));
  const [selectedVenueForTrack, setSelectedVenueForTrack] = useState('');
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueLocation, setNewVenueLocation] = useState('');
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackType, setNewTrackType] = useState<'running' | 'field'>('running');
  const [venueFormError, setVenueFormError] = useState('');
  const [trackFormError, setTrackFormError] = useState('');

  const runningTracks = tracks.filter(t => t.type === 'running');
  const fieldTracks = tracks.filter(t => t.type === 'field');
  const activeSchedules = schedules.filter(s => s.status !== ScheduleStatus.CANCELLED);

  const toggleVenue = (venueId: string) => {
    const newExpanded = new Set(expandedVenues);
    if (newExpanded.has(venueId)) {
      newExpanded.delete(venueId);
    } else {
      newExpanded.add(venueId);
    }
    setExpandedVenues(newExpanded);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!selectedTrack) errors.track = '请选择赛道';
    if (!selectedEvent) errors.event = '请选择项目';
    if (!startTime) errors.startTime = '请选择开始时间';
    if (!endTime) errors.endTime = '请选择结束时间';
    
    if (startTime && endTime) {
      const start = createDateTime(selectedDate, startTime);
      const end = createDateTime(selectedDate, endTime);
      if (end <= start) {
        errors.endTime = '结束时间必须晚于开始时间';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkForConflicts = () => {
    if (!selectedTrack || !startTime || !endTime) {
      setConflicts([]);
      return;
    }
    
    const start = createDateTime(selectedDate, startTime);
    const end = createDateTime(selectedDate, endTime);
    
    const conflictSchedules = schedules.filter(s => {
      if (s.trackId !== selectedTrack) return false;
      if (s.status === ScheduleStatus.CANCELLED) return false;
      
      const sDate = formatDate(s.startTime);
      if (sDate !== selectedDate) return false;
      
      return isTimeOverlap(start, end, s.startTime, s.endTime);
    });
    
    setConflicts(conflictSchedules.map(c => `${c.event?.name} (${formatTime(c.startTime)}-${formatTime(c.endTime)})`));
  };

  const handleCreateSchedule = () => {
    if (!validateForm()) return;
    
    const start = createDateTime(selectedDate, startTime);
    const end = createDateTime(selectedDate, endTime);
    
    const result = createSchedule({
      trackId: selectedTrack,
      eventId: selectedEvent,
      startTime: start,
      endTime: end,
      status: ScheduleStatus.SCHEDULED
    });
    
    if (result.success) {
      setIsModalOpen(false);
      resetForm();
    } else if (result.conflicts) {
      setConflicts(result.conflicts.map(c => c.description));
    }
  };

  const resetForm = () => {
    setSelectedTrack('');
    setSelectedEvent('');
    setStartTime('09:00');
    setEndTime('09:30');
    setConflicts([]);
    setFormErrors({});
  };

  const handleCancelSchedule = (scheduleId: string) => {
    if (window.confirm('确定要取消该排期吗？取消后时段将被释放。')) {
      cancelSchedule(scheduleId);
    }
  };

  const getEventCategory = (event: Event) => {
    const genderLabel = event.gender === 'male' ? '男子' : event.gender === 'female' ? '女子' : '混合';
    return `${genderLabel} ${event.name}`;
  };

  const handleAddVenue = () => {
    if (!newVenueName.trim()) {
      setVenueFormError('请输入场地名称');
      return;
    }
    
    addVenue({
      name: newVenueName.trim(),
      location: newVenueLocation.trim() || '',
      trackCount: 0
    });
    
    setIsVenueModalOpen(false);
    setNewVenueName('');
    setNewVenueLocation('');
    setVenueFormError('');
  };

  const openAddTrackModal = (venueId: string) => {
    setSelectedVenueForTrack(venueId);
    setNewTrackName('');
    setNewTrackType('running');
    setTrackFormError('');
    setIsTrackModalOpen(true);
  };

  const handleAddTrack = () => {
    if (!newTrackName.trim()) {
      setTrackFormError('请输入赛道/场地名称');
      return;
    }
    
    addTrack({
      name: newTrackName.trim(),
      type: newTrackType,
      venueId: selectedVenueForTrack,
      available: true
    });
    
    if (!expandedVenues.has(selectedVenueForTrack)) {
      setExpandedVenues(prev => new Set([...prev, selectedVenueForTrack]));
    }
    
    setIsTrackModalOpen(false);
    setNewTrackName('');
    setSelectedVenueForTrack('');
    setTrackFormError('');
  };

  const getTracksByVenue = (venueId: string) => {
    return tracks.filter(t => t.venueId === venueId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">管理场地赛道的项目排期分配</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          新建排期
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Calendar className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{activeSchedules.length}</p>
              <p className="text-sm text-slate-500">总排期数</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Clock className="text-accent" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">
                {activeSchedules.filter(s => s.status === ScheduleStatus.IN_PROGRESS).length}
              </p>
              <p className="text-sm text-slate-500">进行中</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <Check className="text-success" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">
                {activeSchedules.filter(s => s.status === ScheduleStatus.COMPLETED).length}
              </p>
              <p className="text-sm text-slate-500">已完成</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <MapPin className="text-slate-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{tracks.length}</p>
              <p className="text-sm text-slate-500">可用赛道</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">场地赛道</h3>
              <button 
                onClick={() => { setNewVenueName(''); setNewVenueLocation(''); setVenueFormError(''); setIsVenueModalOpen(true); }}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                <PlusCircle size={16} />
                新增场地
              </button>
            </div>
            
            <div className="space-y-3">
              {venues.map(venue => {
                const venueTracks = getTracksByVenue(venue.id);
                const isExpanded = expandedVenues.has(venue.id);
                const runningVenueTracks = venueTracks.filter(t => t.type === 'running');
                const fieldVenueTracks = venueTracks.filter(t => t.type === 'field');
                
                return (
                  <div key={venue.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div 
                      className="flex items-center gap-2 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleVenue(venue.id)}
                    >
                      {isExpanded ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                      <Building size={18} className="text-primary-600" />
                      <span className="font-medium text-slate-800 flex-1">{venue.name}</span>
                      <span className="text-xs text-slate-500">{venueTracks.length} 条</span>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-3 space-y-3">
                        {runningVenueTracks.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-2 font-medium">径赛赛道</p>
                            <div className="space-y-1">
                              {runningVenueTracks.map(track => (
                                <div 
                                  key={track.id}
                                  className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                                    selectedTrack === track.id 
                                      ? 'border-primary-500 bg-primary-50' 
                                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                                  }`}
                                  onClick={() => setSelectedTrack(track.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-800">{track.name}</span>
                                    {track.available ? (
                                      <span className="text-xs text-success">可用</span>
                                    ) : (
                                      <span className="text-xs text-warning">占用</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {fieldVenueTracks.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-2 font-medium">田赛场地</p>
                            <div className="space-y-1">
                              {fieldVenueTracks.map(track => (
                                <div 
                                  key={track.id}
                                  className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                                    selectedTrack === track.id 
                                      ? 'border-primary-500 bg-primary-50' 
                                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                                  }`}
                                  onClick={() => setSelectedTrack(track.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-800">{track.name}</span>
                                    {track.available ? (
                                      <span className="text-xs text-success">可用</span>
                                    ) : (
                                      <span className="text-xs text-warning">占用</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {venueTracks.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-2">暂无赛道</p>
                        )}
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); openAddTrackModal(venue.id); }}
                          className="w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-dashed border-primary-300 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={14} />
                          添加赛道
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-800">排期列表</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="input text-sm w-auto"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">项目</th>
                    <th className="table-header">赛道</th>
                    <th className="table-header">时间</th>
                    <th className="table-header">状态</th>
                    <th className="table-header text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules
                    .filter(s => formatDate(s.startTime) === selectedDate)
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .map((schedule, index) => (
                    <tr 
                      key={schedule.id} 
                      className="hover:bg-slate-50 transition-colors animate-stagger"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-800">
                            {schedule.event && getEventCategory(schedule.event)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {schedule.event?.type === 'track' ? '径赛' : '田赛'}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="text-slate-800">{schedule.track?.name}</p>
                          <p className="text-xs text-slate-500">{schedule.venue?.name}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <p className="font-mono text-slate-800">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </p>
                      </td>
                      <td className="table-cell">
                        <StatusBadge type="schedule" status={schedule.status} />
                      </td>
                      <td className="table-cell text-right">
                        {schedule.status === ScheduleStatus.SCHEDULED && (
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-primary-600 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleCancelSchedule(schedule.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-warning transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {schedules.filter(s => formatDate(s.startTime) === selectedDate).length === 0 && (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
                <p className="text-slate-500">当日暂无排期</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary mt-4"
                >
                  <Plus size={18} />
                  创建排期
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="新建排期"
        size="lg"
      >
        <div className="space-y-4">
          {conflicts.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-warning mb-2">检测到时段冲突</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {conflicts.map((c, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-warning rounded-full" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">日期</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); checkForConflicts(); }}
                className="input"
              />
            </div>
            <div>
              <label className="label">赛道 <span className="text-warning">*</span></label>
              <select 
                value={selectedTrack}
                onChange={e => { setSelectedTrack(e.target.value); checkForConflicts(); }}
                className={`input ${formErrors.track ? 'input-error' : ''}`}
              >
                <option value="">请选择赛道</option>
                <optgroup label="径赛赛道">
                  {runningTracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name} - {track.venue?.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="田赛场地">
                  {fieldTracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name} - {track.venue?.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              {formErrors.track && <p className="text-xs text-warning mt-1">{formErrors.track}</p>}
            </div>
          </div>

          <div>
            <label className="label">项目 <span className="text-warning">*</span></label>
            <select 
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
              className={`input ${formErrors.event ? 'input-error' : ''}`}
            >
              <option value="">请选择项目</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {getEventCategory(event)}
                </option>
              ))}
            </select>
            {formErrors.event && <p className="text-xs text-warning mt-1">{formErrors.event}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">开始时间 <span className="text-warning">*</span></label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => { setStartTime(e.target.value); checkForConflicts(); }}
                className={`input ${formErrors.startTime ? 'input-error' : ''}`}
              />
              {formErrors.startTime && <p className="text-xs text-warning mt-1">{formErrors.startTime}</p>}
            </div>
            <div>
              <label className="label">结束时间 <span className="text-warning">*</span></label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => { setEndTime(e.target.value); checkForConflicts(); }}
                className={`input ${formErrors.endTime ? 'input-error' : ''}`}
              />
              {formErrors.endTime && <p className="text-xs text-warning mt-1">{formErrors.endTime}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="btn-secondary"
            >
              取消
            </button>
            <button 
              onClick={handleCreateSchedule}
              disabled={conflicts.length > 0}
              className="btn-primary"
            >
              <Check size={18} />
              确认排期
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isVenueModalOpen} 
        onClose={() => { setIsVenueModalOpen(false); setVenueFormError(''); }}
        title="新增场地"
      >
        <div className="space-y-4">
          <div>
            <label className="label">场地名称 <span className="text-warning">*</span></label>
            <input 
              type="text" 
              value={newVenueName}
              onChange={e => { setNewVenueName(e.target.value); setVenueFormError(''); }}
              placeholder="例如：主体育场"
              className={`input ${venueFormError ? 'input-error' : ''}`}
            />
            {venueFormError && <p className="text-xs text-warning mt-1">{venueFormError}</p>}
          </div>
          <div>
            <label className="label">位置/说明</label>
            <input 
              type="text" 
              value={newVenueLocation}
              onChange={e => setNewVenueLocation(e.target.value)}
              placeholder="例如：东门入口旁"
              className="input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsVenueModalOpen(false); setVenueFormError(''); }}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleAddVenue} className="btn-primary">
              <Check size={18} />
              确认添加
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isTrackModalOpen} 
        onClose={() => { setIsTrackModalOpen(false); setTrackFormError(''); }}
        title="新增赛道/场地"
      >
        <div className="space-y-4">
          <div>
            <label className="label">所属场地</label>
            <select 
              value={selectedVenueForTrack}
              onChange={e => setSelectedVenueForTrack(e.target.value)}
              className="input"
            >
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">类型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewTrackType('running')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  newTrackType === 'running'
                    ? 'border-accent bg-accent/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Clock size={24} className={`mx-auto mb-2 ${newTrackType === 'running' ? 'text-accent' : 'text-slate-400'}`} />
                <p className={`font-semibold ${newTrackType === 'running' ? 'text-accent' : 'text-slate-700'}`}>径赛赛道</p>
                <p className={`text-xs ${newTrackType === 'running' ? 'text-accent/70' : 'text-slate-500'}`}>跑步、跨栏、接力等</p>
              </button>
              <button
                onClick={() => setNewTrackType('field')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  newTrackType === 'field'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Target size={24} className={`mx-auto mb-2 ${newTrackType === 'field' ? 'text-primary-600' : 'text-slate-400'}`} />
                <p className={`font-semibold ${newTrackType === 'field' ? 'text-primary-600' : 'text-slate-700'}`}>田赛场地</p>
                <p className={`text-xs ${newTrackType === 'field' ? 'text-primary-600/70' : 'text-slate-500'}`}>跳远、跳高、投掷等</p>
              </button>
            </div>
          </div>
          <div>
            <label className="label">名称 <span className="text-warning">*</span></label>
            <input 
              type="text" 
              value={newTrackName}
              onChange={e => { setNewTrackName(e.target.value); setTrackFormError(''); }}
              placeholder={newTrackType === 'running' ? '例如：第1跑道' : '例如：跳高高地'}
              className={`input ${trackFormError ? 'input-error' : ''}`}
            />
            {trackFormError && <p className="text-xs text-warning mt-1">{trackFormError}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsTrackModalOpen(false); setTrackFormError(''); }}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleAddTrack} className="btn-primary">
              <Check size={18} />
              确认添加
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Schedule;
