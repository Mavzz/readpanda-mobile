// The Interest picker stores preferences as
// { [category]: [{ preference_id, preference_subgenre, preference_value }] } —
// see InterestScreen.js. First-run Home (FIRST_RUN_3a_3b.md § 3a) seeds its
// recommendation and its first curated collection off those picks.

export const selectedInterests = (preferences) => {
  if (!preferences || typeof preferences !== 'object') {
    return [];
  }
  return Object.values(preferences)
    .filter(Array.isArray)
    .flat()
    .filter((p) => p?.preference_value)
    .map((p) => p.preference_subgenre)
    .filter(Boolean);
};

export const topInterest = (preferences) => selectedInterests(preferences)[0] || null;

const matches = (bucketName, interest) => {
  const a = bucketName.toLowerCase();
  const b = interest.toLowerCase();
  return a.includes(b) || b.includes(a);
};

// The collection the first-run hero and the "From your interests" card come
// from: the first curated bucket naming one of the user's picks, else simply
// the first curated bucket so a user who skipped the picker still gets one.
export const seedCollection = (curatedBuckets = [], preferences) => {
  const interests = selectedInterests(preferences);
  for (const interest of interests) {
    const bucket = curatedBuckets.find((b) => b.name && matches(b.name, interest));
    if (bucket) {
      return { bucket, interest };
    }
  }
  return { bucket: curatedBuckets[0] || null, interest: interests[0] || null };
};
