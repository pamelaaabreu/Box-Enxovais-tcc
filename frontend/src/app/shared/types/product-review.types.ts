import { ReviewModerationStatus } from './experience-review.types';
export interface ProductReview {
 id: number; productId: number; productName: string; imagePath: string;
 orderId?: number; rating: number; comment: string; publicationConsent: boolean;
 status?: ReviewModerationStatus; createdAt: string; updatedAt: string;
 customerName?: string; canEdit?: boolean;
}
export interface ReviewableProduct { productId: number; productName: string; imagePath: string; }
export interface ProductReviewInput { rating: number; comment: string; publicationConsent: boolean; }
export interface ReviewSummary { average: number; count: number; }
export interface ReviewSummaryState extends ReviewSummary { loading: boolean; error: boolean; loadedAt: number; }
