import { BadRequestException } from '@nestjs/common'; import { LeaveContext, PolicyResult } from '../leave.types';
export abstract class BaseLeaveEngine {
 abstract supports(type:string):boolean; abstract evaluate(ctx:LeaveContext):PolicyResult;
 protected days(ctx:LeaveContext){ const end=new Date(ctx.endDate); end.setHours(0,0,0,0); const start=new Date(ctx.startDate); start.setHours(0,0,0,0); const ms=end.getTime()-start.getTime(); if(ms<0) throw new BadRequestException('End date cannot be before start date'); return Math.floor(ms/86400000)+1; }
 protected requireDoc(ctx:LeaveContext,label:string){ if(!ctx.documents?.length) throw new BadRequestException(`${label} is mandatory`); }
 protected yearsOfService(ctx:LeaveContext){ return (ctx.startDate.getTime()-ctx.joiningDate.getTime())/(365.2425*86400000); }
 protected ageAtStart(ctx:LeaveContext){ return (ctx.startDate.getTime()-ctx.dateOfBirth.getTime())/(365.2425*86400000); }
}
