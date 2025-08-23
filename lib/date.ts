export function getMockDeadline(): Date {
  // Mock: next Friday 18:30 local
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun - 6 Sat
  const daysUntilFri = (5 - day + 7) % 7 || 7; // always future Friday
  d.setDate(d.getDate() + daysUntilFri);
  d.setHours(18, 30, 0, 0);
  return d;
}

export function formatDeadline(d: Date): string {
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const dayNum = d.getDate();
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `Deadline: ${day} ${dayNum} ${month} ${time}`;
}
