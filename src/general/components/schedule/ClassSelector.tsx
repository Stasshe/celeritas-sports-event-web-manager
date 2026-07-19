import React, { useMemo, useState } from 'react';
import { Box, Chip, Divider, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Event } from '../../../types';

interface ClassSelectorProps {
  activeEvent: Event | null;
  selectedClasses: string[];
  onClassSelect: (classId: string) => void;
}

type GradeTabValue = 'all' | '1' | '2' | '3';

const ClassSelector: React.FC<ClassSelectorProps> = ({ activeEvent, selectedClasses, onClassSelect }) => {
  const [gradeTab, setGradeTab] = useState<GradeTabValue>('all');

  const classGroups = useMemo(() => {
    if (!activeEvent?.roster) return { grade1: [], grade2: [], grade3: [] };
    return {
      grade1: activeEvent.roster.grade1 ? Object.keys(activeEvent.roster.grade1) : [],
      grade2: activeEvent.roster.grade2 ? Object.keys(activeEvent.roster.grade2) : [],
      grade3: activeEvent.roster.grade3 ? Object.keys(activeEvent.roster.grade3) : []
    };
  }, [activeEvent]);

  const allClasses = useMemo(
    () => [...classGroups.grade1, ...classGroups.grade2, ...classGroups.grade3],
    [classGroups]
  );

  const visibleClasses = useMemo(() => {
    if (gradeTab === 'all') return allClasses;
    return classGroups[`grade${gradeTab}` as 'grade1' | 'grade2' | 'grade3'];
  }, [gradeTab, classGroups, allClasses]);

  const allSelected = allClasses.length > 0 && allClasses.every(cls => selectedClasses.includes(cls));

  const handleSelectAll = () => {
    onClassSelect(allSelected ? 'clear-all' : 'select-all');
  };

  return (
    <Paper variant="outlined" sx={{ mb: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          クラスを選択
        </Typography>

        <Chip
          label={allSelected ? '選択解除' : 'すべて選択'}
          color={allSelected ? 'secondary' : 'primary'}
          onClick={handleSelectAll}
          variant={allSelected ? 'filled' : 'outlined'}
          sx={{ mt: 0.5, mb: 2 }}
        />

        <Divider sx={{ mb: 1.5 }} />

        <Tabs value={gradeTab} onChange={(_, value: GradeTabValue) => setGradeTab(value)} sx={{ mb: 1.5 }}>
          <Tab label="全学年" value="all" />
          <Tab label="学年1" value="1" disabled={classGroups.grade1.length === 0} />
          <Tab label="学年2" value="2" disabled={classGroups.grade2.length === 0} />
          <Tab label="学年3" value="3" disabled={classGroups.grade3.length === 0} />
        </Tabs>

        {visibleClasses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            この学年にクラスがありません
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {visibleClasses.map(classId => {
              const isSelected = selectedClasses.includes(classId);
              return (
                <Chip
                  key={classId}
                  label={classId}
                  color={isSelected ? 'primary' : 'default'}
                  onClick={() => onClassSelect(classId)}
                  variant={isSelected ? 'filled' : 'outlined'}
                  sx={{ fontWeight: isSelected ? 600 : 400 }}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {selectedClasses.length > 0 && (
        <Box sx={{ p: 2, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            選択中のクラス
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {selectedClasses.map(classId => (
              <Chip key={classId} label={classId} size="small" color="primary" onDelete={() => onClassSelect(classId)} />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default ClassSelector;
