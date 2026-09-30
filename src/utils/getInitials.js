// Shared by Home/Reading/Rooms avatar clusters (1a/1b/1c) — same "first +
// last initial, else first two letters" rule ProfilePicture.js uses for the
// profile-picture fallback, factored out so member-avatar stacks don't
// duplicate it.
const getInitials = (name) => {
  if (!name) {
    return '?';
  }
  const names = name.trim().split(' ');
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default getInitials;
