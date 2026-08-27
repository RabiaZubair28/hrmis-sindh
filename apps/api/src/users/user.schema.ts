import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Role } from '../common/roles';
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) email!: string;
  @Prop({ required: true, unique: true, trim: true }) personnelNo!: string;
  @Prop({ required: true }) passwordHash!: string;
  @Prop({ enum: Role, required: true }) role!: Role;
  @Prop({ min: 16, max: 20 }) bps?: number;
  @Prop({ default: true }) isActive!: boolean;
  @Prop({ type: Types.ObjectId, ref: 'User' }) assignedMsDhoId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User' }) assignedSectionOfficerId?: Types.ObjectId;
  @Prop({ type: [String], default: [] }) permissions!: string[];
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
