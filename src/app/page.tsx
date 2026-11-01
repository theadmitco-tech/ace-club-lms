import Home from './HomePage';
import { isV2Phase1PreviewEnabled } from '@/lib/server/v2Phase1Feature';

export default function HomePage() {
  return <Home showCourseCatalogue={isV2Phase1PreviewEnabled()} />;
}
