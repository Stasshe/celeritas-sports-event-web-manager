import { CustomThemeProvider } from '../../contexts/ThemeContext';
import { AuthProvider } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { CssBaseline } from '@mui/material';
import { useRouter } from 'next/router';
import '../../i18n/i18n';
import dynamic from 'next/dynamic';
import { GetStaticProps, GetStaticPaths } from 'next';

// クライアントサイドでのみレンダリングするコンポーネント
const SportDetail = dynamic(
  () => import('../../components/public/SportPage'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);

export default function Sport() {
  const router = useRouter();
  const { sportId } = router.query;

  return (
    <CustomThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Layout>
          {sportId && <SportDetail sportId={sportId as string} />}
        </Layout>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  return {
    props: {
      sportId: params?.sportId || null,
    },
    revalidate: 10,
  };
};
