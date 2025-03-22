import dynamic from 'next/dynamic';
import { GetStaticProps } from 'next';

// 管理者コンポーネントをクライアントサイドのみでレンダリング
const AdminPage = dynamic(
  () => import('../../components/admin/AdminDashboard'),
  { ssr: false }
);

export default function Admin() {
  return <AdminPage />;
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
  };
};
