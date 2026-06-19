import React from 'react';
import { ScheduleStatus, QueueStatus, EntryStatus, Priority } from '@/types';
import { getPriorityLabel, getStatusLabel as getQueueStatusLabel } from '@/utils/queue';

interface StatusBadgeProps {
  type: 'schedule' | 'queue' | 'entry' | 'priority';
  status: ScheduleStatus | QueueStatus | EntryStatus | Priority;
  size?: 'sm' | 'md';
}

const scheduleStyles: Record<ScheduleStatus, string> = {
  [ScheduleStatus.SCHEDULED]: 'bg-blue-100 text-blue-700',
  [ScheduleStatus.IN_PROGRESS]: 'bg-accent/10 text-accent',
  [ScheduleStatus.COMPLETED]: 'bg-success/10 text-success',
  [ScheduleStatus.CANCELLED]: 'bg-gray-100 text-gray-500'
};

const scheduleLabels: Record<ScheduleStatus, string> = {
  [ScheduleStatus.SCHEDULED]: '已排期',
  [ScheduleStatus.IN_PROGRESS]: '进行中',
  [ScheduleStatus.COMPLETED]: '已完成',
  [ScheduleStatus.CANCELLED]: '已取消'
};

const queueStyles: Record<QueueStatus, string> = {
  [QueueStatus.WAITING]: 'bg-gray-100 text-gray-600',
  [QueueStatus.CALLED]: 'bg-accent/10 text-accent',
  [QueueStatus.CHECKED_IN]: 'bg-success/10 text-success',
  [QueueStatus.MISSED]: 'bg-warning/10 text-warning'
};

const entryStyles: Record<EntryStatus, string> = {
  [EntryStatus.PENDING]: 'bg-gray-100 text-gray-600',
  [EntryStatus.RUNNING]: 'bg-accent/10 text-accent',
  [EntryStatus.FINISHED]: 'bg-success/10 text-success',
  [EntryStatus.DISQUALIFIED]: 'bg-warning/10 text-warning'
};

const entryLabels: Record<EntryStatus, string> = {
  [EntryStatus.PENDING]: '待比赛',
  [EntryStatus.RUNNING]: '比赛中',
  [EntryStatus.FINISHED]: '已完成',
  [EntryStatus.DISQUALIFIED]: '已取消资格'
};

const priorityStyles: Record<Priority, string> = {
  [Priority.VIP]: 'priority-vip',
  [Priority.URGENT]: 'priority-urgent',
  [Priority.NORMAL]: 'priority-normal'
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  
  let style = '';
  let label = '';
  
  switch (type) {
    case 'schedule':
      style = scheduleStyles[status as ScheduleStatus];
      label = scheduleLabels[status as ScheduleStatus];
      break;
    case 'queue':
      style = queueStyles[status as QueueStatus];
      label = getQueueStatusLabel(status as QueueStatus);
      break;
    case 'entry':
      style = entryStyles[status as EntryStatus];
      label = entryLabels[status as EntryStatus];
      break;
    case 'priority':
      style = priorityStyles[status as Priority];
      label = getPriorityLabel(status as Priority);
      break;
  }
  
  return (
    <span className={`badge ${style} ${sizeClasses} font-medium`}>
      {label}
    </span>
  );
};

export default StatusBadge;
