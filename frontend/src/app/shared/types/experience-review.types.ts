export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ExperienceReview {
  canEdit?: boolean;
  id: number;
  orderId: number;
  overall: number;
  navigation: number | null;
  service: number | null;
  experience: number | null;
  topics?: string[];
  comment: string;
  publicationConsent: boolean;
  status: ReviewModerationStatus;
  createdAt: string;
}

export interface PurchaseReviewInput {
  overall: number;
  experience?: number | null;
  topics?: string[];
  comment: string;
  publicationConsent: boolean;
}
