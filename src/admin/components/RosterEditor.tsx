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
  Tooltip,
  useTheme,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { Sport, Event } from '../../types';
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

  // 競技側: 紐づく行事の現在学年タブのクラス名(名簿があるもののみ)
  const getEventGradeClassNames = () => {
    const gradeKey = getCurrentGradeKey();
    const gradeData = eventData?.roster?.[gradeKey] || {};
    return Object.keys(gradeData).filter(key => Array.isArray(gradeData[key]));
  };

  // 競技側: 行事の名簿にはあるが、まだ競技側に無いクラス名
  const getMissingFromEventRoster = () => {
    const gradeKey = getCurrentGradeKey();
    const currentNames = new Set(Object.keys(roster?.[gradeKey] || {}));
    return getEventGradeClassNames().filter(name => !currentNames.has(name));
  };

  // 競技側: 行事の名簿全体で競技側のrosterを上書き同期
  const handleSyncFromEvent = () => {
    if (!sport || !eventData?.roster) return;
    setRoster(eventData.roster);
    (onUpdate as (sport: Sport) => void)({
      ...sport,
      roster: eventData.roster
    });
    setShowEventRosterAlert(false);
  };

  // 競技側: 行事の名簿にのみあるクラスを個別に追加(名簿ごとコピー)
  const handleAddMissingFromEvent = () => {
    if (!sport) return;
    const gradeKey = getCurrentGradeKey();
    const missing = getMissingFromEventRoster();
    if (missing.length === 0) return;

    const eventGradeData = eventData?.roster?.[gradeKey] || {};
    const updatedRoster = { ...roster };
    updatedRoster[gradeKey] = { ...(updatedRoster[gradeKey] || {}) };
    missing.forEach(className => {
      updatedRoster[gradeKey]![className] = eventGradeData[className];
    });

    setRoster(updatedRoster);
    (onUpdate as (sport: Sport) => void)({
      ...sport,
      roster: updatedRoster
    });
  };

  // 競技側: 同期/追加/削除の3操作のみの一覧(所属生徒は表示しない)
  const renderSportClassList = () => {
    const missing = getMissingFromEventRoster();
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6">
            {"クラス一覧"}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={handleSyncFromEvent}
              disabled={!eventData?.roster}
            >
              {"行事から同期"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddMissingFromEvent}
              disabled={missing.length === 0}
            >
              {`行事の名簿にのみあるものを追加 (${missing.length})`}
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{"クラス名"}</TableCell>
                <TableCell align="right" width="80px">{"操作"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getSortedClassNames().map(className => (
                <TableRow key={className}>
                  <TableCell>{className}</TableCell>
                  <TableCell align="right">
                    <Tooltip title={"削除"}>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClass(className)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {getSortedClassNames().length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                    {"クラスがありません"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  };

  return (
    <Box>
      {showEventRosterAlert && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {"イベント名簿アラート"}
          <Button
            size="small"
            startIcon={<SyncIcon />}
            onClick={handleSyncFromEvent}
            sx={{ ml: 2 }}
          >
            {"イベントから同期"}
          </Button>
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedGrade} onChange={handleGradeChange} aria-label="grade tabs">
          <Tab label={"1年生"} />
          <Tab label={"2年生"} />
          <Tab label={"3年生"} />
        </Tabs>
      </Box>

      {sport && renderSportClassList()}

      {!sport && (
      <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {"クラス一覧"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => openClassDialog()}
        >
          {"クラスを追加"}
        </Button>
      </Box>

      {/* クラス一覧表 */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{"クラス名"}</TableCell>
              <TableCell align="right" width="100px">{"メンバー数"}</TableCell>
              <TableCell align="right" width="100px">{"操作"}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedClassNames().map(className => (
              <TableRow key={className} hover onClick={() => openClassDialog(className)} sx={{ cursor: 'pointer' }}>
                <TableCell>{className}</TableCell>
                <TableCell align="right">{getMembersCount(className)}</TableCell>
                <TableCell align="right">
                  <Tooltip title={"編集"}>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openClassDialog(className); }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={"削除"}>
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteClass(className); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {getSortedClassNames().length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  {"クラスがありません"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </>
      )}

      {/* クラス編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={closeClassDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isNewClass ? "クラスを追加" : "クラスを編集"}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            label={"クラス名"}
            fullWidth
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            margin="normal"
            required
          />
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {"メンバー一覧"}
            </Typography>
            <Box sx={{ display: 'flex', mb: 2 }}>
              <TextField
                label={"新規メンバー"}
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
                  {"メンバーがいません"}
                </Typography>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeClassDialog}>
            {"キャンセル"}
          </Button>
          <Button 
            onClick={handleSaveClass} 
            variant="contained" 
            color="primary"
            disabled={!newClassName.trim()}
          >
            {"保存"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RosterEditor;
