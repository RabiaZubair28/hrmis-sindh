import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ required: true, trim: true, maxlength: 120 }) title!: string;
  @Prop({ required: true, trim: true, maxlength: 500 }) message!: string;
  @Prop({ required: true, trim: true, maxlength: 50 }) type!: string;
  @Prop({ type: Types.ObjectId, ref: 'LeaveRequest' }) leaveRequestId?: Types.ObjectId;
  @Prop({ trim: true }) eventKey?: string;
  @Prop({ default: false, index: true }) read!: boolean;
  @Prop() readAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, eventKey: 1 }, { unique: true, sparse: true });
