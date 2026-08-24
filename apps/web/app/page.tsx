import CheckinView from './components/CheckinView';

export const metadata = {
  title: 'StressLens | Anonymous Student Stress Monitoring',
  description: 'Anonymous student stress monitoring and wellness support platform for Christ University',
};

export default function HomePage() {
  return <CheckinView currentPath="checkin" />;
}
