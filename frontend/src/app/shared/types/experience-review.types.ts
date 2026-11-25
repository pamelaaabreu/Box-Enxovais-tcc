export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ExperienceReview {
  id: number;
  orderId: number;
  overall: number;
  navigation: number | null;
  service: number | null;
  experience: number | null;
  comment: string;
  publicationConsent: boolean;
  status: ReviewModerationStatus;
  createdAt: string;
}

export interface PurchaseReviewInput {
  overall: number;
  comment: string;
  publicationConsent: boolean;
}
