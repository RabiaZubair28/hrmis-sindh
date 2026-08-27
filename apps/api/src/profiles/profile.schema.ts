import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class Posting {
  @Prop({ required: true }) district!: string;
  @Prop({ required: true }) facility!: string;
  @Prop({ required: true }) designation!: string;
  @Prop({ required: true, min: 16, max: 20 }) bps!: number;
  @Prop({ required: true }) startMonth!: Date;
  @Prop() endMonth?: Date;
  @Prop({ default: false }) allowedToWork?: boolean;
}
const PostingSchema = SchemaFactory.createForClass(Posting);

@Schema({ _id: false })
export class Qualification {
  @Prop() institute?: string;
  @Prop({ required: true }) degree!: string;
  @Prop() specialization?: string;
  @Prop() status?: string;
  @Prop({ required: true }) startMonth!: Date;
}
const QualificationSchema = SchemaFactory.createForClass(Qualification);

@Schema({ _id: false })
export class Promotion {
  @Prop({ required: true, min: 16, max: 20 }) bpsFrom!: number;
  @Prop({ required: true, min: 16, max: 20 }) bpsTo!: number;
  @Prop({ required: true }) promotionMonth!: Date;
}
const PromotionSchema = SchemaFactory.createForClass(Promotion);

@Schema({ _id: false })
export class Training {
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) specializedArea!: string;
  @Prop({ required: true }) institute!: string;
  @Prop({ required: true }) startDate!: Date;
  @Prop({ required: true }) endDate!: Date;
  @Prop() certificateUrl?: string;
}
const TrainingSchema = SchemaFactory.createForClass(Training);

@Schema({ _id: false })
export class HistoricalLeave {
  @Prop({ required: true }) leaveType!: string;
  @Prop({ required: true }) startDate!: Date;
  @Prop({ required: true }) endDate!: Date;
}
const HistoricalLeaveSchema = SchemaFactory.createForClass(HistoricalLeave);

@Schema({ timestamps: true })
export class EmployeeProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true }) userId!: Types.ObjectId;
  @Prop({ trim: true, maxlength: 80 }) fullName?: string;
  @Prop({ required: true, trim: true, maxlength: 30 }) personnelNo!: string;
  @Prop({ required: true, match: /^\d{5}-\d{7}-\d$/ }) cnic!: string;
  @Prop({ required: true, trim: true, maxlength: 80, match: /^[A-Za-z .'-]+$/ }) fatherName!: string;
  @Prop({ enum: ['Male', 'Female', 'Transgender'], required: true }) gender!: 'Male' | 'Female' | 'Transgender';
  @Prop({ required: true }) dateOfBirth!: Date;
  @Prop({ required: true, trim: true, maxlength: 80 }) domicile!: string;
  @Prop({ required: true, trim: true, maxlength: 120, enum: ['SO-I','SO-II','SO-III','SO-IV','SO-V','SO-VI'] }) sectionOffice!: string;
  @Prop({ required: true }) serviceRegularized!: boolean;
  @Prop() serviceRegularizationMonth?: Date;
  @Prop() clearedCommissionExam?: boolean;
  @Prop({ required: true }) joiningMonth!: Date;
  @Prop({ trim: true, maxlength: 50 }) meritNumber?: string;
  @Prop({ required: true, trim: true, maxlength: 100 }) cadre!: string;
  @Prop({ required: true, min: 16, max: 20 }) bps!: number;
  @Prop({ required: true, match: /^\+?[0-9]{10,15}$/ }) contactNumber!: string;
  @Prop({ trim: true, maxlength: 50 }) pmdcNo?: string;
  @Prop() pmdcIssueDate?: Date;
  @Prop() pmdcExpiryDate?: Date;
  @Prop({ required: true, lowercase: true, trim: true }) email!: string;
  @Prop({ required: true, trim: true, maxlength: 300 }) address!: string;
  @Prop() cnicFrontUrl?: string;
  @Prop() cnicBackUrl?: string;
  @Prop({ type: PostingSchema }) currentPosting?: Posting;
  @Prop({ type: [PostingSchema], default: [] }) previousPostings!: Posting[];
  @Prop({ type: [QualificationSchema], default: [] }) qualifications!: Qualification[];
  @Prop({ type: [PromotionSchema], default: [] }) promotions!: Promotion[];
  @Prop({ type: [HistoricalLeaveSchema], default: [] }) historicalLeaves!: HistoricalLeave[];
  @Prop({ type: [TrainingSchema], default: [] }) trainings!: Training[];
}
export type EmployeeProfileDocument = HydratedDocument<EmployeeProfile>;
export const EmployeeProfileSchema = SchemaFactory.createForClass(EmployeeProfile);
