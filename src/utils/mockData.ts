import { 
  Venue, Track, Event, Schedule, Athlete, QueueEntry, Result,
  ScheduleStatus, Priority, QueueStatus, EntryStatus, EventType
} from '@/types';
import { generateId, addMinutes } from './time';

const athleteNames = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  '郑一', '冯二', '陈明', '褚亮', '卫华', '蒋伟', '沈杰', '韩磊',
  '杨洋', '朱琳', '秦风', '许晴', '何冰', '吕良', '施雯', '张涛',
  '孔宇', '曹阳', '颜辉', '马超', '黄强', '宋敏', '董超', '梁朝',
  '杜鹏', '阮玲', '蓝雨', '闵捷', '席慕容', '季羡林', '麻天佑', '强卫东',
  '贾平凹', '路遥', '娄烨', '危峰', '江涛', '童安格', '颜真卿', '郭敬明'
];

const teamNames = [
  '北京队', '上海队', '广东队', '江苏队', '浙江队', '山东队',
  '四川队', '湖北队', '湖南队', '河南队', '河北队', '福建队',
  '辽宁队', '陕西队', '天津队', '重庆队'
];

const trackEvents = [
  { name: '100米', type: EventType.TRACK, duration: 15 },
  { name: '200米', type: EventType.TRACK, duration: 20 },
  { name: '400米', type: EventType.TRACK, duration: 30 },
  { name: '800米', type: EventType.TRACK, duration: 45 },
  { name: '1500米', type: EventType.TRACK, duration: 60 },
  { name: '5000米', type: EventType.TRACK, duration: 90 },
  { name: '100米栏', type: EventType.TRACK, duration: 20 },
  { name: '110米栏', type: EventType.TRACK, duration: 20 },
  { name: '400米栏', type: EventType.TRACK, duration: 35 },
  { name: '4x100米接力', type: EventType.TRACK, duration: 40 },
  { name: '4x400米接力', type: EventType.TRACK, duration: 60 },
];

const fieldEvents = [
  { name: '跳高', type: EventType.FIELD, duration: 90 },
  { name: '跳远', type: EventType.FIELD, duration: 90 },
  { name: '三级跳远', type: EventType.FIELD, duration: 90 },
  { name: '撑杆跳高', type: EventType.FIELD, duration: 120 },
  { name: '铅球', type: EventType.FIELD, duration: 90 },
  { name: '铁饼', type: EventType.FIELD, duration: 90 },
  { name: '标枪', type: EventType.FIELD, duration: 90 },
  { name: '链球', type: EventType.FIELD, duration: 90 },
];

const genders: Array<'male' | 'female'> = ['male', 'female'];

export function generateMockVenues(): Venue[] {
  return [
    { id: generateId(), name: '主体育场', location: '中心区域', trackCount: 6 },
    { id: generateId(), name: '副运动场', location: '东区', trackCount: 4 },
    { id: generateId(), name: '田赛场地', location: '西区', trackCount: 2 },
  ];
}

export function generateMockTracks(venues: Venue[]): Track[] {
  const tracks: Track[] = [];
  const mainVenue = venues[0];
  const subVenue = venues[1];
  const fieldVenue = venues[2];
  
  for (let i = 1; i <= 6; i++) {
    tracks.push({
      id: generateId(),
      venueId: mainVenue.id,
      name: `第${i}跑道`,
      type: 'running',
      available: true
    });
  }
  
  for (let i = 1; i <= 4; i++) {
    tracks.push({
      id: generateId(),
      venueId: subVenue.id,
      name: `副场第${i}跑道`,
      type: 'running',
      available: true
    });
  }
  
  tracks.push({
    id: generateId(),
    venueId: fieldVenue.id,
    name: '跳远/三级跳场地',
    type: 'field',
    available: true
  });
  
  tracks.push({
    id: generateId(),
    venueId: fieldVenue.id,
    name: '跳高/撑杆跳场地',
    type: 'field',
    available: true
  });
  
  tracks.push({
    id: generateId(),
    venueId: fieldVenue.id,
    name: '投掷场地A区',
    type: 'field',
    available: true
  });
  
  tracks.push({
    id: generateId(),
    venueId: fieldVenue.id,
    name: '投掷场地B区',
    type: 'field',
    available: true
  });
  
  return tracks;
}

export function generateMockEvents(): Event[] {
  const events: Event[] = [];
  const allEvents = [...trackEvents, ...fieldEvents];
  
  for (const eventTemplate of allEvents) {
    for (const gender of genders) {
      for (let round = 1; round <= 2; round++) {
        events.push({
          id: generateId(),
          name: `${eventTemplate.name}${round > 1 ? ` (第${round}轮)` : ''}`,
          type: eventTemplate.type,
          gender,
          round
        });
      }
    }
  }
  
  return events;
}

export function generateMockSchedules(tracks: Track[], events: Event[]): Schedule[] {
  const schedules: Schedule[] = [];
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  
  const trackTracks = tracks.filter(t => t.type === 'running');
  const fieldTracks = tracks.filter(t => t.type === 'field');
  const trackEventsList = events.filter(e => e.type === EventType.TRACK);
  const fieldEventsList = events.filter(e => e.type === EventType.FIELD);
  
  let currentTime = new Date(today);
  
  for (let i = 0; i < 12; i++) {
    const trackIndex = i % trackTracks.length;
    const event = trackEventsList[i % trackEventsList.length];
    const duration = trackEvents.find(e => e.name === event.name.replace(/ \(第\d轮\)/, ''))?.duration || 30;
    
    const startTime = new Date(currentTime);
    const endTime = addMinutes(startTime, duration);
    
    let status = ScheduleStatus.SCHEDULED;
    if (i < 3) status = ScheduleStatus.COMPLETED;
    else if (i === 3) status = ScheduleStatus.IN_PROGRESS;
    
    schedules.push({
      id: generateId(),
      trackId: trackTracks[trackIndex].id,
      eventId: event.id,
      startTime,
      endTime,
      status
    });
    
    currentTime = addMinutes(currentTime, duration + 10);
    
    if ((i + 1) % 3 === 0) {
      currentTime = addMinutes(currentTime, 30);
    }
  }
  
  currentTime = new Date(today);
  currentTime.setHours(8, 0, 0, 0);
  
  for (let i = 0; i < 6; i++) {
    const trackIndex = i % fieldTracks.length;
    const event = fieldEventsList[i % fieldEventsList.length];
    const duration = fieldEvents.find(e => e.name === event.name.replace(/ \(第\d轮\)/, ''))?.duration || 90;
    
    const startTime = new Date(currentTime);
    const endTime = addMinutes(startTime, duration);
    
    let status = ScheduleStatus.SCHEDULED;
    if (i < 1) status = ScheduleStatus.COMPLETED;
    else if (i === 1) status = ScheduleStatus.IN_PROGRESS;
    
    schedules.push({
      id: generateId(),
      trackId: fieldTracks[trackIndex].id,
      eventId: event.id,
      startTime,
      endTime,
      status
    });
    
    currentTime = addMinutes(currentTime, 30);
  }
  
  const conflictSchedule = {
    id: generateId(),
    trackId: trackTracks[0].id,
    eventId: trackEventsList[3].id,
    startTime: addMinutes(today, 60),
    endTime: addMinutes(today, 90),
    status: ScheduleStatus.SCHEDULED
  };
  schedules.push(conflictSchedule);
  
  return schedules;
}

export function generateMockAthletes(): Athlete[] {
  const athletes: Athlete[] = [];
  
  for (let i = 0; i < 50; i++) {
    athletes.push({
      id: generateId(),
      name: athleteNames[i % athleteNames.length],
      team: teamNames[i % teamNames.length],
      bibNumber: `${String(Math.floor(i / 16) + 1).padStart(2, '0')}${String((i % 16) + 1).padStart(2, '0')}`
    });
  }
  
  return athletes;
}

export function generateMockQueueEntries(events: Event[], athletes: Athlete[]): QueueEntry[] {
  const entries: QueueEntry[] = [];
  const trackEventsList = events.filter(e => e.type === EventType.TRACK && e.round === 1);
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const event = trackEventsList[i % Math.min(trackEventsList.length, 5)];
    const athlete = athletes[i];
    const joinTime = new Date(now.getTime() - (20 - i) * 60000);
    
    let priority = Priority.NORMAL;
    if (i === 2) priority = Priority.VIP;
    if (i === 7) priority = Priority.URGENT;
    
    let status = QueueStatus.WAITING;
    if (i === 0) status = QueueStatus.CALLED;
    if (i < 3) status = QueueStatus.CALLED;
    if (i < 1) status = QueueStatus.CHECKED_IN;
    
    entries.push({
      id: generateId(),
      eventId: event.id,
      athleteId: athlete.id,
      athlete,
      priority,
      status,
      position: i + 1,
      joinTime,
      calledTime: status === QueueStatus.CALLED || status === QueueStatus.CHECKED_IN ? new Date() : undefined
    });
  }
  
  return entries.sort((a, b) => {
    const priorityWeight = { [Priority.VIP]: 0, [Priority.URGENT]: 1, [Priority.NORMAL]: 2 };
    const priorityDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.joinTime.getTime() - b.joinTime.getTime();
  }).map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function generateMockResults(events: Event[], athletes: Athlete[]): Result[] {
  const results: Result[] = [];
  const completedEvents = events.filter(e => e.round === 1).slice(0, 3);
  
  for (const event of completedEvents) {
    const eventAthletes = athletes.slice(0, 8);
    const performances: number[] = [];
    
    if (event.name.includes('100米')) {
      for (let i = 0; i < 8; i++) {
        performances.push(10.2 + Math.random() * 1.5);
      }
    } else if (event.name.includes('跳远')) {
      for (let i = 0; i < 8; i++) {
        performances.push(6.5 + Math.random() * 2.5);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        performances.push(50 + Math.random() * 20);
      }
    }
    
    const sortedPerformances = [...performances].sort((a, b) => a - b);
    
    for (let i = 0; i < eventAthletes.length; i++) {
      const performance = performances[i];
      const rank = sortedPerformances.indexOf(performance) + 1;
      const isTrack = event.type === EventType.TRACK;
      const windSpeed = isTrack ? Math.round((Math.random() * 4 - 1) * 10) / 10 : undefined;
      
      results.push({
        id: generateId(),
        eventId: event.id,
        athleteId: eventAthletes[i].id,
        athlete: eventAthletes[i],
        resultValue: Math.round(performance * 100) / 100,
        resultUnit: event.name.includes('米') && !event.name.includes('跳') ? 's' : 'm',
        rank,
        status: EntryStatus.FINISHED,
        notes: windSpeed !== undefined ? `风速 ${windSpeed}m/s` : undefined
      });
    }
  }
  
  return results;
}
