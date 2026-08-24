import CheckinView from '../components/CheckinView';

export const metadata = {
  title: 'Check-in | StressLens',
  description: 'Anonymous student stress and wellbeing check-in for Christ University',
};

export default function CheckinPage() {
  return <CheckinView currentPath="checkin" />;
}
