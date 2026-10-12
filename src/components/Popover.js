import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DS } from '../styles/global';

const EDGE = 16;
const OFFSET = 8;

// iPad popover (IPAD_AND_HOME_14_16.md § 1 Presentation): a sheet that belongs
// to one control opens as a card anchored to that control instead of rising
// from the bottom. RN has no popover, so this measures the anchor in window
// coordinates on open (and again when the window resizes) and places the card
// under it, flipping above when there isn't room. Callers wrap the control
// in a View with collapsable={false} and pass its ref.
const Popover = ({ visible, anchorRef, onClose, width = 340, maxHeight = 420, children }) => {
  const window = useWindowDimensions();
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    if (!visible) {
      setAnchor(null);
      return;
    }
    anchorRef?.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }));
  }, [visible, anchorRef, window.width, window.height]);

  let position = null;
  if (anchor) {
    // Right-align to the anchor when it sits in the right half (sort pills,
    // header chips), left-align otherwise; then keep it on screen.
    const preferredLeft = anchor.x + anchor.w / 2 > window.width / 2
      ? anchor.x + anchor.w - width
      : anchor.x;
    const left = Math.min(Math.max(preferredLeft, EDGE), window.width - width - EDGE);
    const below = anchor.y + anchor.h + OFFSET;
    const fitsBelow = below + maxHeight <= window.height - EDGE;
    position = fitsBelow
      ? { left, top: below }
      : { left, bottom: window.height - anchor.y + OFFSET };
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        {position ? (
          <View
            style={[styles.card, position, { width, maxHeight }]}
            onStartShouldSetResponder={() => true}
          >
            {children}
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  card: {
    position: 'absolute',
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.tile,
    paddingVertical: 16,
    overflow: 'hidden',
    // Ambient shadow per DESIGN.md.
    shadowColor: DS.colors.surfaceContainerLowest,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 12,
  },
});

export default Popover;
