import { useMemo } from 'react';
import {
  ClassScheduleEntry,
  Event,
  Match,
  MatchParticipantSource,
  Sport,
  Team
} from '../types';
import { getParticipantName, getTeamDisplayName } from '../utils/match';
import { timeToMinutes } from '../utils/scheduleGenerator';

interface ScheduleCandidate {
  entry: ClassScheduleEntry;
  teamIds: Set<string>;
}

const getBlockTeamIds = (source: MatchParticipantSource, sport: Sport): Set<string> => {
  if (source.type !== 'blockRank') return new Set();

  const teamIds = new Set(
    sport.matches
      .filter(match => match.blockId === source.blockId)
      .flatMap(match => [match.team1Id, match.team2Id])
      .filter(Boolean)
  );
  sport.teams.forEach(team => {
    if (team.blockId === source.blockId) teamIds.add(team.id);
  });
  return teamIds;
};

const getSourceTeamIds = (
  source: MatchParticipantSource | undefined,
  sport: Sport,
  path: Set<string>
): Set<string> => {
  if (!source) return new Set();
  if (source.type === 'blockRank') return getBlockTeamIds(source, sport);
  return getMatchTeamIds(source.matchId, sport, path);
};

const getMatchTeamIds = (matchId: string, sport: Sport, path: Set<string>): Set<string> => {
  if (path.has(matchId)) return new Set();
  const match = sport.matches.find(candidate => candidate.id === matchId);
  if (!match) return new Set();

  const nextPath = new Set(path);
  nextPath.add(matchId);
  const teamIds = new Set<string>();
  const addPosition = (teamId: string, source?: MatchParticipantSource) => {
    if (teamId) {
      teamIds.add(teamId);
      return;
    }
    getSourceTeamIds(source, sport, nextPath).forEach(candidateId => teamIds.add(candidateId));
  };

  addPosition(match.team1Id, match.team1Source);
  addPosition(match.team2Id, match.team2Source);
  return teamIds;
};

const getTeamSelectionKeys = (team: Team): string[] => {
  return [team.id, team.name, getTeamDisplayName(team)];
};

const matchesSelectedClass = (
  candidateTeamIds: Set<string>,
  selectedClasses: Set<string>,
  sport: Sport
): boolean => {
  for (const teamId of candidateTeamIds) {
    const team = sport.teams.find(candidate => candidate.id === teamId);
    if (!team) continue;
    if (getTeamSelectionKeys(team).some(key => selectedClasses.has(key))) return true;
  }
  return false;
};

const createCandidate = (match: Match, sport: Sport): ScheduleCandidate | undefined => {
  const slot = sport.scheduleSettings?.timeSlots?.find(candidate => candidate.matchId === match.id);
  if (!slot || slot.type !== 'match') return undefined;

  return {
    entry: {
      sportId: sport.id,
      sportName: sport.name,
      matchId: match.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: match.location,
      date: match.date,
      teams: {
        team1Id: match.team1Id,
        team1Name: getParticipantName(match, 'team1', sport),
        team2Id: match.team2Id,
        team2Name: getParticipantName(match, 'team2', sport)
      },
      status: match.status,
      courtId: slot.courtId,
      courtName: slot.courtId ? sport.scheduleSettings?.courtNames?.[slot.courtId] : undefined
    },
    teamIds: getMatchTeamIds(match.id, sport, new Set())
  };
};

export const buildClassSchedule = (
  sports: Sport[],
  activeEvent: Event | null,
  selectedClasses: string[]
): ClassScheduleEntry[] => {
  if (sports.length === 0 || !activeEvent) return [];

  const selectedClassSet = new Set(selectedClasses);
  const candidates = sports.flatMap(sport => {
    return sport.matches.flatMap(match => {
      const candidate = createCandidate(match, sport);
      return candidate ? [candidate] : [];
    });
  });
  const filteredCandidates = selectedClasses.length === 0
    ? candidates
    : candidates.filter(candidate => {
        const sport = sports.find(item => item.id === candidate.entry.sportId);
        return sport
          ? matchesSelectedClass(candidate.teamIds, selectedClassSet, sport)
          : false;
      });

  return filteredCandidates
    .map(candidate => candidate.entry)
    .sort((first, second) => {
      if (first.date && second.date && first.date !== second.date) {
        return first.date.localeCompare(second.date);
      }
      if (first.date && !second.date) return -1;
      if (!first.date && second.date) return 1;
      return timeToMinutes(first.startTime) - timeToMinutes(second.startTime);
    });
};

export const useClassSchedule = (
  sports: Sport[],
  activeEvent: Event | null,
  selectedClasses: string[]
): ClassScheduleEntry[] => {
  return useMemo(
    () => buildClassSchedule(sports, activeEvent, selectedClasses),
    [sports, activeEvent, selectedClasses]
  );
};
