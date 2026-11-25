package models

import "errors"

const MaxInstallments = 6

var ErrNegativeAmount = errors.New("O valor monetário não pode ser negativo.")

var ErrInstallments = errors.New("Selecione de 1 a 6 parcelas no cartão; Pix e boleto permitem uma parcela.")

type PaymentPlan struct {
	Installments       *int    `json:"installments"`
	InstallmentAmounts []Money `json:"installmentAmounts"`
}

func NormalizeInstallments(method string, value *int) (int, error) {
	installmentCount := 1 // valor padrão da parcela

	// utiliza a quantidade informada, se existir
	if value != nil {
		installmentCount = *value
	}

	if installmentCount < 1 || installmentCount > MaxInstallments {
		return 0, ErrInstallments
	}
	switch method {
	case "card":
	case "pix", "boleto":
		if installmentCount != 1 {
			return 0, ErrInstallments
		}
	default:
		return 0, ErrInstallments
	}

	return installmentCount, nil
}

// divide o valor total da compra entre as parcelas.
func SplitInstallments(total Money, count int) ([]Money, error) {

	if count < 1 || count > MaxInstallments {
		return nil, ErrInstallments
	}

	if total < 0 {
		return nil, ErrNegativeAmount
	}

	// cria e inicializa um slice de valores monetários, com um elemento para cada parcela, inicialmente zero.
	amounts := make([]Money, count)

	quotient, remainder := total/Money(count), total%Money(count)
	for i := range amounts {
		amounts[i] = quotient

		// Distribui os centavos restantes entre as primeiras parcelas.
		if Money(i) < remainder {
			amounts[i]++
		}
	}
	return amounts, nil
}

func (p *PaymentPlan) PopulateInstallments(total Money) error {
	// caso não existam parcelas definidas, limpa o slice e encerra sem erro.
	if p.Installments == nil {
		p.InstallmentAmounts = nil
		return nil
	}

	var err error
	p.InstallmentAmounts, err = SplitInstallments(total, *p.Installments)
	return err
}
