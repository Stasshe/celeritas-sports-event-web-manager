import dynamic from 'next/dynamic';
import { GetStaticProps, GetStaticPaths } from 'next';

// クライアントサイドでのみレンダリングするようにScoringPageコンポーネントを動的インポート
const ScoringPage = dynamic(
  () => import('../../../components/admin/ScoringPage'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);

export default function Scoring() {
  return <ScoringPage />;
}

// SSG用のパス生成
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: true,
  };
};

// 空のpropsを返す
export const getStaticProps: GetStaticProps = async ({ params }) => {
  return {
    props: {
      sportId: params?.sportId || null,
    },
    revalidate: 10,
  };
};
