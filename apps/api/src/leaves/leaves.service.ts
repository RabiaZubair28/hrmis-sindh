import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/roles';
import { ProfilesService } from '../profiles/profiles.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/user.schema';
import { ApprovalChainResolver } from './approval-chain.service';
import { ActOnLeaveDto, CreateLeaveDto } from './dto/leave.dto';
import { POLICY_ENGINES } from './engines/policy.engines';
import { LeaveStatus, LeaveType, StepStatus } from './leave.types';
import { LeaveLedger, LeaveLedgerDocument } from './schemas/ledger.schema';
import { LeaveRequest, LeaveRequestDocument } from './schemas/leave.schema';

const PROCESSED_STEP_STATUSES = [
  StepStatus.PROCEEDED,
  StepStatus.APPROVED,
  StepStatus.REJECTED,
  StepStatus.AUTO_FORWARDED,
];

@Injectable()
export class LeavesService {
  private readonly engines = POLICY_ENGINES.map((Engine) => new Engine());

  constructor(
    @InjectModel(LeaveRequest.name) private readonly requests: Model<LeaveRequestDocument>,
    @InjectModel(LeaveLedger.name) private readonly ledger: Model<LeaveLedgerDocument>,
    private readonly profiles: ProfilesService,
    private readonly users: UsersService,
    private readonly chains: ApprovalChainResolver,
    private readonly notifications: NotificationsService,
  ) {}

  private formatDate(value: Date) { return new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric' }).format(value); }

  private async notifyActiveApprovers(doc: LeaveRequestDocument, requesterName: string) {
    const active = doc.steps.filter(step => step.status === StepStatus.ACTIVE);
    const targetIds: string[] = [];
    for (const step of active) {
      if (step.actorId) targetIds.push(step.actorId.toString());
      else {
        const users = await this.users.findRole(step.role);
        targetIds.push(...users.map(u => u.id));
      }
    }
    await this.notifications.createMany(targetIds, {
      title: 'Leave request awaiting your action',
      message: `${requesterName} has submitted a ${String(doc.type).replaceAll('_',' ')} request from ${this.formatDate(doc.startDate)} to ${this.formatDate(doc.endDate)}.`,
      type: 'LEAVE_ACTION_REQUIRED', leaveRequestId: doc._id,
    });
  }

  private inclusiveDays(a: Date, b: Date) {
    const start = new Date(a);
    const end = new Date(b);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  }

  private startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private historicalUsageCount(profile: any, type: LeaveType) {
    const expected = type === LeaveType.MATERNITY ? 'maternity' : type === LeaveType.PATERNITY ? 'paternity' : '';
    if (!expected) return 0;
    return (profile?.historicalLeaves ?? []).filter((row: any) => {
      const value = String(row?.leaveType ?? '').trim().toLowerCase();
      return value === type.toLowerCase() || value.includes(expected);
    }).length;
  }

  private completedMonths(joining: Date, asOf = new Date()) {
    let months = (asOf.getFullYear() - joining.getFullYear()) * 12 + (asOf.getMonth() - joining.getMonth());
    if (asOf.getDate() < joining.getDate()) months--;
    return Math.max(0, months);
  }

  async balance(userId: string | Types.ObjectId, asOf = new Date()) {
    const profile = await this.profiles.findByUser(userId);
    if (!profile) throw new BadRequestException('Complete user profile before requesting leave');
    const accrued = this.completedMonths(new Date(profile.joiningMonth), asOf) * 4;
    const rows = await this.ledger.find({ userId }).lean().exec();
    const adjustments = rows.reduce((sum, row) => sum + row.amount, 0);
    return {
      accrued,
      adjustments,
      available: Math.max(0, accrued + adjustments),
      completedServiceMonths: this.completedMonths(new Date(profile.joiningMonth), asOf),
    };
  }

  async options(user: UserDocument) {
    const profile = await this.profiles.findByUser(user.id);
    if (!profile) throw new BadRequestException('Complete user profile before requesting leave');
    const [maternityApproved, paternityApproved] = await Promise.all([
      this.requests.countDocuments({ requesterId: user._id, type: LeaveType.MATERNITY, status: LeaveStatus.APPROVED }),
      this.requests.countDocuments({ requesterId: user._id, type: LeaveType.PATERNITY, status: LeaveStatus.APPROVED }),
    ]);
    const maternityUsed = maternityApproved + this.historicalUsageCount(profile, LeaveType.MATERNITY);
    const paternityUsed = paternityApproved + this.historicalUsageCount(profile, LeaveType.PATERNITY);
    return {
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      joiningMonth: profile.joiningMonth,
      usage: { maternity: maternityUsed, paternity: paternityUsed },
      limits: { maternity: 3, paternity: 2, casualDaysPerMonth: 2, lprDays: 365, studyDays: 730 },
    };
  }

  private async context(user: UserDocument, dto: CreateLeaveDto) {
    const profile = await this.profiles.findByUser(user.id);
    if (!profile) throw new BadRequestException('Complete user profile before requesting leave');
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Enter valid leave dates');
    if (start < this.startOfToday()) throw new BadRequestException('Leave cannot start before today');
    if (start > end) throw new BadRequestException('End date cannot be before start date');

    const overlapRange = {
      requesterId: user._id,
      startDate: { $lte: end },
      endDate: { $gte: start },
    };

    // Check pending first so the applicant receives the most actionable message.
    const pendingOverlap = await this.requests.exists({
      ...overlapRange,
      status: LeaveStatus.PENDING,
    });
    if (pendingOverlap) {
      throw new BadRequestException('You already have a pending leave request for the selected dates.');
    }

    const approvedOverlap = await this.requests.exists({
      ...overlapRange,
      status: LeaveStatus.APPROVED,
    });
    if (approvedOverlap) {
      throw new BadRequestException('You already have an approved leave request for the selected dates.');
    }

    const balance = await this.balance(user.id, start);
    const approvedRequestCount = await this.requests.countDocuments({
      requesterId: user._id,
      type: dto.type,
      status: LeaveStatus.APPROVED,
    });
    const previousApprovedCount = approvedRequestCount + this.historicalUsageCount(profile, dto.type);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const casual = await this.requests.find({
      requesterId: user._id,
      type: LeaveType.CASUAL,
      status: LeaveStatus.APPROVED,
      startDate: { $gte: monthStart, $lte: monthEnd },
    }).lean().exec();
    const monthlyCasualUsed = casual.reduce(
      (sum, row) => sum + this.inclusiveDays(new Date(row.startDate), new Date(row.endDate)),
      0,
    );
    return { profile, start, end, balance, previousApprovedCount, monthlyCasualUsed };
  }

  async create(user: UserDocument, dto: CreateLeaveDto) {
    if (![Role.DOCTOR, Role.MSDHO].includes(user.role)) {
      throw new ForbiddenException('This account cannot request leave');
    }
    const context = await this.context(user, dto);
    const engine = this.engines.find((candidate) => candidate.supports(dto.type));
    if (!engine) throw new BadRequestException('Leave policy engine not configured');

    const policy = engine.evaluate({
      type: dto.type,
      gender: context.profile.gender,
      startDate: context.start,
      endDate: context.end,
      joiningDate: new Date(context.profile.joiningMonth),
      dateOfBirth: new Date(context.profile.dateOfBirth),
      balance: context.balance.available,
      previousApprovedCount: context.previousApprovedCount,
      monthlyCasualUsed: context.monthlyCasualUsed,
      documents: dto.documents ?? [],
      requesterRole: user.role,
      bps: context.profile.bps,
    });

    const chain = this.chains.resolve(user.role, context.profile.bps, dto.type);
    const firstStage = Math.min(...chain.map((step) => step.stage));
    const now = new Date();

    // Resolve unambiguous role accounts once at submission time so the request is
    // frozen to a concrete actor wherever possible. MSDHO/SO use explicit user
    // mappings; secretariat roles are assigned only when exactly one active account
    // exists for that role. This avoids role-wide history leakage and N+1 lookups.
    const lookupRoles = [...new Set(chain.map((step) => step.role).filter((role) => ![Role.MSDHO, Role.SECTION_OFFICER].includes(role)))];
    const lookupResults = await Promise.all(lookupRoles.map(async (role) => [role, await this.users.findRole(role)] as const));
    const uniqueActorByRole = new Map<Role, Types.ObjectId>();
    for (const [role, candidates] of lookupResults) {
      if (candidates.length === 1) uniqueActorByRole.set(role, candidates[0]._id);
    }

    const steps = chain.map((step) => {
      let actorId: Types.ObjectId | undefined;
      if (step.role === Role.MSDHO && user.assignedMsDhoId) actorId = user.assignedMsDhoId;
      else if (step.role === Role.SECTION_OFFICER && user.assignedSectionOfficerId) actorId = user.assignedSectionOfficerId;
      else actorId = uniqueActorByRole.get(step.role);
      return {
        ...step,
        actorId,
        status: step.stage === firstStage ? StepStatus.ACTIVE : StepStatus.WAITING,
        activatedAt: step.stage === firstStage ? now : undefined,
        attachments: [],
      };
    });

    const doc = await this.requests.create({
      requesterId: user._id, type: dto.type, startDate: context.start, endDate: context.end,
      documents: dto.documents ?? [], status: LeaveStatus.PENDING, policy, steps,
    });
    const requesterName = context.profile.fullName || user.personnelNo;
    await Promise.all([
      this.notifications.create(user._id, { title:'Leave request submitted', message:`Your ${String(dto.type).replaceAll('_',' ')} request from ${this.formatDate(context.start)} to ${this.formatDate(context.end)} has been submitted.`, type:'LEAVE_SUBMITTED', leaveRequestId:doc._id, eventKey:`leave:${doc._id}:submitted` }),
      this.notifyActiveApprovers(doc, requesterName),
    ]);
    return doc;
  }

  private safeSort(sort: string, fallback = '-createdAt') {
    const allowed = new Set(['createdAt', '-createdAt', 'startDate', '-startDate', 'endDate', '-endDate', 'type', '-type']);
    return allowed.has(sort) ? sort : fallback;
  }

  private searchType(search: string) {
    const terms = search.trim().toLowerCase().split(/\s+/).filter((term) => term && term !== 'leave');
    if (!terms.length) return undefined;
    const matches = Object.values(LeaveType).filter((type) => {
      const normalized = type.replaceAll('_', ' ').toLowerCase();
      return terms.every((term) => normalized.includes(term));
    });
    return matches.length ? { $in: matches } : '__NO_MATCH__';
  }

  private sanitizeForRequester(user: UserDocument, items: any[]) {
    if (user.role !== Role.DOCTOR) return items;
    return items.map((item) => ({
      ...item,
      steps: item.steps.map((step: any) => ({ ...step, note: undefined, attachments: [] })),
    }));
  }

  async mine(user: UserDocument, page = 1, limit = 10, sort = '-createdAt', search = '', status?: LeaveStatus) {
    const query: any = { requesterId: user._id };
    if (status && Object.values(LeaveStatus).includes(status)) query.status = status;
    const typeFilter = this.searchType(search);
    if (typeFilter) query.type = typeFilter;
    const order = this.safeSort(sort);
    const [items, total] = await Promise.all([
      this.requests.find(query).sort(order).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.requests.countDocuments(query),
    ]);
    return {
      items: this.sanitizeForRequester(user, items),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async requesterHistory(user: UserDocument, requesterId: string, page = 1, limit = 50, sort = '-createdAt') {
    if (user.role === Role.DOCTOR) throw new ForbiddenException();
    if (!Types.ObjectId.isValid(requesterId)) throw new BadRequestException('Invalid employee');
    const query = { requesterId: new Types.ObjectId(requesterId) };
    const order = this.safeSort(sort, '-createdAt');
    const [items, total] = await Promise.all([
      this.requests.find(query).sort(order).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.requests.countDocuments(query),
    ]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async queue(user: UserDocument, page = 1, limit = 10, type?: LeaveType, sort = 'createdAt', search = '') {
    if (user.role === Role.DOCTOR) throw new ForbiddenException();
    const query: any = {
      requesterId: { $ne: user._id },
      status: LeaveStatus.PENDING,
      steps: {
        $elemMatch: {
          role: user.role,
          status: StepStatus.ACTIVE,
          $or: [{ actorId: user._id }, { actorId: { $exists: false } }, { actorId: null }],
        },
      },
    };
    if (type) query.type = type;
    else {
      const typeFilter = this.searchType(search);
      if (typeFilter) query.type = typeFilter;
    }
    const order = this.safeSort(sort, 'createdAt');
    const [items, total] = await Promise.all([
      this.requests.find(query)
        .populate('requesterId', 'email personnelNo role bps')
        .sort(order)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requests.countDocuments(query),
    ]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async processed(user: UserDocument, page = 1, limit = 10, sort = '-createdAt', search = '', status?: LeaveStatus) {
    if (user.role === Role.DOCTOR) throw new ForbiddenException();
    const query: any = {
      requesterId: { $ne: user._id },
      steps: {
        $elemMatch: {
          role: user.role,
          actorId: user._id,
          status: { $in: PROCESSED_STEP_STATUSES },
        },
      },
    };
    if (status && Object.values(LeaveStatus).includes(status)) query.status = status;
    const typeFilter = this.searchType(search);
    if (typeFilter) query.type = typeFilter;
    const order = this.safeSort(sort, '-createdAt');
    const [items, total] = await Promise.all([
      this.requests.find(query)
        .populate('requesterId', 'email personnelNo role bps')
        .sort(order)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requests.countDocuments(query),
    ]);
    return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  private activateNextStage(doc: LeaveRequestDocument, currentStage: number, status: StepStatus) {
    doc.steps
      .filter((step) => step.stage === currentStage && step.status === StepStatus.ACTIVE)
      .forEach((step) => {
        step.status = status;
        step.actedAt = new Date();
      });
    const nextStages = doc.steps.filter((step) => step.stage > currentStage).map((step) => step.stage);
    if (!nextStages.length) return;
    const next = Math.min(...nextStages);
    doc.steps
      .filter((step) => step.stage === next && step.status === StepStatus.WAITING)
      .forEach((step) => {
        step.status = StepStatus.ACTIVE;
        step.activatedAt = new Date();
      });
  }

  async act(user: UserDocument, id: string, dto: ActOnLeaveDto) {
    const doc = await this.requests.findById(id);
    if (!doc) throw new NotFoundException();
    if (doc.requesterId.toString() === user.id) throw new ForbiddenException('You cannot act on your own leave request');
    if (doc.status !== LeaveStatus.PENDING) throw new BadRequestException('Leave request is already finalized');

    const active = doc.steps.find(
      (step) => step.role === user.role
        && step.status === StepStatus.ACTIVE
        && (!step.actorId || step.actorId.toString() === user.id),
    );
    if (!active) throw new ForbiddenException('This request is not pending with your account');

    // Freeze the actual actor on first action for accurate actor-specific history.
    if (!active.actorId) active.actorId = user._id;
    active.note = dto.note;
    active.attachments = dto.attachments ?? [];
    active.actedAt = new Date();

    if (dto.action === 'REJECT' && !active.finalApprover) throw new BadRequestException('This step can only proceed the request');
    if (dto.action === 'REJECT') {
      active.status = StepStatus.REJECTED;
      doc.status = LeaveStatus.REJECTED;
      doc.rejectionReason = dto.note;
      doc.finalizedAt = new Date();
      await doc.save();
      await this.notifications.create(doc.requesterId, { title:'Leave request rejected', message:`Your ${String(doc.type).replaceAll('_',' ')} request from ${this.formatDate(doc.startDate)} to ${this.formatDate(doc.endDate)} has been rejected.`, type:'LEAVE_REJECTED', leaveRequestId:doc._id, eventKey:`leave:${doc._id}:rejected` });
      return doc;
    }

    if (active.finalApprover && dto.action !== 'APPROVE') {
      throw new BadRequestException('Final approver can only approve or reject');
    }
    if (!active.finalApprover && dto.action !== 'PROCEED') {
      throw new BadRequestException('This step can only proceed the request');
    }

    active.status = active.finalApprover ? StepStatus.APPROVED : StepStatus.PROCEEDED;
    if (active.finalApprover) {
      const finalStage = active.stage;
      const finals = doc.steps.filter((step) => step.stage === finalStage && step.finalApprover);
      const allApproved = finals.every((step) => step.status === StepStatus.APPROVED);
      if (allApproved) {
        doc.status = LeaveStatus.APPROVED;
        doc.finalizedAt = new Date();
        if (doc.policy.balanceDeduction > 0) {
          await this.ledger.create({
            userId: doc.requesterId,
            leaveRequestId: doc._id,
            amount: -doc.policy.balanceDeduction,
            kind: 'DEDUCTION',
            reason: `${doc.type} approved`,
          });
        }
      }
    } else {
      this.activateNextStage(doc, active.stage, StepStatus.PROCEEDED);
    }

    await doc.save();
    const requesterProfile = await this.profiles.findByUser(doc.requesterId);
    const requesterName = requesterProfile?.fullName || 'An employee';
    if (doc.status === LeaveStatus.APPROVED) {
      await this.notifications.create(doc.requesterId, { title:'Leave request approved', message:`Your ${String(doc.type).replaceAll('_',' ')} request from ${this.formatDate(doc.startDate)} to ${this.formatDate(doc.endDate)} has been approved.`, type:'LEAVE_APPROVED', leaveRequestId:doc._id, eventKey:`leave:${doc._id}:approved` });
    } else if (!active.finalApprover) {
      await this.notifyActiveApprovers(doc, requesterName);
    }
    return doc;
  }

  async autoForwardExpired() {
    const cutoff = new Date(Date.now() - 72 * 3600 * 1000);
    const docs = await this.requests.find({
      status: LeaveStatus.PENDING,
      steps: { $elemMatch: { status: StepStatus.ACTIVE, finalApprover: false, activatedAt: { $lte: cutoff } } },
    }).exec();

    for (const doc of docs) {
      const stages = [...new Set(
        doc.steps
          .filter((step) => step.status === StepStatus.ACTIVE && !step.finalApprover && step.activatedAt && step.activatedAt <= cutoff)
          .map((step) => step.stage),
      )];
      for (const stage of stages) this.activateNextStage(doc, stage, StepStatus.AUTO_FORWARDED);
      await doc.save();
      const requesterProfile = await this.profiles.findByUser(doc.requesterId);
      await this.notifyActiveApprovers(doc, requesterProfile?.fullName || 'An employee');
    }
    return docs.length;
  }
}
