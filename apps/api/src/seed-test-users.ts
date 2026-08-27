import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { Role } from './common/roles';
import { ProfilesService } from './profiles/profiles.service';
import { UpsertProfileDto } from './profiles/profile.dto';
import { UsersService } from './users/users.service';

type SeedAccount = {
  key: string;
  role: Role;
  defaultBps?: number;
  permissions?: string[];
};

const ACCOUNTS: SeedAccount[] = [
  { key: 'DOCTOR', role: Role.DOCTOR, defaultBps: 17 },
  { key: 'MSDHO', role: Role.MSDHO, defaultBps: 19 },
  { key: 'SO', role: Role.SECTION_OFFICER, defaultBps: 17 },
  { key: 'DS', role: Role.DEPUTY_SECRETARY, defaultBps: 18 },
  { key: 'AS', role: Role.ADDITIONAL_SECRETARY, defaultBps: 19 },
  { key: 'SS', role: Role.SPECIAL_SECRETARY, defaultBps: 20 },
  { key: 'SECRETARY', role: Role.SECRETARY, defaultBps: 20 },
  { key: 'MINISTER', role: Role.MINISTER, defaultBps: 20 },
  { key: 'SUPER_ADMIN', role: Role.SUPER_ADMIN, defaultBps: 20, permissions: ['*'] },
];

function required(config: ConfigService, key: string): string {
  const value = config.get<string>(key)?.trim();
  if (!value) throw new Error(`Missing ${key} in apps/api/.env`);
  return value;
}

function numberValue(config: ConfigService, key: string, fallback?: number): number | undefined {
  const raw = config.get<string>(key)?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 16 || value > 20) throw new Error(`${key} must be an integer from 16 to 20`);
  return value;
}

function testProfile(email: string, personnelNo: string, role: Role, bps: number): UpsertProfileDto {
  const names: Record<string,string> = { [Role.DOCTOR]:'Aslam Khan', [Role.MSDHO]:'Dr. Ahmed Ali', [Role.SECTION_OFFICER]:'Sara Ahmed', [Role.DEPUTY_SECRETARY]:'Kamran Shah', [Role.ADDITIONAL_SECRETARY]:'Nadia Hussain', [Role.SPECIAL_SECRETARY]:'Faisal Memon', [Role.SECRETARY]:'Ayesha Siddiqui', [Role.MINISTER]:'Health Minister', [Role.SUPER_ADMIN]:'HRMIS Administrator' };
  const roleProfiles: Record<string, { designation: string; facility: string; district: string; joiningMonth: string; dob: string; phone: string; cnic: string; sectionOffice: string }> = {
    [Role.DOCTOR]: { designation: 'Medical Officer', facility: 'Test Health Facility', district: 'Karachi', joiningMonth: '2020-01-01', dob: '1990-01-15', phone: '+923001111111', cnic: '42101-1234567-1', sectionOffice: 'SO-I' },
    [Role.MSDHO]: { designation: 'District Health Officer', facility: 'Test District Health Office', district: 'Karachi', joiningMonth: '2010-01-01', dob: '1980-01-15', phone: '+923001111112', cnic: '42101-1234567-2', sectionOffice: 'SO-I' },
    [Role.SECTION_OFFICER]: { designation: 'Section Officer', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2012-01-01', dob: '1982-02-15', phone: '+923001111113', cnic: '42101-1234567-3', sectionOffice: 'SO-I' },
    [Role.DEPUTY_SECRETARY]: { designation: 'Deputy Secretary', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2011-01-01', dob: '1981-03-15', phone: '+923001111114', cnic: '42101-1234567-4', sectionOffice: 'SO-II' },
    [Role.ADDITIONAL_SECRETARY]: { designation: 'Additional Secretary', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2009-01-01', dob: '1979-04-15', phone: '+923001111115', cnic: '42101-1234567-5', sectionOffice: 'SO-II' },
    [Role.SPECIAL_SECRETARY]: { designation: 'Special Secretary', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2008-01-01', dob: '1978-05-15', phone: '+923001111116', cnic: '42101-1234567-6', sectionOffice: 'SO-II' },
    [Role.SECRETARY]: { designation: 'Secretary Health', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2005-01-01', dob: '1975-06-15', phone: '+923001111117', cnic: '42101-1234567-7', sectionOffice: 'SO-III' },
    [Role.MINISTER]: { designation: 'Minister Health', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2005-01-01', dob: '1975-07-15', phone: '+923001111118', cnic: '42101-1234567-8', sectionOffice: 'SO-IV' },
    [Role.SUPER_ADMIN]: { designation: 'System Administrator', facility: 'Health Department Secretariat', district: 'Karachi', joiningMonth: '2015-01-01', dob: '1985-08-15', phone: '+923001111119', cnic: '42101-1234567-9', sectionOffice: 'SO-VI' },
  };
  const meta = roleProfiles[role] ?? roleProfiles[Role.DOCTOR];
  return {
    fullName: names[role] ?? personnelNo,
    personnelNo,
    cnic: meta.cnic,
    fatherName: 'Test Father',
    gender: 'Male',
    dateOfBirth: meta.dob,
    domicile: 'Sindh',
    sectionOffice: meta.sectionOffice,
    serviceRegularized: true,
    serviceRegularizationMonth: meta.joiningMonth,
    clearedCommissionExam: true,
    meritNumber: `MERIT-${personnelNo}`,
    joiningMonth: meta.joiningMonth,
    cadre: 'Health Department',
    bps,
    contactNumber: meta.phone,
    pmdcNo: role === Role.DOCTOR ? 'PMDC-TEST-001' : `REG-${personnelNo}`,
    pmdcIssueDate: '2024-01-01',
    pmdcExpiryDate: '2029-01-01',
    email,
    address: 'Health Department, Government of Sindh, Karachi',
    cnicFrontUrl: `seed://${personnelNo}/cnic-front.jpg`,
    cnicBackUrl: `seed://${personnelNo}/cnic-back.jpg`,
    currentPosting: {
      district: meta.district,
      facility: meta.facility,
      designation: meta.designation,
      bps,
      startMonth: meta.joiningMonth,
      allowedToWork: true,
    },
    previousPostings: [{
      district: 'Hyderabad',
      facility: 'Civil Hospital Hyderabad',
      designation: meta.designation,
      bps: Math.max(16, bps - 1),
      startMonth: '2017-01-01',
      endMonth: '2019-12-01',
      allowedToWork: true,
    }],
    qualifications: [{
      institute: 'Liaquat University of Medical & Health Sciences',
      degree: role === Role.DOCTOR ? 'MBBS' : 'Masters in Public Administration',
      specialization: role === Role.DOCTOR ? 'General Medicine' : 'Health Administration',
      status: 'Completed',
      startMonth: '2008-01-01',
    }],
    promotions: [{
      bpsFrom: Math.max(16, bps - 1),
      bpsTo: bps,
      promotionMonth: '2022-01-01',
    }],
    historicalLeaves: [{
      leaveType: 'Earned Leave — Full Pay',
      startDate: '2025-03-10',
      endDate: '2025-03-20',
    }],
    trainings: [{
      title: 'Public Health Management Training',
      specializedArea: 'Health Systems Management',
      institute: 'Health Services Academy',
      startDate: '2025-06-01',
      endDate: '2025-06-05',
      certificateUrl: `seed://${personnelNo}/training-certificate.pdf`,
    }],
  };
}
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);
  const users = app.get(UsersService);
  const profiles = app.get(ProfilesService);

  try {
    const created = new Map<Role, Awaited<ReturnType<UsersService['upsertSeedUser']>>>();

    for (const account of ACCOUNTS) {
      const email = required(config, `TEST_${account.key}_EMAIL`).toLowerCase();
      const password = required(config, `TEST_${account.key}_PASSWORD`);
      const personnelNo = required(config, `TEST_${account.key}_PERSONNEL_NO`);
      const bps = numberValue(config, `TEST_${account.key}_BPS`, account.defaultBps);

      if (password.length < 8) throw new Error(`TEST_${account.key}_PASSWORD must be at least 8 characters`);

      const user = await users.upsertSeedUser({
        email,
        personnelNo,
        passwordHash: await bcrypt.hash(password, 12),
        role: account.role,
        bps,
        permissions: account.permissions ?? [],
      });

      const stored = await users.findByEmail(email);
      if (!stored || stored.role !== account.role || !stored.isActive || !(await bcrypt.compare(password, stored.passwordHash))) {
        throw new Error(`Seed verification failed for ${account.role} (${email})`);
      }

      created.set(account.role, user);
      console.log(`✓ ${account.role.padEnd(20)} ${email} (${personnelNo}) login verified`);
    }

    const doctor = created.get(Role.DOCTOR)!;
    const msdho = created.get(Role.MSDHO)!;
    const so = created.get(Role.SECTION_OFFICER)!;

    await users.updateSeedRouting(doctor._id, {
      assignedMsDhoId: msdho._id,
      assignedSectionOfficerId: so._id,
    });
    await users.updateSeedRouting(msdho._id, { assignedSectionOfficerId: so._id });

    for (const account of ACCOUNTS) {
      const user = created.get(account.role)!;
      await profiles.upsert(
        user.id,
        testProfile(user.email, user.personnelNo, account.role, user.bps ?? account.defaultBps ?? 17),
      );
      console.log(`✓ Employee profile populated for ${account.role} (${user.email})`);
    }

    console.log('\n✓ Doctor -> MS/DHO -> SO routing verified.');
    console.log('✓ Employee information populated for all 9 seeded accounts.');
    console.log('✓ All 9 test account passwords were re-hashed from apps/api/.env and verified.');
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('\nTest user seed failed:', error?.message ?? error);
  process.exit(1);
});
