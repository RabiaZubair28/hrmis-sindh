import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Role } from '../common/roles';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.model.findOne({ email: normalizeEmail(email), isActive: true }).exec();
  }

  findByEmailAny(email: string) {
    return this.model.findOne({ email: normalizeEmail(email) }).exec();
  }

  findById(id: string | Types.ObjectId) {
    return this.model.findById(id).exec();
  }

  findRole(role: Role) {
    return this.model.find({ role, isActive: true }).exec();
  }

  listSectionOfficers() {
    return this.model
      .find({ role: Role.SECTION_OFFICER, isActive: true })
      .select('_id email personnelNo')
      .sort({ personnelNo: 1, email: 1 })
      .lean()
      .exec();
  }

  async assignSectionOfficer(userId: string | Types.ObjectId, sectionOfficerId: string | Types.ObjectId) {
    const [user, sectionOfficer] = await Promise.all([
      this.model.findById(userId).exec(),
      this.model.findById(sectionOfficerId).exec(),
    ]);
    if (!user) throw new NotFoundException('User account not found');
    if (!sectionOfficer || !sectionOfficer.isActive || sectionOfficer.role !== Role.SECTION_OFFICER) {
      throw new BadRequestException('Select a valid active Section Officer');
    }
    user.assignedSectionOfficerId = sectionOfficer._id;
    await user.save();
    return {
      assignedSectionOfficerId: sectionOfficer._id,
      sectionOfficer: {
        id: sectionOfficer.id,
        email: sectionOfficer.email,
        personnelNo: sectionOfficer.personnelNo,
      },
    };
  }

  create(data: Partial<User>) {
    return this.model.create(data);
  }

  /**
   * Idempotently creates/repairs a seeded test account.
   *
   * Older starter versions could leave the same test personnel number attached
   * to a stale email. Looking up only by email then caused the MongoDB unique
   * personnelNo index to abort the seed, which meant DS/AS/SS/Secretary/Minister
   * were never created. This method reconciles by either unique identity before
   * writing, while refusing to merge two genuinely different documents.
   */
  async upsertSeedUser(data: {
    email: string;
    personnelNo: string;
    passwordHash: string;
    role: Role;
    bps?: number;
    permissions?: string[];
    assignedMsDhoId?: Types.ObjectId;
    assignedSectionOfficerId?: Types.ObjectId;
  }) {
    const email = normalizeEmail(data.email);
    const personnelNo = data.personnelNo.trim();

    const [byEmail, byPersonnel] = await Promise.all([
      this.model.findOne({ email }).exec(),
      this.model.findOne({ personnelNo }).exec(),
    ]);

    if (byEmail && byPersonnel && byEmail.id !== byPersonnel.id) {
      throw new BadRequestException(
        `Cannot seed ${email}: email and personnel number ${personnelNo} belong to different accounts. ` +
        'Remove the stale test account or change the TEST_* values in apps/api/.env.',
      );
    }

    const existing = byEmail ?? byPersonnel;
    const update = {
      ...data,
      email,
      personnelNo,
      isActive: true,
      permissions: data.permissions ?? [],
    };

    if (existing) {
      existing.set(update);
      return existing.save();
    }

    return this.model.create(update);
  }

  async updateSeedRouting(
    id: string | Types.ObjectId,
    data: { assignedMsDhoId?: Types.ObjectId; assignedSectionOfficerId?: Types.ObjectId },
  ) {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true }).exec();
  }

  list(page = 1, limit = 25) {
    return Promise.all([
      this.model.find().select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.model.countDocuments(),
    ]);
  }

  updateAccess(id: string, data: { role?: Role; permissions?: string[]; isActive?: boolean }) {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).select('-passwordHash').exec();
  }
}
