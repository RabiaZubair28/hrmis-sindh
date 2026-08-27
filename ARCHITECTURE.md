# HRMIS Architecture

## Modules

### Authentication / Access
JWT login with nine account roles: Doctor, MS/DHO, Section Officer, Deputy Secretary, Additional Secretary, Special Secretary, Secretary, Minister, Super Admin. Only Doctor and MS/DHO can create leave requests. Super Admin API can change role, active state and permission keys.

### User Profile
Seven sub-sections mirror the supplied screens: Employee Information, Current Posting Status, Previous Postings, Qualifications, Promotions, Leaves, Trainings. Validation is duplicated at the UI boundary and enforced authoritatively by NestJS DTO/Mongoose validation.

### Leave Management
Each leave type is evaluated by an independent policy engine. Approval routing is separate from policy calculation, so changing a chain does not modify balance/document logic.

## Leave balance
Gross entitlement = 4 days × completed service months. Approved balance-consuming leaves create immutable negative ledger entries. Balance is gross accrual + ledger adjustments.

The requested sandwich rule is implemented as inclusive calendar duration. A Monday-through-Monday request is 8 days; Monday-through-Saturday is 6 days. A holiday calendar can later be added without changing the leave engines.

## Approval workflow
- Casual (Doctor): MS/DHO is final approver.
- BPS 16–18 Maternity/LPR: MS/DHO → SO → DS → AS (AS final).
- BPS 16–18 other: MS/DHO → SO → DS → AS → SS (SS final).
- BPS 19–20 Doctor/non-MS/DHO: MS/DHO → SO → DS → AS → SS (SS final).
- MS/DHO requester: SO → DS → AS → SS → Secretary + Minister. Secretary and Minister are a parallel final stage and both approvals are required.

Non-final actors can Proceed or Reject; they cannot final-approve. Final actors can Approve or Reject. Non-final active steps auto-forward after 72 hours. Final stages never auto-forward.

## Comment privacy
Doctor request history strips workflow notes and chain attachments. Internal workflow roles receive prior notes when viewing the queue. The API remains the authority; hiding comments is not only a frontend behavior.

## Documents
The policy engine enforces whether documents are mandatory. The starter stores document references/URLs; connect these to S3/MinIO/local object storage through a dedicated upload adapter before production rollout.
