import enhancedStorage from '../utils/enhancedStorage';

// Keeps some of a store's state on disk between launches. Nothing is read at
// import time — MMKV isn't open yet — so hydrate() runs once the account is
// known (see authStore). Returns that hydrate function.
//
// `pick` chooses what's saved; `restore` turns what was saved back into
// state, so a store can derive flags from it.
const persistSlice = (store, name, { pick, restore = (saved) => saved }) => {
  let last = pick(store.getState());
  store.subscribe((state) => {
    const next = pick(state);
    if (Object.keys(next).some((key) => next[key] !== last[key])) {
      last = next;
      enhancedStorage.writeCache(name, next);
    }
  });

  return () => {
    const saved = enhancedStorage.readCache(name);
    if (saved) {
      store.setState(restore(saved));
    }
  };
};

export default persistSlice;
