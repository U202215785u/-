export interface CompetitionDeadline {
  label: string;
  date: string;
}

export interface EntryFee {
  amount: number;
  note: string;
}

export interface Competition {
  id: number;
  title: string;
  organizer: string;
  level: string;
  overview: string;
  posterUrl: string;
  contestType: string;
  tags: string[];
  submissionStartDate: string;
  submissionDeadline: string;
  officialUrl: string;
  status: "draft" | "published" | "archived";
  source: "manual" | "ai";
  deadlines: CompetitionDeadline[];
  categories: string[];
  eligibility: string;
  entryFee: EntryFee;
  awards: string;
  specFormat: string;
  aiPolicy: string;
  isMoeCompetition: string;
  dataVerified: string;
  detailBody: string;
  createdAt: string;
  updatedAt: string;
}

