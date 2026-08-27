import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowRight, Award, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronRight, Clock3, Eye, EyeOff, FileCheck2, FileText, GraduationCap, History, LayoutDashboard, LockKeyhole, LogOut, Menu, Bell, Paperclip, Send, ShieldCheck, Sparkles, Stethoscope, UserRound, X, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react'; import { api, apiUpload, authenticatedDownload } from './api';

type Role = 'DOCTOR' | 'MSDHO' | 'SECTION_OFFICER' | 'DEPUTY_SECRETARY' | 'ADDITIONAL_SECRETARY' | 'SPECIAL_SECRETARY' | 'SECRETARY' | 'MINISTER' | 'SUPER_ADMIN';
type AuthUser = { id: string; email: string; personnelNo: string; role: Role; bps?: number };
type LoginResponse = { accessToken: string; user: AuthUser };
type LeaveOptionsResponse = { gender: 'Male' | 'Female' | 'Transgender'; dateOfBirth: string; joiningMonth: string; usage: { maternity: number; paternity: number }; limits: { maternity: number; paternity: number; casualDaysPerMonth: number; lprDays: number; studyDays: number } };
const leaveTypes = [
  ['CASUAL', 'Casual Leave', '2 days/month • no carry forward'], ['EARNED_FULL', 'Earned Leave — Full Pay', '12+ months service • balance based'], ['HALF_PAY', 'Leave on Half Pay', '50% balance impact, rounded up'], ['EOL', 'Leave Without Pay (EOL)', 'Written request required'], ['MATERNITY', 'Maternity Leave', 'Female • 90 days • 3 times/service'], ['PATERNITY', 'Paternity Leave', 'Male • 7 days • 2 times/service'], ['EX_PAK_FULL', 'Ex-Pakistan — Full Pay', 'Govt. permission required'], ['EX_PAK_HALF', 'Ex-Pakistan — Half Pay', 'Govt. permission required'], ['EX_PAK_EOL', 'Ex-Pakistan — EOL', 'Govt. permission required'], ['SPECIAL_ACCIDENT', 'Special Leave — Accident/Injury', 'Medical certificate required'], ['SPECIAL_QUARANTINE', 'Special Leave — Quarantine', 'Quarantine order required'], ['MEDICAL_LONG', 'Medical Leave — Long-term', 'Medical certificate required'], ['LPR', 'Leave Preparatory to Retirement', 'Age 59–60 • max 365 days'], ['STUDY_FULL', 'Study Leave — Full Pay', '5+ years service • max 2 years'], ['STUDY_HALF', 'Study Leave — Half Pay', '5+ years service • max 2 years'], ['STUDY_EOL', 'Study Leave — EOL', '5+ years service • max 2 years'],
] as const;
const profileTabs = ['Employee Information', 'Current Posting Status', 'Previous Postings', 'Qualifications', 'Promotions', 'Leaves', 'Trainings'];
function Shell({ user, onLogout }: { user: AuthUser, onLogout: () => void }) {
  const [page, setPage] = useState<'profile' | 'leaves' | 'notifications' | 'employee'>('profile');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [profileName, setProfileName] = useState(user.personnelNo);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const loadNotifications = () => api<any>('/notifications?limit=30').then(r => { setNotifications(r.items || []); setUnread(r.unread || 0); }).catch((error) => { console.warn('Unable to refresh notifications', error); });
  useEffect(() => {
    api<any>('/profile/me').then(p => setProfileName(p?.fullName || user.personnelNo)).catch(() => { });
    loadNotifications(); const refresh = () => loadNotifications(); window.addEventListener('hrmis:notifications-changed', refresh); const timer = window.setInterval(loadNotifications, 10000); return () => { window.clearInterval(timer); window.removeEventListener('hrmis:notifications-changed', refresh); };
  }, [user.id]);
  useEffect(() => {
    if (!bellOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBellOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [bellOpen]);
  const displayName = (profileName || user.personnelNo).trim().replace(/^Dr\.?\s+/i, '');
  const initials = (profileName || user.personnelNo).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const markAll = async () => { await api('/notifications/read-all', { method: 'PATCH' }); await loadNotifications(); };
  const openNotification = async (n: any) => { if (!n.read) await api(`/notifications/${n._id}/read`, { method: 'PATCH' }).catch(() => { }); setBellOpen(false); await loadNotifications(); if (n.leaveRequestId) { setPage('leaves'); window.setTimeout(() => window.dispatchEvent(new CustomEvent('hrmis:open-leave-notification', { detail: n })), 0); } };
  const openEmployee = (userId: string) => { setSelectedEmployeeId(userId); setPage('employee'); setBellOpen(false); };
  const pageTitle = page === 'profile' ? 'User profile' : page === 'leaves' ? 'Leave management' : page === 'notifications' ? 'Notifications' : 'Employee record';
  return <div className="app-shell"><aside className={`sidebar ${mobile ? 'open' : ''}`}><button className="close-mobile" onClick={() => setMobile(false)}><X /></button><div className="brand"><div className="logo-orbit"><img src="/govt-sindh-logo.jpg" /></div><div><strong>HRMIS</strong><span>Health Department<br />Government of Sindh</span></div></div><nav><button className={page === 'profile' ? 'active' : ''} onClick={() => { setPage('profile'); setMobile(false) }}><UserRound />User Profile</button><button className={(page === 'leaves' || page === 'employee') ? 'active' : ''} onClick={() => { setPage('leaves'); setMobile(false) }}><CalendarDays />Leave Requests</button><button disabled><ArrowRight />Transfer Requests <em>Soon</em></button><button disabled><Activity />Disciplinary Actions <em>Soon</em></button></nav><div className="powered"><img src="/hrmis-powered-by.png" /></div></aside><main><header><button className="menu-btn" onClick={() => setMobile(true)}><Menu /></button><div><small>Welcome Back Dr. {displayName}!</small><h1>{pageTitle}</h1></div><div className="header-actions"><div className="notification-wrap" ref={notificationRef}><button className="bell-btn" aria-label="Notifications" onClick={() => setBellOpen(v => !v)}><Bell />{unread > 0 && <i>{unread > 99 ? '99+' : unread}</i>}</button>{bellOpen && <div className="notification-panel"><div className="notification-head"><b>Notifications</b><button onClick={markAll}>Mark all as read</button></div><div className="notification-list">{notifications.length === 0 ? <p className="empty-notifications">No notifications yet.</p> : notifications.map(n => <button key={n._id} className={n.read ? '' : 'unread'} onClick={() => openNotification(n)}><span className="notification-icon"><FileText /></span><span className="notification-copy"><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></span>{!n.read && <i className="notification-dot" />}</button>)}</div><button className="notification-view-all" onClick={() => { setBellOpen(false); setPage('notifications'); }}>View all notifications</button></div>}</div><div className="avatar">{initials}</div><div className="header-user"><span>{user.personnelNo}</span><b>{user.email}</b></div><button className="header-logout" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut /></button></div></header><AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .35 }} className="page-wrap">{page === 'profile' ? <ProfilePage /> : page === 'leaves' ? <LeavePage role={user.role} onOpenEmployee={openEmployee} /> : page === 'notifications' ? <NotificationsPage onOpenLeave={(n) => openNotification(n)} /> : selectedEmployeeId ? <EmployeeOverviewPage userId={selectedEmployeeId} role={user.role} onBack={() => setPage('leaves')} /> : <LeavePage role={user.role} onOpenEmployee={openEmployee} />}</motion.div></AnimatePresence></main></div>
}
function Login({ onLogin }: { onLogin: (u: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('hrmis_token', r.accessToken);
      localStorage.setItem('hrmis_user', JSON.stringify(r.user));
      onLogin(r.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="login-screen">
    <div className="ambient a1" /><div className="ambient a2" />
    <motion.div className="login-card" initial={{ opacity: 0, scale: .96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
      <div className="login-hero">
        <img src="/govt-sindh-logo.jpg" />
        <div className="pulse-ring" />
        <h1>Human Resource Management<br /><span>Information System</span></h1>
        <p>Secure workforce management for Health Department, Government of Sindh.</p>
      </div>
      <form onSubmit={submit}>
        <div className="form-title"><Stethoscope /><div><h2>Welcome back</h2><p>Sign in to continue to HRMIS</p></div></div>
        <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@health.sindh.gov.pk" /></label>
        <label>Password
          <div className="input-icon password-field">
            <LockKeyhole />
            <input type={showPassword ? 'text' : 'password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff /> : <Eye />}</button>
          </div>
        </label>
        {error && <div className="error">{error}</div>}
        <button className="primary wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </motion.div>
  </div>;
}
function ProfilePage() {
  const [tab, setTab] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    api<any>('/profile/me').then(p => { if (alive) setProfile(p); }).catch((e: any) => { if (alive) setError(e?.message || 'Unable to load profile.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return <><div className="tabs-scroll profile-tabs">{profileTabs.map((t, i) => <button key={t} className={tab === i ? 'active' : ''} onClick={() => setTab(i)}>{t}</button>)}</div><motion.section key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="content-card">{loading ? <div className="table-state">Loading profile…</div> : error ? <div className="profile-inline-message">{error}</div> : !profile ? <div className="table-state">No employee profile exists yet.</div> : <>{tab === 0 && <EmployeeForm profile={profile} />}{tab === 1 && <CurrentPosting profile={profile} />}{tab === 2 && <RepeatSection kind="posting" profile={profile} />}{tab === 3 && <RepeatSection kind="qualification" profile={profile} />}{tab === 4 && <RepeatSection kind="promotion" profile={profile} />}{tab === 5 && <RepeatSection kind="historyLeave" profile={profile} />}{tab === 6 && <RepeatSection kind="training" profile={profile} />}</>}</motion.section></>;
}
const dateInput = (v?: string) => v ? String(v).slice(0, 10) : '';
const monthInput = (v?: string) => v ? String(v).slice(0, 7) : '';
const dobMaxDate = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10); };
const sectionOfficeOptions = ['SO-I', 'SO-II', 'SO-III', 'SO-IV', 'SO-V', 'SO-VI'];
const bpsOptions = [16, 17, 18, 19, 20];
const Field = ({ label, required = true, type = 'text', value, min, max }: { label: string, required?: boolean, type?: string, value?: string | number | boolean, min?: string, max?: string }) => <label className="field"><span>{label}{required && <b>*</b>}</span><input type={type} required={required} value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? '')} min={min} max={max} readOnly tabIndex={-1} /></label>;
const ReadonlySelect = ({ label, value, options }: { label: string; value?: string | number; options: Array<string | number> }) => <label className="field"><span>{label}<b>*</b></span><select value={String(value ?? '')} disabled>{options.map(x => <option key={String(x)} value={String(x)}>{x}</option>)}</select></label>;
function EmployeeForm({ profile }: { profile: any }) {
  return <div className="readonly-profile"><div className="section-head"><div><h3>Employee Information</h3><p>Identity, service and regulatory information</p></div><UserRound /></div><div className="profile-readonly-note">Profile information is read-only for now.</div><div className="grid2">
    <Field label="Employee Name" value={profile.fullName} />
    <Field label="Personnel No." value={profile.personnelNo} />
    <Field label="CNIC" value={profile.cnic} />
    <Field label="Father Name" value={profile.fatherName} />
    <ReadonlySelect label="Gender" value={profile.gender} options={['Male', 'Female', 'Transgender']} />
    <Field label="Date of Birth" type="date" value={dateInput(profile.dateOfBirth)} min="1900-01-01" max={dobMaxDate()} />
    <Field label="Domicile" value={profile.domicile} />
    <ReadonlySelect label="Section Officer" value={profile.sectionOffice} options={sectionOfficeOptions} />
    <ReadonlySelect label="Was your service regularized?" value={profile.serviceRegularized ? 'Yes' : 'No'} options={['Yes', 'No']} />
    <Field label="Service Regularization Month" type="month" value={monthInput(profile.serviceRegularizationMonth)} />
    <ReadonlySelect label="Did you clear commission exam?" value={profile.clearedCommissionExam ? 'Yes' : 'No'} options={['Yes', 'No']} />
    <Field label="Merit Number" value={profile.meritNumber} />
    <Field label="Joining Date" type="month" value={monthInput(profile.joiningMonth)} />
    <Field label="Cadre" value={profile.cadre} />
    <ReadonlySelect label="BPS" value={profile.bps} options={bpsOptions} />
    <Field label="Contact Number" value={profile.contactNumber} />
    <Field label="PMDC / Registration No." value={profile.pmdcNo} />
    <Field label="PMDC / Registration Issue Date" type="date" value={dateInput(profile.pmdcIssueDate)} />
    <Field label="PMDC / Registration Expiry Date" type="date" value={dateInput(profile.pmdcExpiryDate)} />
    <Field label="Email" type="email" value={profile.email} />
    <Field label="Address" value={profile.address} />
    <Field label="CNIC Front Scan" value={profile.cnicFrontUrl} />
    <Field label="CNIC Back Scan" value={profile.cnicBackUrl} />
  </div></div>;
}
function CurrentPosting({ profile }: { profile: any }) {
  const p = profile.currentPosting || {};
  return <div className="readonly-profile"><div className="section-head"><div><h3>Current Posting Status</h3><p>Your active substantive posting</p></div><BriefcaseBusiness /></div><div className="profile-readonly-note">Profile information is read-only for now.</div><div className="grid2"><ReadonlySelect label="Status" value="Currently Posted" options={['Currently Posted', 'On Leave', 'Suspended']} /><div /><Field label="Substantive Posting District" value={p.district} /><Field label="Substantive Posting Facility" value={p.facility} /><Field label="Designation" value={p.designation} /><ReadonlySelect label="BPS" value={p.bps} options={bpsOptions} /><Field label="Start (Month/Year)" type="month" value={monthInput(p.startMonth)} /></div><label className="check"><input type="checkbox" checked={Boolean(p.allowedToWork)} disabled />Allowed to Work</label></div>;
}
function RepeatSection({ kind, profile }: { kind: 'posting' | 'qualification' | 'promotion' | 'historyLeave' | 'training'; profile: any }) {
  const names = { posting: ['Previous Postings', 'Previous service postings.'], qualification: ['Qualifications', 'Professional and academic qualifications.'], promotion: ['Promotions', 'Promotion and BPS history.'], historyLeave: ['Leave History', 'Historical leave information.'], training: ['Trainings', 'Professional trainings attended.'] } as const;
  const rows: any[] = kind === 'posting' ? (profile.previousPostings || []) : kind === 'qualification' ? (profile.qualifications || []) : kind === 'promotion' ? (profile.promotions || []) : kind === 'historyLeave' ? (profile.historicalLeaves || []) : (profile.trainings || []);
  return <div className="readonly-profile"><div className="section-head"><div><h3>{names[kind][0]}</h3><p>{names[kind][1]}</p></div></div><div className="profile-readonly-note">Profile information is read-only for now.</div>{rows.length === 0 ? <div className="table-state">No information available.</div> : rows.map((row, idx) => <motion.div layout key={idx} className="repeat-card readonly-repeat-card"><div className="grid2">{kind === 'posting' && <><Field label="District" value={row.district} /><Field label="Facility" value={row.facility} /><ReadonlySelect label="BPS" value={row.bps} options={bpsOptions} /><Field label="Designation" value={row.designation} /><Field label="Start (Month/Year)" type="month" value={monthInput(row.startMonth)} /><Field label="End (Month/Year)" type="month" value={monthInput(row.endMonth)} /><ReadonlySelect label="Allowed to Work" value={row.allowedToWork ? 'Yes' : 'No'} options={['Yes', 'No']} /></>}{kind === 'qualification' && <><Field label="Training Institute" value={row.institute} /><Field label="Degree" value={row.degree} /><Field label="Specialization" value={row.specialization} /><Field label="Start (Month/Year)" type="month" value={monthInput(row.startMonth)} /><Field label="Status" value={row.status} /></>}{kind === 'promotion' && <><ReadonlySelect label="BPS From" value={row.bpsFrom} options={bpsOptions} /><ReadonlySelect label="BPS To" value={row.bpsTo} options={bpsOptions} /><Field label="Promotion Date (Month/Year)" type="month" value={monthInput(row.promotionMonth)} /></>}{kind === 'historyLeave' && <><Field label="Leave Type" value={row.leaveType} /><Field label="Starting Date" type="date" value={dateInput(row.startDate)} /><Field label="Ending Date" type="date" value={dateInput(row.endDate)} /></>}{kind === 'training' && <><Field label="Training Name / Title" value={row.title} /><Field label="Training On / Specialized Area" value={row.specializedArea} /><Field label="Venue / Institute Name" value={row.institute} /><Field label="Starting Date" type="date" value={dateInput(row.startDate)} /><Field label="Ending Date" type="date" value={dateInput(row.endDate)} /><Field label="Training Certificate" value={row.certificateUrl} /></>}</div></motion.div>)}</div>;
}
type RequesterRef = { _id?: string; id?: string; email?: string; personnelNo?: string; role?: Role; bps?: number };
type LeaveStep = {
  role: Role;
  status: string;
  stage: number;
  finalApprover?: boolean;
  actorId?: string;
  note?: string;
  attachments?: string[];
  activatedAt?: string;
  actedAt?: string;
};
type LeaveRow = {
  _id: string;
  requesterId: string | RequesterRef;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
  documents?: string[];
  rejectionReason?: string;
  policy?: { requestedDays?: number; balanceDeduction?: number; requiredDocument?: string };
  steps?: LeaveStep[];
};
type LeaveListResponse = { items: LeaveRow[]; total: number; page: number; limit: number; pages: number };
type BalanceResponse = { accrued: number; adjustments: number; available: number; completedServiceMonths: number };
type InternalView = 'pending' | 'processed';

const leaveLabel = (type: string) => leaveTypes.find(x => x[0] === type)?.[1] ?? type.split('_').join(' ');
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const roleLabel = (role?: string) => role ? role.split('_').map(x => x[0] + x.slice(1).toLowerCase()).join(' ') : '—';
const requesterInfo = (row: LeaveRow) => typeof row.requesterId === 'object' ? row.requesterId : undefined;
const currentStep = (row: LeaveRow) => {
  if (row.status !== 'PENDING') return row.status === 'APPROVED' ? 'Completed' : 'Finalized';
  const active = row.steps?.filter(s => s.status === 'ACTIVE').sort((a, b) => a.stage - b.stage)[0];
  return active ? roleLabel(active.role) : 'Pending';
};
const actionStep = (row: LeaveRow, role: Role) => row.steps?.find(s => s.role === role && s.status === 'ACTIVE');

function LeavePage({ role, onOpenEmployee }: { role: Role; onOpenEmployee: (userId: string) => void }) {
  const isDoctor = role === 'DOCTOR';
  const isMsDho = role === 'MSDHO';
  const [mineTab, setMineTab] = useState<'new' | 'history'>('new');
  const [msDhoTab, setMsDhoTab] = useState<'new' | 'history' | 'requests'>('new');
  const [internalTab, setInternalTab] = useState<InternalView>('pending');
  const [historyVersion, setHistoryVersion] = useState(0);
  useEffect(() => {
    const handler = () => {
      if (isMsDho) setMsDhoTab('requests');
      else if (isDoctor) setMineTab('history');
      else setInternalTab('pending');
    };
    window.addEventListener('hrmis:open-leave-notification', handler);
    return () => window.removeEventListener('hrmis:open-leave-notification', handler);
  }, [isMsDho, isDoctor]);

  if (isMsDho) {
    return <>
      <div className="subtabs leave-subtabs msdho-leave-tabs" role="tablist" aria-label="MS/DHO leave navigation">
        <button className={msDhoTab === 'new' ? 'active' : ''} onClick={() => setMsDhoTab('new')}><FileText />New Leave Request</button>
        <button className={msDhoTab === 'history' ? 'active' : ''} onClick={() => setMsDhoTab('history')}><History />Leave History</button>
        <button className={msDhoTab === 'requests' ? 'active' : ''} onClick={() => setMsDhoTab('requests')}><ShieldCheck />Leave Requests</button>
      </div>
      <AnimatePresence mode="wait"><motion.div key={`msdho-${msDhoTab}-${historyVersion}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {msDhoTab === 'new' && <NewLeave onSubmitted={() => { setHistoryVersion(v => v + 1); setMsDhoTab('history'); }} />}
        {msDhoTab === 'history' && <LeaveHistory mode="mine" role={role} refreshKey={historyVersion} onOpenEmployee={onOpenEmployee} />}
        {msDhoTab === 'requests' && <LeaveHistory mode="pending" role={role} refreshKey={historyVersion} onChanged={() => setHistoryVersion(v => v + 1)} onOpenEmployee={onOpenEmployee} />}
      </motion.div></AnimatePresence>
    </>;
  }

  if (isDoctor) {
    return <>
      <div className="subtabs leave-subtabs">
        <button className={mineTab === 'new' ? 'active' : ''} onClick={() => setMineTab('new')}><FileText />New Leave Request</button>
        <button className={mineTab === 'history' ? 'active' : ''} onClick={() => setMineTab('history')}><History />Leave History</button>
      </div>
      <AnimatePresence mode="wait"><motion.div key={`${mineTab}-${historyVersion}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {mineTab === 'new'
          ? <NewLeave onSubmitted={() => { setHistoryVersion(v => v + 1); setMineTab('history'); }} />
          : <LeaveHistory mode="mine" role={role} refreshKey={historyVersion} onOpenEmployee={onOpenEmployee} />}
      </motion.div></AnimatePresence>
    </>;
  }

  return <InternalLeaveWorkspace role={role} view={internalTab} onViewChange={setInternalTab} refreshKey={historyVersion} onChanged={() => setHistoryVersion(v => v + 1)} onOpenEmployee={onOpenEmployee} />;
}

function InternalLeaveWorkspace({ role, view, onViewChange, refreshKey, onChanged, onOpenEmployee }: { role: Role; view: InternalView; onViewChange: (view: InternalView) => void; refreshKey: number; onChanged: () => void; onOpenEmployee: (userId: string) => void }) {
  return <>
    <div className="subtabs leave-subtabs">
      <button className={view === 'pending' ? 'active' : ''} onClick={() => onViewChange('pending')}><Clock3 />Pending Requests</button>
      <button className={view === 'processed' ? 'active' : ''} onClick={() => onViewChange('processed')}><History />Processed History</button>
    </div>
    <AnimatePresence mode="wait"><motion.div key={`${view}-${refreshKey}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <LeaveHistory mode={view} role={role} refreshKey={refreshKey} onChanged={onChanged} onOpenEmployee={onOpenEmployee} />
    </motion.div></AnimatePresence>
  </>;
}

function NewLeave({ onSubmitted }: { onSubmitted: () => void }) {
  const [type, setType] = useState('CASUAL');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [options, setOptions] = useState<LeaveOptionsResponse | null>(null);

  function localDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const today = useMemo(() => localDateInput(new Date()), []);
  const visibleLeaveTypes = useMemo(() => leaveTypes.filter(item => {
    if (options) {
      if (item[0] === 'MATERNITY' && (options.gender !== 'Female' || options.usage.maternity >= options.limits.maternity)) return false;
      if (item[0] === 'PATERNITY' && (options.gender !== 'Male' || options.usage.paternity >= options.limits.paternity)) return false;
    }
    return true;
  }), [options]);

  const lprWindow = useMemo(() => {
    if (!options?.dateOfBirth) return null;
    const dob = new Date(options.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;
    const min = new Date(dob); min.setFullYear(min.getFullYear() + 59);
    const max = new Date(dob); max.setFullYear(max.getFullYear() + 60); max.setDate(max.getDate() - 1);
    const minValue = localDateInput(min) > today ? localDateInput(min) : today;
    return { min: minValue, max: localDateInput(max) };
  }, [options, today]);

  useEffect(() => {
    let alive = true;
    Promise.all([api<BalanceResponse>('/leaves/balance'), api<LeaveOptionsResponse>('/leaves/options')])
      .then(([balanceResult, optionResult]) => {
        if (!alive) return;
        setBalance(balanceResult.available);
        setOptions(optionResult);
      })
      .catch(() => { if (alive) { setBalance(null); setOptions(null); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!visibleLeaveTypes.some(item => item[0] === type) && visibleLeaveTypes.length) {
      setType(visibleLeaveTypes[0][0]); setStart(''); setEnd(''); setFile(null);
    }
  }, [type, visibleLeaveTypes]);

  const days = useMemo(() => {
    if (!start || !end) return 0;
    const diff = Math.floor((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000) + 1;
    return Math.max(0, diff);
  }, [start, end]);

  const maxDays = useMemo(() => {
    if (type === 'CASUAL') return 2;
    if (type === 'MATERNITY') return 90;
    if (type === 'PATERNITY') return 7;
    if (type === 'LPR') return 365;
    if (type.startsWith('STUDY_')) return 730;
    return null;
  }, [type]);

  const durationWarning = useMemo(() => {
    if (!days || !maxDays || days <= maxDays) return '';
    if (type === 'CASUAL') return 'Casual Leave cannot exceed 2 days a month.';
    if (type === 'MATERNITY') return 'Maternity Leave cannot exceed 90 days.';
    if (type === 'PATERNITY') return 'Paternity Leave cannot exceed 7 days.';
    if (type === 'LPR') return 'LPR cannot exceed 365 days.';
    if (type.startsWith('STUDY_')) return 'Study Leave cannot exceed 2 years (730 days).';
    return `This leave cannot exceed ${maxDays} days.`;
  }, [days, maxDays, type]);

  const lprWindowWarning = type === 'LPR' && lprWindow && lprWindow.min > lprWindow.max
    ? 'LPR is only available from the 59th birthday until the day before the 60th birthday.'
    : '';
  const required = type === 'EOL' ? 'Written Request Document' : type.startsWith('EX_PAK') ? 'Government Permission Letter' : ['SPECIAL_ACCIDENT', 'MEDICAL_LONG'].includes(type) ? 'Medical Certificate' : type === 'SPECIAL_QUARANTINE' ? 'Quarantine Order' : type.startsWith('STUDY_') ? 'Admission Letter' : type === 'MATERNITY' ? 'Medical Certificate (optional)' : null;
  const documentMandatory = Boolean(required && !required.includes('(optional)'));
  const startMin = type === 'LPR' && lprWindow ? lprWindow.min : today;
  const startMax = type === 'LPR' && lprWindow ? lprWindow.max : undefined;
  const endMax = type === 'LPR' && lprWindow ? lprWindow.max : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!start || !end) { setError('Select both From Date and To Date.'); return; }
    if (start < today) { setError('Leave cannot start before today.'); return; }
    if (days <= 0) { setError('To Date cannot be before From Date.'); return; }
    if (durationWarning) { setError(durationWarning); return; }
    if (lprWindowWarning) { setError(lprWindowWarning); return; }
    if (type === 'LPR' && lprWindow && (start < lprWindow.min || start > lprWindow.max || end > lprWindow.max)) {
      setError('LPR dates must fall within the employee age window of 59 to before 60 years.'); return;
    }
    if (documentMandatory && !file) { setError(`${required} is mandatory for this leave.`); return; }
    setBusy(true);
    try {
      await api<LeaveRow>('/leaves', {
        method: 'POST',
        body: JSON.stringify({ type, startDate: start, endDate: end, documents: file ? [file.name] : [] }),
      });
      setSuccess('Leave request submitted successfully.');
      window.dispatchEvent(new Event('hrmis:notifications-changed'));
      // Refresh again after MongoDB/API state settles; keeps the bell current without waiting for polling.
      window.setTimeout(() => window.dispatchEvent(new Event('hrmis:notifications-changed')), 300);
      window.setTimeout(() => window.dispatchEvent(new Event('hrmis:notifications-changed')), 1200);
      setStart(''); setEnd(''); setFile(null);
      window.setTimeout(onSubmitted, 450);
    } catch (err: any) {
      setError(err?.message || 'Unable to submit leave request.');
    } finally { setBusy(false); }
  }

  return <div className="leave-layout">
    <form className="content-card" onSubmit={submit}>
      <div className="section-head"><div><h3>Apply for leave</h3><p>The form adapts instantly to the selected leave policy.</p></div><Sparkles /></div>
      <label className="field"><span>Leave Type<b>*</b></span><select value={type} onChange={e => { setType(e.target.value); setStart(''); setEnd(''); setFile(null); setError(''); }}>{visibleLeaveTypes.map(x => <option value={x[0]} key={x[0]}>{x[1]}</option>)}</select></label>
      <div className="grid2 leave-date-grid"><label className="field"><span>From Date<b>*</b></span><input required type="date" min={startMin} max={startMax} value={start} onChange={e => { setStart(e.target.value); if (end && e.target.value > end) setEnd(''); }} /></label><label className="field"><span>To Date<b>*</b></span><input required type="date" min={start || startMin} max={endMax} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
      {durationWarning && <div className="form-message warning-message">{durationWarning}</div>}
      {lprWindowWarning && <div className="form-message warning-message">{lprWindowWarning}</div>}
      {required && <label className="upload-zone"><FileText /><div><b>{required}</b><span>PDF, JPG or PNG • max 10 MB{file ? ` • ${file.name}` : ''}</span></div><input type="file" accept=".pdf,.jpg,.jpeg,.png" required={documentMandatory} onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>}
      {error && <div className="form-message error-message">{error}</div>}
      {success && <div className="form-message success-message">{success}</div>}
      <div className="actions"><button type="submit" className="primary" disabled={busy || Boolean(durationWarning) || Boolean(lprWindowWarning)}>{busy ? 'Submitting…' : 'Submit Request'}</button></div>
    </form>
    <aside className="impact-card balance-only-card" aria-label="Total leave balance">
      <div className="balance-disk">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="balance-disk-track" cx="60" cy="60" r="50" /><circle className="balance-disk-progress" cx="60" cy="60" r="50" /></svg>
        <div className="balance-disk-copy"><span>Total leave balance</span><b>{balance == null ? '—' : balance}</b><small>day(s)</small></div>
      </div>
    </aside>
  </div>;
}

function LeaveHistory({ mode, role, refreshKey, onChanged, onOpenEmployee }: { mode: 'mine' | InternalView; role: Role; refreshKey: number; onChanged?: () => void; onOpenEmployee?: (userId: string) => void }) {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState(mode === 'pending' ? 'createdAt' : '-createdAt');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<LeaveRow | null>(null);

  useEffect(() => { setPage(1); }, [search, status, sort, limit, mode]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });
        if (search.trim()) params.set('search', search.trim());
        if (status && mode !== 'pending') params.set('status', status);
        const endpoint = mode === 'mine' ? '/leaves/mine' : mode === 'pending' ? '/leaves/queue' : '/leaves/processed';
        const result = await api<LeaveListResponse>(`${endpoint}?${params.toString()}`, { signal: controller.signal });
        setRows(result.items ?? []); setTotal(result.total ?? 0); setPages(Math.max(1, result.pages ?? 1));
        if (page > Math.max(1, result.pages ?? 1)) setPage(Math.max(1, result.pages ?? 1));
      } catch (err: any) {
        if (err?.name !== 'AbortError') setError(err?.message || 'Unable to load leave requests.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mode, page, limit, search, status, sort, refreshKey]);

  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(total, page * limit);
  const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, i) => {
    const start = Math.max(1, Math.min(page - 2, pages - 4)); return start + i;
  }).filter(n => n <= pages);
  const internal = mode !== 'mine';
  const title = mode === 'mine' ? 'My Leave History' : mode === 'pending' ? 'Pending Employee Requests' : 'Processed Leave History';

  return <>
    <section className="content-card">
      <div className="table-tools"><div><h3>{title}</h3><p>{mode === 'pending' ? 'Requests currently waiting for your action.' : 'Search, filter, sort and inspect leave requests.'}</p></div><div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leave type…" />
        {mode !== 'pending' && <select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option></select>}
        <select value={sort} onChange={e => setSort(e.target.value)}><option value="-createdAt">Newest first</option><option value="createdAt">Oldest first</option><option value="startDate">From date ↑</option><option value="-startDate">From date ↓</option><option value="type">Leave type A–Z</option></select>
        <select value={limit} onChange={e => setLimit(Number(e.target.value))}><option value={5}>5 / page</option><option value={10}>10 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option></select>
      </div></div>
      {error && <div className="form-message error-message table-message">{error}</div>}
      <div className="table-wrap"><table><thead><tr>{internal && <th>Employee</th>}<th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Balance Impact</th><th>Status</th>{!internal && <th>Current Step</th>}{internal && <th>Action</th>}</tr></thead><tbody>
        {loading ? <tr><td colSpan={internal ? 8 : 7} className="table-state">Loading leave requests…</td></tr> : rows.length === 0 ? <tr><td colSpan={internal ? 8 : 7} className="table-state">No leave requests found.</td></tr> : rows.map((r, i) => {
          const requester = requesterInfo(r);
          const requesterUserId = requester?._id || requester?.id || (typeof r.requesterId === 'string' ? r.requesterId : '');
          return <motion.tr className={internal ? 'clickable-request-row' : ''} onClick={() => { if (internal && requesterUserId) onOpenEmployee?.(requesterUserId); }} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .025 }} key={r._id}>
            {internal && <td><b>{requester?.personnelNo ?? 'Employee'}</b><small className="cell-subtext">{requester?.email ?? '—'}</small></td>}
            <td><b>{leaveLabel(r.type)}</b></td><td>{formatDate(r.startDate)}</td><td>{formatDate(r.endDate)}</td><td>{r.policy?.requestedDays ?? '—'}</td><td>{r.policy?.balanceDeduction ?? 0}</td><td><span className={`badge ${r.status.toLowerCase()}`}>{r.status[0] + r.status.slice(1).toLowerCase()}</span></td>{!internal && <td>{currentStep(r)}</td>}
            {internal && <td><button className="view-request" onClick={(e) => { e.stopPropagation(); setSelected(r); }}><Eye />{mode === 'pending' ? 'Review' : 'View'}</button></td>}
          </motion.tr>;
        })}
      </tbody></table></div>
      <div className="pagination"><span>Showing {first}–{last} of {total}</span><div><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Previous</button>{pageNumbers.map(n => <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)} disabled={loading}>{n}</button>)}<button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages || loading}>Next</button></div></div>
    </section>
    {selected && <LeaveReviewModal row={selected} role={role} actionable={mode === 'pending'} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); onChanged?.(); }} />}
  </>;
}

function LeaveReviewModal({ row, role, actionable, onClose, onChanged }: { row: LeaveRow; role: Role; actionable: boolean; onClose: () => void; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const requester = requesterInfo(row);
  const active = actionStep(row, role);
  const previous = (row.steps ?? []).filter(step => ['PROCEEDED', 'APPROVED', 'REJECTED', 'AUTO_FORWARDED'].includes(step.status) && (step.note || step.attachments?.length));

  async function act(action: 'PROCEED' | 'APPROVE' | 'REJECT') {
    if ((action === 'APPROVE' || action === 'REJECT') && !note.trim()) { setError('Please enter a note before approving or rejecting.'); return; }
    setBusyAction(action); setError('');
    try {
      let attachments: string[] = [];
      if (file) {
        const uploaded = await apiUpload<{ key: string; name: string }>('/leaves/attachments', file);
        attachments = [`${uploaded.key}::${uploaded.name}`];
      }
      await api(`/leaves/${row._id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, note: note.trim() || undefined, attachments }),
      });
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Unable to process this leave request.');
    } finally { setBusyAction(null); }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <motion.div className="review-modal" initial={{ opacity: 0, scale: .97, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} onMouseDown={e => e.stopPropagation()}>
      <div className="review-head"><div><small>Leave request review</small><h3>{leaveLabel(row.type)}</h3></div><button onClick={onClose}><X /></button></div>
      <div className="review-grid">
        <div><span>Employee</span><b>{requester?.personnelNo ?? '—'}</b><small>{requester?.email ?? '—'}</small></div>
        <div><span>Requester role</span><b>{roleLabel(requester?.role)}</b></div>
        <div><span>Leave period</span><b>{formatDate(row.startDate)} → {formatDate(row.endDate)}</b></div>
        <div><span>Requested days</span><b>{row.policy?.requestedDays ?? '—'} day(s)</b></div>
        <div><span>Balance impact</span><b>{row.policy?.balanceDeduction ?? 0} day(s)</b></div>
      </div>
      {(row.documents?.length ?? 0) > 0 && <div className="document-strip"><FileText /><div><span>Requester document(s)</span><b>{row.documents?.join(', ')}</b></div></div>}
      <div className="comment-timeline"><h4>Previous chain notes</h4>{previous.length === 0 ? <p className="empty-note">No previous chain notes yet.</p> : previous.map((step, index) => <div className="timeline-item" key={`${step.role}-${step.stage}-${index}`}><div className="timeline-dot" /><div><div className="timeline-meta"><b>{roleLabel(step.role)}</b><span>{step.status.split('_').join(' ')}</span></div>{step.note && <p>{step.note}</p>}{Boolean(step.attachments?.length) && <div className="timeline-attachments">{step.attachments?.map((attachment, attachmentIndex) => { const [key, ...nameParts] = attachment.split('::'); const name = nameParts.join('::') || key; return <button type="button" className="attachment-download" key={`${key}-${attachmentIndex}`} onClick={() => authenticatedDownload(`/leaves/attachment?key=${encodeURIComponent(key)}`, name)}><Paperclip />{name}<span>Download</span></button>; })}</div>}</div></div>)}</div>
      {actionable && active && <div className="decision-panel">
        <label className="field"><span>Note{active.finalApprover ? <b>*</b> : <small> (optional)</small>}</span><textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)} placeholder={active.finalApprover ? 'Add final approval/rejection note…' : 'Add forwarding note (optional) or rejection note…'} /></label>
        <label className="mini-upload"><Paperclip /><span>{file ? file.name : 'Attach supporting document (optional)'}</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
        {error && <div className="form-message error-message">{error}</div>}
        <div className="decision-actions"><button className="reject-btn" disabled={Boolean(busyAction)} onClick={() => act('REJECT')}><XCircle />{busyAction === 'REJECT' ? 'Rejecting…' : 'Reject'}</button>{active.finalApprover ? <button className="approve-btn" disabled={Boolean(busyAction)} onClick={() => act('APPROVE')}><CheckCircle2 />{busyAction === 'APPROVE' ? 'Approving…' : 'Approve'}</button> : <button className="proceed-btn" disabled={Boolean(busyAction)} onClick={() => act('PROCEED')}><Send />{busyAction === 'PROCEED' ? 'Proceeding…' : 'Proceed'}</button>}</div>
      </div>}
      {actionable && !active && <div className="form-message error-message">This request is no longer pending with your account. Refresh the queue.</div>}
    </motion.div>
  </div>;
}

function NotificationsPage({ onOpenLeave }: { onOpenLeave: (n: any) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const r = await api<any>('/notifications?limit=100'); setItems(r.items || []); } catch (e: any) { setError(e.message || 'Unable to load notifications.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const markAll = async () => { await api('/notifications/read-all', { method: 'PATCH' }); await load(); window.dispatchEvent(new Event('hrmis:notifications-changed')); };
  return <section className="content-card notifications-page"><div className="section-head"><div><h3>All Notifications</h3><p>Your latest HRMIS activity and leave workflow updates.</p></div><button className="secondary" onClick={markAll}>Mark all as read</button></div>{error && <div className="form-message error-message">{error}</div>}{loading ? <div className="table-state">Loading notifications…</div> : items.length === 0 ? <div className="table-state">No notifications yet.</div> : <div className="all-notification-list">{items.map(n => <button key={n._id} className={n.read ? '' : 'unread'} onClick={() => n.leaveRequestId ? onOpenLeave(n) : undefined}><div><b>{n.title}</b><p>{n.message}</p></div><small>{new Date(n.createdAt).toLocaleString()}</small></button>)}</div>}</section>;
}

function EmployeeOverviewPage({ userId, role, onBack }: { userId: string; role: Role; onBack: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [tab, setTab] = useState<'info' | 'leave' | 'transfer' | 'disciplinary'>('leave');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; (async () => { try { const [p, l] = await Promise.all([api<any>(`/profile/employee/${userId}`), api<LeaveListResponse>(`/leaves/requester/${userId}?limit=100&sort=-createdAt`)]); if (active) { setProfile(p); setLeaves(l.items || []); } } catch (e: any) { if (active) setError(e.message || 'Unable to load employee record.') } finally { if (active) setLoading(false); } })(); return () => { active = false }; }, [userId]);
  if (loading) return <section className="content-card"><div className="table-state">Loading employee record…</div></section>;
  if (error || !profile) return <section className="content-card"><button className="secondary" onClick={onBack}>Back</button><div className="form-message error-message">{error || 'Employee profile not found.'}</div></section>;
  const fields = [
    ['Personnel No.', profile.personnelNo], ['CNIC', profile.cnic], ['Father Name', profile.fatherName], ['Gender', profile.gender], ['Date of Birth', formatDate(profile.dateOfBirth)], ['Domicile', profile.domicile], ['Section Office', profile.sectionOffice], ['Service Regularized', profile.serviceRegularized ? 'Yes' : 'No'], ['Regularization Date', profile.serviceRegularizationMonth ? formatDate(profile.serviceRegularizationMonth) : '—'], ['Commission Exam Cleared', profile.clearedCommissionExam ? 'Yes' : 'No'], ['Merit Number', profile.meritNumber || '—'], ['Joining Date', formatDate(profile.joiningMonth)], ['Cadre', profile.cadre], ['BPS', profile.bps], ['Contact Number', profile.contactNumber], ['Email', profile.email], ['Address', profile.address], ['PMDC No.', profile.pmdcNo || '—'], ['Current District', profile.currentPosting?.district || '—'], ['Current Facility', profile.currentPosting?.facility || '—'], ['Designation', profile.currentPosting?.designation || '—']
  ];
  return <div className="employee-overview">
    <div className="employee-overview-head"><button className="secondary" onClick={onBack}>Back to Leave Requests</button><div><small>Employee record</small><h2>{profile.fullName || profile.personnelNo}</h2></div></div>
    <div className="subtabs employee-record-tabs">
      <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>Employee Information</button>
      <button className={tab === 'leave' ? 'active' : ''} onClick={() => setTab('leave')}>Leave Requests</button>
      <button className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>Transfer Requests</button>
      <button className={tab === 'disciplinary' ? 'active' : ''} onClick={() => setTab('disciplinary')}>Disciplinary Actions</button>
    </div>
    {tab === 'info' ? <section className="content-card employee-profile-summary"><div className="section-head"><div><h3>Employee Information</h3><p>Verified profile information for this requester.</p></div><UserRound /></div><div className="profile-summary-grid">{fields.map(([k, v]) => <div key={String(k)}><span>{k}</span><b>{String(v ?? '—')}</b></div>)}</div></section>
      : tab === 'leave' ? <section className="content-card"><div className="section-head"><div><h3>Leave Requests</h3><p>Complete leave request history for this employee.</p></div></div><div className="table-wrap"><table><thead><tr><th>Leave Type</th><th>From</th><th>To</th><th>Days</th><th>Balance Impact</th><th>Status</th></tr></thead><tbody>{leaves.length === 0 ? <tr><td colSpan={6} className="table-state">No leave requests found.</td></tr> : leaves.map(r => <tr key={r._id}><td><b>{leaveLabel(r.type)}</b></td><td>{formatDate(r.startDate)}</td><td>{formatDate(r.endDate)}</td><td>{r.policy?.requestedDays ?? '—'}</td><td>{r.policy?.balanceDeduction ?? 0}</td><td><span className={`badge ${r.status.toLowerCase()}`}>{r.status[0] + r.status.slice(1).toLowerCase()}</span></td></tr>)}</tbody></table></div></section>
        : <section className="content-card"><div className="empty-history-panel"><History /><h3>{tab === 'transfer' ? 'Transfer Requests' : 'Disciplinary Actions'}</h3><p>No records are available yet. This section is ready for the corresponding module when it is enabled.</p></div></section>}
  </div>;
}

function AppLoader() {
  return <motion.div className="app-loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .28 }}>
    <div className="loader-aurora loader-aurora-a" />
    <div className="loader-aurora loader-aurora-b" />
    <motion.div className="loader-core" initial={{ scale: .88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .45, ease: 'easeOut' }}>
      <div className="loader-logo-wrap">
        <span className="loader-ring ring-one" />
        <span className="loader-ring ring-two" />
        <span className="loader-ring ring-three" />
        <motion.img src="/govt-sindh-logo.jpg" alt="Government of Sindh" animate={{ y: [0, -5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
      <motion.h1 initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .12 }}>HRMIS</motion.h1>
      <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .2 }}>Human Resource Management Information System</motion.p>
      <div className="loader-progress"><motion.span initial={{ x: '-100%' }} animate={{ x: '220%' }} transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }} /></div>
      <div className="loader-dots"><i /><i /><i /></div>
    </motion.div>
  </motion.div>;
}

export default function App() {
  const saved = localStorage.getItem('hrmis_user');
  const [user, setUser] = useState<AuthUser | null>(saved ? JSON.parse(saved) : null);
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 900);
    return () => window.clearTimeout(timer);
  }, []);
  if (booting) return <AnimatePresence><AppLoader /></AnimatePresence>;
  return user ? <Shell user={user} onLogout={() => { localStorage.removeItem('hrmis_token'); localStorage.removeItem('hrmis_user'); setUser(null) }} /> : <Login onLogin={setUser} />;
}
