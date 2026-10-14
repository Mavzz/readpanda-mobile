// A room's reading schedule, when it has one: the target page and due date,
// in either the API's or the app's casing. Shared by the widgets (13b) and
// Home's Rooms tonight (16e). The API doesn't send one yet — room schedules
// are on hold (turn 18) — so today every room reads as unscheduled.
const num = (value) => (Number.isFinite(value) ? value : null);

const scheduleOf = (room) => {
  const raw = room?.schedule;
  if (!raw) {
    return null;
  }
  const targetPage = num(raw.targetPage ?? raw.target_page);
  const due = raw.dueAt ?? raw.due_at;
  const dueAt = num(typeof due === 'string' ? Date.parse(due) : due);
  if (!targetPage || !dueAt) {
    return null;
  }
  return {
    targetPage,
    // Where this stretch of the schedule starts, for 13b's bar.
    startPage: num(raw.startPage ?? raw.start_page) ?? 1,
    dueAt,
  };
};

export default scheduleOf;
