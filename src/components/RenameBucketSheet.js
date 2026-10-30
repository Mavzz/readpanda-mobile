import { useState } from 'react';
import { FieldSheet } from '../screens/profile/SettingsSheets';
import useBucketsStore from '../stores/bucketsStore';

const MAX_NAME = 40;

// Renaming a bucket, from My bucket's ⋯ or the bucket grid's (specs/coming-soon
// R3). The same in-app sheet on every platform, in place of iOS's text prompt.
// Save waits for the server: on a failure the sheet stays open and the old name
// stays (the store puts it back).
const RenameBucketSheet = ({ bucket, onClose }) => {
  const renameBucket = useBucketsStore((s) => s.renameBucket);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const current = bucket?.name || '';

  const close = () => {
    setError(null);
    onClose();
  };

  const save = async ({ name }) => {
    setBusy(true);
    setError(null);
    const ok = await renameBucket(bucket.id, name.trim());
    setBusy(false);
    if (ok) {
      close();
    } else {
      setError('Couldn\'t rename. Try again.');
    }
  };

  return (
    <FieldSheet
      visible={!!bucket}
      title="Rename bucket"
      fields={[{ key: 'name', value: current, placeholder: 'Bucket name', maxLength: MAX_NAME }]}
      canSave={({ name = '' }) => {
        const next = name.trim();
        return next.length > 0 && next.length <= MAX_NAME && next !== current;
      }}
      onChange={() => setError(null)}
      error={error}
      busy={busy}
      onSave={save}
      onClose={close}
    />
  );
};

export default RenameBucketSheet;
