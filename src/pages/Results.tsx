import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Award, Plus, Edit2, Trash2, Download, Filter, Upload, Info, CheckCircle, AlertCircle, Eye, EyeOff, Send, RotateCcw, ChevronRight, ArrowRight, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Result, Event, EventType, EntryStatus, Athlete, QueueStatus, Priority } from '@/types';

interface PendingResult {
  athleteId: string;
  athlete?: Athlete;
  resultValue: number;
  resultUnit: string;
  notes?: string;
  parsedSuccess: boolean;
  errorMessage?: string;
}

interface PreviewResult {
  athleteId: string;
  athlete: Athlete;
  resultValue: number;
  resultUnit: string;
  rank: number;
  notes?: string;
  isNew: boolean;
  oldRank?: number;
  rankChange?: number;
}

const Results: React.FC = () => {
  const results = useAppStore(state => state.results);
  const events = useAppStore(state => state.events);
  const athletes = useAppStore(state => state.athletes);
  const addResult = useAppStore(state => state.addResult);
  const updateResult = useAppStore(state => state.updateResult);
  const deleteResult = useAppStore(state => state.deleteResult);
  const publishResults = useAppStore(state => state.publishResults);
  const unpublishResults = useAppStore(state => state.unpublishResults);
  const addEvent = useAppStore(state => state.addEvent);
  const addQueueEntry = useAppStore(state => state.addToQueue);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [batchEventId, setBatchEventId] = useState<string>('');
  const [batchPasteText, setBatchPasteText] = useState<string>('');
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [batchStage, setBatchStage] = useState<'paste' | 'parse' | 'preview' | 'confirm'>('paste');
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advancingEventId, setAdvancingEventId] = useState<string>('');
  const [advanceCount, setAdvanceCount] = useState<number>(8);
  const [advanceMode, setAdvanceMode] = useState<'count' | 'percent'>('count');
  const [nextRoundName, setNextRoundName] = useState<string>('');
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
      notes: formData.notes,
      published: false
    };

    if (editingResult) {
      updateResult(editingResult.id, resultData);
    } else {
      addResult(resultData);
    }

    setIsAddModalOpen(false);
    setEditingResult(null);
  };

  const handleOpenBatchModal = () => {
    setBatchEventId(events[0]?.id || '');
    setBatchPasteText('');
    setPendingResults([]);
    setPreviewResults([]);
    setBatchStage('paste');
    setIsBatchModalOpen(true);
  };

  const parseBatchPaste = () => {
    if (!batchEventId || !batchPasteText.trim()) return;
    
    const lines = batchPasteText.trim().split(/\r?\n/);
    const parsed: PendingResult[] = [];
    
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      
      const parts = line.split(/\t|,|，|\|/).map(p => p.trim());
      if (parts.length < 2) {
        parsed.push({
          athleteId: '',
          resultValue: 0,
          resultUnit: '',
          parsedSuccess: false,
          errorMessage: `第${idx + 1}行：格式不正确，至少需要号码/姓名和成绩`
        });
        return;
      }
      
      const identifier = parts[0];
      const valueStr = parts[1];
      const notes = parts[2] || '';
      
      let athlete = athletes.find(a => 
        a.bibNumber.toLowerCase() === identifier.toLowerCase() ||
        a.name === identifier
      );
      
      if (!athlete) {
        const foundByName = athletes.find(a => a.name.includes(identifier) || identifier.includes(a.name));
        if (foundByName) athlete = foundByName;
      }
      
      const value = parseFloat(valueStr);
      if (!athlete || isNaN(value)) {
        parsed.push({
          athleteId: '',
          resultValue: isNaN(value) ? 0 : value,
          resultUnit: '',
          parsedSuccess: false,
          errorMessage: `第${idx + 1}行：${!athlete ? '找不到运动员' : '成绩格式错误'} - "${line}"`
        });
        return;
      }
      
      const event = events.find(e => e.id === batchEventId);
      const defaultUnit = event?.type === 'field' ? 'm' : 's';
      
      parsed.push({
        athleteId: athlete.id,
        athlete,
        resultValue: value,
        resultUnit: defaultUnit,
        notes,
        parsedSuccess: true
      });
    });
    
    setPendingResults(parsed);
    setBatchStage('parse');
  };

  const generatePreview = () => {
    if (!batchEventId) return;
    
    const event = events.find(e => e.id === batchEventId);
    const isFieldEvent = event?.type === 'field';
    const successfulPendings = pendingResults.filter(p => p.parsedSuccess);
    const existingEventResults = results.filter(r => r.eventId === batchEventId);
    
    const athleteExistingMap = new Map<string, Result>();
    existingEventResults.forEach(r => athleteExistingMap.set(r.athleteId, r));
    
    const merged = new Map<string, { resultValue: number; resultUnit: string; notes?: string; athlete: Athlete; isNew: boolean; oldRank?: number }>();
    
    existingEventResults.forEach(r => {
      const athlete = athletes.find(a => a.id === r.athleteId);
      if (athlete) {
        merged.set(r.athleteId, {
          resultValue: r.resultValue,
          resultUnit: r.resultUnit,
          notes: r.notes,
          athlete,
          isNew: false,
          oldRank: r.rank
        });
      }
    });
    
    successfulPendings.forEach(p => {
      if (p.athlete) {
        const existing = merged.get(p.athleteId);
        merged.set(p.athleteId, {
          resultValue: p.resultValue,
          resultUnit: p.resultUnit,
          notes: p.notes || existing?.notes,
          athlete: p.athlete,
          isNew: !existing,
          oldRank: existing?.oldRank
        });
      }
    });
    
    const mergedList = Array.from(merged.values());
    const sorted = [...mergedList].sort((a, b) => {
      if (isFieldEvent) {
        return b.resultValue - a.resultValue;
      } else {
        return a.resultValue - b.resultValue;
      }
    });
    
    const previews: PreviewResult[] = sorted.map((item, idx) => ({
      athleteId: item.athlete.id,
      athlete: item.athlete,
      resultValue: item.resultValue,
      resultUnit: item.resultUnit,
      rank: idx + 1,
      notes: item.notes,
      isNew: item.isNew,
      oldRank: item.oldRank,
      rankChange: item.oldRank ? idx + 1 - item.oldRank : undefined
    }));
    
    setPreviewResults(previews);
    setBatchStage('preview');
  };

  const confirmBatchImport = () => {
    if (!batchEventId) return;
    
    const successfulPendings = pendingResults.filter(p => p.parsedSuccess);
    const athleteExistingMap = new Map<string, Result>();
    const existingEventResults = results.filter(r => r.eventId === batchEventId);
    
    existingEventResults.forEach(r => athleteExistingMap.set(r.athleteId, r));
    
    successfulPendings.forEach(p => {
      const existing = athleteExistingMap.get(p.athleteId);
      const athlete = athletes.find(a => a.id === p.athleteId);
      if (!athlete) return;
      
      const resultData = {
        eventId: batchEventId,
        athleteId: p.athleteId,
        athlete,
        resultValue: p.resultValue,
        resultUnit: p.resultUnit,
        rank: 0,
        status: EntryStatus.FINISHED,
        notes: p.notes,
        published: false
      };
      
      if (existing) {
        updateResult(existing.id, resultData);
      } else {
        addResult(resultData);
      }
    });
    
    setIsBatchModalOpen(false);
    setBatchStage('confirm');
  };

  const advancingEvent = useMemo(() => events.find(e => e.id === advancingEventId), [events, advancingEventId]);
  const advancingEventResults = useMemo(() => {
    if (!advancingEventId) return [];
    return resultsWithDetails.filter(r => r.eventId === advancingEventId);
  }, [resultsWithDetails, advancingEventId]);

  const advancingQualified = useMemo(() => {
    if (advancingEventResults.length === 0) return [];
    let count = advanceCount;
    if (advanceMode === 'percent') {
      count = Math.ceil(advancingEventResults.length * (advanceCount / 100));
    }
    count = Math.min(count, advancingEventResults.length);
    return advancingEventResults.slice(0, count);
  }, [advancingEventResults, advanceCount, advanceMode]);

  const handleConfirmAdvance = () => {
    if (!advancingEvent || advancingQualified.length === 0) return;

    const baseName = advancingEvent.name.replace(/（第\d+轮）|\(第\d+轮\)/, '').trim();
    const nextRound = advancingEvent.round + 1;
    
    const newEvent = addEvent({
      name: nextRoundName || baseName,
      type: advancingEvent.type,
      gender: advancingEvent.gender,
      round: nextRound,
      roundName: nextRound === 2 ? '半决赛' : nextRound === 3 ? '决赛' : `第${nextRound}轮`,
      parentEventId: advancingEvent.id,
      totalAthletes: advancingQualified.length
    });

    advancingQualified.forEach((result, idx) => {
      addQueueEntry({
        eventId: newEvent.id,
        athleteId: result.athleteId,
        athlete: result.athlete!,
        priority: Priority.NORMAL,
        event: newEvent
      });
    });

    setIsAdvanceModalOpen(false);
    alert(`成功生成 ${nextRoundName}！共 ${advancingQualified.length} 名运动员晋级，已加入检录队列。`);
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
    
    results.filter(r => r.published).forEach(result => {
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
          <button className="btn-secondary" onClick={handleOpenBatchModal}>
            <Upload size={18} />
            批量录入
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
              const isPublished = eventResults.every(r => r.published);
              const hasPartial = eventResults.some(r => r.published) && !isPublished;

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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                      isPublished 
                        ? 'bg-success/10 text-success' 
                        : hasPartial
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isPublished ? (
                        <><Eye size={12} /> 已发布</>
                      ) : hasPartial ? (
                        <><Info size={12} /> 部分发布</>
                      ) : (
                        <><EyeOff size={12} /> 未发布</>
                      )}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {event.round < 3 && eventResults.length >= 2 && (
                        <button 
                          onClick={() => { 
                            setAdvancingEventId(eventId); 
                            setAdvanceCount(event.type === EventType.TRACK ? 8 : 6);
                            setAdvanceMode('count');
                            const baseName = event.name.replace(/（第\d+轮）|\(第\d+轮\)/, '').trim();
                            const nextRound = event.round + 1;
                            const roundLabel = nextRound === 2 ? '半决赛' : nextRound === 3 ? '决赛' : `第${nextRound}轮`;
                            setNextRoundName(`${baseName}（${roundLabel}）`);
                            setIsAdvanceModalOpen(true); 
                          }}
                          className="btn-secondary !py-1.5 !px-3 !text-xs"
                        >
                          <ArrowRight size={14} />
                          晋级下一轮
                        </button>
                      )}
                      {!isPublished ? (
                        <button 
                          onClick={() => publishResults(eventId)}
                          className="btn-primary !py-1.5 !px-3 !text-xs"
                        >
                          <Send size={14} />
                          发布成绩
                        </button>
                      ) : (
                        <button 
                          onClick={() => { if (window.confirm('撤回后将从奖牌榜移除，确定吗？')) unpublishResults(eventId); }}
                          className="btn-secondary !py-1.5 !px-3 !text-xs"
                        >
                          <RotateCcw size={14} />
                          撤回
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {!isPublished && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm text-amber-800 flex items-center gap-2">
                      <Info size={14} />
                      当前为未发布状态，仅管理员可见，发布后仪表板和奖牌榜同步更新
                    </div>
                  )}
                  
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

      <Modal 
        isOpen={isBatchModalOpen} 
        onClose={() => { setIsBatchModalOpen(false); }}
        title="批量录入成绩"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                batchStage === 'paste' 
                  ? 'bg-primary-500 text-white' 
                  : batchStage === 'parse' || batchStage === 'preview' || batchStage === 'confirm'
                    ? 'bg-success text-white' 
                    : 'bg-slate-200 text-slate-500'
              }`}>1</div>
              <span className={`font-medium ${batchStage === 'paste' ? 'text-primary-600' : 'text-slate-500'}`}>粘贴数据</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                batchStage === 'parse' 
                  ? 'bg-primary-500 text-white' 
                  : batchStage === 'preview' || batchStage === 'confirm'
                    ? 'bg-success text-white' 
                    : 'bg-slate-200 text-slate-500'
              }`}>2</div>
              <span className={`font-medium ${batchStage === 'parse' ? 'text-primary-600' : 'text-slate-500'}`}>校验解析</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                batchStage === 'preview' 
                  ? 'bg-primary-500 text-white' 
                  : batchStage === 'confirm' 
                    ? 'bg-success text-white' 
                    : 'bg-slate-200 text-slate-500'
              }`}>3</div>
              <span className={`font-medium ${batchStage === 'preview' ? 'text-primary-600' : 'text-slate-500'}`}>预览名次</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                batchStage === 'confirm' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-slate-200 text-slate-500'
              }`}>4</div>
              <span className={`font-medium ${batchStage === 'confirm' ? 'text-primary-600' : 'text-slate-500'}`}>确认导入</span>
            </div>
          </div>

          <div>
            <label className="label">选择项目 <span className="text-warning">*</span></label>
            <select 
              value={batchEventId}
              onChange={e => { setBatchEventId(e.target.value); setBatchStage('paste'); setPendingResults([]); setPreviewResults([]); }}
              className="input"
            >
              <option value="">请选择项目</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {getEventName(event)} ({event.type === 'field' ? '田赛' : '径赛'})
                </option>
              ))}
            </select>
          </div>

          {batchStage === 'paste' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">粘贴格式说明</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• 每行一条记录，格式：<code className="bg-white px-1 rounded">运动员号码或姓名 + 制表符/逗号/空格 + 成绩 + (可选)备注</code></li>
                      <li>• 从Excel表格复制：选中两列（号码/姓名 和 成绩）直接粘贴即可</li>
                      <li>• 田赛成绩单位为米(m)，径赛为秒(s)</li>
                      <li>• 已录入的运动员成绩会被覆盖更新</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <label className="label">粘贴成绩数据 <span className="text-warning">*</span></label>
                <textarea
                  value={batchPasteText}
                  onChange={e => setBatchPasteText(e.target.value)}
                  className="input min-h-[240px] font-mono text-sm"
                  placeholder={`示例（从Excel直接复制粘贴）：\nA001\t10.85\nA002\t11.02\nA003\t11.15\t破纪录\nA004\t10.98`}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button 
                  onClick={parseBatchPaste}
                  disabled={!batchEventId || !batchPasteText.trim()}
                  className="btn-primary"
                >
                  下一步：校验解析
                </button>
              </div>
            </>
          )}

          {batchStage === 'parse' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-800">解析结果</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-success" />
                      成功 {pendingResults.filter(p => p.parsedSuccess).length} 条
                    </span>
                    {pendingResults.filter(p => !p.parsedSuccess).length > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertCircle size={14} className="text-warning" />
                        失败 {pendingResults.filter(p => !p.parsedSuccess).length} 条
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="text-left p-3 border-b border-slate-200 w-16">状态</th>
                        <th className="text-left p-3 border-b border-slate-200">运动员</th>
                        <th className="text-left p-3 border-b border-slate-200">号码</th>
                        <th className="text-left p-3 border-b border-slate-200">成绩</th>
                        <th className="text-left p-3 border-b border-slate-200">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingResults.map((p, idx) => (
                        <tr key={idx} className={!p.parsedSuccess ? 'bg-red-50' : ''}>
                          <td className="p-3 border-b border-slate-100">
                            {p.parsedSuccess ? (
                              <CheckCircle size={16} className="text-success" />
                            ) : (
                              <div title={p.errorMessage}><AlertCircle size={16} className="text-warning cursor-help" /></div>
                            )}
                          </td>
                          <td className="p-3 border-b border-slate-100">
                            <span className="font-medium text-slate-800">{p.athlete?.name || '-'}</span>
                            {!p.parsedSuccess && p.errorMessage && (
                              <p className="text-xs text-warning mt-0.5">{p.errorMessage}</p>
                            )}
                          </td>
                          <td className="p-3 border-b border-slate-100 font-mono text-slate-600">{p.athlete?.bibNumber || '-'}</td>
                          <td className="p-3 border-b border-slate-100 font-mono text-slate-800">
                            {p.parsedSuccess ? formatResult(p.resultValue, p.resultUnit) : p.resultValue || '-'}
                          </td>
                          <td className="p-3 border-b border-slate-100 text-slate-500">{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setBatchStage('paste')}
                  className="btn-secondary"
                >
                  上一步
                </button>
                <button 
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button 
                  onClick={generatePreview}
                  disabled={pendingResults.filter(p => p.parsedSuccess).length === 0}
                  className="btn-primary"
                >
                  下一步：预览名次
                </button>
              </div>
            </>
          )}

          {batchStage === 'preview' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">名次预览</h4>
                    <p className="text-sm text-slate-600">
                      已合并现有成绩并重新排名，{previewResults.filter(p => p.isNew).length} 名新录入，{previewResults.filter(p => !p.isNew && p.rankChange && p.rankChange !== 0).length} 名名次变化。
                      {(() => {
                        const evt = events.find(e => e.id === batchEventId);
                        return evt ? ` ${evt.type === 'field' ? '田赛，成绩越大排名越靠前' : '径赛，用时越短排名越靠前'}` : '';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="max-h-[350px] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="text-left p-3 border-b border-slate-200 w-16">名次</th>
                      <th className="text-left p-3 border-b border-slate-200">运动员</th>
                      <th className="text-left p-3 border-b border-slate-200">号码</th>
                      <th className="text-left p-3 border-b border-slate-200">代表队</th>
                      <th className="text-left p-3 border-b border-slate-200">成绩</th>
                      <th className="text-left p-3 border-b border-slate-200 w-20">变化</th>
                      <th className="text-left p-3 border-b border-slate-200">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResults.map((p) => (
                      <tr key={p.athleteId} className={p.isNew ? 'bg-green-50' : (p.rankChange && p.rankChange !== 0 ? 'bg-blue-50' : '')}>
                        <td className="p-3 border-b border-slate-100">
                          <div className="flex items-center justify-center">{getRankIcon(p.rank)}</div>
                        </td>
                        <td className="p-3 border-b border-slate-100">
                          <span className="font-medium text-slate-800">{p.athlete.name}</span>
                          {p.isNew && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">新</span>
                          )}
                        </td>
                        <td className="p-3 border-b border-slate-100 font-mono text-slate-600">{p.athlete.bibNumber}</td>
                        <td className="p-3 border-b border-slate-100 text-slate-600">{p.athlete.team}</td>
                        <td className="p-3 border-b border-slate-100 font-mono font-bold text-slate-800">
                          {formatResult(p.resultValue, p.resultUnit)}
                        </td>
                        <td className="p-3 border-b border-slate-100">
                          {p.rankChange !== undefined && p.rankChange !== 0 ? (
                            <span className={`text-sm font-medium ${p.rankChange < 0 ? 'text-success' : 'text-warning'}`}>
                              {p.rankChange < 0 ? '↑' : '↓'} {Math.abs(p.rankChange)}
                            </span>
                          ) : p.oldRank ? (
                            <span className="text-slate-400 text-sm">不变</span>
                          ) : (
                            <span className="text-green-600 text-sm">新入榜</span>
                          )}
                        </td>
                        <td className="p-3 border-b border-slate-100 text-slate-500">{p.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setBatchStage('parse')}
                  className="btn-secondary"
                >
                  上一步
                </button>
                <button 
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button 
                  onClick={confirmBatchImport}
                  className="btn-primary"
                >
                  <CheckCircle size={18} />
                  确认导入（{previewResults.length}人）
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal 
        isOpen={isAdvanceModalOpen} 
        onClose={() => setIsAdvanceModalOpen(false)}
        title="晋级下一轮"
        size="lg"
      >
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="text-primary-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-slate-800 mb-1">
                  从 {advancingEvent ? getEventName(advancingEvent) : '-'} 晋级
                </h4>
                <p className="text-sm text-slate-600">
                  选择晋级规则，确认后将生成下一轮项目并将晋级运动员加入检录队列。
                  当前项目已发布成绩不会被修改。
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">下一轮项目名称</label>
              <input 
                type="text"
                value={nextRoundName}
                onChange={e => setNextRoundName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">晋级规则</label>
              <div className="flex gap-2">
                <select 
                  value={advanceMode}
                  onChange={e => setAdvanceMode(e.target.value as 'count' | 'percent')}
                  className="input flex-shrink-0 w-28"
                >
                  <option value="count">按人数</option>
                  <option value="percent">按比例</option>
                </select>
                <input 
                  type="number"
                  min={1}
                  max={advanceMode === 'percent' ? 100 : advancingEventResults.length}
                  value={advanceCount}
                  onChange={e => setAdvanceCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input"
                />
                <span className="flex items-center text-slate-500 text-sm">
                  {advanceMode === 'count' ? '人' : '%'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-800">
                晋级名单预览（共 {advancingQualified.length} 人）
              </h4>
              <span className="text-sm text-slate-500">
                原项目总人数：{advancingEventResults.length}
              </span>
            </div>
            <div className="max-h-[320px] overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="text-left p-3 border-b border-slate-200 w-20">原名次</th>
                    <th className="text-left p-3 border-b border-slate-200">运动员</th>
                    <th className="text-left p-3 border-b border-slate-200">号码</th>
                    <th className="text-left p-3 border-b border-slate-200">代表队</th>
                    <th className="text-left p-3 border-b border-slate-200">原成绩</th>
                  </tr>
                </thead>
                <tbody>
                  {advancingQualified.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          {getRankIcon(r.rank)}
                          <span className="text-slate-500 text-xs">#{idx + 1}</span>
                        </div>
                      </td>
                      <td className="p-3 border-b border-slate-100">
                        <span className="font-medium text-slate-800">{r.athlete?.name}</span>
                      </td>
                      <td className="p-3 border-b border-slate-100 font-mono text-slate-600">
                        {r.athlete?.bibNumber}
                      </td>
                      <td className="p-3 border-b border-slate-100 text-slate-600">
                        {r.athlete?.team}
                      </td>
                      <td className="p-3 border-b border-slate-100 font-mono font-bold text-slate-800">
                        {formatResult(r.resultValue, r.resultUnit)}
                      </td>
                    </tr>
                  ))}
                  {advancingQualified.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        暂无晋级人员，请调整晋级规则
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setIsAdvanceModalOpen(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button 
              onClick={handleConfirmAdvance}
              disabled={advancingQualified.length === 0 || !nextRoundName.trim()}
              className="btn-primary"
            >
              <ChevronRight size={18} />
              确认晋级（{advancingQualified.length}人）
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Results;
