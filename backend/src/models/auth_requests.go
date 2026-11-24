package models

// DTO redef. de senha
type ValidateResetTokenRequest struct {
	ResetToken string `json:"resetToken"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	ResetToken  string `json:"resetToken"`
	NewPassword string `json:"newPassword"`
}

type ValidateVerificationCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}
