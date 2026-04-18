import { useLocalSearchParams } from 'expo-router';
import ContactInfoScreen from '../../screens/ContactInfoScreen';
export default function ContactInfo() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  return <ContactInfoScreen phone={phone} />;
}
