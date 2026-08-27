import { Role } from '../common/roles';
export enum LeaveType {
  MATERNITY='MATERNITY', PATERNITY='PATERNITY', CASUAL='CASUAL', EARNED_FULL='EARNED_FULL', HALF_PAY='HALF_PAY', EOL='EOL',
  EX_PAK_FULL='EX_PAK_FULL', EX_PAK_HALF='EX_PAK_HALF', EX_PAK_EOL='EX_PAK_EOL', SPECIAL_ACCIDENT='SPECIAL_ACCIDENT', MEDICAL_LONG='MEDICAL_LONG',
  SPECIAL_QUARANTINE='SPECIAL_QUARANTINE', LPR='LPR', STUDY_FULL='STUDY_FULL', STUDY_HALF='STUDY_HALF', STUDY_EOL='STUDY_EOL'
}
export enum LeaveStatus { DRAFT='DRAFT', PENDING='PENDING', APPROVED='APPROVED', REJECTED='REJECTED', CANCELLED='CANCELLED' }
export enum StepStatus { WAITING='WAITING', ACTIVE='ACTIVE', PROCEEDED='PROCEEDED', APPROVED='APPROVED', REJECTED='REJECTED', AUTO_FORWARDED='AUTO_FORWARDED' }
export type LeaveContext = { type: LeaveType; gender:'Male'|'Female'|'Transgender'; startDate:Date; endDate:Date; joiningDate:Date; dateOfBirth:Date; balance:number; previousApprovedCount:number; monthlyCasualUsed:number; documents:string[]; requesterRole:Role; bps:number; };
export type PolicyResult = { requestedDays:number; balanceDeduction:number; requiredDocument?:string; metadata?:Record<string,unknown> };
