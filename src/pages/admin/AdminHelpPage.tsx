import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const AdminHelpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | false>('panel1');

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/admin')} aria-label="back" sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {t('adminHelp.title')}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* サイドメニュー */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('adminHelp.contents')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List dense>
              <ListItem button onClick={() => setExpanded('panel1')}>
                <ListItemText primary={t('adminHelp.gettingStarted')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel2')}>
                <ListItemText primary={t('adminHelp.eventManagement')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel3')}>
                <ListItemText primary={t('adminHelp.sportManagement')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel4')}>
                <ListItemText primary={t('adminHelp.scoring')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel5')}>
                <ListItemText primary={t('adminHelp.exportFeature')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel6')}>
                <ListItemText primary={t('adminHelp.faq')} />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* メインコンテンツ */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 3 }}>
            <Accordion 
              expanded={expanded === 'panel1'} 
              onChange={handleAccordionChange('panel1')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.gettingStarted')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  このスポーツイベント管理システムでは、簡単に学校のスポーツイベントを管理・表示することができます。最初に行うべき設定や基本操作の流れをご説明します。
                </Typography>
                <Typography paragraph>
                  管理パネルでは、イベントの作成、競技の追加、そして試合結果の入力が可能です。これらの情報はリアルタイムでユーザー向けページに反映されます。
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    基本的な流れ：
                  </Typography>
                  <ol>
                    <li>イベントを作成する（例：「2024年度体育祭」）</li>
                    <li>イベント内に複数の競技を追加する（例：「サッカー」「バスケットボール」）</li>
                    <li>各競技にチームを登録する</li>
                    <li>競技形式（トーナメント・総当たり・リーグ・ランキング）を選択する</li>
                    <li>試合スケジュールを設定する</li>
                    <li>イベント当日は、試合結果をリアルタイムで更新する</li>
                  </ol>
                </Box>

                <Box sx={{ mt: 3, bgcolor: theme.palette.background.default, p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    ヒント
                  </Typography>
                  <Typography variant="body2">
                    イベントの編集は「イベント管理」タブ、競技の編集は「競技管理」タブから行うことができます。
                    設定変更は自動で保存されますが、重要な変更の後は手動保存ボタンを押して確実に保存してください。
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expanded === 'panel2'} 
              onChange={handleAccordionChange('panel2')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.eventManagement')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  イベント管理では、スポーツイベント全体の作成と管理を行います。一つのイベントには複数の競技を含めることができます。
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    イベントの作成方法：
                  </Typography>
                  <ol>
                    <li>「イベント管理」タブを選択</li>
                    <li>「新規イベント作成」ボタンをクリック</li>
                    <li>イベント名、日付、説明を入力</li>
                    <li>必要に応じてカバー画像をアップロード</li>
                    <li>「作成」ボタンをクリック</li>
                  </ol>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    アクティブイベントの設定：
                  </Typography>
                  <Typography paragraph>
                    複数のイベントがある場合、一つのイベントを「アクティブ」として設定することで、ユーザーがサイトにアクセスしたときに最初に表示されるイベントを指定できます。
                  </Typography>
                  <ol>
                    <li>イベント一覧から設定したいイベントを見つける</li>
                    <li>「アクティブにする」ボタンをクリック</li>
                  </ol>
                </Box>

                <Box sx={{ bgcolor: theme.palette.background.default, p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    注意点
                  </Typography>
                  <Typography variant="body2">
                    アクティブイベントは一度に一つだけ設定できます。新しいイベントをアクティブにすると、以前のアクティブイベントは自動的に非アクティブになります。
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expanded === 'panel3'} 
              onChange={handleAccordionChange('panel3')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.sportManagement')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  競技管理では、各イベント内の個別競技の設定やチーム管理を行います。競技ごとに形式（トーナメント・総当たり・カスタム）を選択できます。
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    競技の追加方法：
                  </Typography>
                  <ol>
                    <li>「競技管理」タブを選択</li>
                    <li>「新規競技作成」ボタンをクリック</li>
                    <li>競技名、説明を入力</li>
                    <li>競技が属するイベントを選択</li>
                    <li>競技形式（トーナメント・総当たり・カスタム）を選択</li>
                    <li>「作成」ボタンをクリック</li>
                  </ol>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    チームの管理：
                  </Typography>
                  <Typography paragraph>
                    各競技には参加チームを追加する必要があります。
                  </Typography>
                  <ol>
                    <li>競技の詳細画面で「チーム管理」セクションを開く</li>
                    <li>「チーム追加」ボタンをクリック</li>
                    <li>チーム名と詳細情報を入力</li>
                    <li>必要に応じてチームカラーやロゴを設定</li>
                    <li>「追加」ボタンをクリック</li>
                  </ol>
                </Box>

                <Box sx={{ bgcolor: theme.palette.background.default, p: 2, borderRadius: 1, mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    競技形式について
                  </Typography>
                  <Typography variant="body2">
                    <strong>トーナメント形式：</strong> 勝ち抜き方式。敗者は脱落し、最終的に1つの優勝チームを決定します。<br />
                    <strong>総当たり形式：</strong> 全チームが互いに対戦し、勝ち点の合計で順位を決定します。<br />
                    <strong>リーグ形式：</strong> グループ分けと予選・決勝ラウンドを組み合わせた形式です。<br />
                    <strong>ランキング形式：</strong> 個別得点や記録によりランキングを作成する形式です。陸上競技などに適しています。
                  </Typography>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  競技のスコアリングページへのアクセス：
                </Typography>
                <Typography>
                  競技の詳細画面から「スコア入力」ボタンをクリックすると、試合結果を入力するための専用ページに移動します。このページはイベント当日の進行管理に使用します。
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expanded === 'panel4'} 
              onChange={handleAccordionChange('panel4')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.scoring')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  スコアリングページでは、試合の進行状況や結果をリアルタイムで入力・更新することができます。入力されたデータはユーザー向け画面にすぐに反映されます。
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    トーナメント形式のスコアリング：
                  </Typography>
                  <ol>
                    <li>各試合のカードを見つける</li>
                    <li>両チームのスコアを入力</li>
                    <li>試合ステータスを「進行中」から「完了」に変更</li>
                    <li>勝者が自動的に次の試合に進出</li>
                  </ol>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    総当たり形式のスコアリング：
                  </Typography>
                  <ol>
                    <li>対戦表から試合を選択</li>
                    <li>両チームのスコアを入力</li>
                    <li>試合ステータスを「完了」に変更すると、自動的に順位表が更新される</li>
                  </ol>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    カスタム形式のスコアリング：
                  </Typography>
                  <Typography>
                    カスタム形式では、表内の各セルを直接編集することができます。セルをクリックして内容を入力し、セルタイプ（ヘッダー・データ・スコア・結果）を選択できます。
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: theme.palette.info.light, color: theme.palette.info.contrastText, p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    自動保存について
                  </Typography>
                  <Typography variant="body2">
                    スコアリングページでの変更は自動的に保存されますが、重要な更新後は画面上部の「保存」ボタンを押して確実に保存することをお勧めします。
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expanded === 'panel5'} 
              onChange={handleAccordionChange('panel5')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.exportFeature')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography paragraph>
                  エクスポート機能では、イベントや競技のデータをCSV形式でエクスポートすることができます。これにより、データのバックアップや外部システムとの連携が容易になります。
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    エクスポートの手順：
                  </Typography>
                  <ol>
                    <li>「エクスポート」タブを選択</li>
                    <li>エクスポートしたいイベントや競技を選択</li>
                    <li>「エクスポート」ボタンをクリック</li>
                    <li>CSVファイルがダウンロードされます</li>
                  </ol>
                </Box>

                <Box sx={{ bgcolor: theme.palette.background.default, p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    注意点
                  </Typography>
                  <Typography variant="body2">
                    エクスポートされたデータはCSV形式で保存されます。エクスポート前にデータが正確であることを確認してください。
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expanded === 'panel6'} 
              onChange={handleAccordionChange('panel6')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.faq')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  よくある質問：
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Q: 一度作成した競技の形式（トーナメント・総当たり・リーグ・ランキング）を変更できますか？
                  </Typography>
                  <Typography paragraph>
                    A: いいえ、競技形式は作成時に決定され、後から変更することはできません。形式を変更したい場合は、新しい競技を作成する必要があります。
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Q: 同時に複数のイベントを表示することはできますか？
                  </Typography>
                  <Typography paragraph>
                    A: ユーザー向け画面では一度に1つのアクティブイベントのみ表示されます。ただし、管理画面では全てのイベントにアクセスできます。
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Q: ユーザーページから管理ページにアクセスする方法は？
                  </Typography>
                  <Typography paragraph>
                    A: ホームページの右下にある管理者アイコンをクリックし、管理者アカウント（eterynity2024workplace@gmail.com）でログインしてください。
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Q: 競技の画像はどこからアップロードできますか？
                  </Typography>
                  <Typography paragraph>
                    A: 競技の編集画面で「カバー画像」セクションから画像をアップロードできます。推奨サイズは1200×600ピクセルです。
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Q: データが消えてしまった場合どうすればよいですか？
                  </Typography>
                  <Typography>
                    A: 全てのデータはFirebaseに保存されており、自動的にバックアップされています。データ復旧が必要な場合は、システム管理者にお問い合わせください。
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminHelpPage;
