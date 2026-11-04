import type { Member } from './types.ts';

export function displayName(member: Member): string {
  return member.lastInitial ? `${member.firstName} ${member.lastInitial}.` : member.firstName;
}

export function hasNameClash(roster: Member[], firstName: string, excludeId?: string): boolean {
  const normalized = firstName.trim().toLowerCase();
  return roster.some((m) => m.id !== excludeId && m.firstName.trim().toLowerCase() === normalized);
}
