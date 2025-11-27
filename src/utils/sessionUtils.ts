import { MealSession } from '../lib/types';

export const isSessionOrderingActive = (session: MealSession): boolean => {
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                     now.getMinutes().toString().padStart(2, '0');

  const [startHour, startMin] = session.start_time.split(':');
  const [endHour, endMin] = session.end_time.split(':');

  const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
  const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const cutoffMinutes = endMinutes - session.order_cutoff_minutes_before;

  return currentMinutes >= startMinutes && currentMinutes <= cutoffMinutes;
};

export const getTimeUntilCutoff = (session: MealSession): number => {
  const now = new Date();
  const [endHour, endMin] = session.end_time.split(':');

  const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const cutoffMinutes = endMinutes - session.order_cutoff_minutes_before;

  return Math.max(0, cutoffMinutes - currentMinutes);
};

export const formatTimeRemaining = (minutes: number): string => {
  if (minutes <= 0) return 'Ordering closed';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m remaining`;
  }
  return `${mins}m remaining`;
};

export const canOrderParty = (partyDate: string): boolean => {
  const today = new Date();
  const party = new Date(partyDate);

  const daysUntilParty = Math.ceil(
    (party.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilParty >= 2;
};

export const getPartyOrderDeadline = (partyDate: string): Date => {
  const party = new Date(partyDate);
  party.setDate(party.getDate() - 2);
  return party;
};
