import { useRouter } from 'next/router';
import SportEditPage from '../../../components/admin/SportEditPage';

export default function SportEdit() {
  const router = useRouter();
  const { sportId } = router.query;

  return sportId ? <SportEditPage sportId={sportId as string} /> : null;
}
