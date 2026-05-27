export function calculateDayNumber(subscriptionStartDate: string): number {
  const [startYear, startMonth, startDay] = subscriptionStartDate
    .split("-")
    .map(Number);
  const startUTC = Date.UTC(startYear, startMonth - 1, startDay);

  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((todayUTC - startUTC) / msPerDay);

  return daysDiff + 1;
}

export const TOTAL_DAYS = 365;
