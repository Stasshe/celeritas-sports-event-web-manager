import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  useTheme,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Group as GroupIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { Sport, Event } from '../../types';
import { useTranslation } from 'react-i18next';
import { useDatabase } from '../../hooks/useDatabase';

// onUpdateの型を修正: EventもしくはSportのrosterを更新する関数
interface RosterEditorProps {
  sport?: Sport;
  event?: Event;
  onUpdate: ((sport: Sport) => void) | ((event: Event) => void) | ((roster: Event['roster']) => void);
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`grade-tabpanel-${index}`}
      aria-labelledby={`grade-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const RosterEditor: React.FC<RosterEditorProps> = ({ sport, event, onUpdate }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  // 競技を編集する場合は関連するイベントのデータを取得
  const { data: eventData } = useDatabase<Event>(
    sport ? `/events/${sport.eventId}` : '/events/none'
  );
  
  const [selectedGrade, setSelectedGrade] = useState(0);
  const [roster, setRoster] = useState<Event['roster']>(
    (sport?.roster || event?.roster) || {
      grade1: {},
      grade2: {},
      grade3: {}
    }
  );
  
  // 編集ダイアログ用の状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [classMembers, setClassMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState('');
  const [isNewClass, setIsNewClass] = useState(false);
  const [showEventRosterAlert, setShowEventRosterAlert] = useState(false);

  useEffect(() => {
    // sportまたはeventのrosterデータでrosterを初期化
    setRoster(
      (sport?.roster || event?.roster) || {
        grade1: {},
        grade2: {},
        grade3: {}
      }
    );
    
    // sportの編集時に、関連するイベントにrosterがある場合は通知を表示
    if (sport && eventData?.roster && Object.keys(eventData.roster).length > 0) {
      setShowEventRosterAlert(true);
    } else {
      setShowEventRosterAlert(false);
    }
  }, [sport, event, eventData]);

  const handleGradeChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedGrade(newValue);
  };

  const getCurrentGradeKey = (): 'grade1' | 'grade2' | 'grade3' => {
    switch (selectedGrade) {
      case 0:
        return 'grade1';
      case 1:
        return 'grade2';
      case 2:
        return 'grade3';
      default:
        return 'grade2';
    }
  };

  // roster の undefined チェックを追加
  const getCurrentGradeData = () => {
    const key = getCurrentGradeKey();
    return roster?.[key] || {};
  };

  const openClassDialog = (className: string = '') => {
    if (className) {
      // 既存クラスの編集
      setEditingClass(className);
      setNewClassName(className);
      const gradeKey = getCurrentGradeKey();
      // roster の存在確認と安全なアクセス
      const gradeData = roster?.[gradeKey] || {};
      setClassMembers(gradeData[className] || []);
      setIsNewClass(false);
    } else {
      // 新規クラス作成
      setEditingClass('');
      setNewClassName('');
      setClassMembers([]);
      setIsNewClass(true);
    }
    setNewMember('');
    setDialogOpen(true);
  };

  const closeClassDialog = () => {
    setDialogOpen(false);
  };

  const handleAddMember = () => {
    if (newMember.trim()) {
      setClassMembers([...classMembers, newMember.trim()]);
      setNewMember('');
    }
  };

  const handleRemoveMember = (index: number) => {
    const newMembers = [...classMembers];
    newMembers.splice(index, 1);
    setClassMembers(newMembers);
  };

  const handleSaveClass = () => {
    if (newClassName.trim()) {
      const gradeKey = getCurrentGradeKey();
      const updatedRoster = { ...roster };
      
      // 既存クラスを削除（名前が変更された場合に備えて）
      if (editingClass && editingClass !== newClassName && updatedRoster[gradeKey]) {
        const gradeData = { ...updatedRoster[gradeKey] };
        if (editingClass in gradeData) {
          delete gradeData[editingClass];
        }
        updatedRoster[gradeKey] = gradeData;
      }
      
      if (!updatedRoster[gradeKey]) {
        updatedRoster[gradeKey] = {};
      }
      
      // メンバーが空の場合は['none']を設定
      const membersToSave = classMembers.length > 0 ? classMembers : ['none'];
      
      updatedRoster[gradeKey] = {
        ...updatedRoster[gradeKey],
        [newClassName]: membersToSave
      };
      
      setRoster(updatedRoster);
      
      // sportかeventのどちらが提供されたかに基づいて更新
      if (sport) {
        (onUpdate as (sport: Sport) => void)({
          ...sport,
          roster: updatedRoster
        });
      } else if (event) {
        // Event用の更新関数が渡された場合
        if (typeof onUpdate === 'function') {
          if (onUpdate.length === 1) {
            // パラメータが1つの場合、Event全体またはRosterのみを想定
            const param = onUpdate.toString().includes('roster') 
              ? updatedRoster  // Rosterのみを更新する関数
              : { ...event, roster: updatedRoster };  // Event全体を更新する関数
              
            (onUpdate as any)(param);
          }
        }
      }
      
      closeClassDialog();
    }
  };

  const handleDeleteClass = (className: string) => {
    const gradeKey = getCurrentGradeKey();
    
    // nullチェックを追加
    if (roster && roster[gradeKey] && className in roster[gradeKey]!) {
      const updatedRoster = { ...roster };
      const gradeData = { ...updatedRoster[gradeKey] };
      delete gradeData[className];
      updatedRoster[gradeKey] = gradeData;
      
      setRoster(updatedRoster);
      
      // sportかeventのどちらが提供されたかに基づいて更新
      if (sport) {
        (onUpdate as (sport: Sport) => void)({
          ...sport,
          roster: updatedRoster
        });
      } else if (event) {
        // rosterだけを更新する関数の場合
        if (onUpdate.toString().includes('roster')) {
          (onUpdate as (roster: Event['roster']) => void)(updatedRoster);
        } else {
          // Event全体を更新する関数の場合
          (onUpdate as (event: Event) => void)({
            ...event,
            roster: updatedRoster
          });
        }
      }
    }
  };

  const getSortedClassNames = () => {
    const gradeData = getCurrentGradeData();
    // 保存されているチームのみを対象にする
    const classNames = Object.keys(gradeData).filter(key => 
      Array.isArray(gradeData[key]) // 配列として保存されているもののみ
    );
    return classNames.sort((a, b) => {
      // クラス名が 1-1, 1-2 等の形式でソート
      const match1 = a.match(/(\d+)-(\d+)/);
      const match2 = b.match(/(\d+)-(\d+)/);
      
      if (match1 && match2) {
        const gradeA = parseInt(match1[1]);
        const classA = parseInt(match1[2]);
        const gradeB = parseInt(match2[1]);
        const classB = parseInt(match2[2]);
        
        if (gradeA !== gradeB) {
          return gradeA - gradeB;
        }
        return classA - classB;
      }
      
      // 標準の文字列比較
      return a.localeCompare(b);
    });
  };

  // クラス別の生徒数をカウント
  const getMembersCount = (className: string) => {
    const gradeData = getCurrentGradeData();
    // 'none'のみの場合は0とみなす
    const members = gradeData[className] || [];
    if (members.length === 1 && members[0] === 'none') {
      return 0;
    }
    return members.length;
  };

  return (
    <Box>
      {showEventRosterAlert && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('roster.eventRosterAlert')}
          <Button 
            size="small" 
            startIcon={<SyncIcon />} 
            onClick={() => {
              if (sport && eventData?.roster) {
                setRoster(eventData.roster);
                (onUpdate as (sport: Sport) => void)({
                  ...sport,
                  roster: eventData.roster
                });
                setShowEventRosterAlert(false);
              }
            }}
            sx={{ ml: 2 }}
          >
            {t('roster.syncFromEvent')}
          </Button>
        </Alert>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedGrade} onChange={handleGradeChange} aria-label="grade tabs">
          <Tab label={t('roster.grade1')} />
          <Tab label={t('roster.grade2')} />
          <Tab label={t('roster.grade3')} />
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {t('roster.classList')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => openClassDialog()}
        >
          {t('roster.addClass')}
        </Button>
      </Box>
      
      {/* クラス一覧表 */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {getSortedClassNames().map(className => (
          <Grid item xs={12} sm={6} md={4} key={className}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'column',
                height: '100%',
                '&:hover': {
                  boxShadow: 4
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="h3">
                  {className}
                </Typography>
                <Box>
                  <Tooltip title={t('roster.edit')}>
                    <IconButton size="small" onClick={() => openClassDialog(className)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('roster.delete')}>
                    <IconButton size="small" color="error" onClick={() => handleDeleteClass(className)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('roster.memberCount', { count: getMembersCount(className) })}
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {t('roster.memberList')}:
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                  {getCurrentGradeData()[className]?.map((member, index) => (
                    member !== 'none' && (
                      <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                        {member}
                      </Typography>
                    )
                  ))}
                  {!getCurrentGradeData()[className] || 
                   (getCurrentGradeData()[className].length === 1 && 
                    getCurrentGradeData()[className][0] === 'none') ? (
                    <Typography variant="body2" color="text.secondary">
                      {t('roster.noMembers')}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button 
                  size="small" 
                  variant="text" 
                  fullWidth
                  onClick={() => openClassDialog(className)}
                >
                  {t('roster.viewEdit')}
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
        
        {getSortedClassNames().length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {t('roster.noClasses')}
              </Typography>
              <Button 
                startIcon={<AddIcon />}
                onClick={() => openClassDialog()}
                sx={{ mt: 2 }}
              >
                {t('roster.addClass')}
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
      
      {/* クラス編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={closeClassDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isNewClass ? t('roster.addClass') : t('roster.editClass')}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            label={t('roster.className')}
            fullWidth
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            margin="normal"
            required
          />
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('roster.memberList')}
            </Typography>
            <Box sx={{ display: 'flex', mb: 2 }}>
              <TextField
                label={t('roster.newMember')}
                fullWidth
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
              />
              <Button 
                variant="contained"
                onClick={handleAddMember}
                disabled={!newMember.trim()}
                sx={{ ml: 1 }}
              >
                <AddIcon />
              </Button>
            </Box>
            
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', p: 2 }}>
              {classMembers.length > 0 && !(classMembers.length === 1 && classMembers[0] === 'none') ? (
                <Table size="small">
                  <TableBody>
                    {classMembers.map((member, index) => (
                      member !== 'none' && (
                        <TableRow key={index}>
                          <TableCell>
                            {member}
                          </TableCell>
                          <TableCell align="right" width="60px">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveMember(index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  {t('roster.noMembers')}
                </Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeClassDialog}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSaveClass} 
            variant="contained" 
            color="primary"
            disabled={!newClassName.trim()}
          >
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RosterEditor;
