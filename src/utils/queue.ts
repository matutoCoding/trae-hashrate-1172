import { QueueEntry, Priority, QueueStatus } from '@/types';
import { generateId } from './time';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  [Priority.VIP]: 0,
  [Priority.URGENT]: 1,
  [Priority.NORMAL]: 2
};

const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.VIP]: 'VIP',
  [Priority.URGENT]: '加急',
  [Priority.NORMAL]: '普通'
};

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.VIP]: 'bg-amber-500 text-white',
  [Priority.URGENT]: 'bg-red-500 text-white',
  [Priority.NORMAL]: 'bg-blue-500 text-white'
};

export function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    const priorityDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return a.sortOrder - b.sortOrder;
  }).map((entry, index) => ({
    ...entry,
    position: index + 1
  }));
}

export function updatePositions(entries: QueueEntry[]): QueueEntry[] {
  return entries.map((entry, index) => ({
    ...entry,
    position: index + 1
  }));
}

function getMaxSortOrder(queue: QueueEntry[], priority: Priority): number {
  const samePriority = queue.filter(e => e.priority === priority);
  if (samePriority.length === 0) return 0;
  return Math.max(...samePriority.map(e => e.sortOrder));
}

export function insertWithPriority(
  queue: QueueEntry[],
  newEntry: Omit<QueueEntry, 'id' | 'position' | 'joinTime' | 'status' | 'sortOrder'>,
  priority: Priority
): QueueEntry[] {
  const maxSortOrder = getMaxSortOrder(queue, priority);
  
  const entry: QueueEntry = {
    ...newEntry,
    id: generateId(),
    position: 0,
    joinTime: new Date(),
    sortOrder: maxSortOrder + 1,
    status: QueueStatus.WAITING,
    priority
  };
  
  return sortQueue([...queue, entry]);
}

export function addToQueue(
  queue: QueueEntry[],
  newEntry: Omit<QueueEntry, 'id' | 'position' | 'joinTime' | 'status' | 'sortOrder'>
): QueueEntry[] {
  return insertWithPriority(queue, newEntry, Priority.NORMAL);
}

export function removeFromQueue(
  queue: QueueEntry[],
  entryId: string
): QueueEntry[] {
  const remaining = queue.filter(e => e.id !== entryId);
  return sortQueue(remaining);
}

export function moveEntryUp(
  queue: QueueEntry[],
  entryId: string
): QueueEntry[] {
  const waiting = queue.filter(e => e.status === QueueStatus.WAITING);
  const sortedWaiting = sortQueue(waiting);
  const others = queue.filter(e => e.status !== QueueStatus.WAITING);
  
  const entry = sortedWaiting.find(e => e.id === entryId);
  if (!entry) return queue;
  
  const waitingIndex = sortedWaiting.findIndex(e => e.id === entryId);
  if (waitingIndex <= 0) return queue;
  
  const prevEntry = sortedWaiting[waitingIndex - 1];
  if (prevEntry.priority !== entry.priority) {
    return queue;
  }
  
  const tempSortOrder = entry.sortOrder;
  const updatedWaiting = sortedWaiting.map(e => {
    if (e.id === entryId) return { ...e, sortOrder: prevEntry.sortOrder };
    if (e.id === prevEntry.id) return { ...e, sortOrder: tempSortOrder };
    return e;
  });
  
  return sortQueue([...others, ...updatedWaiting]);
}

export function moveEntryDown(
  queue: QueueEntry[],
  entryId: string
): QueueEntry[] {
  const waiting = queue.filter(e => e.status === QueueStatus.WAITING);
  const sortedWaiting = sortQueue(waiting);
  const others = queue.filter(e => e.status !== QueueStatus.WAITING);
  
  const entry = sortedWaiting.find(e => e.id === entryId);
  if (!entry) return queue;
  
  const waitingIndex = sortedWaiting.findIndex(e => e.id === entryId);
  if (waitingIndex >= sortedWaiting.length - 1) return queue;
  
  const nextEntry = sortedWaiting[waitingIndex + 1];
  if (nextEntry.priority !== entry.priority) {
    return queue;
  }
  
  const tempSortOrder = entry.sortOrder;
  const updatedWaiting = sortedWaiting.map(e => {
    if (e.id === entryId) return { ...e, sortOrder: nextEntry.sortOrder };
    if (e.id === nextEntry.id) return { ...e, sortOrder: tempSortOrder };
    return e;
  });
  
  return sortQueue([...others, ...updatedWaiting]);
}

export function changeEntryPriority(
  queue: QueueEntry[],
  entryId: string,
  newPriority: Priority
): QueueEntry[] {
  const maxSortOrder = getMaxSortOrder(queue, newPriority);
  
  const updated = queue.map(e => {
    if (e.id === entryId) {
      return { ...e, priority: newPriority, sortOrder: maxSortOrder + 1 };
    }
    return e;
  });
  
  return sortQueue(updated);
}

export function getNextInQueue(
  queue: QueueEntry[],
  eventId: string
): QueueEntry | null {
  const eventQueue = queue.filter(
    e => e.eventId === eventId && e.status === QueueStatus.WAITING
  );
  const sorted = sortQueue(eventQueue);
  return sorted.length > 0 ? sorted[0] : null;
}

export function callNextNumber(
  queue: QueueEntry[],
  eventId: string
): { updatedQueue: QueueEntry[]; calledEntry: QueueEntry | null } {
  const nextEntry = getNextInQueue(queue, eventId);
  
  if (!nextEntry) {
    return { updatedQueue: queue, calledEntry: null };
  }
  
  const updatedQueue = queue.map(e => {
    if (e.id === nextEntry.id) {
      return {
        ...e,
        status: QueueStatus.CALLED,
        calledTime: new Date()
      };
    }
    return e;
  });
  
  return { updatedQueue, calledEntry: { ...nextEntry, status: QueueStatus.CALLED, calledTime: new Date() } };
}

export function updateQueueEntryStatus(
  queue: QueueEntry[],
  entryId: string,
  status: QueueStatus
): QueueEntry[] {
  return queue.map(e => {
    if (e.id === entryId) {
      return { ...e, status };
    }
    return e;
  });
}

export function getQueueByEvent(
  queue: QueueEntry[],
  eventId: string
): QueueEntry[] {
  return sortQueue(queue.filter(e => e.eventId === eventId));
}

export function getWaitingCount(
  queue: QueueEntry[],
  eventId?: string
): number {
  return queue.filter(e => 
    e.status === QueueStatus.WAITING && 
    (!eventId || e.eventId === eventId)
  ).length;
}

export function getCalledCount(
  queue: QueueEntry[],
  eventId?: string
): number {
  return queue.filter(e => 
    e.status === QueueStatus.CALLED && 
    (!eventId || e.eventId === eventId)
  ).length;
}

export function getCheckedInCount(
  queue: QueueEntry[],
  eventId?: string
): number {
  return queue.filter(e => 
    e.status === QueueStatus.CHECKED_IN && 
    (!eventId || e.eventId === eventId)
  ).length;
}

export function getPriorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority];
}

export function getPriorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority];
}

export function getStatusLabel(status: QueueStatus): string {
  const labels: Record<QueueStatus, string> = {
    [QueueStatus.WAITING]: '等待中',
    [QueueStatus.CALLED]: '已叫号',
    [QueueStatus.CHECKED_IN]: '已检录',
    [QueueStatus.MISSED]: '未到'
  };
  return labels[status];
}

export function getStatusColor(status: QueueStatus): string {
  const colors: Record<QueueStatus, string> = {
    [QueueStatus.WAITING]: 'bg-gray-100 text-gray-700',
    [QueueStatus.CALLED]: 'bg-accent/10 text-accent',
    [QueueStatus.CHECKED_IN]: 'bg-success/10 text-success',
    [QueueStatus.MISSED]: 'bg-warning/10 text-warning'
  };
  return colors[status];
}
