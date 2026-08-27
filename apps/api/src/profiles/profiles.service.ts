import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeProfile, EmployeeProfileDocument } from './profile.schema';
import { UpsertProfileDto } from './profile.dto';

@Injectable()
export class ProfilesService {
  constructor(@InjectModel(EmployeeProfile.name) private readonly model: Model<EmployeeProfileDocument>) {}

  findByUser(userId: string | Types.ObjectId) {
    const normalizedUserId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return this.model.findOne({ userId: normalizedUserId }).exec();
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const dob = new Date(dto.dateOfBirth);
    const minDob = new Date('1900-01-01T00:00:00.000Z');
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - 18);
    if (Number.isNaN(dob.getTime()) || dob < minDob || dob > maxDob) {
      throw new BadRequestException('Date of birth must be between 01-Jan-1900 and 18 years before today');
    }

    if (dto.pmdcIssueDate && dto.pmdcExpiryDate && new Date(dto.pmdcExpiryDate) <= new Date(dto.pmdcIssueDate)) {
      throw new BadRequestException('PMDC expiry date must be after issue date');
    }

    if (dto.currentPosting?.endMonth && new Date(dto.currentPosting.endMonth) < new Date(dto.currentPosting.startMonth)) {
      throw new BadRequestException('Posting end date cannot be before start date');
    }

    const objectUserId = new Types.ObjectId(userId);
    return this.model.findOneAndUpdate(
      { userId: objectUserId },
      { $set: { ...dto, userId: objectUserId } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).exec();
  }
}
