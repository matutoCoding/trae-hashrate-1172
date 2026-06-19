import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Award, Plus, Edit2, Trash2, Download, Filter } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Result, Event, EventType, EntryStatus } from '@/types';

const Results: React.FC = () => {
  const results = useAppStore(state => state.results);
  const events = useAppStore(state => state.events);
  const athletes = useAppStore(state => state.athletes);
  const addResult = useAppStore(state => state.addResult);
  const updateResult = useAppStore(state => state.updateResult);
  const deleteResult = useAppStore(state => state.deleteResult);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [formData, setFormData] = useState({
    eventId: '',
    athleteId: '',
    resultValue: '',
    resultUnit: 's',
    rank: 0,
    notes: ''
  });

  const filteredResults = useMemo(() => {
    if (!selectedEvent) return results;
    return results.filter(r => r.eventId === selectedEvent);
  }, [results, selectedEvent]);

  const resultsWithDetails = useMemo(() => {
    return filteredResults
      .map(result => ({
        ...result,
        event: events.find(e => e.id === result.eventId),
        athlete: athletes.find(a => a.id === result.athleteId)
      }))
      .filter(r => r.event && r.athlete)
      .sort((a, b) => {
        if (a.eventId !== b.eventId) return a.eventId.localeCompare(b.eventId);
        return a.rank - b.rank;
      });
  }, [filteredResults, events, athletes]);

  const groupedResults = useMemo(() => {
    const grouped: Record<string, typeof resultsWithDetails> = {};
    resultsWithDetails.forEach(result => {
      if (!grouped[result.eventId]) {
        grouped[result.eventId] = [];
      }
      grouped[result.eventId].push(result);
    });
    return grouped;
  }, [resultsWithDetails]);

  const handleOpenAddModal = () => {
    setEditingResult(null);
    setFormData({
      eventId: events[0]?.id || '',
      athleteId: athletes[0]?.id || '',
      resultValue: '',
      resultUnit: 's',
      rank: 0,
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleEdit = (result: Result) => {
    setEditingResult(result);
    setFormData({
      eventId: result.eventId,
      athleteId: result.athleteId,
      resultValue: result.resultValue.toString(),
      resultUnit: result.resultUnit,
      rank: result.rank,
      notes: result.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = (resultId: string) => {
    if (window.confirm('确定删除该成绩记录吗？')) {
      deleteResult(resultId);
    }
  };

  const handleSubmit = () => {
    if (!formData.eventId || !formData.athleteId || !formData.resultValue) return;

    const athlete = athletes.find(a => a.id === formData.athleteId);
    if (!athlete) return;

    const resultData = {
      eventId: formData.eventId,
      athleteId: formData.athleteId,
      athlete,
      resultValue: parseFloat(formData.resultValue),
      resultUnit: formData.resultUnit,
      rank: formData.rank,
      status: EntryStatus.FINISHED,
      notes: formData.notes
    };

    if (editingResult) {
      updateResult(editingResult.id, resultData);
    } else {
      addResult(resultData);
    }

    setIsAddModalOpen(false);
    setEditingResult(null);
  };

  const getEventName = (event: Event) => {
    const genderLabel = event.gender === 'male' ? '男子' : event.gender === 'female' ? '女子' : '混合';
    return `${genderLabel} ${event.name}`;
  };

  const formatResult = (value: number, unit: string) => {
    if (unit === 's') {
      if (value >= 60) {
        const mins = Math.floor(value / 60);
        const secs = (value % 60).toFixed(2);
        return `${mins}'${secs}"`;
      }
      return `${value.toFixed(2)} s`;
    }
    if (unit === 'm') {
      return `${value.toFixed(2)} m`;
    }
    return `${value} ${unit}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-500" size={24} />;
    if (rank === 2) return <Medal className="text-slate-400" size={24} />;
    if (rank === 3) return <Award className="text-amber-700" size={24} />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-slate-600">{rank}</span>;
  };

  const getTotalMedals = () => {
    const medalCounts: Record<string, { gold: number; silver: number; bronze: number; total: number }> = {};
    
    results.forEach(result => {
      const athlete = athletes.find(a => a.id === result.athleteId);
      if (!athlete) return;
      
      if (!medalCounts[athlete.team]) {
        medalCounts[athlete.team] = { gold: 0, silver: 0, bronze: 0, total: 0 };
      }
      
      if (result.rank === 1) medalCounts[athlete.team].gold++;
      else if (result.rank === 2) medalCounts[athlete.team].silver++;
      else if (result.rank === 3) medalCounts[athlete.team].bronze++;
      medalCounts[athlete.team].total++;
    });

    return Object.entries(medalCounts)
      .map(([team, counts]) => ({ team, ...counts }))
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        if (b.bronze !== a.bronze) return b.bronze - a.bronze;
        return b.total - a.total;
      });
  };

  const medalRanking = getTotalMedals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">成绩录入与排名管理</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
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
          </div>
          <button className="btn-secondary">
            <Download size={18} />
            导出成绩
          </button>
          <button className="btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} />
            录入成绩
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{results.length}</p>
              <p className="text-sm text-slate-500">成绩记录</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Medal className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">{medalRanking.length}</p>
              <p className="text-sm text-slate-500">参赛队伍</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Award className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">
                {medalRanking.reduce((sum, m) => sum + m.gold, 0)}
              </p>
              <p className="text-sm text-slate-500">金牌总数</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <Award className="text-white" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 font-display">
                {medalRanking.reduce((sum, m) => sum + m.total, 0)}
              </p>
              <p className="text-sm text-slate-500">奖牌总数</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-6">
          <h3 className="font-semibold text-slate-800 mb-6">成绩榜</h3>
          
          {Object.keys(groupedResults).length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">暂无成绩记录</p>
            </div>
          ) : (
            Object.entries(groupedResults).map(([eventId, eventResults]) => {
              const event = eventResults[0].event;
              if (!event) return null;

              return (
                <div key={eventId} className="mb-8 last:mb-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-1 h-8 rounded-full ${
                      event.type === EventType.TRACK ? 'bg-accent' : 'bg-primary-600'
                    }`} />
                    <h4 className="text-lg font-semibold text-slate-800">{getEventName(event)}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      event.type === EventType.TRACK 
                        ? 'bg-accent/10 text-accent' 
                        : 'bg-primary-100 text-primary-700'
                    }`}>
                      {event.type === EventType.TRACK ? '径赛' : '田赛'}
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-header w-20">名次</th>
                          <th className="table-header">运动员</th>
                          <th className="table-header">号码</th>
                          <th className="table-header">代表队</th>
                          <th className="table-header">成绩</th>
                          <th className="table-header">备注</th>
                          <th className="table-header text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventResults.map(result => (
                          <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center justify-center">
                                {getRankIcon(result.rank)}
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="font-medium text-slate-800">{result.athlete?.name}</span>
                            </td>
                            <td className="table-cell">
                              <span className="font-mono text-slate-600">{result.athlete?.bibNumber}</span>
                            </td>
                            <td className="table-cell">
                              <span className="text-slate-600">{result.athlete?.team}</span>
                            </td>
                            <td className="table-cell">
                              <span className={`font-mono font-bold ${
                                result.rank === 1 ? 'text-yellow-600' : 
                                result.rank === 2 ? 'text-slate-500' : 
                                result.rank === 3 ? 'text-amber-700' : 'text-slate-700'
                              }`}>
                                {formatResult(result.resultValue, result.resultUnit)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="text-slate-500 text-sm">{result.notes || '-'}</span>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => handleEdit(result)}
                                  className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-primary-600 transition-colors"
                                  title="编辑"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(result.id)}
                                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-warning transition-colors"
                                  title="删除"
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
                </div>
              );
            })
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-6">奖牌榜</h3>
          
          {medalRanking.length === 0 ? (
            <div className="text-center py-12">
              <Medal className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500">暂无奖牌数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {medalRanking.map((teamData, index) => (
                <div 
                  key={teamData.team}
                  className={`p-4 rounded-xl ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' :
                    index === 1 ? 'bg-gradient-to-r from-slate-50 to-zinc-50 border border-slate-200' :
                    index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200' :
                    'bg-slate-50'
                  } animate-stagger`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-slate-400 text-white' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-white text-slate-600 border border-slate-200'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{teamData.team}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Trophy size={14} className="text-yellow-500" />
                          <span className="text-sm font-medium">{teamData.gold}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Medal size={14} className="text-slate-400" />
                          <span className="text-sm font-medium">{teamData.silver}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Award size={14} className="text-amber-700" />
                          <span className="text-sm font-medium">{teamData.bronze}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800 font-display">{teamData.total}</p>
                      <p className="text-xs text-slate-500">奖牌总数</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setEditingResult(null); }}
        title={editingResult ? "编辑成绩" : "录入成绩"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">选择项目</label>
            <select 
              value={formData.eventId}
              onChange={e => setFormData({ ...formData, eventId: e.target.value })}
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
              value={formData.athleteId}
              onChange={e => setFormData({ ...formData, athleteId: e.target.value })}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">成绩值</label>
              <input 
                type="number"
                step="0.01"
                value={formData.resultValue}
                onChange={e => setFormData({ ...formData, resultValue: e.target.value })}
                className="input"
                placeholder="例如: 10.5"
              />
            </div>
            <div>
              <label className="label">单位</label>
              <select 
                value={formData.resultUnit}
                onChange={e => setFormData({ ...formData, resultUnit: e.target.value })}
                className="input"
              >
                <option value="s">秒 (s)</option>
                <option value="m">米 (m)</option>
                <option value="cm">厘米 (cm)</option>
                <option value="pt">分 (pt)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">名次</label>
            <input 
              type="number"
              min="1"
              value={formData.rank || ''}
              onChange={e => setFormData({ ...formData, rank: parseInt(e.target.value) || 0 })}
              className="input"
              placeholder="例如: 1"
            />
          </div>
          <div>
            <label className="label">备注</label>
            <input 
              type="text"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              placeholder="破纪录、DQ等"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsAddModalOpen(false); setEditingResult(null); }}
              className="btn-secondary"
            >
              取消
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!formData.eventId || !formData.athleteId || !formData.resultValue}
              className="btn-primary"
            >
              {editingResult ? '保存修改' : '确认录入'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Results;
