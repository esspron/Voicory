import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '../../screens/ChatScreen';
export default function Chat() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  return <ChatScreen phone={phone} />;
}
