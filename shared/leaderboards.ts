import type {Progress} from './types';
export const LEADERBOARD_METRICS=['KP','Driver XP','Passenger XP','Routes completed','Safe driver','Districts explored','Missions','Journal'] as const;
export type LeaderboardMetric=typeof LEADERBOARD_METRICS[number];export type LeaderboardRow={name:string;score:number};
export function leaderboardScore(p:Progress,metric:LeaderboardMetric){return {'KP':p.kp,'Driver XP':p.v2?.driverXP||0,'Passenger XP':p.v2?.passengerXP||0,'Routes completed':p.v2?.routesCompleted||0,'Safe driver':p.v2?.rating??100,'Districts explored':p.v2?.districts.length||1,'Missions':p.missions.length,'Journal':p.journal.length}[metric];}
export function rankProfiles(profiles:{name:string;progress:Progress}[],metric:LeaderboardMetric):LeaderboardRow[]{return profiles.map(p=>({name:p.name,score:leaderboardScore(p.progress,metric)})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,20);}
