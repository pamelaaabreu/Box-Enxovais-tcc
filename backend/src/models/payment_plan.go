package models

import "errors"

var ErrInstallments = errors.New("Selecione de 1 a 6 parcelas no cartão; Pix e boleto permitem uma parcela.")

type PaymentPlan struct {
	Installments       *int    `json:"installments"`
	InstallmentAmounts []Money `json:"installmentAmounts"`
}

func NormalizeInstallments(method string, value *int) (int, error) {
	installmentCount := 1
	if value != nil {
		installmentCount = *value
	}
	if installmentCount < 1 || installmentCount > 6 || ((method == "pix" || method == "boleto") && installmentCount != 1) || (method != "card" && method != "pix" && method != "boleto") {
		return 0, ErrInstallments
	}
	return installmentCount, nil
}
func SplitInstallments(total Money, count int) ([]Money, error) {
	if total < 0 || count < 1 || count > 6 {
		return nil, ErrInstallments
	}
	amounts := make([]Money, count)
	for i := range amounts {
		amounts[i] = total / Money(count)
		if Money(i) < total%Money(count) {
			amounts[i]++
		}
	}
	return amounts, nil
}
func (p *PaymentPlan) PopulateInstallments(total Money) error {
	if p.Installments == nil {
		p.InstallmentAmounts = nil
		return nil
	}
	var err error
	p.InstallmentAmounts, err = SplitInstallments(total, *p.Installments)
	return err
}
