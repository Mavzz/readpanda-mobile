import { Text } from 'react-native';
import HeroCard from './HeroCard';
import homeStyles from './homeStyles';

// Mixed state: a room, but no book yet. The hero nudges toward choosing one —
// or, for a member, says who they're waiting on.
const RoomNudgeHero = ({ room, username, onOpenRoom }) => {
  // Choosing what a room reads is creator-only, so a member gets told who
  // they're waiting on rather than a button that would fail. my-rooms doesn't
  // return members yet — like Room Detail, assume the viewer can act until it
  // says otherwise.
  const roomCreator = room.members?.find((m) => m.isCreator);
  const iPickTheBook = !roomCreator || roomCreator.name === username;
  const memberCount = room.members?.length;

  return (
    <HeroCard
      coverUrl={room.coverUrl}
      coverTitle={room.name}
      eyebrow="Your room is waiting"
      title={room.name}
      ctaLabel={iPickTheBook ? 'Choose the book' : 'Open the room'}
      onCta={() => onOpenRoom(room)}
    >
      <Text style={homeStyles.heroSubtitle} numberOfLines={1}>
        {memberCount
          ? `${memberCount} member${memberCount > 1 ? 's' : ''}, no book yet`
          : 'No book yet'}
      </Text>
      <Text style={homeStyles.heroBody}>
        {iPickTheBook
          ? 'Choose the book your room reads together — everyone\'s pace and comments start from there.'
          : `Waiting on ${roomCreator?.name || 'the room\'s creator'} to choose the book. Everyone's pace and comments start from there.`}
      </Text>
    </HeroCard>
  );
};

export default RoomNudgeHero;
