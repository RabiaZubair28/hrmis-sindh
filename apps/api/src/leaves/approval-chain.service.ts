import { BadRequestException, Injectable } from '@nestjs/common'; import { Role } from '../common/roles'; import { LeaveType } from './leave.types';
export type ChainStep={role:Role;stage:number;finalApprover:boolean};
@Injectable() export class ApprovalChainResolver {
 resolve(role:Role,bps:number,type:LeaveType):ChainStep[]{
   if(![Role.DOCTOR,Role.MSDHO].includes(role)) throw new BadRequestException('This account cannot request leave');
   if(role===Role.MSDHO) return [
     {role:Role.SECTION_OFFICER,stage:1,finalApprover:false},{role:Role.DEPUTY_SECRETARY,stage:2,finalApprover:false},{role:Role.ADDITIONAL_SECRETARY,stage:3,finalApprover:false},{role:Role.SPECIAL_SECRETARY,stage:4,finalApprover:false},
     {role:Role.SECRETARY,stage:5,finalApprover:true},{role:Role.MINISTER,stage:5,finalApprover:true},
   ];
   if(type===LeaveType.CASUAL) return [{role:Role.MSDHO,stage:1,finalApprover:true}];
   if(bps>=16&&bps<=18){ const special=[LeaveType.MATERNITY,LeaveType.LPR].includes(type); return [
     {role:Role.MSDHO,stage:1,finalApprover:false},{role:Role.SECTION_OFFICER,stage:2,finalApprover:false},{role:Role.DEPUTY_SECRETARY,stage:3,finalApprover:false},{role:Role.ADDITIONAL_SECRETARY,stage:4,finalApprover:special},
     ...(!special?[{role:Role.SPECIAL_SECRETARY,stage:5,finalApprover:true}]:[]),
   ];}
   if(bps>=19&&bps<=20) return [{role:Role.MSDHO,stage:1,finalApprover:false},{role:Role.SECTION_OFFICER,stage:2,finalApprover:false},{role:Role.DEPUTY_SECRETARY,stage:3,finalApprover:false},{role:Role.ADDITIONAL_SECRETARY,stage:4,finalApprover:false},{role:Role.SPECIAL_SECRETARY,stage:5,finalApprover:true}];
   throw new BadRequestException('No approval chain is configured for this BPS');
 }
}
