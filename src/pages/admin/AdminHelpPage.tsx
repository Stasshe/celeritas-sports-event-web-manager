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
  useTheme,
  Stepper,
  Step,
  StepLabel,
  ListItemIcon
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
  Groups as GroupsIcon,
  SportsScore as SportsScoreIcon,
  Schedule as ScheduleIcon
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
                <ListItemIcon>
                  <CheckCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('adminHelp.gettingStarted')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel2')}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('adminHelp.eventManagement')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel3')}>
                <ListItemIcon>
                  <GroupsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('adminHelp.sportManagement')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel4')}>
                <ListItemIcon>
                  <SportsScoreIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('adminHelp.leagueFormat')} />
              </ListItem>
              <ListItem button onClick={() => setExpanded('panel5')}>
                <ListItemIcon>
                  <ScheduleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('adminHelp.scheduling')} />
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
                <Typography variant="h6" gutterBottom>
                  基本的な使い方の流れ
                </Typography>
                
                <Stepper orientation="vertical" sx={{ mt: 2 }}>
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">1. 行事（イベント）を作成する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ダッシュボードから「イベント作成」を押し、イベント名を設定して作成します。
                        詳細情報は後から編集できます。
                      </Typography>
                    </StepLabel>
                  </Step>
                  
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">2. 名簿を設定する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        名簿タブに移動し、クラステンプレートを作成します。
                        これにより参加者情報を管理できます。
                      </Typography>
                    </StepLabel>
                  </Step>
                  
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">3. 競技を作成する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        サイドパネルから「競技作成」を押し、競技形式を選択します。
                        ほとんどの場合はリーグ戦形式を選択します。
                      </Typography>
                    </StepLabel>
                  </Step>
                  
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">4. チームを設定する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        名簿タブで「イベントから同期」を押してチームを取得します。
                        必要に応じてチーム情報を編集できます。
                      </Typography>
                    </StepLabel>
                  </Step>
                  
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">5. リーグ戦を設定する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        「スコア管理」を押し、ブロック数と進出チーム数を決定後、
                        「チームを振り分け」で予選リーグを作成します。
                      </Typography>
                    </StepLabel>
                  </Step>
                  
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">6. プレーオフを生成する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        必要に応じて「プレーオフを生成」を押し、決勝トーナメントを作成します。
                      </Typography>
                    </StepLabel>
                  </Step>
                  
                  <Step active>
                    <StepLabel>
                      <Typography variant="subtitle1">7. スケジュールを生成する</Typography>
                      <Typography variant="body2" color="text.secondary">
                        競技編集ページの「スケジュール」タブで「スケジュール生成」を押します。
                        パラメータは後からでも変更可能です。
                      </Typography>
                    </StepLabel>
                  </Step>
                </Stepper>
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
                  競技管理では、各イベント内の個別競技の設定やチーム管理を行います。競技ごとに形式（トーナメント・総当たり・リーグ・ランキング）を選択できます。
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
                    <li>競技形式（トーナメント・総当たり・リーグ・ランキング）を選択</li>
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
                    <strong>リーグ形式：</strong> 主にこれ。グループ分けと予選・決勝ラウンドを組み合わせた形式です。<br />
                    <strong>ランキング形式：</strong> リレーなど。個別得点や記録によりランキングを作成する形式です。陸上競技などに適しています。
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
                <Typography variant="h6">{t('adminHelp.leagueFormat')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="h6" gutterBottom>
                  リーグ戦形式の詳細説明
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    1. ブロック分けとチーム振り分け
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • ブロック数を設定（例：4ブロック）<br/>
                    • 各ブロックからの進出チーム数を設定（例：各ブロック上位2チーム）<br/>
                    • 「チームを振り分け」を押すと自動的にチームが均等に分配されます
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    2. 予選リーグ戦
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • 各ブロック内で総当たり戦を実施<br/>
                    • 勝ち点制で順位を決定（勝:3点、引分:1点、負:0点）<br/>
                    • 同点の場合は得失点差で順位を決定
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    3. 決勝トーナメント（プレーオフ）
                  </Typography>
                  <Typography variant="body2" paragraph>
                    • 各ブロックの上位チームが進出<br/>
                    • トーナメント形式で優勝を決定<br/>
                    • 3位決定戦の有無を選択可能
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion 
              expanded={expanded === 'panel5'} 
              onChange={handleAccordionChange('panel5')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('adminHelp.scheduling')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="h6" gutterBottom>
                  スケジュール生成について
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    スケジュール生成の手順
                  </Typography>
                  <Typography variant="body2" paragraph>
                    1. 競技編集ページの「スケジュール」タブを開く<br/>
                    2. 開始日時と終了日時を設定<br/>
                    3. 1日あたりの試合数を設定<br/>
                    4. 試合時間（分）を設定<br/>
                    5. 「スケジュール生成」を押す
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    パラメータについて
                  </Typography>
                  <Typography variant="body2">
                    • パラメータは後からでも変更可能<br/>
                    • 変更後は再度「生成」を押すことで更新される<br/>
                    • 既存のスケジュールは上書きされるため注意
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
                {/* ここから開発者連絡フィールド */}
                <Divider sx={{ my: 3 }} />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    開発者への連絡・質問
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    ご不明点やご要望があれば、下記までお気軽にご連絡ください。
                  </Typography>
                  <Typography variant="body2">
                    メール1: <a href="mailto:eterynity2024workplace@gmail.com">eterynity2024workplace@gmail.com</a><br />
                    メール2: <a href="mailto:egnm9stasshe@gmail.com">egnm9stasshe@gmail.com</a><br />
                    GitHub: <a href="https://github.com/Stasshe" target="_blank" rel="noopener noreferrer">Stasshe</a><br />
                    このサイトのソースコード: <a href="https://github.com/Stasshe/celeritas-sports-event-web-manager" target="_blank" rel="noopener noreferrer">https://github.com/Stasshe/celeritas-sports-event-web-manager</a>
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
