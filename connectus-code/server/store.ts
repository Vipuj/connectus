import fs from 'fs';
import path from 'path';
import {
  SUPPORTED_LANGUAGES,
  type Area,
  type AuditLogEntry,
  type BetaAccessConfig,
  type CallGenderFilter,
  type CampusAnnouncement,
  type CampusEvent,
  type CampusSurvey,
  type College,
  type ConnectionRequest,
  type EventFeedback,
  type EventReport,
  type NotificationItem,
  type OfficialInvite,
  type OrganizerAccount,
  type PartnerPost,
  type PosterExtractionResult,
  type Registration,
  type Squad,
  type SquadJoinRequest,
  type SquadRegistrationSnapshot,
  type StudentGender,
  type StudentProfile,
  type SupportedLanguage,
  type SurveyResponse,
  type TeamChatMessage,
  type TeamChatRoom,
  type TeamConversation,
  type TeamUpCall,
  type TeamUpCallEventRef,
} from '../src/types';

export const HYDERABAD_AREAS: Area[] = [
  { id: 'area-gachibowli', city: 'Hyderabad', name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
  { id: 'area-madhapur', city: 'Hyderabad', name: 'Madhapur / HITEC City', lat: 17.4483, lng: 78.3915 },
  { id: 'area-gandipet', city: 'Hyderabad', name: 'Gandipet / Kokapet', lat: 17.3916, lng: 78.3193 },
  { id: 'area-kukatpally', city: 'Hyderabad', name: 'Kukatpally / Bachupally', lat: 17.4948, lng: 78.3996 },
  { id: 'area-tarnaka', city: 'Hyderabad', name: 'Tarnaka / Osmania', lat: 17.4280, lng: 78.5320 },
  { id: 'area-begumpet', city: 'Hyderabad', name: 'Begumpet', lat: 17.4447, lng: 78.4664 },
  { id: 'area-banjara', city: 'Hyderabad', name: 'Banjara Hills', lat: 17.4156, lng: 78.4347 },
  { id: 'area-ameerpet', city: 'Hyderabad', name: 'Ameerpet / Abids', lat: 17.4375, lng: 78.4483 },
  { id: 'area-uppal', city: 'Hyderabad', name: 'Uppal / Ghatkesar', lat: 17.4018, lng: 78.5602 },
  { id: 'area-patancheru', city: 'Hyderabad', name: 'Patancheru / Sangareddy', lat: 17.5326, lng: 78.2642 },
  { id: 'area-kompally', city: 'Hyderabad', name: 'Kompally / Medchal / Dundigal', lat: 17.5380, lng: 78.4850 },
  { id: 'area-ibrahimpatnam', city: 'Hyderabad', name: 'Ibrahimpatnam / Nadergul', lat: 17.2465, lng: 78.5940 },
  { id: 'area-lbnagar', city: 'Hyderabad', name: 'LB Nagar / Meerpet', lat: 17.3457, lng: 78.5522 },
  { id: 'area-secunderabad', city: 'Hyderabad', name: 'Secunderabad / Alwal', lat: 17.4563, lng: 78.5015 },
  { id: 'area-rajendranagar', city: 'Hyderabad', name: 'Rajendranagar / Mehdipatnam', lat: 17.3264, lng: 78.4018 },
  { id: 'area-shamshabad', city: 'Hyderabad', name: 'Shamshabad / Moinabad', lat: 17.2603, lng: 78.3955 },
];

export const HYDERABAD_COLLEGES: College[] = [
  // Default Campus & Flagship Universities
  { id: 'col-mrdu', name: 'Malla Reddy Deemed to be University (MRDU)', shortName: 'MRDU', tier: 'Tier 2', areaId: 'area-kompally', emailDomain: 'mrdu.ac.in', verified: true },

  // Tier 1: Premier National Institutes, Flagship Universities & Top Autonomous Campuses
  { id: 'col-iith', name: 'IIT Hyderabad', shortName: 'IIT-H', tier: 'Tier 1', areaId: 'area-patancheru', emailDomain: 'iith.ac.in', verified: true },
  { id: 'col-iiith', name: 'IIIT Hyderabad', shortName: 'IIIT-H', tier: 'Tier 1', areaId: 'area-gachibowli', emailDomain: 'iiit.ac.in', verified: true },
  { id: 'col-bits', name: 'BITS Pilani Hyderabad Campus', shortName: 'BITS Hyd', tier: 'Tier 1', areaId: 'area-uppal', emailDomain: 'hyderabad.bits-pilani.ac.in', verified: true },
  { id: 'col-uoh', name: 'University of Hyderabad', shortName: 'UoH', tier: 'Tier 1', areaId: 'area-gachibowli', emailDomain: 'uohyd.ac.in', verified: true },
  { id: 'col-isb', name: 'Indian School of Business (ISB)', shortName: 'ISB Hyd', tier: 'Tier 1', areaId: 'area-gachibowli', emailDomain: 'isb.edu', verified: true },
  { id: 'col-nalsar', name: 'NALSAR University of Law', shortName: 'NALSAR', tier: 'Tier 1', areaId: 'area-kompally', emailDomain: 'nalsar.ac.in', verified: true },
  { id: 'col-ou', name: 'Osmania University College of Engineering', shortName: 'OUCE', tier: 'Tier 1', areaId: 'area-tarnaka', emailDomain: 'osmania.ac.in', verified: true },
  { id: 'col-jntuh', name: 'JNTUH University College of Engineering', shortName: 'JNTUH', tier: 'Tier 1', areaId: 'area-kukatpally', emailDomain: 'jntuh.ac.in', verified: true },
  { id: 'col-mahindra', name: 'Mahindra University', shortName: 'MU', tier: 'Tier 1', areaId: 'area-kukatpally', emailDomain: 'mahindrauniversity.edu.in', verified: true },
  { id: 'col-cbit', name: 'Chaitanya Bharathi Institute of Technology', shortName: 'CBIT', tier: 'Tier 1', areaId: 'area-gandipet', emailDomain: 'cbit.ac.in', verified: true },
  { id: 'col-vnr', name: 'VNR Vignana Jyothi Institute of Engineering & Technology', shortName: 'VNR VJIET', tier: 'Tier 1', areaId: 'area-kukatpally', emailDomain: 'vnrvjiet.in', verified: true },
  { id: 'col-vasavi', name: 'Vasavi College of Engineering', shortName: 'VCE', tier: 'Tier 1', areaId: 'area-gandipet', emailDomain: 'vce.ac.in', verified: true },
  { id: 'col-nift', name: 'NIFT Hyderabad', shortName: 'NIFT Hyd', tier: 'Tier 1', areaId: 'area-madhapur', emailDomain: 'nift.ac.in', verified: true },
  { id: 'col-niper', name: 'NIPER Hyderabad', shortName: 'NIPER Hyd', tier: 'Tier 1', areaId: 'area-kukatpally', emailDomain: 'niperhyd.ac.in', verified: true },
  { id: 'col-eflu', name: 'English and Foreign Languages University (EFLU)', shortName: 'EFLU', tier: 'Tier 1', areaId: 'area-tarnaka', emailDomain: 'efluniversity.ac.in', verified: true },
  { id: 'col-manuu', name: 'Maulana Azad National Urdu University (MANUU)', shortName: 'MANUU', tier: 'Tier 1', areaId: 'area-gachibowli', emailDomain: 'manuu.edu.in', verified: true },

  // Tier 2: Established Autonomous Engineering, Management & Heritage Degree Colleges
  { id: 'col-griet', name: 'Gokaraju Rangaraju Institute of Engineering & Technology', shortName: 'GRIET', tier: 'Tier 2', areaId: 'area-kukatpally', emailDomain: 'griet.ac.in', verified: true },
  { id: 'col-cvr', name: 'CVR College of Engineering', shortName: 'CVR', tier: 'Tier 2', areaId: 'area-ibrahimpatnam', emailDomain: 'cvr.ac.in', verified: true },
  { id: 'col-vardhaman', name: 'Vardhaman College of Engineering', shortName: 'VMEG', tier: 'Tier 2', areaId: 'area-shamshabad', emailDomain: 'vardhaman.org', verified: true },
  { id: 'col-mjcet', name: 'Muffakham Jah College of Engineering & Technology', shortName: 'MJCET', tier: 'Tier 2', areaId: 'area-banjara', emailDomain: 'mjcollege.ac.in', verified: true },
  { id: 'col-mgit', name: 'Mahatma Gandhi Institute of Technology', shortName: 'MGIT', tier: 'Tier 2', areaId: 'area-gandipet', emailDomain: 'mgit.ac.in', verified: true },
  { id: 'col-snist', name: 'Sreenidhi Institute of Science and Technology', shortName: 'SNIST', tier: 'Tier 2', areaId: 'area-uppal', emailDomain: 'sreenidhi.edu.in', verified: true },
  { id: 'col-mvsr', name: 'MVSR Engineering College', shortName: 'MVSR', tier: 'Tier 2', areaId: 'area-ibrahimpatnam', emailDomain: 'mvsrec.edu.in', verified: true },
  { id: 'col-kmit', name: 'Keshav Memorial Institute of Technology', shortName: 'KMIT', tier: 'Tier 2', areaId: 'area-tarnaka', emailDomain: 'kmit.in', verified: true },
  { id: 'col-bvrith', name: 'BVRIT Hyderabad College of Engineering for Women', shortName: 'BVRIT-H', tier: 'Tier 2', areaId: 'area-kukatpally', emailDomain: 'bvrithyderabad.edu.in', verified: true },
  { id: 'col-gnits', name: 'G. Narayanamma Institute of Technology & Science', shortName: 'GNITS', tier: 'Tier 2', areaId: 'area-gachibowli', emailDomain: 'gnits.ac.in', verified: true },
  { id: 'col-dcet', name: 'Deccan College of Engineering & Technology', shortName: 'DCET', tier: 'Tier 2', areaId: 'area-banjara', emailDomain: 'deccancollege.ac.in', verified: true },
  { id: 'col-anurag', name: 'Anurag University', shortName: 'Anurag Univ', tier: 'Tier 2', areaId: 'area-uppal', emailDomain: 'anurag.edu.in', verified: true },
  { id: 'col-woxsen', name: 'Woxsen University', shortName: 'Woxsen', tier: 'Tier 2', areaId: 'area-patancheru', emailDomain: 'woxsen.edu.in', verified: true },
  { id: 'col-ifhe', name: 'ICFAI Foundation for Higher Education (IBS / IcfaiTech)', shortName: 'IFHE / IBS', tier: 'Tier 2', areaId: 'area-gandipet', emailDomain: 'ifheindia.org', verified: true },
  { id: 'col-gitam', name: 'GITAM Deemed University Hyderabad', shortName: 'GITAM Hyd', tier: 'Tier 2', areaId: 'area-patancheru', emailDomain: 'gitam.edu', verified: true },
  { id: 'col-sibm', name: 'Symbiosis Institute of Business Management (SIBM)', shortName: 'SIBM Hyd', tier: 'Tier 2', areaId: 'area-shamshabad', emailDomain: 'sibmhyd.edu.in', verified: true },
  { id: 'col-iare', name: 'Institute of Aeronautical Engineering', shortName: 'IARE', tier: 'Tier 2', areaId: 'area-kompally', emailDomain: 'iare.ac.in', verified: true },
  { id: 'col-cmrcet', name: 'CMR College of Engineering & Technology', shortName: 'CMRCET', tier: 'Tier 2', areaId: 'area-kompally', emailDomain: 'cmrcet.ac.in', verified: true },
  { id: 'col-mrec', name: 'Malla Reddy Engineering College (MREC)', shortName: 'MREC', tier: 'Tier 2', areaId: 'area-kompally', emailDomain: 'mrec.ac.in', verified: true },
  { id: 'col-stfrancis', name: "St. Francis College for Women", shortName: 'St. Francis', tier: 'Tier 2', areaId: 'area-begumpet', emailDomain: 'sfc.ac.in', verified: true },
  { id: 'col-loyola', name: 'Loyola Academy Degree & PG College', shortName: 'Loyola Hyd', tier: 'Tier 2', areaId: 'area-secunderabad', emailDomain: 'loyolaacademy.edu.in', verified: true },
  { id: 'col-nizam', name: 'Nizam College', shortName: 'Nizam College', tier: 'Tier 2', areaId: 'area-ameerpet', emailDomain: 'nizamcollege.ac.in', verified: true },
  { id: 'col-bhavans', name: "Bhavan's Vivekananda College", shortName: "Bhavan's", tier: 'Tier 2', areaId: 'area-secunderabad', emailDomain: 'bhavansvc.ac.in', verified: true },
  { id: 'col-stanley', name: 'Stanley College of Engineering & Technology for Women', shortName: 'Stanley', tier: 'Tier 2', areaId: 'area-ameerpet', emailDomain: 'stanley.edu.in', verified: true },

  // Tier 3: Affiliated Engineering, Technology, Pharmacy & Regional Degree Colleges
  { id: 'col-gcet', name: 'Geethanjali College of Engineering & Technology', shortName: 'GCET', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'geethanjaliinstitutions.com', verified: true },
  { id: 'col-gnit', name: 'Guru Nanak Institute of Technology', shortName: 'GNIT', tier: 'Tier 3', areaId: 'area-ibrahimpatnam', emailDomain: 'gnithyd.ac.in', verified: true },
  { id: 'col-gnitc', name: 'Guru Nanak Institutions Technical Campus', shortName: 'GNITC', tier: 'Tier 3', areaId: 'area-ibrahimpatnam', emailDomain: 'gniindia.org', verified: true },
  { id: 'col-mlrit', name: 'MLR Institute of Technology', shortName: 'MLRIT', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'mlrit.ac.in', verified: true },
  { id: 'col-mlritm', name: 'Marri Laxman Reddy Institute of Technology & Management', shortName: 'MLRITM', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'mlritm.ac.in', verified: true },
  { id: 'col-cmrtc', name: 'CMR Technical Campus', shortName: 'CMRTC', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'cmrtc.ac.in', verified: true },
  { id: 'col-cmrit', name: 'CMR Institute of Technology', shortName: 'CMRIT', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'cmritonline.ac.in', verified: true },
  { id: 'col-cmrec', name: 'CMR Engineering College', shortName: 'CMREC', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'cmrec.ac.in', verified: true },
  { id: 'col-mrcet', name: 'Malla Reddy College of Engineering & Technology', shortName: 'MRCET', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'mrcet.com', verified: true },
  { id: 'col-mriet', name: 'Malla Reddy Institute of Engineering & Technology', shortName: 'MRIET', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'mriet.ac.in', verified: true },
  { id: 'col-mru', name: 'Malla Reddy University', shortName: 'MRU', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'mallareddyuniversity.ac.in', verified: true },
  { id: 'col-tkrcet', name: 'TKR College of Engineering & Technology', shortName: 'TKRCET', tier: 'Tier 3', areaId: 'area-lbnagar', emailDomain: 'tkrcet.ac.in', verified: true },
  { id: 'col-tkrec', name: 'Teegala Krishna Reddy Engineering College', shortName: 'TKREC', tier: 'Tier 3', areaId: 'area-lbnagar', emailDomain: 'tkrec.ac.in', verified: true },
  { id: 'col-vjit', name: 'Vidya Jyothi Institute of Technology', shortName: 'VJIT', tier: 'Tier 3', areaId: 'area-gandipet', emailDomain: 'vjit.ac.in', verified: true },
  { id: 'col-jbiet', name: 'J.B. Institute of Engineering & Technology', shortName: 'JBIET', tier: 'Tier 3', areaId: 'area-gandipet', emailDomain: 'jbiet.edu.in', verified: true },
  { id: 'col-lords', name: 'Lords Institute of Engineering & Technology', shortName: 'Lords', tier: 'Tier 3', areaId: 'area-rajendranagar', emailDomain: 'lords.ac.in', verified: true },
  { id: 'col-shadan', name: 'Shadan College of Engineering & Technology', shortName: 'Shadan', tier: 'Tier 3', areaId: 'area-rajendranagar', emailDomain: 'shadan.in', verified: true },
  { id: 'col-sphoorthy', name: 'Sphoorthy Engineering College', shortName: 'Sphoorthy', tier: 'Tier 3', areaId: 'area-ibrahimpatnam', emailDomain: 'sphoorthyengg.ac.in', verified: true },
  { id: 'col-sriindu', name: 'Sri Indu College of Engineering & Technology', shortName: 'Sri Indu', tier: 'Tier 3', areaId: 'area-ibrahimpatnam', emailDomain: 'sriindu.ac.in', verified: true },
  { id: 'col-vits', name: 'Vignan Institute of Technology & Science', shortName: 'VITS', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'vignanits.ac.in', verified: true },
  { id: 'col-ace', name: 'Ace Engineering College', shortName: 'ACE', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'aceec.ac.in', verified: true },
  { id: 'col-kprit', name: 'Kommuri Pratap Reddy Institute of Technology', shortName: 'KPRIT', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'kprit.in', verified: true },
  { id: 'col-nmrec', name: 'Nalla Malla Reddy Engineering College', shortName: 'NMREC', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'nmrec.edu.in', verified: true },
  { id: 'col-nnrg', name: 'Nalla Narasimha Reddy Education Society Group', shortName: 'NNRG', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'nnrg.edu.in', verified: true },
  { id: 'col-matrusri', name: 'Matrusri Engineering College', shortName: 'Matrusri', tier: 'Tier 3', areaId: 'area-lbnagar', emailDomain: 'matrusri.edu.in', verified: true },
  { id: 'col-methodist', name: 'Methodist College of Engineering & Technology', shortName: 'Methodist', tier: 'Tier 3', areaId: 'area-ameerpet', emailDomain: 'methodist.edu.in', verified: true },
  { id: 'col-ngit', name: 'Neil Gogte Institute of Technology', shortName: 'NGIT', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'ngit.ac.in', verified: true },
  { id: 'col-kmec', name: 'Keshav Memorial Engineering College', shortName: 'KMEC', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'kmec.in', verified: true },
  { id: 'col-stmartins', name: "St. Martin's Engineering College", shortName: "St. Martin's", tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'smec.ac.in', verified: true },
  { id: 'col-stpeters', name: "St. Peter's Engineering College", shortName: "St. Peter's", tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'stpetershyd.com', verified: true },
  { id: 'col-hits', name: 'Holy Mary Institute of Technology & Science', shortName: 'HITS Bogaram', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'hmgi.ac.in', verified: true },
  { id: 'col-scient', name: 'Scient Institute of Technology', shortName: 'Scient', tier: 'Tier 3', areaId: 'area-ibrahimpatnam', emailDomain: 'scient.ac.in', verified: true },
  { id: 'col-siddhartha', name: 'Siddhartha Institute of Engineering & Technology', shortName: 'SIET', tier: 'Tier 3', areaId: 'area-ibrahimpatnam', emailDomain: 'siddhartha.co.in', verified: true },
  { id: 'col-samskruti', name: 'Samskruti College of Engineering & Technology', shortName: 'Samskruti', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'samskruti.ac.in', verified: true },
  { id: 'col-aurora', name: "Aurora's Technological & Research Institute", shortName: 'Aurora', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'atri.edu.in', verified: true },
  { id: 'col-jbrec', name: 'Joginpally B.R. Engineering College', shortName: 'JBREC', tier: 'Tier 3', areaId: 'area-gandipet', emailDomain: 'jbrec.edu.in', verified: true },
  { id: 'col-kgrcet', name: 'KGReddy College of Engineering & Technology', shortName: 'KGRCET', tier: 'Tier 3', areaId: 'area-shamshabad', emailDomain: 'kgr.ac.in', verified: true },
  { id: 'col-mist', name: 'Mahaveer Institute of Science & Technology', shortName: 'MIST', tier: 'Tier 3', areaId: 'area-lbnagar', emailDomain: 'mist.ac.in', verified: true },
  { id: 'col-ellenki', name: 'Ellenki College of Engineering & Technology', shortName: 'Ellenki', tier: 'Tier 3', areaId: 'area-patancheru', emailDomain: 'ellenkicet.ac.in', verified: true },
  { id: 'col-hitam', name: 'Hyderabad Institute of Technology and Management', shortName: 'HITAM', tier: 'Tier 3', areaId: 'area-kompally', emailDomain: 'hitam.org', verified: true },
  { id: 'col-vbit', name: 'Vignana Bharathi Institute of Technology', shortName: 'VBIT', tier: 'Tier 3', areaId: 'area-uppal', emailDomain: 'vbithyd.ac.in', verified: true },
  { id: 'col-pallavi', name: 'Pallavi Engineering College', shortName: 'Pallavi', tier: 'Tier 3', areaId: 'area-lbnagar', emailDomain: 'pallaviengineeringcollege.ac.in', verified: true },
  { id: 'col-brecw', name: 'Bhoj Reddy Engineering College for Women', shortName: 'BRECW', tier: 'Tier 3', areaId: 'area-lbnagar', emailDomain: 'brecw.ac.in', verified: true },
  { id: 'col-badruka', name: 'Badruka College of Commerce & Arts', shortName: 'Badruka', tier: 'Tier 3', areaId: 'area-tarnaka', emailDomain: 'badruka.com', verified: true },
  { id: 'col-stanns', name: "St. Ann's College for Women", shortName: "St. Ann's", tier: 'Tier 3', areaId: 'area-rajendranagar', emailDomain: 'stannscollegehyd.com', verified: true },
  { id: 'col-villamarie', name: 'Villa Marie College for Women', shortName: 'Villa Marie', tier: 'Tier 3', areaId: 'area-begumpet', emailDomain: 'villamariecollege.ac.in', verified: true },
  { id: 'col-avinash', name: 'Avinash College of Commerce', shortName: 'Avinash', tier: 'Tier 3', areaId: 'area-secunderabad', emailDomain: 'avinashcollege.com', verified: true },
  { id: 'col-kasturba', name: 'Kasturba Gandhi Degree & PG College for Women', shortName: 'Kasturba', tier: 'Tier 3', areaId: 'area-secunderabad', emailDomain: 'kgdc.ac.in', verified: true },
];

export const SAMPLE_POSTERS = [
  {
    id: 'sample-iqx24',
    label: 'IQX24 — Official Poster (MRDU)',
    imagePath: '/assets/aistudio/WhatsApp_Image_2026-11-18_at_5.23.32_PM_7e5ad653.jpeg',
    collegeId: 'col-mrdu',
  },
  {
    id: 'sample-iqx24-schedule',
    label: 'IQX24 — 24H Event Schedule (MRDU)',
    imagePath: '/src/assets/images/poster_iqx24_hackathon.jpeg',
    collegeId: 'col-mrdu',
  },
  {
    id: 'sample-mrdu-genai',
    label: 'PromptForge GenAI Bootcamp (MRDU)',
    imagePath: '/src/assets/images/mrdu_genai_poster_1795301187623.jpg',
    collegeId: 'col-mrdu',
  },
  {
    id: 'sample-mrdu-cultural',
    label: 'Aarohan Cultural & Indie Night (MRDU)',
    imagePath: '/src/assets/images/mrdu_cultural_poster_1795301187979.jpg',
    collegeId: 'col-mrdu',
  },
  {
    id: 'sample-bits-cloud',
    label: 'Atmos Cloud & Quantum Summit (BITS Hyd)',
    imagePath: '/src/assets/images/bits_cloud_poster_1795301187946.jpg',
    collegeId: 'col-bits',
  },
  {
    id: 'sample-iare-drone',
    label: 'AeroSpark Drone Grand Prix (IARE)',
    imagePath: '/src/assets/images/iare_drone_poster_1795301189284.jpg',
    collegeId: 'col-iare',
  },
  {
    id: 'sample-uoh-policy',
    label: 'Deccan Founders & AI Policy Conclave (UoH)',
    imagePath: '/src/assets/images/uoh_conclave_poster_1795301189048.jpg',
    collegeId: 'col-uoh',
  },
  {
    id: 'sample-hackathon',
    label: 'AI & Software Hackathon (Clean English)',
    imagePath: '/src/assets/images/poster_ai_hackathon_1795081969222.jpg',
    collegeId: 'col-iiith',
  },
  {
    id: 'sample-robotics',
    label: 'Autonomous Robotics Bootcamp (Dense Technical)',
    imagePath: '/src/assets/images/poster_robotics_workshop_1795081969109.jpg',
    collegeId: 'col-cbit',
  },
  {
    id: 'sample-cultural',
    label: 'Osmania Cultural & Music Fest (Multi-Day)',
    imagePath: '/src/assets/images/poster_cultural_fest_1795081969484.jpg',
    collegeId: 'col-ou',
  },
  {
    id: 'sample-design',
    label: 'UI/UX Product Design Conclave',
    imagePath: '/src/assets/images/poster_design_summit_1795081969848.jpg',
    collegeId: 'col-vnr',
  },
  {
    id: 'sample-fintech',
    label: 'FinTech & Startup Pitch Competition',
    imagePath: '/src/assets/images/poster_fintech_case_1795081969450.jpg',
    collegeId: 'col-mahindra',
  },
];

export interface DatabaseState {
  student: StudentProfile;
  students: Record<string, StudentProfile>;
  organizers: OrganizerAccount[];
  officialInvites: OfficialInvite[];
  announcements: CampusAnnouncement[];
  activeOrganizerId: string;
  events: CampusEvent[];
  registrations: Registration[];
  notifications: NotificationItem[];
  reports: EventReport[];
  auditLog: AuditLogEntry[];
  extractionCache: Record<string, PosterExtractionResult>;
  partnerPosts: PartnerPost[];
  chatRooms: TeamChatRoom[];
  chatMessages: TeamChatMessage[];
  squads: Squad[];
  joinRequests: SquadJoinRequest[];
  connectionRequests: ConnectionRequest[];
  teamUpCalls: TeamUpCall[];
  conversations: TeamConversation[];
  registrationSnapshots: SquadRegistrationSnapshot[];
  eventFeedback: EventFeedback[];
  surveys: CampusSurvey[];
  surveyResponses: SurveyResponse[];
  betaAccess?: BetaAccessConfig;
}

export function createGuestStudent(studentId = 'guest-student'): StudentProfile {
  const tokenSuffix = Math.random().toString(36).slice(2, 7);
  return {
    id: studentId,
    displayName: 'Guest Student',
    email: '',
    phoneNumber: '',
    photoUrl: '',
    collegeId: 'col-mrdu',
    customCollegeName: '',
    collegeVerified: false,
    course: 'B.Tech',
    branch: 'CSE',
    semester: 'Sem 1',
    year: '1st Year',
    interests: ['Hackathon', 'Workshop', 'Competition', 'Cultural'],
    areaId: 'area-kompally',
    locationLabel: 'Kompally / Medchal (MRDU), Hyderabad',
    locationLat: 17.5594,
    locationLng: 78.4481,
    radiusKm: 50,
    followedCollegeIds: ['col-mrdu'],
    telegramConnected: false,
    telegramDeepLinkToken: `cp_ind_${tokenSuffix}`,
    telegramHandle: '',
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00',
    },
    mutedAll: false,
    mutedEventIds: [],
    savedEventIds: [],
    onboardingCompleted: false,
    consentAccepted: false,
    skills: [],
    learningGoals: [],
    headline: '',
    bio: '',
    graduationYear: '',
    rollNumber: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    leetcodeUrl: '',
    hackerrankUrl: '',
    instagramUrl: '',
    profileVisibility: {
      linksVisibility: 'squads',
      discoverableInTeams: true,
      showAcademicYear: true,
    },
    accessibilityPrefs: {
      reducedMotion: false,
      highContrastFocus: false,
      compactDensity: false,
      themePreference: 'system',
    },
    preferredModes: ['In-Person', 'Hybrid', 'Online'],
    availability: 'Open to All',
    priorityLowSeatAlerts: true,
    teamDiscoveryEnabled: true,
    teamCallNotifications: true,
    gender: 'unset',
    languages: [],
  };
}

// Helper to create IST -> UTC ISO timestamps relative to November 2026 demo timeline
function istToUtcIso(year: number, month: number, day: number, hour: number, minute: number): string {
  // IST is UTC+05:30
  const utcMs = Date.UTC(year, month - 1, day, hour - 5, minute - 30, 0);
  return new Date(utcMs).toISOString();
}

export function createSeedState(): DatabaseState {
  const initialStudent = createGuestStudent();

  const organizers: OrganizerAccount[] = [
    {
      id: 'org-official-nvipuj',
      clubName: 'IIIT-H Campus Governance Office',
      contactName: 'Vipuj N (Campus Official)',
      designation: 'Campus Official',
      email: 'nvipuj@gmail.com',
      collegeId: 'col-iiith',
      domainMatched: true,
      proofNote: 'Primary Campus Official for IIIT Hyderabad (Connectus Institutional Console)',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: true,
      createdAt: '2026-11-08T09:05:00.000Z',
    },
    {
      id: 'org-club-vinay',
      clubName: 'IIIT-H Tech & Innovation Club',
      contactName: 'Vinay Chandra',
      designation: 'Club Leader',
      email: 'janumpallyvinaychandra@gmail.com',
      collegeId: 'col-iiith',
      domainMatched: true,
      proofNote: 'Invited by Vipuj N (Campus Official) for IIIT Hyderabad Club Submissions',
      status: 'approved',
      memberRole: 'club_leader',
      accountType: 'club_leader',
      invitedByOfficialId: 'org-official-nvipuj',
      invitedByName: 'Vipuj N (Campus Official)',
      createdAt: '2026-11-08T10:00:00.000Z',
    },
    {
      id: 'org-mrdu-prajwal',
      clubName: 'Prajwal Students Club · School of Humanities and Sciences',
      contactName: 'MRDU Hackathon Coordinator',
      designation: 'Faculty & Official Coordinator',
      email: 'prajwal.club@mrdu.ac.in',
      collegeId: 'col-mrdu',
      domainMatched: true,
      proofNote: 'Appointed institutional Campus Official for MallaReddy (MR) Deemed to be University',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: true,
      appointedByAdminEmail: 'nvipuj@gmail.com',
      createdAt: '2026-11-09T09:00:00.000Z',
    },
    {
      id: 'org-osdg',
      clubName: 'Open Source Developers Group (OSDG)',
      contactName: 'Rohan Kulkarni',
      designation: 'Dean Student Affairs · Primary Official',
      email: 'osdg@iiit.ac.in',
      collegeId: 'col-iiith',
      domainMatched: true,
      proofNote: 'Appointed institutional Campus Official for IIIT Hyderabad',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: false,
      appointedByAdminEmail: 'nvipuj@gmail.com',
      createdAt: '2026-11-10T09:00:00.000Z',
    },
    {
      id: 'org-iiith-acm-cl',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      contactName: 'Niharika Verma',
      designation: 'Club President · Invited Leader',
      email: 'acm.chapter@iiit.ac.in',
      collegeId: 'col-iiith',
      domainMatched: true,
      proofNote: 'Invited by Rohan Kulkarni via Official Invite CP-IIITH-CLUB1',
      status: 'approved',
      memberRole: 'club_leader',
      accountType: 'club_leader',
      invitedByOfficialId: 'org-osdg',
      invitedByName: 'Rohan Kulkarni',
      inviteToken: 'inv-osdg-demo',
      createdAt: '2026-11-11T11:15:00.000Z',
    },
    {
      id: 'org-cbit-robo',
      clubName: 'CBIT Robotics & Automation Society',
      contactName: 'Siddharth Varma',
      designation: 'Faculty Coordinator · Primary Official',
      email: 'robotics@cbit.ac.in',
      collegeId: 'col-cbit',
      domainMatched: true,
      proofNote: 'Appointed institutional Campus Official for CBIT',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: true,
      appointedByAdminEmail: 'nvipuj@gmail.com',
      createdAt: '2026-11-12T10:30:00.000Z',
    },
    {
      id: 'org-thub-external',
      clubName: 'T-Hub Campus Innovation Lab',
      contactName: 'Vikramaditya Rao',
      designation: 'Ecosystem Partner Lead',
      email: 'campus.programs@t-hub.co',
      collegeId: 'col-iiith',
      domainMatched: false,
      proofNote: 'Verified Hyderabad student innovation partner · Campus Governance approved',
      status: 'approved',
      memberRole: 'external_organizer',
      accountType: 'external_organizer',
      organizationName: 'T-Hub Foundation Hyderabad',
      organizationWebsite: 'https://t-hub.co',
      organizationCategory: 'Startup Incubator & Hackathon Partner',
      appointedByAdminEmail: 'nvipuj@gmail.com',
      createdAt: '2026-11-13T10:00:00.000Z',
    },
    {
      id: 'org-vnr-design',
      clubName: 'VNR Design & Product Guild',
      contactName: 'Meghana Rao',
      designation: 'External Workshop Partner',
      email: 'vnrdesignclub@gmail.com',
      collegeId: 'col-vnr',
      domainMatched: false,
      proofNote: 'External design collective partnership verification attached (#VNR-2026-41)',
      status: 'pending',
      memberRole: 'external_organizer',
      accountType: 'external_organizer',
      organizationName: 'Deccan Product Design Collective',
      organizationWebsite: 'https://pixelcraft.hyd.dev',
      organizationCategory: 'Design & Product Collective',
      createdAt: '2026-11-18T14:20:00.000Z',
    },
    {
      id: 'org-ou-music',
      clubName: 'OU Cultural & Arts Collective',
      contactName: 'Karthik Goud',
      designation: 'External Festival Producer',
      email: 'cultural.council@osmania.ac.in',
      collegeId: 'col-ou',
      domainMatched: true,
      proofNote: 'Awaiting Campus Governance verification for campus festival listing',
      status: 'pending',
      memberRole: 'external_organizer',
      accountType: 'external_organizer',
      organizationName: 'Deccan Indie Arts Guild',
      organizationWebsite: 'https://deccanarts.in',
      organizationCategory: 'Arts & Cultural Collective',
      createdAt: '2026-11-18T16:45:00.000Z',
    },
    {
      id: 'org-mrdu-cultural',
      clubName: 'MRDU Student Council & Cultural Forum',
      contactName: 'Anusha Reddy',
      designation: 'Cultural Secretary · MRDU',
      email: 'cultural@mrdu.ac.in',
      collegeId: 'col-mrdu',
      domainMatched: true,
      proofNote: 'Appointed Cultural Council Organizer for MRDU Amphitheatre events',
      status: 'approved',
      memberRole: 'club_leader',
      accountType: 'club_leader',
      invitedByOfficialId: 'org-mrdu-prajwal',
      invitedByName: 'MRDU Hackathon Coordinator',
      createdAt: '2026-11-18T17:00:00.000Z',
    },
    {
      id: 'org-bits-atmos',
      clubName: 'BITS Pilani Hyderabad Tech Senate (ATMOS)',
      contactName: 'Ishaan Deshpande',
      designation: 'ATMOS Technical Convener',
      email: 'atmos@hyderabad.bits-pilani.ac.in',
      collegeId: 'col-bits',
      domainMatched: true,
      proofNote: 'Official BITS Pilani Hyderabad ATMOS Technical Summit Organizer',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: true,
      createdAt: '2026-11-18T17:15:00.000Z',
    },
    {
      id: 'org-iare-aero',
      clubName: 'IARE Aero & Autonomous Systems Club',
      contactName: 'Praveen Kumar',
      designation: 'Faculty Advisor · IARE Dundigal',
      email: 'aeroclub@iare.ac.in',
      collegeId: 'col-iare',
      domainMatched: true,
      proofNote: 'Official IARE Dundigal Aerospace Competition Organizer',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: true,
      createdAt: '2026-11-18T17:30:00.000Z',
    },
    {
      id: 'org-uoh-conclave',
      clubName: 'UoH E-Cell & Public Policy Society',
      contactName: 'Neha Kulkarni',
      designation: 'Conclave Convener · UoH',
      email: 'ecell@uohyd.ac.in',
      collegeId: 'col-uoh',
      domainMatched: true,
      proofNote: 'Official University of Hyderabad Founders & Policy Conclave',
      status: 'approved',
      memberRole: 'college_official',
      accountType: 'campus_official',
      isPrimaryContact: true,
      createdAt: '2026-11-18T17:45:00.000Z',
    },
  ];

  const officialInvites: OfficialInvite[] = [
    {
      token: 'inv-osdg-demo',
      code: 'CP-IIITH-2026',
      collegeId: 'col-iiith',
      clubName: 'IIIT-H Programming & Hackathon Club',
      createdByOfficialId: 'org-osdg',
      createdByName: 'Rohan Kulkarni',
      createdByEmail: 'osdg@iiit.ac.in',
      singleUse: true,
      maxUses: 1,
      usedCount: 0,
      status: 'active',
      acceptedByNames: [],
      createdAt: '2026-11-18T12:00:00.000Z',
      expiresAt: '2026-12-31T18:29:00.000Z',
    },
    {
      token: 'inv-iiith-design-active',
      code: 'CP-DESG-902K',
      collegeId: 'col-iiith',
      clubName: 'IIIT-H Design & Product Guild',
      createdByOfficialId: 'org-official-nvipuj',
      createdByName: 'Vipuj N (Campus Official)',
      createdByEmail: 'nvipuj@gmail.com',
      targetEmail: 'design.guild@iiit.ac.in',
      singleUse: true,
      maxUses: 1,
      usedCount: 0,
      status: 'active',
      acceptedByNames: [],
      createdAt: '2026-11-20T09:15:00.000Z',
      expiresAt: '2026-12-20T18:29:00.000Z',
    },
    {
      token: 'inv-iiith-acm-used',
      code: 'CP-IIITH-CLUB1',
      collegeId: 'col-iiith',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      createdByOfficialId: 'org-osdg',
      createdByName: 'Rohan Kulkarni',
      createdByEmail: 'osdg@iiit.ac.in',
      targetEmail: 'acm.chapter@iiit.ac.in',
      singleUse: true,
      maxUses: 1,
      usedCount: 1,
      status: 'used',
      acceptedByNames: ['Niharika Verma'],
      createdAt: '2026-11-10T10:00:00.000Z',
      expiresAt: '2026-12-10T18:29:00.000Z',
    },
  ];

  const announcements: CampusAnnouncement[] = [
    {
      id: 'ann-iiith-1',
      collegeId: 'col-iiith',
      collegeShortName: 'IIIT-H',
      authorId: 'org-osdg',
      authorName: 'Rohan Kulkarni',
      authorDesignation: 'Dean Student Affairs · IIIT Hyderabad',
      title: 'Visitor Gate Clearance Window for Deccan AI & Systems Hackathon',
      body: 'External college participants must carry their physical college photo ID + Connectus QR pass. Main gate security verification opens at 08:15 AM IST on Saturday at Himalaya Block.',
      pinned: true,
      createdAt: '2026-11-19T08:30:00.000Z',
    },
    {
      id: 'ann-iiith-2',
      collegeId: 'col-iiith',
      collegeShortName: 'IIIT-H',
      authorId: 'org-official-nvipuj',
      authorName: 'Vipuj N (Campus Official)',
      authorDesignation: 'Campus Official · IIIT Hyderabad',
      title: 'December Auditorium & Club Event Submission Cutoffs',
      body: 'All Club Leaders planning workshops or build sprints in Himalaya, Vindhya, or Nilgiri blocks for December must submit their venue confirmation and speaker roster at least 5 days ahead for Campus Official sign-off.',
      pinned: false,
      createdAt: '2026-11-20T11:20:00.000Z',
    },
    {
      id: 'ann-mrdu-1',
      collegeId: 'col-mrdu',
      collegeShortName: 'MRDU',
      authorId: 'org-mrdu-prajwal',
      authorName: 'MRDU Hackathon Coordinator',
      authorDesignation: 'School of Humanities and Sciences · MRDU',
      title: 'IQX24 Starter Kit & Power Strip Advisory',
      body: 'Team check-in & starter kit pickup begins promptly at 09:00 AM IST in IT Block (Block 11) Lobby. Bring one multi-plug extension board per squad.',
      pinned: true,
      createdAt: '2026-11-19T12:30:00.000Z',
    },
    {
      id: 'ann-mrdu-2',
      collegeId: 'col-mrdu',
      collegeShortName: 'MRDU',
      authorId: 'org-mrdu-prajwal',
      authorName: 'MRDU Hackathon Coordinator',
      authorDesignation: 'School of Humanities and Sciences · MRDU',
      title: 'PromptForge GenAI Bootcamp & Aarohan Cultural Passes Live',
      body: 'MRDU students and visiting Hyderabad campuses can now claim E-Tickets for PromptForge GenAI Bootcamp (Nov 26, IT Block) and Aarohan Cultural & Indie Night (Dec 1, Open Amphitheatre).',
      pinned: false,
      createdAt: '2026-11-20T14:00:00.000Z',
    },
  ];

  const events: CampusEvent[] = [
    {
      id: 'evt-iqx24-hackathon',
      clubId: 'org-mrdu-prajwal',
      clubName: 'Prajwal Students Club · School of Humanities and Sciences',
      collegeId: 'col-mrdu',
      title: 'IQX24 — National Level 24H Hackathon',
      description:
        'Intelligence × Innovation × Execution. National Level 24-Hour Hackathon presented by School of Humanities and Sciences & Prajwal Students Club at Malla Reddy (MR) Deemed to be University in collaboration with student.alumni.ai (Community Partner: COPEX). Themes include AI & GenAI, Data Science & Big Data, Quantum Computing, AgriTech, Computer Vision, Healthcare, Clean & Green Tech, Robotics, Cybersecurity, IoT, Agentic AI, ML/DL, Blockchain & Web3, and FinTech.',
      type: 'Hackathon',
      startAt: istToUtcIso(2026, 11, 21, 9, 0),
      endAt: istToUtcIso(2026, 11, 22, 10, 0),
      venueName: 'IT Block (Block 11), Malla Reddy (MR) Deemed to be University',
      formattedAddress:
        'Malla Reddy (MR) Deemed to be University, IT Block (Block 11), Maisammaguda, Kompally, Hyderabad 500100',
      areaId: 'area-kompally',
      lat: 17.5594,
      lng: 78.4481,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 99,
      capacity: 200,
      confirmedCount: 142,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 21, 9, 0),
      regLink: 'https://connectus.in/register/iqx24',
      paymentInfo: {
        upiId: 'mrdu.prajwal@sbi',
        accountNote:
          '₹99 per participant · National Level 24H Hackathon hosted by School of Humanities and Sciences & Prajwal Students Club, MRDU.',
        refundPolicy: 'Covers full 24h meals, starter kit, campfire session & coding platform access.',
      },
      teamSize: 'Teams (1st to 4th Year · All Campuses Welcome)',
      rules: [
        'Registration, Check-in & Kit Distribution runs 09:00 AM – 09:45 AM on Saturday, 21st November 2026 at IT Block (Block 11).',
        'Inauguration & Welcome Address at 09:45 AM followed by Hackathon Rules, Guidelines & Problem Statements at 10:00 AM.',
        '24-Hour Hackathon window runs continuously from 21st Nov, 10:00 AM to 22nd Nov, 10:00 AM across Coding Phases 1–8.',
        'Open to students, developers, designers & AI enthusiasts from MRDU and visiting colleges across India.',
        'Project Demonstrations & Jury Evaluation run 09:00 AM – 09:30 AM on Sunday, 22nd Nov 2026, followed by Valedictory & Prize Distribution at 09:45 AM.',
      ],
      prizesAndPerks: [
        '₹50,000+ Cash Pool Prize for top winning teams',
        '3 months free AI tokens for ChatGPT & Google Gemini + exclusive coding app access',
        'Starter kit, exciting goodies & gifts for participants',
        'All meals provided: Lunch, Evening Snacks & Tea, Dinner, Mid-Night Refreshments & Day 2 Tiffin',
        'Exclusive Campfire, Music & Team Networking Session (01:00 AM – 02:00 AM)',
      ],
      prerequisites: [
        'Valid College Photo ID Card for MRDU IT Block check-in and kit distribution',
        'Laptop, power adapter, and extension strip for the 24-hour sprint',
      ],
      schedule: [
        {
          dayLabel: 'Day 1 – 21st November 2026 (Saturday)',
          items: [
            { time: '09:00 AM – 09:45 AM', activity: 'Registration & Check-in (Kit Distribution)' },
            { time: '09:45 AM – 10:00 AM', activity: 'Inauguration & Welcome Address' },
            { time: '10:00 AM – 10:30 AM', activity: 'Hackathon Rules, Guidelines & Problem Statements' },
            { time: '10:30 AM – 11:00 AM', activity: 'Team Formation & Final Problem Selection' },
            { time: '11:00 AM – 01:00 PM', activity: 'Coding Session – Phase 1' },
            { time: '01:00 PM – 02:00 PM', activity: 'Lunch' },
            { time: '02:00 PM – 04:00 PM', activity: 'Coding Session – Phase 2' },
            { time: '04:00 PM – 04:30 PM', activity: 'Evening Snacks & Tea' },
            { time: '04:30 PM – 06:30 PM', activity: 'Coding Session – Phase 3' },
            { time: '06:30 PM – 07:00 PM', activity: 'Mentor Interaction & Progress Review' },
            { time: '07:00 PM – 08:30 PM', activity: 'Coding Session – Phase 4' },
            { time: '08:30 PM – 09:30 PM', activity: 'Dinner' },
            { time: '09:30 PM – 11:00 PM', activity: 'Coding Session – Phase 5' },
            { time: '11:00 PM – 12:00 AM', activity: 'Late Night Development & Integration' },
            { time: '12:00 AM – 01:00 AM', activity: 'Coding Session – Phase 6' },
          ],
        },
        {
          dayLabel: 'Day 2 – 22nd November 2026 (Sunday)',
          items: [
            {
              time: '01:00 AM – 02:00 AM',
              activity: 'Campfire, Networking & Fun Activities (Music, Games & Team Interaction)',
            },
            { time: '02:00 AM – 03:30 AM', activity: 'Coding Session – Phase 7' },
            { time: '03:30 AM – 04:00 AM', activity: 'Mid-Night Tea & Refreshments' },
            { time: '04:00 AM – 06:30 AM', activity: 'Advanced Development & Integration' },
            { time: '06:30 AM – 07:00 AM', activity: 'Freshen Up & Break' },
            { time: '07:00 AM – 08:30 AM', activity: 'Coding Session – Phase 8' },
            { time: '08:30 AM – 09:00 AM', activity: 'Tea & Tiffin Break' },
            { time: '09:00 AM – 09:30 AM', activity: 'Project Demonstrations & Jury Evaluation' },
            { time: '09:30 AM – 09:45 AM', activity: 'Jury Deliberation & Result Preparation' },
            {
              time: '09:45 AM – 10:00 AM',
              activity: 'Valedictory Ceremony (Results, Prize Distribution & Vote of Thanks)',
            },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Prajwal Students Club',
        role: 'School of Humanities and Sciences · Malla Reddy (MR) Deemed to be University',
        email: 'prajwal.club@mrdu.ac.in',
      },
      posterUrl: '/assets/aistudio/WhatsApp_Image_2026-11-18_at_5.23.32_PM_7e5ad653.jpeg',
      additionalPosterUrls: ['/src/assets/images/poster_iqx24_hackathon.jpeg'],
      promoVideoUrl: '/assets/aistudio/WhatsApp_Video_2026-11-20_at_9.46.48_AM_3759f61e.mp4',
      promoVideoCaption:
        'IQX24 Official Promo Reel · Live at MRDU IT Block (Nov 21–22) · ₹99 Entry, Food & Campfire, ₹50,000+ Cash Pool & Free AI Tokens',
      source: 'organizer',
      aiConfidence: { title: 0.99, start_datetime_ist: 0.99, venue_name: 0.99 },
      status: 'published',
      createdAt: '2026-11-19T12:00:00.000Z',
    },
    {
      id: 'evt-mrdu-genai-agents',
      clubId: 'org-mrdu-prajwal',
      clubName: 'Prajwal Students Club · MRDU',
      collegeId: 'col-mrdu',
      title: 'PromptForge — GenAI & Agentic Systems Bootcamp',
      description:
        'Hands-on build workshop at MRDU IT Block covering multi-step tool-calling agents, structured prompt engineering, RAG evaluation, and safe campus deployment.',
      type: 'Workshop',
      startAt: istToUtcIso(2026, 11, 26, 10, 0),
      endAt: istToUtcIso(2026, 11, 26, 16, 30),
      venueName: 'IT Block Seminar Hall, MRDU',
      formattedAddress:
        'Malla Reddy (MR) Deemed to be University, IT Block 2nd Floor, Maisammaguda, Kompally, Hyderabad 500100',
      areaId: 'area-kompally',
      lat: 17.5594,
      lng: 78.4481,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'AI/ML', 'Data Science', 'IT', 'All'],
      years: ['All'],
      feeInr: 0,
      capacity: 140,
      confirmedCount: 94,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 25, 22, 0),
      regLink: 'https://connectus.in/register/mrdu-promptforge',
      whatsappGroupUrl: 'https://chat.whatsapp.com/MRDUPromptForge2026',
      paymentInfo: {
        accountNote: 'Free entry pass hosted by Prajwal Students Club, MRDU.',
      },
      teamSize: 'Individual or Pair Build Bench',
      rules: [
        'Carry your college ID card and laptop with Python 3.10+ or Node.js 20+ installed.',
        'Seats in IT Block Seminar Hall are allocated first-come upon QR pass scan at 09:45 AM.',
      ],
      prizesAndPerks: [
        'Verified MRDU GenAI Bootcamp Completion Certificate',
        'Starter agent templates + API sandbox credits',
      ],
      prerequisites: ['College Photo ID Card', 'Laptop + Charger'],
      schedule: [
        {
          dayLabel: 'Bootcamp Agenda (IST)',
          items: [
            { time: '10:00 AM – 10:30 AM', activity: 'QR Pass Check-In & Sandbox Setup' },
            { time: '10:30 AM – 01:00 PM', activity: 'Prompt Engineering Masterclass & Structured Outputs' },
            { time: '02:00 PM – 04:30 PM', activity: 'Building Multi-Tool Agentic Workflows & Live Showcase' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Prajwal Students Club',
        role: 'MRDU Tech & AI Chapter',
        email: 'prajwal.club@mrdu.ac.in',
      },
      posterUrl: '/src/assets/images/mrdu_genai_poster_1795301187623.jpg',
      source: 'organizer',
      sourceType: 'campus_official',
      viewCount: 312,
      status: 'published',
      createdAt: '2026-11-20T09:00:00.000Z',
    },
    {
      id: 'evt-mrdu-aarohan-night',
      clubId: 'org-mrdu-cultural',
      clubName: 'MRDU Student Council & Cultural Forum',
      collegeId: 'col-mrdu',
      title: 'Aarohan — MRDU Cultural & Indie Music Night',
      description:
        'An evening celebration of live college indie bands, classical & folk fusion performances, street dance showcases, and student food stalls under the open amphitheatre lights.',
      type: 'Cultural',
      startAt: istToUtcIso(2026, 12, 1, 18, 0),
      endAt: istToUtcIso(2026, 12, 1, 22, 0),
      venueName: 'Open Amphitheatre, MRDU Campus',
      formattedAddress:
        'Malla Reddy Campus Central Open Amphitheatre, Maisammaguda, Kompally, Hyderabad 500100',
      areaId: 'area-kompally',
      lat: 17.5601,
      lng: 78.4492,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 0,
      capacity: 450,
      confirmedCount: 288,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 1, 16, 0),
      regLink: 'https://connectus.in/register/mrdu-aarohan',
      whatsappGroupUrl: 'https://chat.whatsapp.com/MRDUAarohan2026',
      paymentInfo: {
        accountNote: 'Free general entry pass for college students across Hyderabad.',
      },
      teamSize: 'Individual Audience Pass',
      rules: [
        'Valid physical college photo ID + Connectus QR Entry Pass mandatory at Amphitheatre gate.',
        'Gates open at 05:30 PM IST; seating is general admission.',
      ],
      prizesAndPerks: [
        'Live college bands, folk fusion & dance battle finale',
        'Food courts & acoustic jam corner',
      ],
      prerequisites: ['College Photo ID Card & Connectus QR Pass'],
      schedule: [
        {
          dayLabel: 'Evening Programme (IST)',
          items: [
            { time: '06:00 PM – 07:15 PM', activity: 'Folk Music & Classical Fusion Opening Showcase' },
            { time: '07:15 PM – 08:30 PM', activity: 'Inter-College Dance Crews & Acoustic Sets' },
            { time: '08:30 PM – 10:00 PM', activity: 'Headliner Live Indie Band Performance' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Anusha Reddy',
        role: 'Cultural Secretary · MRDU Student Council',
        phone: '+91 98491 77210',
        email: 'cultural@mrdu.ac.in',
      },
      posterUrl: '/src/assets/images/mrdu_cultural_poster_1795301187979.jpg',
      source: 'organizer',
      sourceType: 'club_approved',
      viewCount: 470,
      status: 'published',
      createdAt: '2026-11-20T10:30:00.000Z',
    },
    {
      id: 'evt-bits-atmos-summit',
      clubId: 'org-bits-atmos',
      clubName: 'BITS Pilani Hyderabad Tech Senate (ATMOS)',
      collegeId: 'col-bits',
      title: 'ATMOS — Cloud-Native & Quantum Systems Summit',
      description:
        'Full-day engineering summit at BITS Pilani Hyderabad Auditorium exploring Kubernetes autoscaling, edge inference, and quantum computing algorithms with FCI & research speakers.',
      type: 'Talk',
      startAt: istToUtcIso(2026, 11, 30, 9, 30),
      endAt: istToUtcIso(2026, 11, 30, 17, 30),
      venueName: 'Main Auditorium, BITS Pilani Hyderabad',
      formattedAddress:
        'BITS Pilani Hyderabad Campus, Jawahar Nagar, Kapra Mandal, Secunderabad, Telangana 500078',
      areaId: 'area-uppal',
      lat: 17.5449,
      lng: 78.5718,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'ECE', 'AI/ML', 'IT', 'All'],
      years: ['All'],
      feeInr: 100,
      capacity: 220,
      confirmedCount: 158,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 28, 23, 59),
      regLink: 'https://connectus.in/register/bits-atmos-cloud',
      paymentInfo: {
        upiId: 'atmos.bits@sbi',
        accountNote: '₹100 visitor summit pass including lunch & keynotes at BITS Pilani Hyderabad.',
      },
      teamSize: 'Individual Summit Pass',
      rules: [
        'Pre-registered external students must carry physical college ID for campus main gate entry.',
      ],
      prizesAndPerks: [
        'ATMOS Summit Certificate & cloud lab sandbox credits',
        'Lunch & high-tea networking with speakers',
      ],
      prerequisites: ['College Photo ID Card & Connectus Pass'],
      schedule: [
        {
          dayLabel: 'Summit Tracks (IST)',
          items: [
            { time: '09:30 AM – 11:30 AM', activity: 'Keynote: Kubernetes & Distributed Microservices at Scale' },
            { time: '11:45 AM – 01:30 PM', activity: 'Quantum Computing Fundamentals & Algorithms Track' },
            { time: '02:30 PM – 05:30 PM', activity: 'Cloud Security, Edge AI & Panel Q&A' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Ishaan Deshpande',
        role: 'ATMOS Technical Convener · BITS Hyd',
        email: 'atmos@hyderabad.bits-pilani.ac.in',
      },
      posterUrl: '/src/assets/images/bits_cloud_poster_1795301187946.jpg',
      source: 'seeded',
      viewCount: 389,
      status: 'published',
      createdAt: '2026-11-20T11:00:00.000Z',
    },
    {
      id: 'evt-iare-aerospark-gp',
      clubId: 'org-iare-aero',
      clubName: 'IARE Aero & Autonomous Systems Club',
      collegeId: 'col-iare',
      title: 'AeroSpark — Autonomous Drone & RC Grand Prix',
      description:
        'Inter-college autonomous quadcopter obstacle course & RC glider precision competition at IARE Dundigal campus. Test vision-guided flight paths and manual FPV agility.',
      type: 'Competition',
      startAt: istToUtcIso(2026, 12, 4, 9, 0),
      endAt: istToUtcIso(2026, 12, 4, 17, 0),
      venueName: 'Aero Ground & Hangar, IARE Dundigal',
      formattedAddress:
        'Institute of Aeronautical Engineering (IARE), Dundigal, Hyderabad, Telangana 500043',
      areaId: 'area-kompally',
      lat: 17.5998,
      lng: 78.4176,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['ECE', 'Mechanical', 'CSE', 'EEE', 'AI/ML'],
      years: ['All'],
      feeInr: 150,
      capacity: 80,
      confirmedCount: 52,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 2, 23, 59),
      regLink: 'https://connectus.in/register/iare-aerospark',
      paymentInfo: {
        upiId: 'iare.aeroclub@hdfcbank',
        accountNote: '₹150 per team entry payable to IARE Aero Club.',
      },
      teamSize: 'Teams of 2–4 pilots/engineers',
      rules: [
        'All LiPo batteries must pass safety voltage & prop-guard inspection at Pit Desk before flight.',
        'Maximum drone frame diagonal 450mm; kill-switch failsafe mandatory.',
      ],
      prizesAndPerks: [
        '₹40,000 AeroSpark Prize Pool + Flight Controller Hardware Kits',
        'Official IARE Competition Certificates',
      ],
      prerequisites: ['College Photo ID Card, LiPo Safe Bag & Team Entry Pass'],
      schedule: [
        {
          dayLabel: 'Flight Day Timeline (IST)',
          items: [
            { time: '09:00 AM – 10:30 AM', activity: 'Pit Check-In, Weight & Failsafe Tech Inspection' },
            { time: '10:30 AM – 01:30 PM', activity: 'Time-Trial Obstacle Slalom & Autonomous Gate Run' },
            { time: '02:30 PM – 05:00 PM', activity: 'Grand Prix Finals & Awards Ceremony' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Praveen Kumar',
        role: 'Faculty Advisor · IARE Dundigal',
        email: 'aeroclub@iare.ac.in',
      },
      posterUrl: '/src/assets/images/iare_drone_poster_1795301189284.jpg',
      source: 'seeded',
      viewCount: 295,
      status: 'published',
      createdAt: '2026-11-20T12:00:00.000Z',
    },
    {
      id: 'evt-uoh-policy-conclave',
      clubId: 'org-uoh-conclave',
      clubName: 'UoH E-Cell & Public Policy Society',
      collegeId: 'col-uoh',
      title: 'Deccan Founders, AI Policy & Law Conclave',
      description:
        'Cross-disciplinary forum at University of Hyderabad bringing together student founders, AI researchers, and technology policy fellows on India DPDP governance and deep-tech commercialization.',
      type: 'Meetup',
      startAt: istToUtcIso(2026, 12, 7, 10, 0),
      endAt: istToUtcIso(2026, 12, 7, 17, 0),
      venueName: 'DST Auditorium, University of Hyderabad',
      formattedAddress:
        'University of Hyderabad (Central University), Prof. C.R. Rao Rd, Gachibowli, Hyderabad 500046',
      areaId: 'area-gachibowli',
      lat: 17.4567,
      lng: 78.3264,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 0,
      capacity: 180,
      confirmedCount: 116,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 5, 23, 59),
      regLink: 'https://connectus.in/register/uoh-policy-conclave',
      paymentInfo: {
        accountNote: 'Free entry pass — University of Hyderabad E-Cell & Public Policy Society.',
      },
      teamSize: 'Individual Delegate Pass',
      rules: [
        'Carry college ID card for University of Hyderabad North Gate visitor pass.',
      ],
      prizesAndPerks: [
        'Networking lunch with Hyderabad founders & legal-tech fellows',
        'Delegate participation certificate',
      ],
      prerequisites: ['College Photo ID Card'],
      schedule: [
        {
          dayLabel: 'Conclave Agenda (IST)',
          items: [
            { time: '10:00 AM – 11:30 AM', activity: 'Opening Panel: India AI Governance & DPDP Compliance' },
            { time: '12:00 PM – 02:00 PM', activity: 'Student Founder Fireside & Lunch Mixer' },
            { time: '02:30 PM – 05:00 PM', activity: 'Deep-Tech Commercialization & Policy Roundtable' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Neha Kulkarni',
        role: 'Conclave Convener · UoH',
        email: 'ecell@uohyd.ac.in',
      },
      posterUrl: '/src/assets/images/uoh_conclave_poster_1795301189048.jpg',
      source: 'seeded',
      viewCount: 244,
      status: 'published',
      createdAt: '2026-11-20T13:00:00.000Z',
    },
    {
      id: 'evt-deccan-hack',
      clubId: 'org-osdg',
      clubName: 'Open Source Developers Group (OSDG)',
      collegeId: 'col-iiith',
      title: 'Deccan AI & Systems Hackathon 2026',
      description: '24-hour inter-college build sprint focused on local civic tools, vernacular AI, and edge computing. Mentors from Hyderabad startups.',
      type: 'Hackathon',
      startAt: istToUtcIso(2026, 11, 22, 9, 0),
      endAt: istToUtcIso(2026, 11, 23, 18, 0),
      venueName: 'Himalaya Block Auditorium, IIIT-H',
      formattedAddress: 'IIIT Hyderabad Campus, Professor CR Rao Rd, Gachibowli, Hyderabad 500032 · Main Gate Check-in',
      areaId: 'area-gachibowli',
      lat: 17.4455,
      lng: 78.3489,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 0,
      capacity: 50,
      confirmedCount: 49,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 21, 23, 59),
      regLink: 'https://connectus.in/register/deccan-hack',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeDeccanHackTeamForm/viewform',
      whatsappGroupUrl: 'https://chat.whatsapp.com/DeccanAIHackathon2026',
      telegramGroupUrl: 'https://t.me/osdg_iiith_events',
      paymentInfo: {
        accountNote: 'Zero entry fee — sponsored by IIIT Hyderabad OSDG & Student Council.',
        refundPolicy: 'Free entry; confirm attendance 24h prior or seat passes to waitlist.',
      },
      teamSize: 'Teams of 2–4 members (inter-college teams allowed)',
      rules: [
        'All code and hardware prototypes must be built fresh during the 24-hour hackathon window.',
        'Pre-trained open-weight models and public APIs are allowed if cited in your README.',
        'Every participant must carry a valid physical college ID card for IIIT-H main gate entry.',
        'At least one team member must remain at the assigned desk during midnight mentor check-ins.',
      ],
      prizesAndPerks: [
        '₹75,000 total cash pool across Winner, Runner-Up & Best Civic Impact',
        'Overnight meals, midnight chai/snacks & high-speed campus Wi-Fi',
        'Official IIIT-H participation certificates & OD support letters',
      ],
      prerequisites: [
        'Original College Photo ID Card (mandatory at security gate)',
        'Laptop, charger, and power extension strip',
        'Completed team roster in the Google Form above before deadline',
      ],
      schedule: [
        {
          dayLabel: 'Day 1 – Opening & Sprint',
          items: [
            { time: '09:00 AM – 10:00 AM', activity: 'Gate ID Verification, QR Check-In & Welcome Kit' },
            { time: '10:00 AM – 11:00 AM', activity: 'Problem Statement Release & Mentor Track Briefing' },
            { time: '11:00 AM – 01:30 PM', activity: 'Architecture & Prototype Sprint — Phase 1' },
            { time: '01:30 PM – 02:30 PM', activity: 'Lunch Break at Nilgiri Lawns' },
            { time: '06:00 PM – 07:30 PM', activity: 'First Mentor Check-In & API Clinics' },
          ],
        },
        {
          dayLabel: 'Day 2 – Finals & Demo',
          items: [
            { time: '09:00 AM – 11:30 AM', activity: 'Code Freeze & Final Pitch Deck Submission' },
            { time: '02:00 PM – 05:00 PM', activity: 'Live Jury Demos at Himalaya Block Auditorium' },
            { time: '05:15 PM – 06:00 PM', activity: 'Valedictory & ₹75,000 Prize Distribution' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Rohan Kulkarni',
        role: 'OSDG Lead Coordinator · IIIT Hyderabad',
        phone: '+91 98490 44210',
        email: 'osdg@iiit.ac.in',
      },
      posterUrl: '/src/assets/images/poster_ai_hackathon_1795081969222.jpg',
      promoVideoUrl: '/src/assets/videos/reel_ai_hackathon.mp4',
      promoVideoCaption: '24-hour AI build sprint teaser · ₹75,000 prize pool & IIIT-H mentor lineup',
      source: 'organizer',
      sourceType: 'campus_official',
      viewCount: 842,
      aiConfidence: { title: 0.96, start_datetime_ist: 0.92, venue_name: 0.89 },
      status: 'published',
      createdAt: '2026-11-17T08:00:00.000Z',
    },
    {
      id: 'evt-robotics-rover',
      clubId: 'org-cbit-robo',
      clubName: 'CBIT Robotics & Automation Society',
      collegeId: 'col-cbit',
      title: 'Autonomous Robotics & Drone Bootcamp',
      description: 'Hands-on ROS2, LiDAR sensor fusion, and flight controller workshop. Hardware kits provided in teams of 3.',
      type: 'Workshop',
      startAt: istToUtcIso(2026, 11, 24, 10, 0),
      endAt: istToUtcIso(2026, 11, 24, 17, 0),
      venueName: 'Room 312, Robotics Lab, CBIT',
      formattedAddress: 'CBIT Campus Block C, Kokapet / Gandipet Rd, Hyderabad 500075 · Lab Wing Entrance',
      areaId: 'area-gandipet',
      lat: 17.3918,
      lng: 78.3195,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'ECE', 'Mechanical', 'AI/ML'],
      years: ['2nd Year', '3rd Year', '4th Year'],
      feeInr: 150,
      capacity: 40,
      confirmedCount: 40,
      waitlistCount: 2,
      regDeadline: istToUtcIso(2026, 11, 22, 20, 0),
      regLink: 'https://connectus.in/register/robotics-rover',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeCBITRoboticsPaymentProof/viewform',
      whatsappGroupUrl: 'https://chat.whatsapp.com/CBITRoboticsBootcamp',
      paymentInfo: {
        upiId: 'cbit.robotics@sbi',
        paymentUrl: 'https://payments.cbit.ac.in/robotics-bootcamp',
        accountNote: 'Pay ₹150 per participant directly to CBIT Robotics & Automation Society official college account.',
        refundPolicy: '100% refundable if waitlisted and not promoted; non-refundable once kit is allocated.',
      },
      teamSize: 'Individual registration (grouped into lab teams of 3 on-site)',
      rules: [
        'Handle LiDAR sensors and drone LiPo batteries strictly under lab instructor supervision.',
        'Upload your UPI transaction screenshot / UTR ID in the Google Form to confirm your hardware kit.',
        'Closed-toe shoes are mandatory inside CBIT Robotics Lab.',
      ],
      prizesAndPerks: [
        'Hands-on shared ROS2 & micro-drone kit per 3-member bench',
        'Verified CBIT Technical Workshop Certificate',
        'Afternoon refreshments included',
      ],
      prerequisites: [
        'College ID Card & UPI Payment Screenshot',
        'Laptop with Ubuntu 22.04/24.04 or WSL2 installed',
      ],
      schedule: [
        {
          dayLabel: 'Bootcamp Agenda (IST)',
          items: [
            { time: '10:00 AM – 10:30 AM', activity: 'QR Pass & Payment Verification + Bench Kit Handover' },
            { time: '10:30 AM – 12:45 PM', activity: 'ROS2 Nodes, Topics & LiDAR SLAM Mapping Lab' },
            { time: '01:30 PM – 03:30 PM', activity: 'Flight Controller Tuning & Obstacle Avoidance' },
            { time: '03:30 PM – 05:00 PM', activity: 'Indoor Drone Arena Trials & Certificate Distribution' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Siddharth Varma',
        role: 'Faculty & Lab Coordinator · CBIT',
        phone: '+91 98661 33019',
        email: 'robotics@cbit.ac.in',
      },
      posterUrl: '/src/assets/images/poster_robotics_workshop_1795081969109.jpg',
      promoVideoUrl: '/src/assets/videos/reel_robotics_workshop.mp4',
      promoVideoCaption: 'Inside CBIT Robotics Lab · ROS2 & micro-drone hands-on preview',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-16T11:00:00.000Z',
    },
    {
      id: 'evt-pixelcraft-conclave',
      clubId: 'org-vnr-design',
      clubName: 'VNR Design & Product Guild',
      collegeId: 'col-vnr',
      title: 'PixelCraft UI/UX Product Design Conclave',
      description: 'Full-day portfolio reviews, design systems teardown, and live Figma prototyping sprint with product designers from Madhapur.',
      type: 'Workshop',
      startAt: istToUtcIso(2026, 11, 21, 9, 30),
      endAt: istToUtcIso(2026, 11, 21, 17, 30),
      venueName: 'KS Auditorium, VNR VJIET',
      formattedAddress: 'VNR VJIET Campus, Pragathi Nagar, Nizampet, Bachupally, Hyderabad 500090',
      areaId: 'area-kukatpally',
      lat: 17.5389,
      lng: 78.3863,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 100,
      capacity: 120,
      confirmedCount: 84,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 20, 21, 0),
      regLink: 'https://connectus.in/register/pixelcraft',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeVNRPixelCraftPortfolio/viewform',
      whatsappGroupUrl: 'https://chat.whatsapp.com/VNRPixelCraft2026',
      telegramGroupUrl: 'https://t.me/vnr_design_guild',
      paymentInfo: {
        upiId: 'vnrvjiet.events@icici',
        accountNote: 'Pay ₹100 registration fee to VNR VJIET Student Activity Cell.',
        refundPolicy: 'Fee covers lunch voucher & sprint workbook; transferable to another student.',
      },
      teamSize: 'Solo or Duo (1–2 designers)',
      rules: [
        'Submit your Figma link or Behance portfolio in the Google Form if opting for 1-on-1 mentor review.',
        'All prototyping sprint submissions must be created during the afternoon 3-hour slot.',
        'Bring your own laptop; free guest Wi-Fi credentials will be shared at registration desk.',
      ],
      prizesAndPerks: [
        '₹20,000 design sprint awards + Figma Pro annual vouchers',
        '1-on-1 portfolio critiques with Madhapur product leads',
        'Lunch & evening coffee included',
      ],
      prerequisites: [
        'Valid Student ID & Figma account',
        'Laptop with charger',
      ],
      schedule: [
        {
          dayLabel: 'Conclave Timeline (IST)',
          items: [
            { time: '09:30 AM – 10:15 AM', activity: 'Gate Entry Pass Scan, Badge & Sprint Workbook' },
            { time: '10:15 AM – 12:30 PM', activity: 'Design Systems Teardown & 1-on-1 Portfolio Desk' },
            { time: '01:30 PM – 04:30 PM', activity: 'Live Figma Prototyping Sprint' },
            { time: '04:30 PM – 05:30 PM', activity: 'Design Critique Showcase & Award Ceremony' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Meghana Rao',
        role: 'Design Guild Lead · VNR VJIET',
        phone: '+91 97014 88120',
        email: 'vnrdesignclub@gmail.com',
      },
      posterUrl: '/src/assets/images/poster_design_summit_1795081969848.jpg',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-15T13:00:00.000Z',
    },
    {
      id: 'evt-sankalp-fest',
      clubId: 'org-ou-music',
      clubName: 'OU Cultural & Arts Collective',
      collegeId: 'col-ou',
      title: 'Sankalp Hyderabad Cultural & Music Fest',
      description: 'Three evenings of indie bands, Deccan folk fusion, street theatre, and campus food stalls at the Osmania Arts Lawn.',
      type: 'Cultural',
      startAt: istToUtcIso(2026, 11, 28, 16, 0),
      endAt: istToUtcIso(2026, 11, 30, 22, 0),
      venueName: 'Arts College Lawn, Osmania University',
      formattedAddress: 'Osmania University Arts College Heritage Lawn, Tarnaka, Hyderabad 500007',
      areaId: 'area-tarnaka',
      lat: 17.4190,
      lng: 78.5280,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 0,
      capacity: 400,
      confirmedCount: 276,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 27, 23, 59),
      regLink: 'https://connectus.in/register/sankalp',
      whatsappGroupUrl: 'https://chat.whatsapp.com/OUSankalpFestAudience',
      telegramGroupUrl: 'https://t.me/ou_cultural_sankalp',
      paymentInfo: {
        accountNote: 'Free general audience pass for all college students across India.',
      },
      teamSize: 'Individual entry pass (band/theatre performers register via cultural desk)',
      rules: [
        'Original college ID card + Connectus Entry Pass required at Arts Lawn security gate.',
        'Outside food, glass bottles, and sharp objects are strictly prohibited.',
        'Maintain campus heritage cleanliness around the Arts College building.',
      ],
      prizesAndPerks: [
        'Live pro-night performances across 3 evenings',
        '25+ student food & craft stalls',
      ],
      prerequisites: [
        'Valid College ID Card',
      ],
      schedule: [
        {
          dayLabel: 'Evening Lineup (Days 1–3)',
          items: [
            { time: '04:00 PM – 05:30 PM', activity: 'Gate Entry, Craft Bazaar & Street Theatre Showcase' },
            { time: '06:00 PM – 08:00 PM', activity: 'Inter-College Battle of Bands & Deccan Folk Fusion' },
            { time: '08:15 PM – 10:00 PM', activity: 'Main Stage Pro-Night Headliner Concert' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Karthik Goud',
        role: 'Cultural Council · Osmania University',
        phone: '+91 99482 55091',
        email: 'cultural.council@osmania.ac.in',
      },
      posterUrl: '/src/assets/images/poster_cultural_fest_1795081969484.jpg',
      promoVideoUrl: '/src/assets/videos/reel_cultural_fest.mp4',
      promoVideoCaption: '3 evenings of indie bands, folk fusion & Arts Lawn pro-nights',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-14T15:00:00.000Z',
    },
    {
      id: 'evt-finedge-pitch',
      clubId: 'org-mu-ecell',
      clubName: 'MU E-Cell & FinTech Forum',
      collegeId: 'col-mahindra',
      title: 'FinEdge Startup & Case Pitch Challenge',
      description: 'Solve live UPI merchant credit & micro-insurance cases. Top 6 teams pitch to Hyderabad angel investors.',
      type: 'Competition',
      startAt: istToUtcIso(2026, 12, 3, 10, 0),
      endAt: istToUtcIso(2026, 12, 3, 17, 0),
      venueName: 'E-Cell Seminar Hall, Mahindra University',
      formattedAddress: 'Mahindra University Campus, Bahadurpally, Jeedimetla, Hyderabad 500043',
      areaId: 'area-kukatpally',
      lat: 17.5681,
      lng: 78.4366,
      mode: 'Hybrid',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'MBA/Management', 'IT', 'All'],
      years: ['2nd Year', '3rd Year', '4th Year', 'PG'],
      feeInr: 200,
      capacity: 60,
      confirmedCount: 38,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 30, 18, 0),
      regLink: 'https://connectus.in/register/finedge',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeFinEdgeDeckUpload/viewform',
      whatsappGroupUrl: 'https://chat.whatsapp.com/MUFinedgePitch2026',
      paymentInfo: {
        upiId: 'ecell.mu@hdfcbank',
        paymentUrl: 'https://mahindrauniversity.edu.in/events/finedge-pay',
        accountNote: '₹200 per team (covers up to 3 team members) payable to Mahindra University E-Cell.',
        refundPolicy: 'Non-refundable once case docket is released on 1 Dec.',
      },
      teamSize: 'Teams of 2–3 members',
      rules: [
        'Upload your 5-slide preliminary case deck via the Google Form before 1 Dec, 11:59 PM IST.',
        'Finalists get 7 minutes for pitch + 3 minutes Q&A with the investor jury.',
        'Online participants join via Zoom link shared on the WhatsApp group.',
      ],
      prizesAndPerks: [
        '₹1,00,000 seed grant & cash prizes + T-Hub incubation fast-track',
        'Certificate of Merit for all finalists',
      ],
      prerequisites: [
        'College ID Card & Team Pitch Deck (PDF)',
      ],
      schedule: [
        {
          dayLabel: 'Finals Schedule (IST)',
          items: [
            { time: '10:00 AM – 10:45 AM', activity: 'Registration Check-In & Angel Jury Panel Briefing' },
            { time: '11:00 AM – 01:30 PM', activity: 'Semifinal Case Presentations (Tracks A & B)' },
            { time: '02:30 PM – 04:30 PM', activity: 'Top 6 Grand Finale Pitches & Live Investor Q&A' },
            { time: '04:30 PM – 05:00 PM', activity: 'Seed Grant Awards & Founder Mixer' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Aarav Sharma',
        role: 'E-Cell President · Mahindra University',
        phone: '+91 91210 77832',
        email: 'ecell@mahindrauniversity.edu.in',
      },
      posterUrl: '/src/assets/images/poster_fintech_case_1795081969450.jpg',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-16T09:30:00.000Z',
    },
    {
      id: 'evt-vnr-internal-prep',
      clubId: 'org-vnr-coding',
      clubName: 'VNR Placement & CP Cell',
      collegeId: 'col-vnr',
      title: 'VNR Internal ICPC Mock Contest & Review',
      description: 'Host-college-only 3-hour competitive programming simulation exclusively for verified VNR VJIET students.',
      type: 'Competition',
      startAt: istToUtcIso(2026, 11, 25, 14, 0),
      endAt: istToUtcIso(2026, 11, 25, 17, 30),
      venueName: 'CSE Block Lab 4, VNR VJIET',
      formattedAddress: 'VNR VJIET Campus, CSE Block 2nd Floor, Bachupally, Hyderabad 500090',
      areaId: 'area-kukatpally',
      lat: 17.5389,
      lng: 78.3863,
      mode: 'In-Person',
      audience: 'host_college_only',
      regStatus: 'open',
      branches: ['CSE', 'IT', 'AI/ML'],
      years: ['2nd Year', '3rd Year'],
      feeInr: 0,
      capacity: 90,
      confirmedCount: 62,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 24, 22, 0),
      regLink: 'https://connectus.in/register/vnr-icpc',
      telegramGroupUrl: 'https://t.me/vnrvjiet_cp_cell',
      paymentInfo: {
        accountNote: 'Free for verified VNR VJIET students.',
      },
      teamSize: 'Teams of 3 (ICPC regional format)',
      rules: [
        'Only @vnrvjiet.in verified students are permitted.',
        'One lab workstation per team; printed standard C++/Java reference sheet allowed.',
        'Zero tolerance for AI code assistants or external messaging during the 3-hour contest.',
      ],
      prizesAndPerks: [
        'Official VNR ICPC Regional sponsorship slots for Top 4 teams',
        'Attendance exemption (OD) for afternoon lab hours',
      ],
      prerequisites: [
        'VNR VJIET ID Card & Codeforces Handle',
      ],
      schedule: [
        {
          dayLabel: 'Contest Window (IST)',
          items: [
            { time: '02:00 PM – 02:20 PM', activity: 'Workstation Allotment & QR Check-In at Lab 4' },
            { time: '02:20 PM – 05:20 PM', activity: '3-Hour ICPC Mirror Contest (10 Problems)' },
            { time: '05:20 PM – 05:30 PM', activity: 'Editorial Walkthrough & Top-4 Qualifiers Announcement' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Pranav Teja',
        role: 'CP Cell Coordinator · VNR VJIET',
        phone: '+91 90105 22481',
        email: 'cpcell@vnrvjiet.in',
      },
      posterUrl: '/src/assets/images/poster_ai_hackathon_1795081969222.jpg',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-17T12:00:00.000Z',
    },
    {
      id: 'evt-iiith-systems-talk',
      clubId: 'org-osdg',
      clubName: 'IIIT-H Systems & Distributed Lab',
      collegeId: 'col-iiith',
      title: 'Building Low-Latency Inference in Rust & C++',
      description: 'Evening tech talk and Q&A with IIIT-H researchers on serving multimodal models on college GPU clusters.',
      type: 'Talk',
      startAt: istToUtcIso(2026, 11, 23, 17, 30),
      endAt: istToUtcIso(2026, 11, 23, 19, 30),
      venueName: 'Vindhya C4-101, IIIT Hyderabad',
      formattedAddress: 'Vindhya Academic Wing C4, IIIT Hyderabad, Gachibowli 500032',
      areaId: 'area-gachibowli',
      lat: 17.4455,
      lng: 78.3489,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'AI/ML', 'ECE', 'IT'],
      years: ['All'],
      feeInr: 0,
      capacity: 150,
      confirmedCount: 112,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 23, 15, 0),
      regLink: 'https://connectus.in/register/iiith-rust',
      telegramGroupUrl: 'https://t.me/osdg_iiith_events',
      paymentInfo: {
        accountNote: 'Free open campus seminar hosted by IIIT Hyderabad.',
      },
      teamSize: 'Individual attendance',
      rules: [
        'Arrive 15 minutes before start time for visitor gate clearance at IIIT-H.',
        'Q&A slides and benchmark repo links will be posted in the Telegram group right after the talk.',
      ],
      prizesAndPerks: [
        'Direct networking with IIIT-H Systems Lab researchers',
        'Open-source benchmark repo & slides',
      ],
      prerequisites: [
        'College ID Card',
      ],
      schedule: [
        {
          dayLabel: 'Evening Session (IST)',
          items: [
            { time: '05:30 PM – 05:45 PM', activity: 'Gate Pass Scan & Auditorium Seating' },
            { time: '05:45 PM – 07:00 PM', activity: 'Deep-Dive: Kernel Batching, KV Cache & SIMD in Rust' },
            { time: '07:00 PM – 07:30 PM', activity: 'Open Q&A & Systems Lab Research Internships Mixer' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Rohan Kulkarni',
        role: 'OSDG Coordinator · IIIT Hyderabad',
        email: 'osdg@iiit.ac.in',
      },
      posterUrl: '/src/assets/images/poster_robotics_workshop_1795081969109.jpg',
      source: 'organizer',
      sourceType: 'campus_official',
      viewCount: 394,
      status: 'published',
      createdAt: '2026-11-18T09:00:00.000Z',
    },
    {
      id: 'evt-vasavi-genai',
      clubId: 'org-vce-gdsc',
      clubName: 'Vasavi Developer Student Club',
      collegeId: 'col-vasavi',
      title: 'Full-Stack Web & Cloud Jam: Gachibowli Edition',
      description: 'Saturday hands-on build session covering Postgres row locks, background queues, and serverless functions.',
      type: 'Workshop',
      startAt: istToUtcIso(2026, 11, 29, 10, 0),
      endAt: istToUtcIso(2026, 11, 29, 16, 0),
      venueName: 'Ramanujan Hall, Vasavi College',
      formattedAddress: 'Vasavi College of Engineering, Ibrahimbagh, Hyderabad 500031',
      areaId: 'area-gandipet',
      lat: 17.3806,
      lng: 78.3826,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'IT', 'AI/ML'],
      years: ['1st Year', '2nd Year', '3rd Year'],
      feeInr: 0,
      capacity: 80,
      confirmedCount: 54,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 27, 23, 59),
      regLink: 'https://connectus.in/register/vasavi-jam',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeVasaviCloudJamTrack/viewform',
      whatsappGroupUrl: 'https://chat.whatsapp.com/VasaviCloudJam2026',
      paymentInfo: {
        accountNote: 'Free entry — Vasavi College of Engineering Student Developer Club.',
      },
      teamSize: 'Individual or Pair programming',
      rules: [
        'Fill the Google Form track selector (Backend / Cloud DevOps) before Friday.',
        'Bring a laptop with Node.js 20+ and Docker Desktop pre-installed.',
      ],
      prizesAndPerks: [
        'Cloud sandbox credits & digital completion badge',
        'Free sticker pack & tea break',
      ],
      prerequisites: [
        'College ID Card, Laptop + Charger, Node.js 20+',
      ],
      schedule: [
        {
          dayLabel: 'Saturday Jam Schedule (IST)',
          items: [
            { time: '10:00 AM – 10:30 AM', activity: 'QR Pass Check-In & Local Docker Env Setup' },
            { time: '10:30 AM – 01:00 PM', activity: 'Postgres Row Locks, Transactions & Queue Lab' },
            { time: '02:00 PM – 04:00 PM', activity: 'Deploy Serverless API + Live Stress Benchmark' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Sneha Reddy',
        role: 'DSC Lead · Vasavi College of Engineering',
        phone: '+91 96521 40988',
        email: 'dsc@vce.ac.in',
      },
      posterUrl: '/src/assets/images/poster_design_summit_1795081969848.jpg',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-18T11:00:00.000Z',
    },
    {
      id: 'evt-mjcet-product-meetup',
      clubId: 'org-mjcet-ecell',
      clubName: 'MJCET Innovation Cell',
      collegeId: 'col-mjcet',
      title: 'Hyderabad Student Founders & Builders Meetup',
      description: 'Informal lightning demos and co-founder matching for student builders across Banjara Hills and Madhapur.',
      type: 'Meetup',
      startAt: istToUtcIso(2026, 12, 5, 16, 30),
      endAt: istToUtcIso(2026, 12, 5, 19, 30),
      venueName: 'Ghulam Ahmed Hall, MJCET',
      formattedAddress: 'Muffakham Jah College of Engineering & Technology, Mount Pleasant, Road No 3, Banjara Hills, Hyderabad 500034',
      areaId: 'area-banjara',
      lat: 17.4281,
      lng: 78.4426,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 0,
      capacity: 100,
      confirmedCount: 41,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 4, 21, 0),
      regLink: 'https://connectus.in/register/hyd-founders',
      whatsappGroupUrl: 'https://chat.whatsapp.com/HydStudentBuildersMJCET',
      paymentInfo: {
        accountNote: 'Free open meetup hosted by MJCET Innovation Cell.',
      },
      teamSize: 'Individual registration',
      rules: [
        'Lightning demo slots are strictly 3 minutes per builder — no slide decks, live demos only.',
      ],
      prizesAndPerks: [
        'Co-founder speed matching & founder feedback',
        'Chai & snacks',
      ],
      prerequisites: [
        'College ID Card',
      ],
      schedule: [
        {
          dayLabel: 'Evening Meetup Timeline (IST)',
          items: [
            { time: '04:30 PM – 05:00 PM', activity: 'Entry Pass Check-In & Builder Mixer' },
            { time: '05:00 PM – 06:30 PM', activity: '3-Minute Live Product Lightning Demos (15 Teams)' },
            { time: '06:30 PM – 07:30 PM', activity: 'Co-Founder Speed Matching & Chai Networking' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Zaid Khan',
        role: 'Innovation Cell Lead · MJCET',
        phone: '+91 98485 61209',
        email: 'ecell@mjcollege.ac.in',
      },
      posterUrl: '/src/assets/images/poster_fintech_case_1795081969450.jpg',
      source: 'seeded',
      status: 'published',
      createdAt: '2026-11-18T12:15:00.000Z',
    },
    {
      id: 'evt-jntuh-pending-suggestion',
      clubId: 'org-student-tip',
      clubName: 'JNTUH ACM Student Chapter',
      collegeId: 'col-jntuh',
      title: 'JNTUH Cybersecurity & CTF Weekend',
      description: 'Student-suggested event: 12-hour beginner-friendly Capture The Flag covering web, crypto, and OSINT.',
      type: 'Hackathon',
      startAt: istToUtcIso(2026, 12, 6, 9, 0),
      endAt: istToUtcIso(2026, 12, 6, 21, 0),
      venueName: 'SIT Seminar Hall, JNTUH Kukatpally',
      areaId: 'area-kukatpally',
      lat: 17.4933,
      lng: 78.3914,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'IT', 'AI/ML'],
      years: ['All'],
      feeInr: 50,
      capacity: 100,
      confirmedCount: 0,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 4, 23, 59),
      regLink: 'https://connectus.in/register/jntuh-ctf',
      googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeJNTUHCTFReg/viewform',
      telegramGroupUrl: 'https://t.me/jntuh_acm_ctf',
      paymentInfo: {
        upiId: 'jntuh.acm@sbi',
        accountNote: '₹50 per participant payable to JNTUH ACM Student Chapter.',
      },
      teamSize: 'Teams of 1–3',
      rules: [
        'Attacking competition infrastructure or sharing flags between teams leads to instant disqualification.',
      ],
      prizesAndPerks: [
        '₹25,000 CTF prize pool + TryHackMe vouchers',
      ],
      prerequisites: [
        'College ID Card & Laptop',
      ],
      posterUrl: '/src/assets/images/poster_ai_hackathon_1795081969222.jpg',
      source: 'student_suggested',
      sourceType: 'student_suggested',
      status: 'pending_review',
      createdAt: '2026-11-19T06:30:00.000Z',
    },
    {
      id: 'evt-iiith-club-pending',
      clubId: 'org-iiith-acm-cl',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      collegeId: 'col-iiith',
      title: 'IIIT-H Systems & Robotics Paper Reading Jam',
      description: 'Weekly peer-led paper breakdown and autonomous navigation code walkthrough submitted by ACM Student Chapter for Campus Official review.',
      type: 'Workshop',
      startAt: istToUtcIso(2026, 12, 7, 17, 0),
      endAt: istToUtcIso(2026, 12, 7, 19, 0),
      venueName: 'Nilgiri 204, IIIT Hyderabad',
      areaId: 'area-gachibowli',
      lat: 17.4455,
      lng: 78.3489,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'AI/ML', 'ECE'],
      years: ['All'],
      feeInr: 0,
      capacity: 60,
      confirmedCount: 0,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 6, 22, 0),
      regLink: 'https://connectus.in/register/iiith-acm-jam',
      teamSize: 'Individual or Pair',
      coordinatorContact: {
        name: 'Niharika Verma',
        role: 'Club President · IIIT-H ACM',
        email: 'acm.chapter@iiit.ac.in',
      },
      posterUrl: '/src/assets/images/poster_robotics_workshop_1795081969109.jpg',
      source: 'organizer',
      sourceType: 'club_approved',
      submittedById: 'org-iiith-acm-cl',
      submittedByName: 'Niharika Verma',
      approvalHistory: [
        {
          id: 'hist-club-sub-1',
          reviewerId: 'org-iiith-acm-cl',
          reviewerName: 'Niharika Verma',
          reviewerRole: 'club_leader',
          decision: 'submitted',
          note: 'Submitted club workshop draft with Nilgiri 204 venue confirmation.',
          createdAt: '2026-11-19T10:15:00.000Z',
        },
      ],
      status: 'pending_review',
      createdAt: '2026-11-19T10:15:00.000Z',
    },
    {
      id: 'evt-thub-external-sprint',
      clubId: 'org-thub-external',
      clubName: 'T-Hub Campus Innovation Lab',
      collegeId: 'col-iiith',
      title: 'T-Hub Student AI Founders & SaaS Build Weekend',
      description: 'Verified external partner build weekend open to students across Hyderabad campuses. Ship a live SaaS MVP with T-Hub mentors and pitch for ₹1,00,000 cloud & pilot credits.',
      type: 'Hackathon',
      startAt: istToUtcIso(2026, 12, 8, 9, 30),
      endAt: istToUtcIso(2026, 12, 9, 18, 0),
      venueName: 'T-Hub Phase 2 Atrium, Raidurgam',
      formattedAddress: 'Plot No 1/C, Sy No 83/1, Raidurgam Panmaktha, Knowledge City, Madhapur, Hyderabad 500081',
      areaId: 'area-madhapur',
      lat: 17.4348,
      lng: 78.3806,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 0,
      capacity: 160,
      confirmedCount: 92,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 6, 23, 59),
      regLink: 'https://connectus.in/register/thub-saas-sprint',
      teamSize: 'Teams of 2–4 members',
      rules: [
        'Carry your valid college photo ID card for T-Hub Phase 2 visitor badge issuance.',
        'External Organizer event verified for Hyderabad student ecosystem.',
      ],
      prizesAndPerks: [
        '₹1,00,000 Cloud & Pilot Credits + T-Hub Student Demo Day shortlist',
      ],
      prerequisites: [
        'College Photo ID Card & Laptop + Charger',
        'QR Entry Pass for T-Hub Lobby Security',
      ],
      schedule: [
        {
          dayLabel: 'Day 1 – Ideation & Build',
          items: [
            { time: '09:30 AM – 10:30 AM', activity: 'T-Hub Atrium QR Check-In & Visitor Badge Desk' },
            { time: '10:30 AM – 01:00 PM', activity: 'SaaS Problem Framing & Mentor Office Hours' },
            { time: '02:00 PM – 06:30 PM', activity: 'Core MVP Build & API Integration' },
          ],
        },
        {
          dayLabel: 'Day 2 – Demo Day',
          items: [
            { time: '10:00 AM – 02:00 PM', activity: 'Product Polish & Pitch Readiness Review' },
            { time: '03:00 PM – 06:00 PM', activity: 'T-Hub Partner Jury Demos & Grant Awards' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Vikramaditya Rao',
        role: 'Ecosystem Partner Lead · T-Hub Foundation',
        email: 'campus.programs@t-hub.co',
      },
      posterUrl: '/src/assets/images/poster_ai_hackathon_1795081969222.jpg',
      source: 'organizer',
      sourceType: 'external_verified',
      isSponsored: true,
      sponsorLabel: 'Sponsored · T-Hub Campus Partner',
      submittedById: 'org-thub-external',
      submittedByName: 'Vikramaditya Rao',
      viewCount: 518,
      status: 'published',
      createdAt: '2026-11-18T15:00:00.000Z',
    },
    {
      id: 'evt-iiith-techclub-sprint',
      clubId: 'org-club-vinay',
      clubName: 'IIIT-H Tech & Innovation Club',
      collegeId: 'col-iiith',
      title: 'IIIT-H Edge-AI & Embedded Build Sprint',
      description: 'Saturday evening hardware-meets-LLM build jam for IIIT-H & Hyderabad students using quantized on-device models and Jetson/Raspberry Pi kits.',
      type: 'Hackathon',
      startAt: istToUtcIso(2026, 12, 4, 15, 0),
      endAt: istToUtcIso(2026, 12, 4, 21, 0),
      venueName: 'Vindhya A3-204, IIIT Hyderabad',
      formattedAddress: 'Vindhya Block A3, IIIT Hyderabad Campus, Gachibowli 500032',
      areaId: 'area-gachibowli',
      lat: 17.4455,
      lng: 78.3489,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['CSE', 'AI/ML', 'ECE', 'IT'],
      years: ['All'],
      feeInr: 0,
      capacity: 65,
      confirmedCount: 44,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 3, 23, 59),
      regLink: 'https://connectus.in/register/iiith-edge-ai',
      teamSize: 'Teams of 2–3',
      prerequisites: [
        'College ID Card & Laptop with Python 3.10+',
      ],
      schedule: [
        {
          dayLabel: 'Evening Sprint Schedule (IST)',
          items: [
            { time: '03:00 PM – 03:30 PM', activity: 'QR Check-In & Jetson / Raspberry Pi Kit Allocation' },
            { time: '03:30 PM – 07:30 PM', activity: 'Quantized Edge-LLM Build Jam' },
            { time: '07:30 PM – 09:00 PM', activity: 'Live Latency Benchmarks & Showcase' },
          ],
        },
      ],
      coordinatorContact: {
        name: 'Vinay Chandra',
        role: 'Club Leader · IIIT-H Tech & Innovation Club',
        email: 'janumpallyvinaychandra@gmail.com',
      },
      posterUrl: '/src/assets/images/poster_robotics_workshop_1795081969109.jpg',
      source: 'organizer',
      sourceType: 'club_approved',
      submittedById: 'org-club-vinay',
      submittedByName: 'Vinay Chandra',
      viewCount: 215,
      revisionPendingReview: true,
      pendingRevision: {
        venueName: 'KCIS Seminar Hall, IIIT Hyderabad',
        capacity: 90,
        description: 'Saturday evening hardware-meets-LLM build jam expanded to KCIS Seminar Hall with 25 additional Jetson Nano & Raspberry Pi 5 kits.',
        submittedById: 'org-club-vinay',
        submittedByName: 'Vinay Chandra',
        submittedAt: '2026-11-20T14:10:00.000Z',
        changedFields: ['venueName', 'capacity', 'description'],
      },
      approvalHistory: [
        {
          id: 'hist-techclub-rev',
          reviewerId: 'org-club-vinay',
          reviewerName: 'Vinay Chandra',
          reviewerRole: 'club_leader',
          decision: 'revision_submitted',
          note: 'Requested upgrade from Vindhya A3-204 (65 seats) to KCIS Seminar Hall (90 seats) due to waitlist demand.',
          changedFields: ['venueName', 'capacity', 'description'],
          createdAt: '2026-11-20T14:10:00.000Z',
        },
        {
          id: 'hist-techclub-app',
          reviewerId: 'org-official-nvipuj',
          reviewerName: 'Vipuj N (Campus Official)',
          reviewerRole: 'college_official',
          decision: 'approved',
          note: 'Initial club sprint approved for campus calendar.',
          createdAt: '2026-11-17T10:30:00.000Z',
        },
      ],
      status: 'published',
      createdAt: '2026-11-16T10:00:00.000Z',
    },
    {
      id: 'evt-iiith-design-jam',
      clubId: 'org-club-vinay',
      clubName: 'IIIT-H Tech & Innovation Club',
      collegeId: 'col-iiith',
      title: 'IIIT-H Civic UX & Service Design Jam',
      description: 'Interactive Figma + field-research sprint redesigning Hyderabad metro feeder signage and college campus accessibility.',
      type: 'Competition',
      startAt: istToUtcIso(2026, 12, 12, 10, 0),
      endAt: istToUtcIso(2026, 12, 12, 17, 0),
      venueName: 'Himalaya 105 Studio, IIIT Hyderabad',
      areaId: 'area-gachibowli',
      lat: 17.4455,
      lng: 78.3489,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'open',
      branches: ['All'],
      years: ['All'],
      feeInr: 100,
      capacity: 80,
      confirmedCount: 0,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 12, 10, 23, 59),
      regLink: 'https://connectus.in/register/iiith-civic-ux',
      teamSize: 'Teams of 2–3',
      coordinatorContact: {
        name: 'Vinay Chandra',
        role: 'Club Leader · IIIT-H Tech & Innovation Club',
        email: 'janumpallyvinaychandra@gmail.com',
      },
      posterUrl: '/src/assets/images/poster_design_summit_1795081969848.jpg',
      source: 'organizer',
      sourceType: 'club_approved',
      submittedById: 'org-club-vinay',
      submittedByName: 'Vinay Chandra',
      submissionFeedback:
        'Please attach Himalaya 105 slot confirmation and specify whether external visitor seats are capped at 25 before publishing.',
      approvalHistory: [
        {
          id: 'hist-design-ret',
          reviewerId: 'org-official-nvipuj',
          reviewerName: 'Vipuj N (Campus Official)',
          reviewerRole: 'college_official',
          decision: 'changes_requested',
          note: 'Please attach Himalaya 105 slot confirmation and specify whether external visitor seats are capped at 25 before publishing.',
          createdAt: '2026-11-19T16:40:00.000Z',
        },
      ],
      status: 'changes_requested',
      createdAt: '2026-11-18T11:00:00.000Z',
    },
    {
      id: 'evt-iiith-orientation-bootcamp',
      clubId: 'org-iiith-acm-cl',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      collegeId: 'col-iiith',
      title: 'IIIT-H Open-Source & Linux Winter Workshop',
      description: 'Hands-on Git workflows, kernel basics, container debugging, and first PR mentoring session across 3 parallel lab tracks.',
      type: 'Workshop',
      startAt: istToUtcIso(2026, 11, 15, 10, 0),
      endAt: istToUtcIso(2026, 11, 15, 16, 30),
      venueName: 'Nilgiri Labs 1 & 2, IIIT Hyderabad',
      areaId: 'area-gachibowli',
      lat: 17.4455,
      lng: 78.3489,
      mode: 'In-Person',
      audience: 'open_to_all',
      regStatus: 'closed',
      branches: ['All'],
      years: ['All'],
      feeInr: 100,
      capacity: 150,
      confirmedCount: 146,
      waitlistCount: 0,
      regDeadline: istToUtcIso(2026, 11, 14, 21, 0),
      regLink: 'https://connectus.in/register/iiith-linux-winter',
      teamSize: 'Individual hands-on lab',
      paymentInfo: {
        upiId: 'iiith.acm@sbi',
        accountNote: '₹100 refundable lab kit deposit.',
      },
      coordinatorContact: {
        name: 'Niharika Verma',
        role: 'Club President · IIIT-H ACM',
        email: 'acm.chapter@iiit.ac.in',
      },
      posterUrl: '/src/assets/images/poster_fintech_case_1795081969450.jpg',
      source: 'organizer',
      sourceType: 'club_approved',
      submittedById: 'org-iiith-acm-cl',
      submittedByName: 'Niharika Verma',
      viewCount: 640,
      status: 'published',
      createdAt: '2026-11-10T09:00:00.000Z',
    },
  ];

  const registrations: Registration[] = [
    {
      id: 'reg-seed-1',
      eventId: 'evt-robotics-rover',
      userId: 'stu-kiran',
      userName: 'Kiran Sai (Waitlist #1)',
      collegeShortName: 'IIIT-H',
      passCode: 'CP-ROBO-WL0001',
      qrPayload: 'CAMPUSPULSE:V1:evt-robotics-rover:reg-seed-1:CP-ROBO-WL0001',
      paymentStatus: 'pending_verification',
      amountPaidInr: 0,
      status: 'waitlisted',
      createdAt: '2026-11-18T10:00:00.000Z',
    },
    {
      id: 'reg-seed-2',
      eventId: 'evt-robotics-rover',
      userId: 'stu-divya',
      userName: 'Divya Menon (Waitlist #2)',
      collegeShortName: 'CBIT',
      passCode: 'CP-ROBO-WL0002',
      qrPayload: 'CAMPUSPULSE:V1:evt-robotics-rover:reg-seed-2:CP-ROBO-WL0002',
      paymentStatus: 'pending_verification',
      amountPaidInr: 0,
      status: 'waitlisted',
      createdAt: '2026-11-18T11:00:00.000Z',
    },
    {
      id: 'reg-seed-3',
      eventId: 'evt-deccan-hack',
      userId: 'stu-kiran',
      userName: 'Kiran Deshmukh',
      userEmail: 'kiran.d@iiit.ac.in',
      userPhone: '+91 90001 44556',
      collegeShortName: 'IIIT-H',
      passCode: 'CP-DECCAN-84K2M1',
      qrPayload: 'CAMPUSPULSE:V1:evt-deccan-hack:reg-seed-3:CP-DECCAN-84K2M1',
      paymentStatus: 'free',
      amountPaidInr: 0,
      paymentMethod: 'Free Pass',
      teamName: 'Team Deccan Builders',
      status: 'confirmed',
      createdAt: '2026-11-18T12:30:00.000Z',
    },
    {
      id: 'reg-seed-4',
      eventId: 'evt-finedge-pitch',
      userId: 'stu-riya',
      userName: 'Riya Sharma',
      userEmail: 'riya.sharma@mahindrauniversity.edu.in',
      userPhone: '+91 98112 33094',
      collegeShortName: 'MU',
      passCode: 'CP-FINEDG-59P4X2',
      qrPayload: 'CAMPUSPULSE:V1:evt-finedge-pitch:reg-seed-4:CP-FINEDG-59P4X2',
      paymentStatus: 'paid_verified',
      amountPaidInr: 200,
      paymentMethod: 'UPI',
      paymentRef: 'UTR432198765401',
      teamName: 'FinStack Trio',
      status: 'confirmed',
      createdAt: '2026-11-18T14:00:00.000Z',
    },
    {
      id: 'reg-seed-5',
      eventId: 'evt-deccan-hack',
      userId: 'stu-sana',
      userName: 'Sana Fatima',
      userEmail: 'sana.f@cbit.ac.in',
      userPhone: '+91 98482 11092',
      collegeShortName: 'CBIT',
      passCode: 'CP-DECCAN-92J7R4',
      qrPayload: 'CAMPUSPULSE:V1:evt-deccan-hack:reg-seed-5:CP-DECCAN-92J7R4',
      paymentStatus: 'free',
      amountPaidInr: 0,
      paymentMethod: 'Free Pass',
      teamName: 'Deccan UI Guild',
      status: 'checked_in',
      checkedInAt: '2026-11-20T09:12:00.000Z',
      createdAt: '2026-11-18T13:45:00.000Z',
    },
    {
      id: 'reg-seed-6',
      eventId: 'evt-iiith-systems-talk',
      userId: 'stu-kiran',
      userName: 'Kiran Deshmukh',
      userEmail: 'kiran.d@iiit.ac.in',
      collegeShortName: 'IIIT-H',
      passCode: 'CP-RUST-31V8T2',
      qrPayload: 'CAMPUSPULSE:V1:evt-iiith-systems-talk:reg-seed-6:CP-RUST-31V8T2',
      paymentStatus: 'free',
      amountPaidInr: 0,
      paymentMethod: 'Free Pass',
      status: 'checked_in',
      checkedInAt: '2026-11-20T17:05:00.000Z',
      createdAt: '2026-11-18T15:10:00.000Z',
    },
    {
      id: 'reg-seed-7',
      eventId: 'evt-iiith-orientation-bootcamp',
      userId: 'stu-kiran',
      userName: 'Kiran Deshmukh',
      userEmail: 'kiran.d@iiit.ac.in',
      collegeShortName: 'IIIT-H',
      passCode: 'CP-LINUX-77M2Q9',
      qrPayload: 'CAMPUSPULSE:V1:evt-iiith-orientation-bootcamp:reg-seed-7:CP-LINUX-77M2Q9',
      paymentStatus: 'paid_verified',
      amountPaidInr: 100,
      paymentMethod: 'UPI',
      paymentRef: 'UTR609184420112',
      status: 'checked_in',
      checkedInAt: '2026-11-15T04:15:00.000Z',
      createdAt: '2026-11-12T10:30:00.000Z',
    },
    {
      id: 'reg-seed-8',
      eventId: 'evt-iiith-orientation-bootcamp',
      userId: 'stu-arjun',
      userName: 'Arjun Nair',
      userEmail: 'arjun.nair@vnrvjiet.in',
      collegeShortName: 'VNR VJIET',
      passCode: 'CP-LINUX-48N6K5',
      qrPayload: 'CAMPUSPULSE:V1:evt-iiith-orientation-bootcamp:reg-seed-8:CP-LINUX-48N6K5',
      paymentStatus: 'pending_verification',
      amountPaidInr: 100,
      paymentMethod: 'UPI',
      paymentRef: 'UTR609199015524',
      status: 'confirmed',
      createdAt: '2026-11-14T16:20:00.000Z',
    },
    {
      id: 'reg-seed-9',
      eventId: 'evt-iiith-techclub-sprint',
      userId: 'stu-ananya',
      userName: 'Ananya Rao',
      userEmail: 'ananya.rao@iiit.ac.in',
      collegeShortName: 'IIIT-H',
      passCode: 'CP-EDGEAI-19W4C8',
      qrPayload: 'CAMPUSPULSE:V1:evt-iiith-techclub-sprint:reg-seed-9:CP-EDGEAI-19W4C8',
      paymentStatus: 'free',
      amountPaidInr: 0,
      paymentMethod: 'Free Pass',
      teamName: 'EdgePulse Trio',
      status: 'confirmed',
      createdAt: '2026-11-19T14:40:00.000Z',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-welcome',
      userId: 'stu-ananya',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      kind: 'followed_college',
      channel: 'telegram',
      title: 'New from IIIT Hyderabad (Followed)',
      body: 'Deccan AI & Systems Hackathon 2026 · 22 Nov, 09:00 AM IST · Himalaya Block Auditorium, IIIT-H · Open to All · Closes 21 Nov',
      sendAfter: '2026-11-19T03:00:00.000Z',
      sentAt: '2026-11-19T03:00:05.000Z',
      status: 'sent',
      dedupeKey: 'followed_college:stu-ananya:evt-deccan-hack',
    },
  ];

  const reports: EventReport[] = [
    {
      id: 'rep-1',
      eventId: 'evt-finedge-pitch',
      eventTitle: 'FinEdge Startup & Case Pitch Challenge',
      reporterName: 'Arjun N. (Student)',
      reason: 'Poster says fee is ₹200 per team, listing shows ₹200 per person — needs clarification.',
      status: 'open',
      createdAt: '2026-11-18T18:10:00.000Z',
    },
  ];

  const auditLog: AuditLogEntry[] = [
    {
      id: 'aud-1',
      actor: 'Admin (Connectus)',
      action: 'APPROVED_ORGANIZER',
      target: 'Open Source Developers Group (IIIT-H)',
      createdAt: '2026-11-10T09:15:00.000Z',
    },
    {
      id: 'aud-2',
      actor: 'Admin (Connectus)',
      action: 'APPROVED_ORGANIZER',
      target: 'CBIT Robotics & Automation Society',
      createdAt: '2026-11-12T10:45:00.000Z',
    },
  ];

  const partnerPosts: PartnerPost[] = [
    {
      id: 'pp-1',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      eventType: 'Hackathon',
      userId: 'stu-kiran',
      userName: 'Kiran Deshmukh',
      collegeId: 'col-iiith',
      collegeShortName: 'IIIT-H',
      branch: 'CSE',
      year: '3rd Year',
      skills: ['AI / ML', 'Backend & Cloud'],
      roleSkill: 'Backend & FastAPI / ML',
      lookingFor: 'Frontend (React) + UI/UX designer',
      teamSlotsNeeded: 2,
      note: 'Building an edge-AI transit & campus safety tool. Already have RAG pipeline ready—need 2 teammates to form a 4-person squad.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-18T11:30:00.000Z',
    },
    {
      id: 'pp-2',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      eventType: 'Hackathon',
      userId: 'stu-sana',
      userName: 'Sana Fatima',
      collegeId: 'col-cbit',
      collegeShortName: 'CBIT',
      branch: 'AI/ML',
      year: '2nd Year',
      skills: ['UI/UX Design', 'React & Frontend'],
      roleSkill: 'UI/UX Figma + React Tailwind',
      lookingFor: 'Backend / AI engineer',
      teamSlotsNeeded: 2,
      note: 'Can handle full prototype, design system, and pitch deck. Happy to connect 1-on-1 first and move to a WhatsApp group once we confirm.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-18T14:15:00.000Z',
    },
    {
      id: 'pp-3',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      eventType: 'Hackathon',
      userId: 'stu-arjun',
      userName: 'Arjun Nair',
      collegeId: 'col-vnr',
      collegeShortName: 'VNR VJIET',
      branch: 'IT',
      year: '3rd Year',
      skills: ['Full-Stack Web', 'Backend & Cloud'],
      roleSkill: 'Full-Stack TypeScript & Cloud',
      lookingFor: '1 ML dev & 1 presenter',
      teamSlotsNeeded: 2,
      note: 'Same campus commute from Kukatpally/Gachibowli. Looking for dedicated teammates for the full 24-hour sprint.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-18T17:40:00.000Z',
    },
    {
      id: 'pp-4',
      eventId: 'evt-robotics-rover',
      eventTitle: 'Autonomous Robotics & Drone Bootcamp',
      eventType: 'Workshop',
      userId: 'stu-meera',
      userName: 'Meera Iyer',
      collegeId: 'col-cbit',
      collegeShortName: 'CBIT',
      branch: 'ECE',
      year: '2nd Year',
      skills: ['Robotics & IoT'],
      roleSkill: 'Arduino / STM32 & Sensors',
      lookingFor: '1 lab partner (ROS2 / Python)',
      teamSlotsNeeded: 1,
      note: 'Looking for 1 partner to share the rover kit and split the ₹150 workshop registration.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-18T12:10:00.000Z',
    },
    {
      id: 'pp-5',
      eventId: 'evt-iqx24-hackathon',
      eventTitle: 'IQX24 — National Level 24H Hackathon',
      eventType: 'Hackathon',
      userId: 'stu-dev',
      userName: 'Devansh Patel',
      collegeId: 'col-mrdu',
      collegeShortName: 'MRDU',
      branch: 'CSE',
      year: '3rd Year',
      skills: ['AI / ML', 'Full-Stack Web'],
      roleSkill: 'Python, AI Agents & Next.js',
      lookingFor: 'UI/UX Designer + Pitch Lead',
      teamSlotsNeeded: 2,
      note: 'Already on campus at MRDU Block 11. Want 2 focused builders for the 24-hour sprint.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-18T15:05:00.000Z',
    },
    {
      id: 'pp-6',
      eventId: 'evt-finedge-pitch',
      eventTitle: 'FinEdge Startup & Case Pitch Challenge',
      eventType: 'Competition',
      userId: 'stu-riya',
      userName: 'Riya Sharma',
      collegeId: 'col-mahindra',
      collegeShortName: 'MU',
      branch: 'Management',
      year: '3rd Year',
      skills: ['FinTech & Startup Pitch'],
      roleSkill: 'Financial Modeling & Pitching',
      lookingFor: 'Tech co-builder + Product analyst',
      teamSlotsNeeded: 2,
      note: 'Need 2 teammates (tech + strategy) for a 3-person UPI credit-scoring fintech case.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-18T16:20:00.000Z',
    },
    {
      id: 'pp-7',
      eventId: 'evt-pixelcraft-conclave',
      eventTitle: 'PixelCraft UI/UX Product Design Conclave',
      eventType: 'Workshop',
      userId: 'stu-tanvi',
      userName: 'Tanvi Joshi',
      collegeId: 'col-vnr',
      collegeShortName: 'VNR VJIET',
      branch: 'Design',
      year: '2nd Year',
      skills: ['UI/UX Design', 'Product Design'],
      roleSkill: 'Figma & Motion Prototyping',
      lookingFor: '1 Frontend/Design buddy',
      teamSlotsNeeded: 1,
      note: 'Heading to PixelCraft Conclave—let’s pair up for the afternoon design prototyping sprint.',
      whatsappReady: false,
      discoveryEnabled: true,
      createdAt: '2026-11-18T18:10:00.000Z',
    },
    {
      id: 'pp-8',
      eventId: 'evt-sankalp-fest',
      eventTitle: 'Sankalp Hyderabad Cultural & Music Fest',
      eventType: 'Cultural',
      userId: 'stu-kabir',
      userName: 'Kabir Verma',
      collegeId: 'col-ou',
      collegeShortName: 'OUCE',
      branch: 'Mechanical',
      year: '3rd Year',
      skills: ['Cultural, Music & Arts'],
      roleSkill: 'Acoustic Guitar & Stage Crew',
      lookingFor: '2 band / festival squad mates',
      teamSlotsNeeded: 2,
      note: 'Looking for a vocalist/keyboardist or fest buddies heading to OU Arts Lawn.',
      whatsappReady: true,
      discoveryEnabled: true,
      createdAt: '2026-11-19T06:30:00.000Z',
    },
  ];

  const squads: Squad[] = [
    {
      id: 'sq-deccan-builders',
      name: 'Deccan Builders',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      eventType: 'Hackathon',
      ownerId: 'stu-kiran',
      targetSize: 4,
      requiredRoles: ['UI/UX Design'],
      recruitmentStatus: 'open',
      isLocked: false,
      memberIds: ['stu-kiran', 'stu-arjun', 'stu-sana'],
      members: [
        {
          userId: 'stu-kiran',
          name: 'Kiran Deshmukh',
          collegeShortName: 'IIIT-H',
          branch: 'CSE',
          year: '3rd Year',
          roleSkill: 'Backend & FastAPI / ML',
          role: 'owner',
          joinedAt: '2026-11-18T13:00:00.000Z',
        },
        {
          userId: 'stu-arjun',
          name: 'Arjun Nair',
          collegeShortName: 'VNR VJIET',
          branch: 'IT',
          year: '3rd Year',
          roleSkill: 'Full-Stack TypeScript & Cloud',
          role: 'member',
          joinedAt: '2026-11-18T15:00:00.000Z',
        },
        {
          userId: 'stu-sana',
          name: 'Sana Fatima',
          collegeShortName: 'CBIT',
          branch: 'AI/ML',
          year: '2nd Year',
          roleSkill: 'React Tailwind & API Integration',
          role: 'member',
          joinedAt: '2026-11-18T16:10:00.000Z',
        },
      ],
      createdAt: '2026-11-18T13:00:00.000Z',
      updatedAt: '2026-11-18T16:10:00.000Z',
    },
    {
      id: 'sq-iqx24-ignite',
      name: 'Ignite MRDU',
      eventId: 'evt-iqx24-hackathon',
      eventTitle: 'IQX24 — National Level 24H Hackathon',
      eventType: 'Hackathon',
      ownerId: 'stu-dev',
      targetSize: 4,
      requiredRoles: ['UI/UX Design', 'Backend & Cloud'],
      recruitmentStatus: 'open',
      isLocked: false,
      memberIds: ['stu-dev', 'stu-tanvi'],
      members: [
        {
          userId: 'stu-dev',
          name: 'Devansh Patel',
          collegeShortName: 'MRDU',
          branch: 'CSE',
          year: '3rd Year',
          roleSkill: 'Python, AI Agents & Next.js',
          role: 'owner',
          joinedAt: '2026-11-19T08:00:00.000Z',
        },
        {
          userId: 'stu-tanvi',
          name: 'Tanvi Joshi',
          collegeShortName: 'VNR VJIET',
          branch: 'Design',
          year: '2nd Year',
          roleSkill: 'Figma & Motion Prototyping',
          role: 'member',
          joinedAt: '2026-11-19T09:15:00.000Z',
        },
      ],
      createdAt: '2026-11-19T08:00:00.000Z',
      updatedAt: '2026-11-19T09:15:00.000Z',
    },
    {
      id: 'sq-finedge-alpha',
      name: 'FinStack Trio',
      eventId: 'evt-finedge-pitch',
      eventTitle: 'FinEdge Startup & Case Pitch Challenge',
      eventType: 'Competition',
      ownerId: 'stu-riya',
      targetSize: 3,
      requiredRoles: ['Full-Stack Web'],
      recruitmentStatus: 'open',
      isLocked: false,
      memberIds: ['stu-riya', 'stu-meera'],
      members: [
        {
          userId: 'stu-riya',
          name: 'Riya Sharma',
          collegeShortName: 'MU',
          branch: 'Management',
          year: '3rd Year',
          roleSkill: 'Financial Modeling & Pitching',
          role: 'owner',
          joinedAt: '2026-11-18T17:00:00.000Z',
        },
        {
          userId: 'stu-meera',
          name: 'Meera Iyer',
          collegeShortName: 'CBIT',
          branch: 'ECE',
          year: '2nd Year',
          roleSkill: 'Product Research & Analytics',
          role: 'member',
          joinedAt: '2026-11-18T18:00:00.000Z',
        },
      ],
      createdAt: '2026-11-18T17:00:00.000Z',
      updatedAt: '2026-11-18T18:00:00.000Z',
    },
  ];

  const chatMessages: TeamChatMessage[] = [
    {
      id: 'msg-seed-sq1',
      roomId: 'sq-deccan-builders',
      roomScope: 'squad',
      senderId: 'system',
      senderName: 'Connectus',
      kind: 'system',
      body: 'Squad "Deccan Builders" created for Deccan AI & Systems Hackathon 2026 (Looking for: UI/UX Design).',
      createdAt: '2026-11-18T13:00:00.000Z',
    },
    {
      id: 'msg-seed-sq2',
      roomId: 'sq-deccan-builders',
      roomScope: 'squad',
      senderId: 'stu-kiran',
      senderName: 'Kiran Deshmukh',
      kind: 'text',
      body: 'Welcome aboard! Once we get our 4th designer seat filled, let’s lock the team and register together.',
      createdAt: '2026-11-18T16:15:00.000Z',
    },
  ];

  const eventFeedback: EventFeedback[] = [
    {
      id: 'fb-iiith-1',
      eventId: 'evt-iiith-orientation-bootcamp',
      eventTitle: 'IIIT-H Open-Source & Linux Winter Workshop',
      eventType: 'Workshop',
      collegeId: 'col-iiith',
      clubId: 'org-iiith-acm-cl',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      userId: 'stu-kiran',
      authorName: 'Kiran Deshmukh',
      isAnonymous: false,
      rating: 5,
      requestedCategory: 'Systems & Kernel Labs',
      comment: 'Mentors debugged every single Docker and git-rebase issue patiently. Best hands-on lab session this semester.',
      suggestion: 'Upload starter VM images a day earlier so hostel Wi-Fi stays fast during lab kickoff.',
      createdAt: '2026-11-15T17:15:00.000Z',
    },
    {
      id: 'fb-iiith-2',
      eventId: 'evt-iiith-orientation-bootcamp',
      eventTitle: 'IIIT-H Open-Source & Linux Winter Workshop',
      eventType: 'Workshop',
      collegeId: 'col-iiith',
      clubId: 'org-iiith-acm-cl',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      userId: 'stu-anon-1',
      authorName: 'Anonymous Student',
      isAnonymous: true,
      rating: 4,
      requestedCategory: 'Cloud & Kubernetes',
      comment: 'Great terminal cheatsheets and first-PR walkthroughs.',
      complaint: 'Projector contrast in Nilgiri Lab 2 was dim for students seated in the back three rows.',
      suggestion: 'Share live terminal mirror links over local campus LAN during workshops.',
      createdAt: '2026-11-15T18:40:00.000Z',
    },
    {
      id: 'fb-iiith-3',
      eventId: 'evt-iiith-orientation-bootcamp',
      eventTitle: 'IIIT-H Open-Source & Linux Winter Workshop',
      eventType: 'Workshop',
      collegeId: 'col-iiith',
      clubId: 'org-iiith-acm-cl',
      clubName: 'IIIT-H ACM & Robotics Student Chapter',
      userId: 'stu-arjun',
      authorName: 'Arjun Nair',
      isAnonymous: false,
      rating: 3,
      comment: 'Content was solid once started, but external college participants waited 25 minutes at the main security gate.',
      complaint: 'Visitor gate QR list reached security 15 minutes after the 10 AM start.',
      suggestion: 'Send pre-cleared QR rosters to main gate security at least 2 hours before inter-college events.',
      createdAt: '2026-11-16T07:20:00.000Z',
    },
    {
      id: 'fb-iiith-4',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      eventType: 'Hackathon',
      collegeId: 'col-iiith',
      clubId: 'org-osdg',
      clubName: 'Open Source Developers Group (OSDG)',
      userId: 'stu-sana',
      authorName: 'Sana Fatima',
      isAnonymous: false,
      rating: 5,
      requestedCategory: 'AI Engineering & Product Design',
      comment: 'Super clear problem statements, zero fee, and Teams Hub squad matching helped us find a backend lead in 20 minutes.',
      suggestion: 'Keep 2 dedicated power strips per desk row in Himalaya Auditorium.',
      createdAt: '2026-11-19T14:05:00.000Z',
    },
    {
      id: 'fb-iiith-5',
      eventId: 'evt-deccan-hack',
      eventTitle: 'Deccan AI & Systems Hackathon 2026',
      eventType: 'Hackathon',
      collegeId: 'col-iiith',
      clubId: 'org-osdg',
      clubName: 'Open Source Developers Group (OSDG)',
      userId: 'stu-anon-2',
      authorName: 'Anonymous Student',
      isAnonymous: true,
      rating: 4,
      requestedCategory: 'Hardware & IoT Hackathons',
      comment: 'Loving the mentorship roster from Hyderabad startups.',
      complaint: 'Seats filled up almost immediately — wish capacity at Himalaya was closer to 120.',
      createdAt: '2026-11-20T09:10:00.000Z',
    },
    {
      id: 'fb-iiith-6',
      eventId: 'evt-iiith-systems-talk',
      eventTitle: 'Building Low-Latency Inference in Rust & C++',
      eventType: 'Talk',
      collegeId: 'col-iiith',
      clubId: 'org-osdg',
      clubName: 'IIIT-H Systems & Distributed Lab',
      userId: 'stu-ananya',
      authorName: 'Ananya Rao',
      isAnonymous: false,
      rating: 5,
      requestedCategory: 'GPU & Inference Engineering',
      comment: 'Benchmark breakdown between llama.cpp and vLLM batching was practical and easy to follow even for 2nd years.',
      suggestion: 'Post recorded talk slides + benchmark repo directly on the event page afterward.',
      createdAt: '2026-11-20T18:10:00.000Z',
    },
  ];

  const surveys: CampusSurvey[] = [
    {
      id: 'srv-iiith-spring-tracks',
      collegeId: 'col-iiith',
      collegeShortName: 'IIIT-H',
      createdById: 'org-official-nvipuj',
      createdByName: 'Vipuj N (Campus Official)',
      title: 'Spring Semester Technical Workshop Priorities',
      description: 'Help Student Council and registered clubs prioritize December & January lab tracks and mentor budgets.',
      questionPrompt: 'Which hands-on weekend track should IIIT-H clubs run first in December?',
      allowAnonymous: true,
      options: [
        'AI Agents & Local LLM Systems',
        'Rust & Distributed Databases',
        'Robotics & Embedded Hardware',
        'Product UI/UX & Design Systems',
      ],
      status: 'active',
      createdAt: '2026-11-18T10:00:00.000Z',
    },
    {
      id: 'srv-iiith-timing-poll',
      collegeId: 'col-iiith',
      collegeShortName: 'IIIT-H',
      createdById: 'org-osdg',
      createdByName: 'Rohan Kulkarni',
      title: 'Preferred Weekly Workshop & Paper Jam Slot',
      description: 'Used to avoid academic lab clashes for B.Tech 2nd and 3rd year cohorts.',
      questionPrompt: 'Which weekly time window lets you attend campus talks consistently?',
      allowAnonymous: true,
      options: [
        'Weekday Evening (5:30 PM – 7:30 PM)',
        'Saturday Morning (10:00 AM – 1:00 PM)',
        'Sunday Afternoon Sprint',
      ],
      status: 'closed',
      createdAt: '2026-11-11T09:30:00.000Z',
    },
  ];

  const surveyResponses: SurveyResponse[] = [
    {
      id: 'sr-iiith-1',
      surveyId: 'srv-iiith-spring-tracks',
      collegeId: 'col-iiith',
      userId: 'stu-kiran',
      respondentName: 'Kiran Deshmukh',
      isAnonymous: false,
      rating: 5,
      selectedOption: 'AI Agents & Local LLM Systems',
      responseText: 'Would love a multi-session build lab deploying quantized models on college GPUs.',
      createdAt: '2026-11-19T10:15:00.000Z',
    },
    {
      id: 'sr-iiith-2',
      surveyId: 'srv-iiith-spring-tracks',
      collegeId: 'col-iiith',
      userId: 'stu-ananya',
      respondentName: 'Ananya Rao',
      isAnonymous: false,
      rating: 5,
      selectedOption: 'Rust & Distributed Databases',
      responseText: 'More systems internals labs like Raft consensus or async runtimes please!',
      createdAt: '2026-11-19T12:40:00.000Z',
    },
    {
      id: 'sr-iiith-3',
      surveyId: 'srv-iiith-spring-tracks',
      collegeId: 'col-iiith',
      userId: 'stu-anon-s1',
      respondentName: 'Anonymous Student',
      isAnonymous: true,
      rating: 4,
      selectedOption: 'AI Agents & Local LLM Systems',
      responseText: 'Please reserve 30% beginner seats so 1st & 2nd years can join without prerequisite anxiety.',
      createdAt: '2026-11-20T08:05:00.000Z',
    },
    {
      id: 'sr-iiith-4',
      surveyId: 'srv-iiith-spring-tracks',
      collegeId: 'col-iiith',
      userId: 'stu-anon-s2',
      respondentName: 'Anonymous Student',
      isAnonymous: true,
      rating: 4,
      selectedOption: 'Robotics & Embedded Hardware',
      responseText: 'Joint ACM + Robotics hardware kit lending would boost participation.',
      createdAt: '2026-11-20T15:25:00.000Z',
    },
    {
      id: 'sr-iiith-5',
      surveyId: 'srv-iiith-timing-poll',
      collegeId: 'col-iiith',
      userId: 'stu-kiran',
      respondentName: 'Kiran Deshmukh',
      isAnonymous: false,
      rating: 5,
      selectedOption: 'Saturday Morning (10:00 AM – 1:00 PM)',
      responseText: 'Saturdays have zero course lab clashes.',
      createdAt: '2026-11-12T11:00:00.000Z',
    },
    {
      id: 'sr-iiith-6',
      surveyId: 'srv-iiith-timing-poll',
      collegeId: 'col-iiith',
      userId: 'stu-anon-s3',
      respondentName: 'Anonymous Student',
      isAnonymous: true,
      rating: 4,
      selectedOption: 'Weekday Evening (5:30 PM – 7:30 PM)',
      responseText: 'Short 90-minute evening talks work great right after 5 PM lectures.',
      createdAt: '2026-11-13T14:20:00.000Z',
    },
  ];

  return {
    student: initialStudent,
    students: {},
    organizers,
    officialInvites,
    announcements,
    activeOrganizerId: 'org-official-nvipuj',
    events,
    registrations,
    notifications,
    reports,
    auditLog,
    extractionCache: {},
    partnerPosts,
    chatRooms: [],
    chatMessages,
    squads,
    joinRequests: [],
    connectionRequests: [],
    teamUpCalls: [],
    conversations: [],
    registrationSnapshots: [],
    eventFeedback,
    surveys,
    surveyResponses,
    betaAccess: {
      enabled: false,
      maxSeats: 6,
      allowedEmails: [
        'vipujgaming@gmail.com',
        'nvipuj@gmail.com',
        'janumpallyvinaychandra@gmail.com',
      ],
      inviteCodes: [],
    },
  };
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'campuspulse-db.json');

let memoryState: DatabaseState | null = null;

export function loadDb(): DatabaseState {
  if (memoryState) return memoryState;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      parsed.student = createGuestStudent();
      parsed.students =
        parsed.students && typeof parsed.students === 'object' ? parsed.students : {};
      parsed.organizers = (parsed.organizers || [])
        .filter(
          (o) =>
            o.id !== 'org-official-vipuj' &&
            (o.email || '').trim().toLowerCase() !== 'vipujgaming@gmail.com'
        )
        .map((o) => ({
          ...o,
          memberRole: o.memberRole || 'college_official',
          accountType:
            o.accountType ||
            (o.memberRole === 'club_leader'
              ? 'club_leader'
              : o.memberRole === 'external_organizer'
                ? 'external_organizer'
                : 'campus_official'),
        }));
      if (parsed.activeOrganizerId === 'org-official-vipuj') {
        parsed.activeOrganizerId = 'org-official-nvipuj';
      }
      const seedFallback = createSeedState();
      parsed.officialInvites = Array.isArray(parsed.officialInvites)
        ? parsed.officialInvites
        : seedFallback.officialInvites;
      if (parsed.officialInvites.length <= 1) {
        const existingTokens = new Set(parsed.officialInvites.map((i) => i.token));
        for (const seedInv of seedFallback.officialInvites) {
          if (!existingTokens.has(seedInv.token)) {
            parsed.officialInvites.push(seedInv);
          }
        }
      }
      parsed.announcements = Array.isArray(parsed.announcements)
        ? parsed.announcements
        : seedFallback.announcements;
      if (parsed.announcements.length <= 2) {
        const existingAnnIds = new Set(parsed.announcements.map((a) => a.id));
        for (const seedAnn of seedFallback.announcements) {
          if (!existingAnnIds.has(seedAnn.id)) {
            parsed.announcements.push(seedAnn);
          }
        }
      }
      const existingOrgIds = new Set((parsed.organizers || []).map((o) => o.id));
      for (const seedOrg of seedFallback.organizers) {
        if (!existingOrgIds.has(seedOrg.id)) {
          parsed.organizers = [seedOrg, ...(parsed.organizers || [])];
        }
      }

      const existingRegIds = new Set((parsed.registrations || []).map((r) => r.id));
      if (!Array.isArray(parsed.registrations) || parsed.registrations.length < 6) {
        parsed.registrations = [
          ...(Array.isArray(parsed.registrations) ? parsed.registrations : []),
          ...seedFallback.registrations.filter((r) => !existingRegIds.has(r.id)),
        ];
      }

      const seedEventsById = new Map(seedFallback.events.map((e) => [e.id, e]));
      const existingEventIds = new Set((parsed.events || []).map((e) => e.id));
      const missingSeedEvents = seedFallback.events.filter((e) => !existingEventIds.has(e.id));
      parsed.events = [
        ...missingSeedEvents,
        ...(parsed.events || []).map((e) => {
          const seed = seedEventsById.get(e.id);
          const inferredSourceType =
            e.sourceType ||
            seed?.sourceType ||
            (e.source === 'student_suggested'
              ? 'student_suggested'
              : e.source === 'seeded'
                ? 'seeded'
                : 'campus_official');
          if (!seed) {
            return {
              ...e,
              sourceType: inferredSourceType,
            };
          }
          return {
            ...seed,
            ...e,
            sourceType: inferredSourceType,
            rules: e.rules ?? seed.rules,
            paymentInfo: e.paymentInfo ?? seed.paymentInfo,
            googleFormUrl: e.googleFormUrl ?? seed.googleFormUrl,
            whatsappGroupUrl: e.whatsappGroupUrl ?? seed.whatsappGroupUrl,
            telegramGroupUrl: e.telegramGroupUrl ?? seed.telegramGroupUrl,
            teamSize: e.teamSize ?? seed.teamSize,
            prizesAndPerks: e.prizesAndPerks ?? seed.prizesAndPerks,
            prerequisites: e.prerequisites ?? seed.prerequisites,
            schedule: e.schedule ?? seed.schedule,
            coordinatorContact: e.coordinatorContact ?? seed.coordinatorContact,
            promoVideoUrl: e.promoVideoUrl ?? seed.promoVideoUrl,
            promoVideoCaption: e.promoVideoCaption ?? seed.promoVideoCaption,
          };
        }),
      ];
      parsed.partnerPosts = Array.isArray(parsed.partnerPosts)
        ? parsed.partnerPosts.map((p) => ({
            ...p,
            discoveryEnabled: p.discoveryEnabled !== false,
          }))
        : seedFallback.partnerPosts;
      parsed.chatRooms = Array.isArray(parsed.chatRooms) ? parsed.chatRooms : [];
      parsed.chatMessages = Array.isArray(parsed.chatMessages)
        ? parsed.chatMessages
        : seedFallback.chatMessages;
      parsed.squads =
        Array.isArray(parsed.squads) && parsed.squads.length > 0
          ? parsed.squads
          : seedFallback.squads;
      parsed.joinRequests = Array.isArray(parsed.joinRequests) ? parsed.joinRequests : [];
      parsed.connectionRequests = Array.isArray(parsed.connectionRequests)
        ? parsed.connectionRequests
        : [];
      const validAreaIds = new Set(HYDERABAD_AREAS.map((a) => a.id));
      const validLanguages = new Set<string>(SUPPORTED_LANGUAGES);
      const validGenders = new Set<StudentGender>([
        'woman',
        'man',
        'non_binary',
        'prefer_not_to_say',
        'unset',
      ]);
      const validCallGenders = new Set<CallGenderFilter>([
        'any',
        'woman',
        'man',
        'non_binary',
      ]);

      for (const [stuKey, stuVal] of Object.entries(parsed.students)) {
        if (!stuVal || typeof stuVal !== 'object') continue;
        const needsMrduDefault =
          (!stuVal.collegeId || stuVal.collegeId === 'other') &&
          !stuVal.customCollegeName?.trim() &&
          !stuVal.onboardingCompleted;
        parsed.students[stuKey] = {
          ...stuVal,
          ...(needsMrduDefault
            ? {
                collegeId: 'col-mrdu',
                areaId: 'area-kompally',
                locationLabel: 'Kompally / Medchal (MRDU), Hyderabad',
                locationLat: 17.5594,
                locationLng: 78.4481,
                radiusKm: 50 as const,
                followedCollegeIds:
                  Array.isArray(stuVal.followedCollegeIds) && stuVal.followedCollegeIds.length > 0
                    ? stuVal.followedCollegeIds
                    : ['col-mrdu'],
              }
            : {}),
          gender: validGenders.has(stuVal.gender as StudentGender)
            ? (stuVal.gender as StudentGender)
            : 'unset',
          languages: Array.isArray(stuVal.languages)
            ? Array.from(
                new Set(
                  stuVal.languages.filter((l): l is SupportedLanguage =>
                    validLanguages.has(String(l))
                  )
                )
              ).slice(0, 5)
            : [],
        };
      }

      const evtMapForMigration = new Map(parsed.events.map((e) => [e.id, e]));
      parsed.teamUpCalls = Array.isArray(parsed.teamUpCalls)
        ? parsed.teamUpCalls.map((rawCall) => {
            const c = rawCall as TeamUpCall & { eventId?: string };
            const rawIds =
              Array.isArray(c.eventIds) && c.eventIds.length > 0
                ? c.eventIds
                : c.eventId
                  ? [c.eventId]
                  : [];
            const eventIds = Array.from(
              new Set(rawIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))
            ).slice(0, 3);
            const events: TeamUpCallEventRef[] =
              Array.isArray(c.events) && c.events.length > 0
                ? c.events.slice(0, 3)
                : eventIds.map((eid) => {
                    const matchedEvt = evtMapForMigration.get(eid);
                    return {
                      id: eid,
                      title: matchedEvt?.title || c.eventTitle || 'Campus Event',
                      type: matchedEvt?.type || c.eventType || 'Hackathon',
                      ...(matchedEvt?.regDeadline ? { regDeadline: matchedEvt.regDeadline } : {}),
                    };
                  });
            const primary = events[0];
            const preferredAreas = Array.isArray(c.preferredAreas)
              ? Array.from(
                  new Set(c.preferredAreas.filter((a): a is string => validAreaIds.has(a)))
                )
              : [];
            const preferredLanguages = Array.isArray(c.preferredLanguages)
              ? Array.from(
                  new Set(
                    c.preferredLanguages.filter((l): l is SupportedLanguage =>
                      validLanguages.has(String(l))
                    )
                  )
                )
              : [];
            const genderPreference: CallGenderFilter = validCallGenders.has(
              c.genderPreference as CallGenderFilter
            )
              ? (c.genderPreference as CallGenderFilter)
              : 'any';

            return {
              ...c,
              eventId: c.eventId || primary?.id || '',
              eventTitle: c.eventTitle || primary?.title || 'Campus Event',
              eventType: c.eventType || primary?.type || 'Hackathon',
              eventIds: eventIds.length > 0 ? eventIds : primary ? [primary.id] : [],
              events,
              preferredAreas,
              preferredLanguages,
              genderPreference,
            };
          })
        : [];
      parsed.conversations = Array.isArray(parsed.conversations) ? parsed.conversations : [];
      parsed.registrationSnapshots = Array.isArray(parsed.registrationSnapshots)
        ? parsed.registrationSnapshots
        : [];
      parsed.eventFeedback =
        Array.isArray(parsed.eventFeedback) && parsed.eventFeedback.length > 0
          ? parsed.eventFeedback
          : seedFallback.eventFeedback;
      parsed.surveys =
        Array.isArray(parsed.surveys) && parsed.surveys.length > 0
          ? parsed.surveys
          : seedFallback.surveys;
      parsed.surveyResponses =
        Array.isArray(parsed.surveyResponses) && parsed.surveyResponses.length > 0
          ? parsed.surveyResponses
          : seedFallback.surveyResponses;
      parsed.events = parsed.events.map((e) => {
        const seed = seedEventsById.get(e.id);
        const upgradeIqx24 =
          e.id === 'evt-iqx24-hackathon' &&
          seed &&
          (e.posterUrl === '/src/assets/images/poster_iqx24_hackathon.jpeg' ||
            e.promoVideoUrl === '/src/assets/videos/reel_ai_hackathon.mp4');
        return {
          ...e,
          ...(upgradeIqx24
            ? {
                posterUrl: seed.posterUrl,
                additionalPosterUrls: seed.additionalPosterUrls,
                promoVideoUrl: seed.promoVideoUrl,
                promoVideoCaption: seed.promoVideoCaption,
                venueName: seed.venueName,
                formattedAddress: seed.formattedAddress,
                description: seed.description,
                feeInr: seed.feeInr,
                paymentInfo: seed.paymentInfo,
                prizesAndPerks: seed.prizesAndPerks,
                rules: seed.rules,
                teamSize: seed.teamSize,
              }
            : {}),
          additionalPosterUrls:
            Array.isArray(e.additionalPosterUrls) && e.additionalPosterUrls.length > 0
              ? e.additionalPosterUrls
              : seed?.additionalPosterUrls,
          viewCount:
            typeof e.viewCount === 'number' && e.viewCount > 0
              ? e.viewCount
              : (seed?.viewCount ?? e.viewCount ?? 0),
          formattedAddress: e.formattedAddress || seed?.formattedAddress,
          schedule:
            Array.isArray(e.schedule) && e.schedule.length > 0
              ? e.schedule
              : seed?.schedule,
          rules: Array.isArray(e.rules) && e.rules.length > 0 ? e.rules : seed?.rules,
          prizesAndPerks:
            Array.isArray(e.prizesAndPerks) && e.prizesAndPerks.length > 0
              ? e.prizesAndPerks
              : seed?.prizesAndPerks,
          prerequisites:
            Array.isArray(e.prerequisites) && e.prerequisites.length > 0
              ? e.prerequisites
              : seed?.prerequisites,
          coordinatorContact: e.coordinatorContact || seed?.coordinatorContact,
          paymentInfo: e.paymentInfo || seed?.paymentInfo,
        };
      });
      const defaultBeta = seedFallback.betaAccess!;
      const rawBeta = parsed.betaAccess;
      const normalizedEmails = Array.from(
        new Set([
          'vipujgaming@gmail.com',
          'nvipuj@gmail.com',
          'janumpallyvinaychandra@gmail.com',
          ...(Array.isArray(rawBeta?.allowedEmails)
            ? rawBeta!.allowedEmails
                .map((e) => String(e || '').trim().toLowerCase())
                .filter((e) => Boolean(e) && e !== 'snow.kngt@gmail.com')
            : []),
        ])
      ).slice(0, 6);
      parsed.betaAccess = {
        enabled: typeof rawBeta?.enabled === 'boolean' ? rawBeta.enabled : defaultBeta.enabled,
        maxSeats: 6,
        allowedEmails: normalizedEmails,
        inviteCodes: Array.isArray(rawBeta?.inviteCodes) ? rawBeta.inviteCodes : [],
      };
      const evtMap = new Map(parsed.events.map((e) => [e.id, e]));
      parsed.registrations = (parsed.registrations || []).map((r) => {
        const suffix = r.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000001';
        const passCode = r.passCode || `CP-PASS-${suffix}`;
        const evt = evtMap.get(r.eventId);
        return {
          ...r,
          passCode,
          qrPayload: r.qrPayload || `CONNECTUS:V1:${r.eventId}:${r.id}:${passCode}`,
          paymentStatus: r.paymentStatus || (evt && evt.feeInr > 0 ? 'paid_verified' : 'free'),
          amountPaidInr: typeof r.amountPaidInr === 'number' ? r.amountPaidInr : evt?.feeInr || 0,
        };
      });
      memoryState = parsed;
      return memoryState;
    }
  } catch {
    // Fall back to fresh seed state
  }
  memoryState = createSeedState();
  saveDb(memoryState);
  return memoryState;
}

export function saveDb(state: DatabaseState): void {
  memoryState = state;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

export function resetDb(): DatabaseState {
  memoryState = createSeedState();
  saveDb(memoryState);
  return memoryState;
}
