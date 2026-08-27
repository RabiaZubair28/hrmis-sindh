import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveStatus } from '../leaves/leave.types';
import { LeaveRequest, LeaveRequestDocument } from '../leaves/schemas/leave.schema';
import { Notification, NotificationDocument } from './notification.schema';

type NotificationInput = {
  title: string;
  message: string;
  type: string;
  leaveRequestId?: string | Types.ObjectId;
  eventKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly model: Model<NotificationDocument>,
    @InjectModel(LeaveRequest.name) private readonly leaves: Model<LeaveRequestDocument>,
  ) {}

  private objectId(value: string | Types.ObjectId): Types.ObjectId {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(String(value));
  }

  private formatDate(value: Date | string): string {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
  }

  async create(userId: string | Types.ObjectId, data: NotificationInput) {
    const normalizedUserId = this.objectId(userId);
    const payload = {
      ...data,
      userId: normalizedUserId,
      leaveRequestId: data.leaveRequestId ? this.objectId(data.leaveRequestId) : undefined,
    };
    if (data.eventKey) {
      return this.model.findOneAndUpdate(
        { userId: normalizedUserId, eventKey: data.eventKey },
        { $setOnInsert: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).exec();
    }
    return this.model.create(payload);
  }

  async createMany(userIds: Array<string | Types.ObjectId>, data: NotificationInput) {
    const unique = [...new Set(userIds.map(String))];
    if (!unique.length) return;
    await Promise.all(unique.map((userId) => this.create(userId, data)));
  }

  private async ensureRequesterLeaveNotifications(userId: Types.ObjectId) {
    const requests = await this.leaves
      .find({ requesterId: userId, status: { $in: [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED] } })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('_id type startDate endDate status')
      .lean()
      .exec();

    if (!requests.length) return;

    const operations: any[] = [];
    for (const request of requests) {
      const id = String(request._id);
      const leaveName = String(request.type).replaceAll('_', ' ');
      const period = `${this.formatDate(request.startDate)} to ${this.formatDate(request.endDate)}`;

      operations.push({
        updateOne: {
          filter: { userId, eventKey: `leave:${id}:submitted` },
          update: { $setOnInsert: {
            userId,
            eventKey: `leave:${id}:submitted`,
            title: 'Leave request submitted',
            message: `Your ${leaveName} request from ${period} has been submitted.`,
            type: 'LEAVE_SUBMITTED',
            leaveRequestId: request._id,
            read: false,
          } },
          upsert: true,
        },
      });

      if (request.status === LeaveStatus.APPROVED) {
        operations.push({
          updateOne: {
            filter: { userId, eventKey: `leave:${id}:approved` },
            update: { $setOnInsert: {
              userId,
              eventKey: `leave:${id}:approved`,
              title: 'Leave request approved',
              message: `Your ${leaveName} request from ${period} has been approved.`,
              type: 'LEAVE_APPROVED',
              leaveRequestId: request._id,
              read: false,
            } },
            upsert: true,
          },
        });
      } else if (request.status === LeaveStatus.REJECTED) {
        operations.push({
          updateOne: {
            filter: { userId, eventKey: `leave:${id}:rejected` },
            update: { $setOnInsert: {
              userId,
              eventKey: `leave:${id}:rejected`,
              title: 'Leave request rejected',
              message: `Your ${leaveName} request from ${period} has been rejected.`,
              type: 'LEAVE_REJECTED',
              leaveRequestId: request._id,
              read: false,
            } },
            upsert: true,
          },
        });
      }
    }
    if (operations.length) await this.model.bulkWrite(operations, { ordered: false });
  }

  async list(userId: string | Types.ObjectId, limit = 30) {
    const normalizedUserId = this.objectId(userId);
    await this.ensureRequesterLeaveNotifications(normalizedUserId);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, unread] = await Promise.all([
      this.model.find({ userId: normalizedUserId }).sort({ createdAt: -1 }).limit(safeLimit).lean().exec(),
      this.model.countDocuments({ userId: normalizedUserId, read: false }),
    ]);
    return { items, unread };
  }

  async markRead(userId: string | Types.ObjectId, id: string) {
    const normalizedUserId = this.objectId(userId);
    return this.model.findOneAndUpdate(
      { _id: id, userId: normalizedUserId },
      { $set: { read: true, readAt: new Date() } },
      { new: true },
    ).lean().exec();
  }

  async markAllRead(userId: string | Types.ObjectId) {
    const normalizedUserId = this.objectId(userId);
    await this.model.updateMany(
      { userId: normalizedUserId, read: false },
      { $set: { read: true, readAt: new Date() } },
    ).exec();
    return { ok: true };
  }
}
