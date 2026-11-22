export type Role = 'student' | 'organizer' | 'admin';

export type EventType =
  | 'Hackathon'
  | 'Workshop'
  | 'Talk'
  | 'Cultural'
  | 'Competition'
  | 'Meetup';

export type EventMode = 'In-Person' | 'Hybrid' | 'Online';
export type AudienceType = 'open_to_all' | 'host_college_only';
export type RegStatus = 'open' | 'closed';
export type EventStatus =
  | 'draft'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'cancelled';
export type EventSourceType =
  | 'campus_official'
  | 'club_approved'
  | 'external_verified'
  | 'student_suggested'
  | 'seeded';
export type OrganizerStatus = 'pending' | 'approved' | 'rejected';

export interface ProfileVisibilitySettings {
  linksVisibility: 'public' | 'squads' | 'hidden';
  discoverableInTeams: boolean;
  showAcademicYear: boolean;
}

export interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrastFocus: boolean;
  compactDensity: boolean;
  themePreference?: 'system' | 'light' | 'dark';
}

export interface Area {
  id: string;
  city: string;
  name: string;
  lat: number;
  lng: number;
}

export interface College {
  id: string;
  name: string;
  shortName: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  areaId: string;
  emailDomain: string;
  verified: boolean;
}

export const SUPPORTED_LANGUAGES = [
  'English',
  'Hindi',
  'Telugu',
  'Tamil',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Urdu',
  'Other',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type StudentGender =
  | 'woman'
  | 'man'
  | 'non_binary'
  | 'prefer_not_to_say'
  | 'unset';

export type CallGenderFilter = 'any' | 'woman' | 'man' | 'non_binary';

export interface StudentProfile {
  id: string;
  authUid?: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoUrl?: string;
  collegeId: string;
  customCollegeName?: string;
  collegePlaceId?: string;
  collegeAddress?: string;
  collegeLat?: number;
  collegeLng?: number;
  collegeVerified: boolean;
  course: string;
  branch: string;
  semester: string;
  year: string;
  interests: EventType[];
  areaId: string;
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
  radiusKm: 5 | 10 | 20 | 50;
  followedCollegeIds: string[];
  telegramConnected: boolean;
  telegramDeepLinkToken: string;
  telegramHandle: string;
  telegramChatId?: string;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm IST e.g. "22:00"
    end: string;   // HH:mm IST e.g. "07:00"
  };
  mutedAll: boolean;
  mutedEventIds: string[];
  savedEventIds: string[];
  onboardingCompleted: boolean;
  consentAccepted: boolean;
  skills?: string[];
  learningGoals?: string[];
  headline?: string;
  bio?: string;
  graduationYear?: string;
  rollNumber?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  leetcodeUrl?: string;
  hackerrankUrl?: string;
  instagramUrl?: string;
  profileVisibility?: ProfileVisibilitySettings;
  accessibilityPrefs?: AccessibilityPreferences;
  preferredModes?: EventMode[];
  availability?: 'Weekends' | 'Evenings' | 'Open to All';
  priorityLowSeatAlerts?: boolean;
  teamDiscoveryEnabled?: boolean;
  teamCallNotifications?: boolean;
  gender?: StudentGender;
  languages?: SupportedLanguage[];
}

export type OfficialMemberRole = 'college_official' | 'club_leader' | 'external_organizer';
export type OrganizerAccountType = 'campus_official' | 'club_leader' | 'external_organizer';

export interface OrganizerAccount {
  id: string;
  clubName: string;
  contactName: string;
  designation?: string;
  email: string;
  facultyEmail?: string;
  collegeId: string;
  domainMatched: boolean;
  proofNote: string;
  status: OrganizerStatus;
  memberRole?: OfficialMemberRole;
  accountType?: OrganizerAccountType;
  isPrimaryContact?: boolean;
  appointedByAdminEmail?: string;
  organizationName?: string;
  organizationWebsite?: string;
  organizationCategory?: string;
  invitedByOfficialId?: string;
  invitedByName?: string;
  inviteToken?: string;
  authUid?: string;
  createdAt: string;
}

export interface OfficialInvite {
  token: string;
  code: string;
  collegeId: string;
  clubName: string;
  createdByOfficialId: string;
  createdByName: string;
  createdByEmail: string;
  targetEmail?: string;
  singleUse?: boolean;
  maxUses: number;
  usedCount: number;
  status: 'active' | 'used' | 'revoked';
  acceptedByNames: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface CampusAnnouncement {
  id: string;
  collegeId: string;
  collegeShortName: string;
  authorId: string;
  authorName: string;
  authorDesignation?: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export interface EventApprovalEntry {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'college_official' | 'club_leader' | 'external_organizer' | 'admin';
  decision:
    | 'draft_saved'
    | 'submitted'
    | 'approved'
    | 'changes_requested'
    | 'rejected'
    | 'published'
    | 'revision_submitted'
    | 'revision_approved'
    | 'revision_rejected';
  note?: string;
  changedFields?: string[];
  createdAt: string;
}

export interface EventPendingRevision {
  title?: string;
  venueName?: string;
  formattedAddress?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  regDeadline?: string;
  feeInr?: number;
  capacity?: number;
  mode?: EventMode;
  posterUrl?: string;
  regLink?: string;
  googleFormUrl?: string;
  whatsappGroupUrl?: string;
  telegramGroupUrl?: string;
  paymentInfo?: EventPaymentInfo;
  rules?: string[];
  teamSize?: string;
  prizesAndPerks?: string[];
  prerequisites?: string[];
  schedule?: EventScheduleDay[];
  coordinatorContact?: EventCoordinatorContact;
  promoVideoUrl?: string;
  promoVideoCaption?: string;
  submittedById: string;
  submittedByName: string;
  submittedAt: string;
  changedFields: string[];
}

export interface EventPaymentInfo {
  upiId?: string;
  paymentUrl?: string;
  accountNote?: string;
  refundPolicy?: string;
}

export interface EventCoordinatorContact {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
}

export interface EventScheduleItem {
  time: string;
  activity: string;
}

export interface EventScheduleDay {
  dayLabel: string;
  items: EventScheduleItem[];
}

export interface CampusEvent {
  id: string;
  clubId: string;
  clubName: string;
  collegeId: string;
  title: string;
  description: string;
  type: EventType;
  startAt: string; // ISO UTC
  endAt: string;   // ISO UTC
  venueName: string;
  areaId: string;
  placeId?: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  mode: EventMode;
  audience: AudienceType;
  regStatus: RegStatus;
  branches: string[];
  years: string[];
  feeInr: number;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  regDeadline: string; // ISO UTC
  regLink: string;
  googleFormUrl?: string;
  whatsappGroupUrl?: string;
  telegramGroupUrl?: string;
  paymentInfo?: EventPaymentInfo;
  rules?: string[];
  teamSize?: string;
  prizesAndPerks?: string[];
  prerequisites?: string[];
  schedule?: EventScheduleDay[];
  coordinatorContact?: EventCoordinatorContact;
  posterUrl: string;
  additionalPosterUrls?: string[];
  promoVideoUrl?: string;
  promoVideoCaption?: string;
  source: 'organizer' | 'seeded' | 'student_suggested';
  sourceType?: EventSourceType;
  isSponsored?: boolean;
  sponsorLabel?: string;
  submissionFeedback?: string;
  submittedById?: string;
  submittedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  pendingRevision?: EventPendingRevision;
  revisionPendingReview?: boolean;
  approvalHistory?: EventApprovalEntry[];
  aiConfidence?: Record<string, number>;
  status: EventStatus;
  changeNotice?: string;
  viewCount?: number;
  createdAt: string;
}

export interface FeedEvent extends CampusEvent {
  collegeName: string;
  collegeShortName: string;
  areaName: string;
  distanceKm: number;
  score: number;
  reasons: string[];
  eligibleToRegister?: boolean;
  ineligibilityReasons?: string[];
  averageRating?: number | null;
  feedbackCount?: number;
  myRegistrationStatus: 'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in' | null;
  myRegistration?: Registration | null;
  waitlistPosition: number | null;
  isSaved: boolean;
  matchedSkills?: string[];
  matchedGoals?: string[];
  fillRatio?: number;
  isFillingFast?: boolean;
}

export type PaymentStatus = 'free' | 'paid_verified' | 'pending_verification';

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  collegeShortName?: string;
  rollNumber?: string;
  branch?: string;
  year?: string;
  attendeePhotoUrl?: string;
  emergencyContact?: string;
  participationType?: 'individual' | 'team';
  needsTeammates?: boolean;
  squadId?: string;
  squadSnapshotId?: string;
  passCode: string;
  qrPayload: string;
  paymentStatus: PaymentStatus;
  amountPaidInr: number;
  paymentMethod?: 'UPI' | 'College Portal' | 'Free Pass';
  paymentRef?: string;
  teamName?: string;
  teamMembers?: string;
  pitchNote?: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled' | 'checked_in';
  checkedInAt?: string;
  checkedInBy?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  kind:
    | 'followed_college'
    | 'morning_digest'
    | 'deadline_24h'
    | 'reminder_24h'
    | 'reminder_2h'
    | 'event_change'
    | 'waitlist_promoted'
    | 'priority_skill_low_seats'
    | 'team_up_call'
    | 'connection_request'
    | 'squad_request'
    | 'squad_confirmed'
    | 'submission_approved'
    | 'submission_changes_requested'
    | 'submission_rejected'
    | 'new_submission';
  channel: 'telegram' | 'in_app';
  title: string;
  body: string;
  sendAfter: string;
  sentAt: string | null;
  status: 'queued' | 'sent' | 'held_quiet_hours' | 'capped_daily' | 'muted';
  dedupeKey: string;
}

export interface EventReport {
  id: string;
  eventId: string;
  eventTitle: string;
  reporterName: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export interface PosterExtractionResult {
  is_event_poster: boolean;
  multiple_events: boolean;
  title: string | null;
  type: EventType | null;
  start_datetime_ist: string | null; // YYYY-MM-DDTHH:mm
  end_datetime_ist: string | null;
  venue_name: string | null;
  area_guess: string | null;
  mode: EventMode | null;
  audience: AudienceType | null;
  branches: string[];
  years: string[];
  fee_inr: number | null;
  capacity: number | null;
  registration_deadline_ist: string | null;
  registration_link: string | null;
  organizer_name: string | null;
  description: string | null;
  language: string;
  confidence: Record<string, number>;
  warnings: string[];
  cached?: boolean;
  latencyMs?: number;
}

export interface PartnerPost {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  userId: string;
  userName: string;
  collegeId?: string;
  collegeShortName: string;
  branch: string;
  year: string;
  skills?: string[];
  roleSkill: string;
  lookingFor: string;
  teamSlotsNeeded: number;
  note: string;
  whatsappReady: boolean;
  discoveryEnabled?: boolean;
  createdAt: string;
}

export interface ChatParticipant {
  userId: string;
  name: string;
  collegeShortName: string;
  branch?: string;
  year?: string;
  roleSkill?: string;
  whatsappNumber?: string;
}

export interface TeamChatRoom {
  id: string;
  kind: 'dm' | 'gc';
  name: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  targetSize: number;
  status: 'discussing' | 'team_formed';
  whatsappGroupUrl?: string;
  participants: ChatParticipant[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamChatMessage {
  id: string;
  roomId: string;
  roomScope?: 'conversation' | 'squad';
  senderId: string;
  senderName: string;
  kind: 'text' | 'whatsapp_contact' | 'whatsapp_group' | 'system';
  body: string;
  whatsappNumber?: string;
  whatsappUrl?: string;
  createdAt: string;
}

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface ConnectionRequest {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  fromUserId: string;
  fromName: string;
  fromCollege: string;
  fromBranch: string;
  fromYear: string;
  fromSkills: string[];
  toUserId: string;
  toName: string;
  toCollege: string;
  note: string;
  status: ConnectionRequestStatus;
  conversationId?: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface TeamUpCallResponse {
  userId: string;
  name: string;
  collegeShortName: string;
  branch: string;
  year: string;
  skills: string[];
  note?: string;
  status: 'interested' | 'invited' | 'dismissed';
  conversationId?: string;
  respondedAt: string;
}

export interface TeamUpCallEventRef {
  id: string;
  title: string;
  type: EventType;
  regDeadline?: string;
}

export interface TeamUpCall {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventIds: string[];
  events: TeamUpCallEventRef[];
  creatorId: string;
  creatorName: string;
  creatorCollege: string;
  creatorBranch: string;
  creatorYear: string;
  teammatesNeeded: number;
  preferredCollege: string;
  preferredYear: string;
  preferredSkills: string[];
  rolesNeeded: string[];
  preferredAreas?: string[];
  preferredLanguages?: SupportedLanguage[];
  genderPreference?: CallGenderFilter;
  otherPreferences?: string;
  audienceMode: 'active_only' | 'all_matching';
  note: string;
  eligibleCount: number;
  eligibleCountLabel?: string;
  recipientUserIds: string[];
  responses: TeamUpCallResponse[];
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface TeamConversation {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  sourceType: 'connection_request' | 'team_up_call' | 'direct';
  sourceId?: string;
  participantIds: string[];
  participants: ChatParticipant[];
  proposedSquadName?: string;
  proposedTargetSize?: number;
  proposedByUserId?: string;
  confirmedByUserIds: string[];
  status: 'active' | 'confirmed_to_squad' | 'archived';
  createdSquadId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export type SquadRecruitmentStatus = 'open' | 'closed' | 'locked';

export interface SquadMember {
  userId: string;
  name: string;
  collegeShortName: string;
  branch: string;
  year: string;
  roleSkill: string;
  role: 'owner' | 'member';
  whatsappShared?: boolean;
  whatsappNumber?: string;
  joinedAt: string;
}

export interface Squad {
  id: string;
  name: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  ownerId: string;
  targetSize: number;
  requiredRoles: string[];
  recruitmentStatus: SquadRecruitmentStatus;
  isLocked: boolean;
  whatsappGroupUrl?: string;
  memberIds: string[];
  members: SquadMember[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSquadSummary {
  id: string;
  name: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  ownerId: string;
  ownerName: string;
  ownerCollege: string;
  memberCount: number;
  targetSize: number;
  openSeats: number;
  requiredRoles: string[];
  recruitmentStatus: SquadRecruitmentStatus;
  memberPreviews: Array<{
    userId: string;
    name: string;
    collegeShortName: string;
    roleSkill: string;
  }>;
  createdAt: string;
}

export interface SquadJoinRequest {
  id: string;
  squadId: string;
  squadName: string;
  squadOwnerId: string;
  eventId: string;
  eventTitle: string;
  applicantId: string;
  applicantName: string;
  applicantCollege: string;
  applicantBranch: string;
  applicantYear: string;
  applicantSkills: string[];
  roleApplied: string;
  note: string;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export interface SquadMemberRegistrationStatus {
  userId: string;
  name: string;
  collegeShortName: string;
  roleSkill: string;
  registrationStatus: 'confirmed' | 'waitlisted' | 'not_registered';
  passCode?: string;
  hasQrPass: boolean;
}

export interface SquadRegistrationSnapshot {
  id: string;
  squadId: string;
  squadName: string;
  eventId: string;
  eventTitle: string;
  submittedByUserId: string;
  submittedByName?: string;
  primaryRegistrationId: string;
  rosterHash: string;
  status: 'submitted' | 'needs_update' | 'amended';
  members: SquadMemberRegistrationStatus[];
  submittedAt: string;
  amendedAt?: string;
}

export interface BetaInviteCode {
  code: string;
  label?: string;
  createdAt: string;
  usedByEmail?: string;
  usedAt?: string;
}

export interface BetaAccessConfig {
  enabled: boolean;
  maxSeats: number;
  allowedEmails: string[];
  inviteCodes: BetaInviteCode[];
}

export interface EventFeedback {
  id: string;
  eventId: string;
  eventTitle?: string;
  eventType?: EventType;
  collegeId: string;
  clubId: string;
  clubName?: string;
  userId: string;
  authorName: string;
  isAnonymous: boolean;
  rating: number;
  requestedCategory?: string;
  comment: string;
  suggestion?: string;
  complaint?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CampusSurvey {
  id: string;
  collegeId: string;
  collegeShortName?: string;
  createdById: string;
  createdByName: string;
  title: string;
  description: string;
  questionPrompt: string;
  allowAnonymous: boolean;
  options?: string[];
  status: 'active' | 'closed';
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  collegeId: string;
  userId: string;
  respondentName: string;
  isAnonymous: boolean;
  rating?: number;
  selectedOption?: string;
  responseText: string;
  createdAt: string;
}

export interface FeedbackThemeItem {
  theme: string;
  count: number;
  examples: string[];
}

export interface FeedbackAnalysisReport {
  scope: 'campus' | 'club' | 'event';
  scopeLabel: string;
  analyzedAt: string;
  totalFeedbackCount: number;
  totalSurveyResponseCount: number;
  averageRating: number | null;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  commonComplaints: FeedbackThemeItem[];
  requestedCategories: Array<{ category: string; count: number }>;
  recurringSuggestions: FeedbackThemeItem[];
  crossEventTrends: string[];
  summaryNote: string;
  limitationNotice: string;
}

