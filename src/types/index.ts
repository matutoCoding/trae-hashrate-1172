export enum Priority {
  VIP = 'vip',
  URGENT = 'urgent',
  NORMAL = 'normal'
}

export enum ScheduleStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum QueueStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  CHECKED_IN = 'checked_in',
  MISSED = 'missed'
}

export enum EntryStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FINISHED = 'finished',
  DISQUALIFIED = 'disqualified'
}

export enum EventType {
  TRACK = 'track',
  FIELD = 'field',
  COMBINED = 'combined'
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  trackCount: number;
}

export interface Track {
  id: string;
  venueId: string;
  name: string;
  type: 'running' | 'field' | 'combined';
  available: boolean;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  gender: 'male' | 'female' | 'mixed';
  round: number;
}

export interface Schedule {
  id: string;
  trackId: string;
  eventId: string;
  startTime: Date;
  endTime: Date;
  status: ScheduleStatus;
}

export interface Conflict {
  id: string;
  scheduleId1: string;
  scheduleId2: string;
  trackId: string;
  description: string;
}

export interface Athlete {
  id: string;
  name: string;
  team: string;
  bibNumber: string;
}

export interface QueueEntry {
  id: string;
  eventId: string;
  athleteId: string;
  athlete: Athlete;
  priority: Priority;
  status: QueueStatus;
  position: number;
  joinTime: Date;
  sortOrder: number;
  calledTime?: Date;
  event?: Event;
}

export interface Result {
  id: string;
  eventId: string;
  athleteId: string;
  athlete: Athlete;
  resultValue: number;
  resultUnit: string;
  rank: number;
  status: EntryStatus;
  notes?: string;
}

export interface AppState {
  venues: Venue[];
  tracks: Track[];
  events: Event[];
  schedules: Schedule[];
  conflicts: Conflict[];
  athletes: Athlete[];
  queueEntries: QueueEntry[];
  results: Result[];
  currentCalledNumber: string | null;
  currentCalledEntry: QueueEntry | null;
}

export interface AppStore extends AppState {
  addVenue: (venue: Omit<Venue, 'id'>) => void;
  addTrack: (track: Omit<Track, 'id'>) => void;
  addEvent: (event: Omit<Event, 'id'>) => void;
  createSchedule: (schedule: Omit<Schedule, 'id'>) => { success: boolean; conflicts?: Conflict[] };
  updateSchedule: (scheduleId: string, updates: Partial<Omit<Schedule, 'id'>>) => { success: boolean; conflicts?: Conflict[] };
  cancelSchedule: (scheduleId: string) => void;
  
  checkAllConflicts: () => Conflict[];
  resolveConflict: (conflictId: string, keepScheduleId: string) => void;
  
  addToQueue: (entry: Omit<QueueEntry, 'id' | 'position' | 'joinTime' | 'status' | 'sortOrder'>) => void;
  callNextNumber: (eventId: string) => QueueEntry | null;
  updateQueueStatus: (entryId: string, status: QueueStatus) => void;
  insertWithPriority: (entry: Omit<QueueEntry, 'id' | 'position' | 'joinTime' | 'status' | 'sortOrder'>, priority: Priority) => void;
  removeFromQueue: (entryId: string) => void;
  moveQueueEntryUp: (entryId: string) => void;
  moveQueueEntryDown: (entryId: string) => void;
  changeEntryPriority: (entryId: string, priority: Priority) => void;
  
  addResult: (result: Omit<Result, 'id'>) => void;
  updateResult: (id: string, result: Partial<Omit<Result, 'id'>>) => void;
  deleteResult: (id: string) => void;
  calculateRanks: (eventId: string) => void;
  
  initializeMockData: () => void;
}
