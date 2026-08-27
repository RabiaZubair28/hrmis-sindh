import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; import { HydratedDocument, Types } from 'mongoose'; import { Role } from '../../common/roles'; import { LeaveStatus, LeaveType, StepStatus } from '../leave.types';
@Schema({_id:false}) export class ApprovalStep {
 @Prop({enum:Role,required:true}) role!:Role; @Prop({default:0}) stage!:number; @Prop({required:true}) finalApprover!:boolean; @Prop({enum:StepStatus,default:StepStatus.WAITING}) status!:StepStatus;
 @Prop({type:Types.ObjectId,ref:'User'}) actorId?:Types.ObjectId; @Prop() note?:string; @Prop({type:[String],default:[]}) attachments!:string[]; @Prop() activatedAt?:Date; @Prop() actedAt?:Date;
}
const ApprovalStepSchema=SchemaFactory.createForClass(ApprovalStep);
@Schema({_id:false}) export class PolicySnapshot { @Prop({required:true}) requestedDays!:number; @Prop({required:true}) balanceDeduction!:number; @Prop() requiredDocument?:string; @Prop({type:Object}) metadata?:Record<string,unknown>; }
const PolicySnapshotSchema=SchemaFactory.createForClass(PolicySnapshot);
@Schema({timestamps:true}) export class LeaveRequest {
 @Prop({type:Types.ObjectId,ref:'User',required:true,index:true}) requesterId!:Types.ObjectId; @Prop({enum:LeaveType,required:true,index:true}) type!:LeaveType;
 @Prop({required:true}) startDate!:Date; @Prop({required:true}) endDate!:Date; @Prop({enum:LeaveStatus,default:LeaveStatus.PENDING,index:true}) status!:LeaveStatus;
 @Prop({type:[String],default:[]}) documents!:string[]; @Prop({type:PolicySnapshotSchema,required:true}) policy!:PolicySnapshot; @Prop({type:[ApprovalStepSchema],default:[]}) steps!:ApprovalStep[];
 @Prop() rejectionReason?:string; @Prop() finalizedAt?:Date;
}
export type LeaveRequestDocument=HydratedDocument<LeaveRequest>; export const LeaveRequestSchema=SchemaFactory.createForClass(LeaveRequest);
LeaveRequestSchema.index({requesterId:1,startDate:1,endDate:1});
