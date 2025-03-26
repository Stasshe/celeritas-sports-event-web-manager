import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Chip, 
  Typography, 
  Paper,
  Divider,
  Tabs,
  Tab,
  Stack,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Event } from '../../types';
import { Grade } from '@mui/icons-material';

interface ClassSelectorProps {
  activeEvent: Event | null;
  selectedClasses: string[];
  onClassSelect: (classId: string) => void;
}

// 全学年のクラス選択状態を表すタブ値
type GradeTabValue = 'all' | '1' | '2' | '3';

const ClassSelector: React.FC<ClassSelectorProps> = ({ 
  activeEvent, 
  selectedClasses, 
  onClassSelect 
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [gradeTab, setGradeTab] = useState<GradeTabValue>('all');

  // クラス一覧を学年別にグループ化
  const classGroups = useMemo(() => {
    if (!activeEvent?.roster) return { grade1: [], grade2: [], grade3: [] };
    
    // 既存のrosterからのクラスリスト
    const rosterClasses = {
      grade1: activeEvent.roster.grade1 ? Object.keys(activeEvent.roster.grade1) : [],
      grade2: activeEvent.roster.grade2 ? Object.keys(activeEvent.roster.grade2) : [],
      grade3: activeEvent.roster.grade3 ? Object.keys(activeEvent.roster.grade3) : [],
    };
    
    console.log("Roster classes:", rosterClasses);
    
    return rosterClasses;
  }, [activeEvent]);
  
  // 現在選択されている学年のクラス一覧
  const visibleClasses = useMemo(() => {
    if (gradeTab === 'all') {
      return [
        ...classGroups.grade1, 
        ...classGroups.grade2, 
        ...classGroups.grade3
      ];
    }
    
    switch(gradeTab) {
      case '1':
        return classGroups.grade1;
      case '2':
        return classGroups.grade2;
      case '3':
        return classGroups.grade3;
      default:
        return [];
    }
  }, [gradeTab, classGroups]);
  
  // 学年タブの変更ハンドラ
  const handleGradeChange = (event: React.SyntheticEvent, newValue: GradeTabValue) => {
    setGradeTab(newValue);
  };
  
  // クラス選択の切り替え
  const handleClassToggle = (classId: string) => {
    onClassSelect(classId);
  };

  // クラスIDから学年を判定する関数
  const getGradeFromClass = (classId: string): string => {
    if (classGroups.grade1.includes(classId)) return '1';
    if (classGroups.grade2.includes(classId)) return '2';
    if (classGroups.grade3.includes(classId)) return '3';
    
    // IDに学年情報が含まれている場合の追加パターン
    if (classId.startsWith('grade1-') || classId.match(/^1[A-Z]/)) return '1';
    if (classId.startsWith('grade2-') || classId.match(/^2[A-Z]/)) return '2';
    if (classId.startsWith('grade3-') || classId.match(/^3[A-Z]/)) return '3';
    
    return '';
  };
  
  // 全クラス選択済みかチェック
  const allSelected = useMemo(() => {
    const allClasses = [
      ...classGroups.grade1,
      ...classGroups.grade2,
      ...classGroups.grade3
    ];
    return allClasses.length > 0 && allClasses.every(cls => selectedClasses.includes(cls));
  }, [selectedClasses, classGroups]);
  
  // 全クラス選択/解除
  const handleSelectAll = () => {
    if (allSelected) {
      // 全解除
      onClassSelect('clear-all');
    } else {
      // 全選択
      const allClasses = [
        ...classGroups.grade1,
        ...classGroups.grade2,
        ...classGroups.grade3
      ];
      onClassSelect('select-all');
    }
  };
  
  // 各学年のクラスがすべて選択されているかチェック
  const gradeFullySelected = {
    grade1: classGroups.grade1.length > 0 && classGroups.grade1.every(cls => selectedClasses.includes(cls)),
    grade2: classGroups.grade2.length > 0 && classGroups.grade2.every(cls => selectedClasses.includes(cls)),
    grade3: classGroups.grade3.length > 0 && classGroups.grade3.every(cls => selectedClasses.includes(cls))
  };
  
  return (
    <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('classSchedule.selectClasses')}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t('classSchedule.selectClassesHint')}
        </Typography>
        
        {/* 全クラス選択/解除チップ */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={allSelected ? t('classSchedule.clearAll') : t('classSchedule.selectAll')}
            color={allSelected ? "secondary" : "primary"}
            onClick={handleSelectAll}
            variant={allSelected ? "filled" : "outlined"}
            sx={{ mr: 1 }}
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* 学年タブ */}
        <Tabs
          value={gradeTab}
          onChange={handleGradeChange}
          aria-label="grade tabs"
          sx={{ mb: 2 }}
        >
          <Tab 
            label={t('classSchedule.allGrades')} 
            value="all" 
          />
          <Tab 
            label={`${t('classSchedule.grade')}1`} 
            value="1" 
            disabled={classGroups.grade1.length === 0}
            icon={
              gradeFullySelected.grade1 ? 
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: theme.palette.primary.main,
                position: 'absolute',
                top: 5,
                right: 5
              }} /> : undefined
            }
            iconPosition="end"
          />
          <Tab 
            label={`${t('classSchedule.grade')}2`} 
            value="2" 
            disabled={classGroups.grade2.length === 0}
            icon={
              gradeFullySelected.grade2 ? 
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: theme.palette.primary.main,
                position: 'absolute',
                top: 5,
                right: 5
              }} /> : undefined
            }
            iconPosition="end"
          />
          <Tab 
            label={`${t('classSchedule.grade')}3`} 
            value="3" 
            disabled={classGroups.grade3.length === 0}
            icon={
              gradeFullySelected.grade3 ? 
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: theme.palette.primary.main,
                position: 'absolute',
                top: 5,
                right: 5
              }} /> : undefined
            }
            iconPosition="end"
          />
        </Tabs>
        
        {/* クラスチップ表示 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {visibleClasses.map(classId => {
            const isSelected = selectedClasses.includes(classId);
            const grade = getGradeFromClass(classId);
            
            return (
              <Chip 
                key={classId}
                label={`${classId}`}
                color={isSelected ? "primary" : "default"}
                onClick={() => handleClassToggle(classId)}
                variant={isSelected ? "filled" : "outlined"}
                sx={{ 
                  fontWeight: isSelected ? 'bold' : 'normal',
                  transition: 'all 0.2s ease'
                }}
              />
            );
          })}
        </Box>
        
        {visibleClasses.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('classSchedule.noClassesInGrade')}
          </Typography>
        )}
      </Box>
      
      {/* 選択済みクラスのサマリー表示 */}
      {selectedClasses.length > 0 && (
        <Box sx={{ 
          p: 2, 
          bgcolor: theme.palette.grey[50],
          borderTop: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('classSchedule.selectedClasses')}:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedClasses.map(classId => {
              const grade = getGradeFromClass(classId);
              return (
                <Chip
                  key={`selected-${classId}`}
                  label={`${classId}`}
                  size="small"
                  color="primary"
                  onDelete={() => handleClassToggle(classId)}
                />
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default ClassSelector;
