import { IsArray, IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'; import { LeaveType } from '../leave.types';
export class CreateLeaveDto { @IsEnum(LeaveType) type!:LeaveType; @IsDateString() startDate!:string; @IsDateString() endDate!:string; @IsOptional() @IsArray() @IsString({each:true}) documents?:string[]; }
export class ActOnLeaveDto { @IsIn(['PROCEED','APPROVE','REJECT']) action!:'PROCEED'|'APPROVE'|'REJECT'; @IsOptional() @IsString() @MaxLength(2000) note?:string; @IsOptional() @IsArray() @IsString({each:true}) attachments?:string[]; }
