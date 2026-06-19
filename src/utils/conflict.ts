import { Schedule, Conflict, ScheduleStatus } from '@/types';
import { generateId, formatTime } from './time';

export function isTimeOverlap(
  start1: Date, 
  end1: Date,
  start2: Date, 
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

export function detectConflictsForSchedule(
  schedules: Schedule[],
  newSchedule: Omit<Schedule, 'id'>,
  excludeScheduleId?: string
): Conflict[] {
  const conflicts: Conflict[] = [];
  const sameTrackSchedules = schedules.filter(
    s => s.trackId === newSchedule.trackId && 
         s.status !== ScheduleStatus.CANCELLED &&
         s.id !== excludeScheduleId
  );
  
  for (const existing of sameTrackSchedules) {
    if (isTimeOverlap(
      existing.startTime, existing.endTime,
      newSchedule.startTime, newSchedule.endTime
    )) {
      conflicts.push({
        id: generateId(),
        scheduleId1: existing.id,
        scheduleId2: 'new',
        trackId: newSchedule.trackId,
        description: `时段重叠: ${formatTime(existing.startTime)}-${formatTime(existing.endTime)} 与 ${formatTime(newSchedule.startTime)}-${formatTime(newSchedule.endTime)}`
      });
    }
  }
  
  return conflicts;
}

export function detectAllConflicts(schedules: Schedule[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const activeSchedules = schedules.filter(s => s.status !== ScheduleStatus.CANCELLED);
  
  for (let i = 0; i < activeSchedules.length; i++) {
    for (let j = i + 1; j < activeSchedules.length; j++) {
      const s1 = activeSchedules[i];
      const s2 = activeSchedules[j];
      
      if (s1.trackId !== s2.trackId) continue;
      
      if (isTimeOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
        conflicts.push({
          id: generateId(),
          scheduleId1: s1.id,
          scheduleId2: s2.id,
          trackId: s1.trackId,
          description: `时段重叠: ${formatTime(s1.startTime)}-${formatTime(s1.endTime)} 与 ${formatTime(s2.startTime)}-${formatTime(s2.endTime)}`
        });
      }
    }
  }
  
  return conflicts;
}

export function getConflictingSchedules(
  scheduleId: string,
  schedules: Schedule[]
): Schedule[] {
  const schedule = schedules.find(s => s.id === scheduleId);
  if (!schedule) return [];
  
  return schedules.filter(s => {
    if (s.id === scheduleId) return false;
    if (s.trackId !== schedule.trackId) return false;
    if (s.status === ScheduleStatus.CANCELLED) return false;
    return isTimeOverlap(
      schedule.startTime, schedule.endTime,
      s.startTime, s.endTime
    );
  });
}

export function hasConflict(
  trackId: string,
  startTime: Date,
  endTime: Date,
  schedules: Schedule[],
  excludeScheduleId?: string
): boolean {
  return schedules.some(s => {
    if (s.trackId !== trackId) return false;
    if (s.status === ScheduleStatus.CANCELLED) return false;
    if (excludeScheduleId && s.id === excludeScheduleId) return false;
    return isTimeOverlap(startTime, endTime, s.startTime, s.endTime);
  });
}

export function getTrackOccupiedTimes(
  trackId: string,
  schedules: Schedule[]
): Array<{ start: Date; end: Date; scheduleId: string }> {
  return schedules
    .filter(s => 
      s.trackId === trackId && 
      s.status !== ScheduleStatus.CANCELLED
    )
    .map(s => ({
      start: s.startTime,
      end: s.endTime,
      scheduleId: s.id
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getAvailableTimeSlots(
  trackId: string,
  schedules: Schedule[],
  date: Date,
  minGapMinutes: number = 15
): Array<{ start: Date; end: Date }> {
  const dayStart = new Date(date);
  dayStart.setHours(6, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(22, 0, 0, 0);
  
  const occupiedTimes = getTrackOccupiedTimes(trackId, schedules)
    .filter(t => {
      const tDayStart = new Date(t.start);
      tDayStart.setHours(0, 0, 0, 0);
      const dayStartOnly = new Date(date);
      dayStartOnly.setHours(0, 0, 0, 0);
      return tDayStart.getTime() === dayStartOnly.getTime();
    });
  
  const slots: Array<{ start: Date; end: Date }> = [];
  let currentTime = new Date(dayStart);
  
  for (const occupied of occupiedTimes) {
    const gapStart = new Date(currentTime);
    const gapEnd = new Date(occupied.start);
    
    const duration = getDurationMinutes(gapStart, gapEnd);
    if (duration >= minGapMinutes) {
      slots.push({ start: gapStart, end: gapEnd });
    }
    
    currentTime = new Date(occupied.end);
  }
  
  const finalDuration = getDurationMinutes(currentTime, dayEnd);
  if (finalDuration >= minGapMinutes) {
    slots.push({ start: currentTime, end: dayEnd });
  }
  
  return slots;
}

function getDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
