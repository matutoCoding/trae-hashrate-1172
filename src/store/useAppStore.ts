import { create } from 'zustand';
import { 
  AppStore, AppState, Venue, Track, Event, Schedule, 
  ScheduleStatus, Conflict, QueueEntry, Priority, 
  QueueStatus, Result, EntryStatus 
} from '@/types';
import { generateId } from '@/utils/time';
import { detectConflictsForSchedule, detectAllConflicts, hasConflict } from '@/utils/conflict';
import { 
  sortQueue, addToQueue as addToQueueUtil, 
  insertWithPriority as insertWithPriorityUtil,
  callNextNumber as callNextNumberUtil,
  updateQueueEntryStatus,
  removeFromQueue as removeFromQueueUtil,
  moveEntryUp as moveEntryUpUtil,
  moveEntryDown as moveEntryDownUtil,
  changeEntryPriority as changeEntryPriorityUtil
} from '@/utils/queue';
import { 
  generateMockVenues, generateMockTracks, generateMockEvents,
  generateMockSchedules, generateMockAthletes, 
  generateMockQueueEntries, generateMockResults 
} from '@/utils/mockData';

const initialState: AppState = {
  venues: [],
  tracks: [],
  events: [],
  schedules: [],
  conflicts: [],
  athletes: [],
  queueEntries: [],
  results: [],
  currentCalledNumber: null,
  currentCalledEntry: null
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  addVenue: (venue: Omit<Venue, 'id'>) => {
    set(state => ({
      venues: [...state.venues, { ...venue, id: generateId() }]
    }));
  },

  addTrack: (track: Omit<Track, 'id'>) => {
    set(state => ({
      tracks: [...state.tracks, { ...track, id: generateId() }]
    }));
  },

  addEvent: (event: Omit<Event, 'id'>) => {
    const newEvent: Event = { ...event, id: generateId() };
    set(state => ({
      events: [...state.events, newEvent]
    }));
    return newEvent;
  },

  createSchedule: (schedule: Omit<Schedule, 'id'>) => {
    const state = get();
    
    const conflicts = detectConflictsForSchedule(state.schedules, schedule);
    
    if (conflicts.length > 0) {
      return { success: false, conflicts };
    }
    
    const newSchedule: Schedule = {
      ...schedule,
      id: generateId()
    };
    
    set(state => ({
      schedules: [...state.schedules, newSchedule]
    }));
    
    return { success: true };
  },

  cancelSchedule: (scheduleId: string) => {
    set(state => ({
      schedules: state.schedules.map(s => 
        s.id === scheduleId 
          ? { ...s, status: ScheduleStatus.CANCELLED }
          : s
      ),
      conflicts: state.conflicts.filter(c => 
        c.scheduleId1 !== scheduleId && c.scheduleId2 !== scheduleId
      )
    }));
  },

  updateSchedule: (scheduleId: string, updates: Partial<Omit<Schedule, 'id'>>) => {
    const state = get();
    const existing = state.schedules.find(s => s.id === scheduleId);
    if (!existing) return { success: false, conflicts: [] };
    
    const updatedSchedule: Schedule = {
      ...existing,
      ...updates
    };
    
    const otherSchedules = state.schedules.filter(s => s.id !== scheduleId);
    const conflicts = detectConflictsForSchedule(otherSchedules, updatedSchedule);
    
    if (conflicts.length > 0) {
      return { success: false, conflicts };
    }
    
    set(state => ({
      schedules: state.schedules.map(s => 
        s.id === scheduleId ? updatedSchedule : s
      )
    }));
    
    return { success: true };
  },

  checkAllConflicts: () => {
    const state = get();
    const conflicts = detectAllConflicts(state.schedules);
    set({ conflicts });
    return conflicts;
  },

  resolveConflict: (conflictId: string, keepScheduleId: string) => {
    const state = get();
    const conflict = state.conflicts.find(c => c.id === conflictId);
    
    if (!conflict) return;
    
    const cancelId = conflict.scheduleId1 === keepScheduleId 
      ? conflict.scheduleId2 
      : conflict.scheduleId1;
    
    set(state => ({
      schedules: state.schedules.map(s => 
        s.id === cancelId 
          ? { ...s, status: ScheduleStatus.CANCELLED }
          : s
      ),
      conflicts: state.conflicts.filter(c => c.id !== conflictId)
    }));
  },

  addToQueue: (entry: Omit<QueueEntry, 'id' | 'position' | 'joinTime' | 'status'>) => {
    set(state => ({
      queueEntries: addToQueueUtil(state.queueEntries, entry)
    }));
  },

  callNextNumber: (eventId: string) => {
    const state = get();
    const { updatedQueue, calledEntry } = callNextNumberUtil(state.queueEntries, eventId);
    
    if (calledEntry) {
      set({
        queueEntries: updatedQueue,
        currentCalledNumber: calledEntry.athlete.bibNumber,
        currentCalledEntry: calledEntry
      });
    }
    
    return calledEntry;
  },

  updateQueueStatus: (entryId: string, status: QueueStatus) => {
    set(state => ({
      queueEntries: updateQueueEntryStatus(state.queueEntries, entryId, status)
    }));
  },

  insertWithPriority: (entry: Omit<QueueEntry, 'id' | 'position' | 'joinTime' | 'status'>, priority: Priority) => {
    set(state => ({
      queueEntries: insertWithPriorityUtil(state.queueEntries, entry, priority)
    }));
  },

  removeFromQueue: (entryId: string) => {
    set(state => ({
      queueEntries: removeFromQueueUtil(state.queueEntries, entryId)
    }));
  },

  moveQueueEntryUp: (entryId: string) => {
    set(state => ({
      queueEntries: moveEntryUpUtil(state.queueEntries, entryId)
    }));
  },

  moveQueueEntryDown: (entryId: string) => {
    set(state => ({
      queueEntries: moveEntryDownUtil(state.queueEntries, entryId)
    }));
  },

  changeEntryPriority: (entryId: string, priority: Priority) => {
    set(state => ({
      queueEntries: changeEntryPriorityUtil(state.queueEntries, entryId, priority)
    }));
  },

  addResult: (result: Omit<Result, 'id'>) => {
    const newResult: Result = {
      ...result,
      id: generateId(),
      rank: 0,
      published: result.published ?? false
    };
    
    set(state => ({
      results: [...state.results, newResult]
    }));
    
    get().calculateRanks(result.eventId);
  },

  updateResult: (id: string, result: Partial<Omit<Result, 'id'>>) => {
    const oldResult = get().results.find(r => r.id === id);
    const oldEventId = oldResult?.eventId;
    
    set(state => ({
      results: state.results.map(r => 
        r.id === id ? { ...r, ...result } : r
      )
    }));
    
    const updated = get().results.find(r => r.id === id);
    if (updated) {
      if (oldEventId && oldEventId !== updated.eventId) {
        get().calculateRanks(oldEventId);
      }
      get().calculateRanks(updated.eventId);
    }
  },

  deleteResult: (id: string) => {
    const state = get();
    const result = state.results.find(r => r.id === id);
    const eventId = result?.eventId;
    
    set(state => ({
      results: state.results.filter(r => r.id !== id)
    }));
    
    if (eventId) {
      get().calculateRanks(eventId);
    }
  },

  publishResults: (eventId: string) => {
    set(state => ({
      results: state.results.map(r => 
        r.eventId === eventId 
          ? { ...r, published: true, publishedAt: new Date() }
          : r
      )
    }));
  },

  unpublishResults: (eventId: string) => {
    set(state => ({
      results: state.results.map(r => 
        r.eventId === eventId 
          ? { ...r, published: false, publishedAt: undefined }
          : r
      )
    }));
  },

  calculateRanks: (eventId: string) => {
    const state = get();
    const event = state.events.find(e => e.id === eventId);
    const eventResults = state.results.filter(r => r.eventId === eventId);
    
    const isFieldEvent = event?.type === 'field';
    
    const sorted = [...eventResults].sort((a, b) => {
      if (a.status === EntryStatus.DISQUALIFIED) return 1;
      if (b.status === EntryStatus.DISQUALIFIED) return -1;
      
      if (isFieldEvent) {
        return b.resultValue - a.resultValue;
      } else {
        return a.resultValue - b.resultValue;
      }
    });
    
    const updatedResults = sorted.map((r, index) => ({
      ...r,
      rank: r.status === EntryStatus.DISQUALIFIED ? sorted.length : index + 1
    }));
    
    set(state => ({
      results: [
        ...state.results.filter(r => r.eventId !== eventId),
        ...updatedResults
      ]
    }));
  },

  initializeMockData: () => {
    const venues = generateMockVenues();
    const tracks = generateMockTracks(venues);
    const events = generateMockEvents();
    const schedules = generateMockSchedules(tracks, events);
    const athletes = generateMockAthletes();
    const queueEntries = generateMockQueueEntries(events, athletes);
    const results = generateMockResults(events, athletes);
    const conflicts = detectAllConflicts(schedules);
    
    set({
      venues,
      tracks,
      events,
      schedules,
      conflicts,
      athletes,
      queueEntries,
      results
    });
  }
}));

export function useTracksWithVenue() {
  const tracks = useAppStore(state => state.tracks);
  const venues = useAppStore(state => state.venues);
  
  return tracks.map(track => ({
    ...track,
    venue: venues.find(v => v.id === track.venueId)
  }));
}

export function useSchedulesWithDetails() {
  const schedules = useAppStore(state => state.schedules);
  const tracks = useAppStore(state => state.tracks);
  const events = useAppStore(state => state.events);
  const venues = useAppStore(state => state.venues);
  
  return schedules.map(schedule => {
    const track = tracks.find(t => t.id === schedule.trackId);
    const event = events.find(e => e.id === schedule.eventId);
    const venue = track ? venues.find(v => v.id === track.venueId) : undefined;
    
    return { ...schedule, track, event, venue };
  });
}

export function useQueueWithDetails() {
  const queueEntries = useAppStore(state => state.queueEntries);
  const events = useAppStore(state => state.events);
  
  return sortQueue(queueEntries).map(entry => ({
    ...entry,
    event: events.find(e => e.id === entry.eventId)
  }));
}

export function useResultsWithDetails() {
  const results = useAppStore(state => state.results);
  const events = useAppStore(state => state.events);
  
  return results.map(result => ({
    ...result,
    event: events.find(e => e.id === result.eventId)
  }));
}

export function useTodaySchedules() {
  const schedules = useSchedulesWithDetails();
  const today = new Date();
  
  return schedules.filter(s => {
    return (
      s.startTime.getDate() === today.getDate() &&
      s.startTime.getMonth() === today.getMonth() &&
      s.startTime.getFullYear() === today.getFullYear()
    );
  });
}

export function useActiveConflicts() {
  const conflicts = useAppStore(state => state.conflicts);
  const schedules = useSchedulesWithDetails();
  
  return conflicts.map(conflict => ({
    ...conflict,
    schedule1: schedules.find(s => s.id === conflict.scheduleId1),
    schedule2: schedules.find(s => s.id === conflict.scheduleId2)
  }));
}
